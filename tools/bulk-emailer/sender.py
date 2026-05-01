"""Outlook COM send backend (Windows-only).

Talks to a running / installed Microsoft Outlook desktop application
through the COM API (``Outlook.Application``). Because the COM session
uses the user's already-logged-in Outlook profile, the program does NOT
need a username, password, or SMTP configuration — it just sends "as"
whichever account is selected in the dropdown.

This module imports ``win32com.client`` lazily so the rest of the app
can import it on non-Windows machines for development or static checks.
"""

from __future__ import annotations

import datetime as dt
import time
from dataclasses import dataclass, field
from pathlib import Path
from typing import Callable

from auto_mode import Envelope

# Outlook MailItem constant (olMailItem == 0).
_OL_MAIL_ITEM = 0


@dataclass
class OutlookAccount:
    """Lightweight description of one of Outlook's configured accounts."""

    display_name: str
    smtp_address: str

    def __str__(self) -> str:
        if self.smtp_address and self.smtp_address != self.display_name:
            return f"{self.display_name} <{self.smtp_address}>"
        return self.display_name or self.smtp_address or "(unknown account)"


@dataclass
class EmailJob:
    envelopes: list[Envelope]
    subject: str
    body: str
    attachments: list[str] = field(default_factory=list)
    account_smtp: str = ""  # Empty = default Outlook account.
    mode_label: str = "individual"  # purely cosmetic, used in logs
    is_html: bool = False
    # Map of CID -> absolute file path. Each entry is attached to every
    # outgoing message and tagged with PR_ATTACH_CONTENT_ID = <cid> so
    # an ``<img src="cid:<cid>">`` reference in the HTML body renders
    # inside the message rather than as a separate attachment.
    inline_images: dict[str, str] = field(default_factory=dict)
    # Optional per-recipient subject override. Keyed by lowercased
    # email address; the lookup is done against the *first* address in
    # each envelope's To list. When the lookup misses, the message
    # falls back to ``subject``.
    subject_overrides: dict[str, str] = field(default_factory=dict)
    # Pause this many seconds between consecutive Send() calls. For
    # scheduled jobs the Nth message's DeferredDeliveryTime is
    # offset by N * delay so the Outbox flushes them staggered.
    delay_seconds: float = 0.0


ProgressCallback = Callable[[str], None]


class OutlookUnavailableError(RuntimeError):
    """Raised when Outlook / pywin32 is not available."""


def _import_win32com():
    """Import ``win32com.client`` with a friendly error if missing."""
    try:
        import win32com.client  # type: ignore[import-not-found]
    except ImportError as exc:
        raise OutlookUnavailableError(
            "This program needs the 'pywin32' package and Microsoft "
            "Outlook for Windows. Install with: pip install pywin32"
        ) from exc
    return win32com.client


def _import_pythoncom():
    """Import ``pythoncom`` with a friendly error if missing."""
    try:
        import pythoncom  # type: ignore[import-not-found]
    except ImportError as exc:
        raise OutlookUnavailableError(
            "This program needs the 'pywin32' package. "
            "Install with: pip install pywin32"
        ) from exc
    return pythoncom


def list_accounts() -> list[OutlookAccount]:
    """Return every account currently configured in the Outlook profile."""
    win32com_client = _import_win32com()
    pythoncom = _import_pythoncom()
    pythoncom.CoInitialize()
    try:
        try:
            outlook = win32com_client.Dispatch("Outlook.Application")
            namespace = outlook.GetNamespace("MAPI")
        except Exception as exc:  # pragma: no cover - depends on Outlook
            raise OutlookUnavailableError(
                f"Could not talk to Outlook. Make sure Outlook is installed "
                f"and you are signed in. ({exc})"
            ) from exc

        accounts = namespace.Accounts
        out: list[OutlookAccount] = []
        for index in range(1, accounts.Count + 1):
            acc = accounts.Item(index)
            smtp = getattr(acc, "SmtpAddress", "") or ""
            display = getattr(acc, "DisplayName", "") or smtp or f"Account {index}"
            out.append(OutlookAccount(display_name=display, smtp_address=smtp))
        return out
    finally:
        pythoncom.CoUninitialize()


def _resolve_account(namespace, smtp_address: str):
    """Find the Outlook ``Account`` object matching ``smtp_address``.

    Returns ``None`` when no override is requested, in which case
    Outlook will use the profile's default sending account.
    """
    if not smtp_address:
        return None
    accounts = namespace.Accounts
    for index in range(1, accounts.Count + 1):
        acc = accounts.Item(index)
        if (getattr(acc, "SmtpAddress", "") or "").lower() == smtp_address.lower():
            return acc
    return None


def _attach_files(mail_item, attachments: list[str], log: ProgressCallback) -> None:
    for path_str in attachments:
        path = Path(path_str)
        if not path.is_file():
            log(f"  attachment skipped (not found): {path_str}")
            continue
        mail_item.Attachments.Add(str(path.resolve()))


# MAPI named-property tags exposed via Outlook's ``PropertyAccessor``.
# These let us mark an attachment as inline/hidden and tie it to a CID
# referenced in the HTML body.
_PR_ATTACH_CONTENT_ID = (
    "http://schemas.microsoft.com/mapi/proptag/0x3712001E"
)
_PR_ATTACHMENT_HIDDEN = (
    "http://schemas.microsoft.com/mapi/proptag/0x7FFE000B"
)


def _attach_inline_images(
    mail_item,
    inline_images: dict[str, str],
    log: ProgressCallback,
) -> None:
    """Attach images that the HTML body references via ``cid:<id>``.

    Each attachment is tagged with ``PR_ATTACH_CONTENT_ID`` so Outlook
    renders it inside the body and with ``PR_ATTACHMENT_HIDDEN`` so it
    doesn't appear as a regular paperclip attachment.
    """
    for cid, path_str in inline_images.items():
        path = Path(path_str)
        if not path.is_file():
            log(f"  inline image skipped (not found): {path_str}")
            continue
        try:
            attachment = mail_item.Attachments.Add(str(path.resolve()))
            accessor = attachment.PropertyAccessor
            accessor.SetProperty(_PR_ATTACH_CONTENT_ID, cid)
            try:
                accessor.SetProperty(_PR_ATTACHMENT_HIDDEN, True)
            except Exception:
                # Some Outlook builds reject PR_ATTACHMENT_HIDDEN; the
                # email still renders correctly, the attachment just
                # appears in the paperclip list as well.
                pass
        except Exception as exc:
            log(f"  inline image '{path.name}' failed: {exc}")


def send(
    job: EmailJob,
    scheduled_time: dt.datetime | None = None,
    progress: ProgressCallback | None = None,
) -> tuple[int, int]:
    """Send the job through Outlook. Returns ``(sent, failed)``.

    When ``scheduled_time`` is set, each created message is given an
    Outlook ``DeferredDeliveryTime`` and dropped into the Outbox;
    Outlook itself releases them at that time. The mail still requires
    Outlook to be running at the scheduled moment to actually leave the
    Outbox.

    For immediate (non-deferred) sends, this also asks Outlook to flush
    its Outbox (``Session.SendAndReceive``) so the message leaves
    promptly instead of sitting in the Outbox until the next manual
    send/receive.
    """
    if not job.envelopes:
        raise ValueError("No recipients provided.")
    if not job.subject.strip():
        raise ValueError("Subject must not be empty.")

    log = progress or (lambda _msg: None)
    win32com_client = _import_win32com()
    pythoncom = _import_pythoncom()

    # COM objects must be initialised on each thread that uses them.
    # ``send`` is typically called from a background thread, so we always
    # initialise here and tear down on exit.
    pythoncom.CoInitialize()
    try:
        return _send_inner(win32com_client, job, scheduled_time, log)
    finally:
        pythoncom.CoUninitialize()


def _send_inner(win32com_client, job, scheduled_time, log):
    try:
        outlook = win32com_client.Dispatch("Outlook.Application")
        namespace = outlook.GetNamespace("MAPI")
    except Exception as exc:
        raise OutlookUnavailableError(
            f"Could not talk to Outlook. Make sure Outlook is installed "
            f"and you are signed in. ({exc})"
        ) from exc

    sender_account = _resolve_account(namespace, job.account_smtp)
    if job.account_smtp and sender_account is None:
        raise ValueError(
            f"Outlook does not have an account with the SMTP address "
            f"'{job.account_smtp}'. Pick one of the accounts shown in the dropdown."
        )

    sent = 0
    failed = 0
    total = len(job.envelopes)
    delay = max(0.0, float(job.delay_seconds or 0.0))

    for index, envelope in enumerate(job.envelopes, start=1):
        to_csv = "; ".join(envelope.to)
        cc_csv = "; ".join(envelope.cc)
        if envelope.cc:
            log(
                f"[{index}/{total}] Composing for "
                f"{to_csv} (cc: {len(envelope.cc)})"
            )
        else:
            log(f"[{index}/{total}] Composing for {to_csv}")
        try:
            mail = outlook.CreateItem(_OL_MAIL_ITEM)
            primary = envelope.to[0].lower() if envelope.to else ""
            subject = job.subject_overrides.get(primary, job.subject)
            mail.Subject = subject
            if job.is_html:
                mail.HTMLBody = job.body
            else:
                mail.Body = job.body
            mail.To = to_csv
            if cc_csv:
                mail.CC = cc_csv
            if sender_account is not None:
                # SendUsingAccount must be assigned via the underlying
                # property because pywin32 doesn't expose it as a normal
                # attribute on some Outlook versions.
                mail._oleobj_.Invoke(*(64209, 0, 8, 0, sender_account))  # noqa: SLF001
            _attach_files(mail, job.attachments, log)
            if job.is_html and job.inline_images:
                _attach_inline_images(mail, job.inline_images, log)
            if scheduled_time is not None:
                # Stagger scheduled sends by ``delay`` so a 5-minute
                # gap (for example) is preserved in the Outbox.
                offset = dt.timedelta(seconds=delay * (index - 1))
                mail.DeferredDeliveryTime = scheduled_time + offset
            mail.Send()
            sent += 1
        except Exception as exc:
            failed += 1
            log(f"  -> failed: {exc}")

        # Sleep between *immediate* sends so we don't blast Outlook
        # back-to-back. We don't sleep after the last message and we
        # don't sleep when scheduling — there each mail's
        # DeferredDeliveryTime already has the offset applied.
        if scheduled_time is None and delay > 0 and index < total:
            log(f"  waiting {delay:.0f}s before next send…")
            time.sleep(delay)

    if scheduled_time is not None:
        log(
            f"All {sent} message(s) queued in Outbox for "
            f"{scheduled_time:%Y-%m-%d %H:%M}"
        )
    elif sent > 0:
        # Force Outlook to actually push the Outbox; without this,
        # immediately-sent COM messages sometimes sit in the Outbox
        # until the next manual F9 / send-receive cycle.
        try:
            namespace.SendAndReceive(False)
            log("Outbox flushed (SendAndReceive completed)")
        except Exception as exc:
            log(f"  -> Outbox flush failed (Outlook may flush on its own): {exc}")

    return sent, failed
