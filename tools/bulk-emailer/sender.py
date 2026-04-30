"""SMTP sending logic for the bulk emailer.

Targets Office 365 / Outlook business by default
(``smtp.office365.com`` on port 587 with STARTTLS) but works with any
SMTP server. Supports two send modes:

- ``individual``: one message per recipient (recipients do not see each
  other's addresses).
- ``cc``: a single message addressed to the first recipient with the
  rest in CC.
"""

from __future__ import annotations

import mimetypes
import smtplib
import ssl
from dataclasses import dataclass, field
from email.message import EmailMessage
from email.utils import formataddr
from pathlib import Path
from typing import Callable, Iterable


@dataclass
class SmtpConfig:
    host: str = "smtp.office365.com"
    port: int = 587
    username: str = ""
    password: str = ""
    use_starttls: bool = True


@dataclass
class EmailJob:
    recipients: list[str]
    subject: str
    body: str
    attachments: list[str] = field(default_factory=list)
    mode: str = "individual"  # "individual" | "cc"
    from_name: str = ""

    def from_address(self, smtp: SmtpConfig) -> str:
        if self.from_name:
            return formataddr((self.from_name, smtp.username))
        return smtp.username


ProgressCallback = Callable[[str], None]


def _build_message(
    subject: str,
    body: str,
    from_addr: str,
    to_list: Iterable[str],
    cc_list: Iterable[str] = (),
    attachments: Iterable[str] = (),
) -> EmailMessage:
    msg = EmailMessage()
    msg["Subject"] = subject
    msg["From"] = from_addr
    msg["To"] = ", ".join(to_list)
    cc_joined = ", ".join(cc_list)
    if cc_joined:
        msg["Cc"] = cc_joined
    msg.set_content(body)
    for path_str in attachments:
        path = Path(path_str)
        if not path.is_file():
            continue
        ctype, encoding = mimetypes.guess_type(path.name)
        if ctype is None or encoding is not None:
            ctype = "application/octet-stream"
        maintype, subtype = ctype.split("/", 1)
        with path.open("rb") as f:
            msg.add_attachment(
                f.read(),
                maintype=maintype,
                subtype=subtype,
                filename=path.name,
            )
    return msg


def _connect(smtp: SmtpConfig) -> smtplib.SMTP:
    server = smtplib.SMTP(smtp.host, smtp.port, timeout=60)
    server.ehlo()
    if smtp.use_starttls:
        server.starttls(context=ssl.create_default_context())
        server.ehlo()
    server.login(smtp.username, smtp.password)
    return server


def send(
    smtp: SmtpConfig,
    job: EmailJob,
    progress: ProgressCallback | None = None,
) -> tuple[int, int]:
    """Send the job. Returns (sent_count, failed_count)."""
    if not job.recipients:
        raise ValueError("No recipients provided.")
    if not job.subject.strip():
        raise ValueError("Subject must not be empty.")
    if not smtp.username or not smtp.password:
        raise ValueError("SMTP username and password are required.")

    log = progress or (lambda _msg: None)
    sent = 0
    failed = 0
    server = _connect(smtp)
    try:
        from_addr = job.from_address(smtp)
        if job.mode == "cc":
            primary = job.recipients[0]
            cc = job.recipients[1:]
            log(f"Sending one email to {primary} with {len(cc)} addresses in CC")
            msg = _build_message(
                job.subject,
                job.body,
                from_addr,
                [primary],
                cc,
                job.attachments,
            )
            try:
                server.send_message(msg)
                sent += len(job.recipients)
                log(f"Sent successfully to {len(job.recipients)} recipients")
            except smtplib.SMTPException as exc:
                failed += len(job.recipients)
                log(f"Failed: {exc}")
        else:
            for index, recipient in enumerate(job.recipients, start=1):
                log(f"[{index}/{len(job.recipients)}] Sending to {recipient}")
                msg = _build_message(
                    job.subject,
                    job.body,
                    from_addr,
                    [recipient],
                    (),
                    job.attachments,
                )
                try:
                    server.send_message(msg)
                    sent += 1
                except smtplib.SMTPException as exc:
                    failed += 1
                    log(f"  -> failed: {exc}")
    finally:
        try:
            server.quit()
        except smtplib.SMTPException:
            pass
    return sent, failed
