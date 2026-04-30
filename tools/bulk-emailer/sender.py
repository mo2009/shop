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
from dataclasses import dataclass, field
from pathlib import Path
from typing import Callable

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
    recipients: list[str]
    subject: str
    body: str
    attachments: list[str] = field(default_factory=list)
    mode: str = "individual"  # "individual" | "cc"
    account_smtp: str = ""  # Empty = default Outlook account.


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
    """
    if not job.recipients:
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

    def _build_one(to_csv: str, cc_csv: str = ""):
        mail = outlook.CreateItem(_OL_MAIL_ITEM)
        mail.Subject = job.subject
        mail.Body = job.body
        mail.To = to_csv
        if cc_csv:
            mail.CC = cc_csv
        if sender_account is not None:
            # SendUsingAccount must be assigned via the underlying property
            # because pywin32 doesn't expose it as a normal attribute on
            # some Outlook versions.
            mail._oleobj_.Invoke(*(64209, 0, 8, 0, sender_account))  # noqa: SLF001
        _attach_files(mail, job.attachments, log)
        if scheduled_time is not None:
            mail.DeferredDeliveryTime = scheduled_time
        return mail

    if job.mode == "cc":
        primary = job.recipients[0]
        cc_list = job.recipients[1:]
        log(
            f"Composing one email with {len(cc_list)} address(es) in CC "
            f"(primary: {primary})"
        )
        try:
            mail = _build_one(primary, "; ".join(cc_list))
            mail.Send()
            sent += len(job.recipients)
            log(
                "Handed off to Outlook"
                + (f" (deferred until {scheduled_time:%Y-%m-%d %H:%M})"
                   if scheduled_time else "")
            )
        except Exception as exc:
            failed += len(job.recipients)
            log(f"Failed: {exc}")
    else:
        for index, recipient in enumerate(job.recipients, start=1):
            log(f"[{index}/{len(job.recipients)}] Composing for {recipient}")
            try:
                mail = _build_one(recipient)
                mail.Send()
                sent += 1
            except Exception as exc:
                failed += 1
                log(f"  -> failed: {exc}")
        if scheduled_time is not None:
            log(f"All messages queued in Outbox for {scheduled_time:%Y-%m-%d %H:%M}")

    return sent, failed
