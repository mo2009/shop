"""Bulk Outlook email sender — desktop GUI (Outlook COM backend).

A simple, single-window application for sending marketing emails through
the user's locally-installed Microsoft Outlook desktop app. Designed to
be runnable by a non-technical user.

Run on Windows: ``python main.py``
"""

from __future__ import annotations

import datetime as dt
import html as html_lib
import re
import threading
import tkinter as tk
from pathlib import Path
from tkinter import colorchooser, filedialog, messagebox, ttk

import customtkinter as ctk
from tkcalendar import DateEntry

import storage
from auto_mode import build_envelopes, describe_envelopes
from excel_import import (
    EMAIL_REGEX,
    SheetSummary,
    extract_email_subject_pairs,
    extract_emails,
    inspect_workbook,
)
from sender import (
    EmailJob,
    OutlookAccount,
    OutlookUnavailableError,
    list_accounts,
    send,
)

APP_TITLE = "Outlook Bulk Emailer"
APP_VERSION = "2.2.0"

_CID_REGEX = re.compile(r'cid:([A-Za-z0-9_-]+)')
_HTML_TAG_REGEX = re.compile(r'<[^>]+>')


def _looks_like_html(text: str) -> bool:
    """Heuristic: does this body contain HTML tags we'd want to render?"""
    return bool(_HTML_TAG_REGEX.search(text))


_BR_BEFORE_NEWLINE_REGEX = re.compile(r'<br\s*/?>\s*\Z', re.IGNORECASE)


def _newlines_to_br(body: str) -> str:
    """Insert ``<br>`` before every bare newline in ``body``.

    Outlook's HTML renderer collapses unescaped ``\\n`` characters into
    a single space, so plain-text-style line breaks in an HTML body
    silently disappear. This walks through the body line by line and
    appends ``<br>`` to each line that doesn't already end with one
    (so a ``<br>`` the user typed manually isn't doubled).

    Carriage returns are normalised to plain newlines first.
    """
    body = body.replace('\r\n', '\n').replace('\r', '\n')
    lines = body.split('\n')
    out: list[str] = []
    for index, line in enumerate(lines):
        if index == len(lines) - 1:
            # Last line: nothing more to break; append untouched.
            out.append(line)
            break
        if _BR_BEFORE_NEWLINE_REGEX.search(line):
            out.append(line + '\n')
        else:
            out.append(line + '<br>\n')
    return ''.join(out)

SEND_MODES = [
    ("individual", "Individual"),
    ("cc", "Single CC"),
    ("auto", "Auto (group by company)"),
]


def _parse_recipients(raw: str) -> list[str]:
    """Pull all email addresses out of free-form text."""
    seen: set[str] = set()
    ordered: list[str] = []
    for match in EMAIL_REGEX.findall(raw):
        normalized = match.strip().lower()
        if normalized in seen:
            continue
        seen.add(normalized)
        ordered.append(match.strip())
    return ordered


class PresetDialog(ctk.CTkToplevel):
    """Modal dialog used by the '+ New' buttons for subjects and bodies."""

    def __init__(
        self,
        parent: ctk.CTk,
        title: str,
        prompt: str,
        multiline: bool,
        initial: str = "",
    ) -> None:
        super().__init__(parent)
        self.title(title)
        self.geometry("520x320" if multiline else "520x160")
        self.resizable(False, False)
        self.transient(parent)
        self.result: str | None = None

        ctk.CTkLabel(
            self,
            text=prompt,
            font=ctk.CTkFont(size=13, weight="bold"),
        ).pack(anchor="w", padx=16, pady=(14, 6))

        if multiline:
            self.text_widget = ctk.CTkTextbox(self, height=180)
            self.text_widget.pack(fill="both", expand=True, padx=16, pady=(0, 10))
            self.text_widget.insert("1.0", initial)
            self.text_widget.focus_set()
        else:
            self.var = ctk.StringVar(value=initial)
            entry = ctk.CTkEntry(self, textvariable=self.var)
            entry.pack(fill="x", padx=16, pady=(0, 10))
            entry.focus_set()
            entry.bind("<Return>", lambda _e: self._on_save())

        self._multiline = multiline
        bar = ctk.CTkFrame(self, fg_color="transparent")
        bar.pack(fill="x", padx=16, pady=(0, 14))
        ctk.CTkButton(bar, text="Save", command=self._on_save, width=110).pack(
            side="right", padx=(6, 0)
        )
        ctk.CTkButton(
            bar,
            text="Cancel",
            command=self._on_cancel,
            width=110,
            fg_color="transparent",
            border_width=1,
        ).pack(side="right")
        self.protocol("WM_DELETE_WINDOW", self._on_cancel)

        self.after(50, self._grab)

    def _grab(self) -> None:
        try:
            self.grab_set()
        except tk.TclError:
            pass

    def _on_save(self) -> None:
        if self._multiline:
            value = self.text_widget.get("1.0", "end").rstrip()
        else:
            value = self.var.get().strip()
        if not value:
            messagebox.showwarning("Empty", "Please enter a value.", parent=self)
            return
        self.result = value
        self.destroy()

    def _on_cancel(self) -> None:
        self.result = None
        self.destroy()

    @classmethod
    def ask(
        cls,
        parent: ctk.CTk,
        title: str,
        prompt: str,
        multiline: bool,
        initial: str = "",
    ) -> str | None:
        dialog = cls(parent, title, prompt, multiline, initial)
        parent.wait_window(dialog)
        return dialog.result


class LinkDialog(ctk.CTkToplevel):
    """Two-field dialog for inserting a hyperlink (URL + display text)."""

    def __init__(self, parent: ctk.CTk, prefilled_text: str = "") -> None:
        super().__init__(parent)
        self.title("Insert link")
        self.geometry("520x220")
        self.resizable(False, False)
        self.transient(parent)
        self.result: tuple[str, str] | None = None

        ctk.CTkLabel(
            self,
            text="URL (e.g. https://example.com):",
            font=ctk.CTkFont(size=13, weight="bold"),
        ).pack(anchor="w", padx=16, pady=(14, 4))
        self.url_var = ctk.StringVar()
        url_entry = ctk.CTkEntry(self, textvariable=self.url_var)
        url_entry.pack(fill="x", padx=16)
        url_entry.focus_set()

        ctk.CTkLabel(
            self,
            text="Display text (optional — defaults to the URL):",
            font=ctk.CTkFont(size=13, weight="bold"),
        ).pack(anchor="w", padx=16, pady=(12, 4))
        self.text_var = ctk.StringVar(value=prefilled_text)
        ctk.CTkEntry(self, textvariable=self.text_var).pack(fill="x", padx=16)

        bar = ctk.CTkFrame(self, fg_color="transparent")
        bar.pack(fill="x", padx=16, pady=(16, 14))
        ctk.CTkButton(bar, text="Insert", command=self._on_insert, width=110).pack(
            side="right", padx=(6, 0)
        )
        ctk.CTkButton(
            bar,
            text="Cancel",
            command=self._on_cancel,
            width=110,
            fg_color="transparent",
            border_width=1,
        ).pack(side="right")

        self.protocol("WM_DELETE_WINDOW", self._on_cancel)
        self.bind("<Return>", lambda _e: self._on_insert())
        self.bind("<Escape>", lambda _e: self._on_cancel())
        self.after(50, self._grab)

    def _grab(self) -> None:
        try:
            self.grab_set()
        except tk.TclError:
            pass

    def _on_insert(self) -> None:
        url = self.url_var.get().strip()
        if not url:
            messagebox.showwarning("Missing URL", "Type a URL.", parent=self)
            return
        # Be friendly: prepend https:// if the user just typed a domain.
        if not re.match(r"^[a-zA-Z][a-zA-Z0-9+\-.]*:", url):
            url = "https://" + url
        self.result = (url, self.text_var.get().strip())
        self.destroy()

    def _on_cancel(self) -> None:
        self.result = None
        self.destroy()

    @classmethod
    def ask(cls, parent: ctk.CTk, prefilled_text: str = "") -> tuple[str, str] | None:
        dialog = cls(parent, prefilled_text=prefilled_text)
        parent.wait_window(dialog)
        return dialog.result


class HtmlPreviewDialog(ctk.CTkToplevel):
    """Pop-up window that renders the HTML body the way Outlook will.

    Uses ``tkhtmlview`` if available; falls back to a plain-text view of
    the raw HTML otherwise.
    """

    def __init__(
        self,
        parent: ctk.CTk,
        html_body: str,
        inline_images: dict[str, str],
    ) -> None:
        super().__init__(parent)
        self.title("HTML preview")
        self.geometry("780x560")
        self.transient(parent)

        ctk.CTkLabel(
            self,
            text="Preview (best-effort — Outlook's exact rendering may differ slightly):",
            font=ctk.CTkFont(size=12, weight="bold"),
        ).pack(anchor="w", padx=14, pady=(12, 4))

        # Replace cid: references with absolute file paths so the
        # preview renderer can actually display them. Inline images
        # won't load on the recipient side until Outlook embeds them
        # at send time, but for the preview we map cid:foo -> file://...
        # Sort by CID length descending so e.g. ``cid:img10`` is
        # rewritten before ``cid:img1`` (otherwise the shorter prefix
        # would corrupt the longer one).
        rewritten = html_body
        for cid, path in sorted(
            inline_images.items(),
            key=lambda item: len(item[0]),
            reverse=True,
        ):
            rewritten = rewritten.replace(
                f"cid:{cid}",
                Path(path).resolve().as_uri(),
            )

        try:
            from tkhtmlview import HTMLScrolledText  # type: ignore[import-not-found]

            view = HTMLScrolledText(self, html=rewritten)
            view.pack(fill="both", expand=True, padx=14, pady=(0, 8))
            view.set_html(rewritten)
        except ImportError:
            note = ctk.CTkLabel(
                self,
                text=(
                    "tkhtmlview is not installed — falling back to a raw "
                    "HTML view. Install it with: pip install tkhtmlview"
                ),
                text_color=("gray45", "gray70"),
                wraplength=720,
                justify="left",
            )
            note.pack(anchor="w", padx=14, pady=(0, 4))
            text = ctk.CTkTextbox(self, font=ctk.CTkFont(family="Consolas", size=12))
            text.pack(fill="both", expand=True, padx=14, pady=(0, 8))
            text.insert("1.0", rewritten)
            text.configure(state="disabled")

        ctk.CTkButton(
            self,
            text="Close",
            command=self.destroy,
            width=110,
        ).pack(side="right", padx=14, pady=(0, 14))


class ExcelColumnPicker(ctk.CTkToplevel):
    """Dialog asking the user to pick a sheet + email column + subject column.

    The radio button labels show the column letter, the detected
    header (row 1), and a small preview of the first few values so
    the user can tell columns apart even when row 1 is unhelpful.
    """

    def __init__(self, parent: ctk.CTk, summaries: list[SheetSummary]) -> None:
        super().__init__(parent)
        self.title("Pick email + subject columns")
        self.geometry("720x560")
        self.minsize(640, 480)
        self.transient(parent)
        self.result: tuple[str, str, str | None] | None = None
        self._summaries: dict[str, SheetSummary] = {s.name: s for s in summaries if s.columns}
        self._email_var = ctk.StringVar()
        self._subject_var = ctk.StringVar(value="")  # "" = no subject column
        self._email_radios: list[ctk.CTkRadioButton] = []
        self._subject_radios: list[ctk.CTkRadioButton] = []

        ctk.CTkLabel(
            self,
            text="Sheet:",
            font=ctk.CTkFont(size=13, weight="bold"),
        ).pack(anchor="w", padx=14, pady=(12, 2))
        sheet_names = list(self._summaries.keys())
        initial_sheet = sheet_names[0] if sheet_names else ""
        # Prefer the first sheet that already has a suggested email
        # column (i.e. some column with email-like values in it).
        for name, summary in self._summaries.items():
            if summary.suggested_email_column:
                initial_sheet = name
                break
        self._sheet_var = ctk.StringVar(value=initial_sheet)
        sheet_menu = ctk.CTkOptionMenu(
            self,
            values=sheet_names or [""],
            variable=self._sheet_var,
            command=lambda _v: self._populate_columns(),
        )
        sheet_menu.pack(anchor="w", padx=14)

        body = ctk.CTkFrame(self, fg_color="transparent")
        body.pack(fill="both", expand=True, padx=14, pady=(10, 0))

        # Two scrollable columns side-by-side: email picker and subject picker.
        left = ctk.CTkFrame(body)
        left.pack(side="left", fill="both", expand=True, padx=(0, 6))
        ctk.CTkLabel(
            left,
            text="Which column has the EMAIL addresses?",
            font=ctk.CTkFont(size=13, weight="bold"),
        ).pack(anchor="w", padx=10, pady=(8, 2))
        self._email_scroll = ctk.CTkScrollableFrame(left)
        self._email_scroll.pack(fill="both", expand=True, padx=6, pady=(0, 8))

        right = ctk.CTkFrame(body)
        right.pack(side="left", fill="both", expand=True, padx=(6, 0))
        ctk.CTkLabel(
            right,
            text="Which column has the SUBJECT for each row?",
            font=ctk.CTkFont(size=13, weight="bold"),
        ).pack(anchor="w", padx=10, pady=(8, 2))
        self._subject_scroll = ctk.CTkScrollableFrame(right)
        self._subject_scroll.pack(fill="both", expand=True, padx=6, pady=(0, 8))

        bar = ctk.CTkFrame(self, fg_color="transparent")
        bar.pack(fill="x", padx=14, pady=(8, 14))
        ctk.CTkButton(bar, text="Import", command=self._on_ok, width=120).pack(
            side="right", padx=(6, 0)
        )
        ctk.CTkButton(
            bar,
            text="Cancel",
            command=self._on_cancel,
            width=120,
            fg_color="transparent",
            border_width=1,
        ).pack(side="right")

        self.protocol("WM_DELETE_WINDOW", self._on_cancel)
        self.bind("<Escape>", lambda _e: self._on_cancel())
        self.after(50, self._grab)
        self._populate_columns()

    def _grab(self) -> None:
        try:
            self.grab_set()
        except tk.TclError:
            pass

    def _populate_columns(self) -> None:
        for widgets, _ in (
            (self._email_radios, self._email_scroll),
            (self._subject_radios, self._subject_scroll),
        ):
            for w in widgets:
                w.destroy()
        self._email_radios.clear()
        self._subject_radios.clear()

        sheet = self._summaries.get(self._sheet_var.get())
        if not sheet:
            return

        # "(none)" radio for the subject column.
        none_radio = ctk.CTkRadioButton(
            self._subject_scroll,
            text="(none — don't use per-recipient subjects from this file)",
            variable=self._subject_var,
            value="",
        )
        none_radio.pack(anchor="w", padx=4, pady=2)
        self._subject_radios.append(none_radio)

        suggested_email = sheet.suggested_email_column or (
            sheet.columns[0].letter if sheet.columns else ""
        )
        # If the auto-suggested email column is the same as the
        # currently selected subject column, blank the subject so
        # we don't end up with both pointing at the same data.
        if self._email_var.get() not in {c.letter for c in sheet.columns}:
            self._email_var.set(suggested_email)

        for col in sheet.columns:
            preview = ", ".join(col.preview[:3])
            if len(preview) > 70:
                preview = preview[:70] + "…"
            label = f"{col.letter}  —  {col.header}"
            if preview:
                label += f"\n     e.g. {preview}"
            email_radio = ctk.CTkRadioButton(
                self._email_scroll,
                text=label,
                variable=self._email_var,
                value=col.letter,
            )
            email_radio.pack(anchor="w", padx=4, pady=2)
            self._email_radios.append(email_radio)

            subject_radio = ctk.CTkRadioButton(
                self._subject_scroll,
                text=label,
                variable=self._subject_var,
                value=col.letter,
            )
            subject_radio.pack(anchor="w", padx=4, pady=2)
            self._subject_radios.append(subject_radio)

    def _on_ok(self) -> None:
        sheet = self._sheet_var.get()
        email_col = self._email_var.get()
        subject_col = self._subject_var.get() or None
        if not sheet or not email_col:
            messagebox.showwarning(
                "Missing column",
                "Pick a sheet and an email column before importing.",
                parent=self,
            )
            return
        if subject_col and subject_col == email_col:
            messagebox.showwarning(
                "Same column",
                "Email and subject can't be the same column.",
                parent=self,
            )
            return
        self.result = (sheet, email_col, subject_col)
        self.destroy()

    def _on_cancel(self) -> None:
        self.result = None
        self.destroy()

    @classmethod
    def ask(
        cls,
        parent: ctk.CTk,
        summaries: list[SheetSummary],
    ) -> tuple[str, str, str | None] | None:
        dialog = cls(parent, summaries=summaries)
        parent.wait_window(dialog)
        return dialog.result


class BulkEmailerApp(ctk.CTk):
    def __init__(self) -> None:
        super().__init__()
        self.title(f"{APP_TITLE} v{APP_VERSION}")
        self.geometry("980x820")
        self.minsize(900, 720)

        self.state_data = storage.load()
        settings = self.state_data["settings"]

        ctk.set_appearance_mode(settings.get("theme", "system"))
        ctk.set_default_color_theme("blue")

        self._sending_lock = threading.Lock()
        self._attachments: list[str] = []
        self._outlook_accounts: list[OutlookAccount] = []
        self._mode_buttons: dict[str, ctk.CTkButton] = {}
        # Inline images registered via the "🖼️ Image" toolbar button.
        # Keyed by the auto-generated CID; value is the absolute path on
        # disk. Only those whose CID still appears in the body at send
        # time are actually attached.
        self._inline_images: dict[str, str] = {}
        self._next_cid = 1
        # Map of lowercased recipient email -> per-recipient subject,
        # populated when the user imports an Excel file with the
        # "Use subjects from Excel" toggle on. Cleared when they
        # clear recipients or import without the toggle.
        self._excel_subjects: dict[str, str] = {}

        self._build_ui()
        self._apply_initial_settings()
        self._refresh_outlook_accounts(quiet=True)

        self.protocol("WM_DELETE_WINDOW", self._on_close)

    # ------------------------------------------------------------------
    # UI construction
    # ------------------------------------------------------------------
    def _build_ui(self) -> None:
        outer = ctk.CTkFrame(self, fg_color="transparent")
        outer.pack(fill="both", expand=True, padx=14, pady=14)

        self._build_header(outer)

        scrollable = ctk.CTkScrollableFrame(outer, fg_color="transparent")
        scrollable.pack(fill="both", expand=True, pady=(8, 0))

        self._build_sender_section(scrollable)
        self._build_recipients_section(scrollable)
        self._build_priority_section(scrollable)
        self._build_subject_section(scrollable)
        self._build_body_section(scrollable)
        self._build_attachments_section(scrollable)
        self._build_schedule_section(scrollable)
        self._build_actions_section(outer)
        self._build_log_section(outer)

    def _build_header(self, parent: ctk.CTkFrame) -> None:
        header = ctk.CTkFrame(parent, fg_color="transparent")
        header.pack(fill="x")
        title_block = ctk.CTkFrame(header, fg_color="transparent")
        title_block.pack(side="left")
        ctk.CTkLabel(
            title_block,
            text=APP_TITLE,
            font=ctk.CTkFont(size=24, weight="bold"),
        ).pack(anchor="w")
        ctk.CTkLabel(
            title_block,
            text=f"v{APP_VERSION} · sends through your local Outlook desktop",
            text_color=("gray40", "gray70"),
            font=ctk.CTkFont(size=12),
        ).pack(anchor="w")

        right = ctk.CTkFrame(header, fg_color="transparent")
        right.pack(side="right")
        ctk.CTkLabel(right, text="Theme:").pack(side="left", padx=(0, 6))
        self.theme_var = ctk.StringVar(value=self.state_data["settings"].get("theme", "system"))
        theme_menu = ctk.CTkOptionMenu(
            right,
            values=["light", "dark", "system"],
            variable=self.theme_var,
            command=self._on_theme_change,
            width=110,
        )
        theme_menu.pack(side="left")

    def _section(self, parent: ctk.CTkFrame, title: str, *, hint: str = "") -> ctk.CTkFrame:
        wrapper = ctk.CTkFrame(parent)
        wrapper.pack(fill="x", pady=6, padx=2)
        ctk.CTkLabel(
            wrapper,
            text=title,
            font=ctk.CTkFont(size=15, weight="bold"),
        ).pack(anchor="w", padx=14, pady=(12, 2))
        if hint:
            ctk.CTkLabel(
                wrapper,
                text=hint,
                text_color=("gray40", "gray70"),
                wraplength=900,
                justify="left",
                font=ctk.CTkFont(size=12),
            ).pack(anchor="w", padx=14)
        body = ctk.CTkFrame(wrapper, fg_color="transparent")
        body.pack(fill="x", padx=14, pady=(8, 12))
        return body

    # -- Sender (Outlook account) ------------------------------------
    def _build_sender_section(self, parent: ctk.CTkFrame) -> None:
        body = self._section(
            parent,
            "1. Sending account",
            hint=(
                "Sends through your locally-installed Outlook. No password "
                "required. Pick which Outlook account to send from, or leave "
                "on Default to use whichever account Outlook itself is set to."
            ),
        )

        row = ctk.CTkFrame(body, fg_color="transparent")
        row.pack(fill="x")
        ctk.CTkLabel(row, text="From account:").pack(side="left", padx=(0, 6))
        self.account_combo = ttk.Combobox(row, values=["Default"], state="readonly", width=60)
        self.account_combo.pack(side="left", fill="x", expand=True)
        ctk.CTkButton(
            row,
            text="Refresh",
            command=lambda: self._refresh_outlook_accounts(quiet=False),
            width=90,
            fg_color="transparent",
            border_width=1,
        ).pack(side="left", padx=6)

    def _refresh_outlook_accounts(self, *, quiet: bool) -> None:
        try:
            self._outlook_accounts = list_accounts()
        except OutlookUnavailableError as exc:
            self._outlook_accounts = []
            self.account_combo.configure(values=["Default (Outlook not detected)"])
            self.account_combo.set("Default (Outlook not detected)")
            if not quiet:
                messagebox.showerror("Outlook not available", str(exc))
            self._log(f"Outlook unavailable: {exc}")
            return

        labels = ["Default"] + [str(a) for a in self._outlook_accounts]
        self.account_combo.configure(values=labels)

        target_smtp = self.state_data["settings"].get("account_smtp", "")
        chosen = "Default"
        if target_smtp:
            for account, label in zip(self._outlook_accounts, labels[1:]):
                if account.smtp_address.lower() == target_smtp.lower():
                    chosen = label
                    break
        self.account_combo.set(chosen)
        self._log(f"Detected {len(self._outlook_accounts)} Outlook account(s)")

    def _selected_account_smtp(self) -> str:
        label = self.account_combo.get()
        if not label or label.startswith("Default"):
            return ""
        for account in self._outlook_accounts:
            if str(account) == label:
                return account.smtp_address
        return ""

    # -- Recipients ---------------------------------------------------
    def _build_recipients_section(self, parent: ctk.CTkFrame) -> None:
        body = self._section(
            parent,
            "2. Recipients & send mode",
            hint=(
                "Paste email addresses (any separator) or import them from an "
                "Excel file. Pick how the program should send them."
            ),
        )

        self.recipients_text = ctk.CTkTextbox(body, height=110)
        self.recipients_text.pack(fill="x", pady=(0, 6))
        self.recipients_text.bind("<<Modified>>", self._on_recipients_modified)
        self.recipients_text.bind("<KeyRelease>", lambda _e: self._refresh_recipient_count())

        controls = ctk.CTkFrame(body, fg_color="transparent")
        controls.pack(fill="x")
        ctk.CTkButton(
            controls,
            text="Import from Excel…",
            command=self._on_import_excel,
        ).pack(side="left")
        self.recipient_count_label = ctk.CTkLabel(controls, text="0 recipients")
        self.recipient_count_label.pack(side="left", padx=12)
        ctk.CTkButton(
            controls,
            text="Refresh count",
            command=self._refresh_recipient_count,
            fg_color="transparent",
            border_width=1,
        ).pack(side="left")
        ctk.CTkButton(
            controls,
            text="Clear",
            command=self._on_clear_recipients,
            fg_color="transparent",
            border_width=1,
        ).pack(side="left", padx=6)

        # Toggle: when on, the next Excel import asks the user to pick
        # an email column AND a subject column. Each recipient is then
        # sent with the subject from their row.
        excel_subject_row = ctk.CTkFrame(body, fg_color="transparent")
        excel_subject_row.pack(fill="x", pady=(8, 0))
        self.use_excel_subjects_var = ctk.BooleanVar(
            value=bool(
                self.state_data["settings"].get("use_excel_subjects", False)
            )
        )
        ctk.CTkSwitch(
            excel_subject_row,
            text="Use subjects from Excel (per-recipient)",
            variable=self.use_excel_subjects_var,
            command=self._on_use_excel_subjects_toggled,
        ).pack(side="left")
        self.excel_subjects_status = ctk.CTkLabel(
            excel_subject_row,
            text="",
            text_color=("gray35", "gray70"),
            font=ctk.CTkFont(size=12),
        )
        self.excel_subjects_status.pack(side="left", padx=10)
        self._refresh_excel_subjects_status()

        # Send mode as segmented buttons.
        mode_row = ctk.CTkFrame(body, fg_color="transparent")
        mode_row.pack(fill="x", pady=(12, 0))
        ctk.CTkLabel(mode_row, text="Send mode:").pack(side="left", padx=(0, 10))

        initial_mode = self.state_data["settings"].get("send_mode", "individual")
        if initial_mode not in {key for key, _ in SEND_MODES}:
            initial_mode = "individual"
        self.send_mode_var = ctk.StringVar(value=initial_mode)
        for key, label in SEND_MODES:
            btn = ctk.CTkButton(
                mode_row,
                text=label,
                width=200,
                command=lambda k=key: self._set_mode(k),
            )
            btn.pack(side="left", padx=4)
            self._mode_buttons[key] = btn

        self.mode_hint_label = ctk.CTkLabel(
            body,
            text="",
            text_color=("gray35", "gray70"),
            wraplength=900,
            justify="left",
            font=ctk.CTkFont(size=12),
        )
        self.mode_hint_label.pack(anchor="w", pady=(8, 0))

        self._set_mode(initial_mode)

    def _set_mode(self, mode: str) -> None:
        self.send_mode_var.set(mode)
        for key, button in self._mode_buttons.items():
            if key == mode:
                button.configure(
                    fg_color=("#1f6aa5", "#1f6aa5"),
                    text_color="white",
                    border_width=0,
                )
            else:
                button.configure(
                    fg_color="transparent",
                    text_color=("gray20", "gray85"),
                    border_width=1,
                )
        hints = {
            "individual": (
                "One email per recipient. Recipients will NOT see each other "
                "(recommended for marketing)."
            ),
            "cc": (
                "ONE email — first recipient goes in 'To', everyone else in "
                "CC. All recipients see each other."
            ),
            "auto": (
                "Group recipients by company (the part after @). For each "
                "company group, the priority address (e.g. purchasing@…) "
                "goes in 'To' and the rest go in CC. If no priority keyword "
                "matches, the first email in the group becomes 'To' so the "
                "company still gets one combined send. Singletons and "
                "personal-mail domains are sent individually."
            ),
        }
        self.mode_hint_label.configure(text=hints.get(mode, ""))
        self._refresh_priority_section_visibility()
        self._refresh_preview()

    def _on_recipients_modified(self, _event: object) -> None:
        try:
            self.recipients_text.edit_modified(False)
        except tk.TclError:
            return
        self._refresh_recipient_count()
        self._refresh_preview()

    def _on_import_excel(self) -> None:
        path = filedialog.askopenfilename(
            title="Choose Excel file",
            filetypes=[("Excel files", "*.xlsx"), ("All files", "*.*")],
        )
        if not path:
            return
        if self.use_excel_subjects_var.get():
            self._import_excel_with_subjects(path)
        else:
            self._import_excel_emails_only(path)

    def _import_excel_emails_only(self, path: str) -> None:
        try:
            emails = extract_emails(path)
        except Exception as exc:  # pragma: no cover - GUI path
            messagebox.showerror("Import failed", f"Could not read file:\n{exc}")
            return
        if not emails:
            messagebox.showinfo("No emails found", "No email addresses were found in that file.")
            return
        self._merge_imported_emails(emails)
        self._log(f"Imported {len(emails)} email address(es) from {path}")

    def _import_excel_with_subjects(self, path: str) -> None:
        try:
            summaries = inspect_workbook(path)
        except Exception as exc:  # pragma: no cover - GUI path
            messagebox.showerror("Import failed", f"Could not read file:\n{exc}")
            return
        if not summaries or all(not s.columns for s in summaries):
            messagebox.showinfo(
                "Empty workbook",
                "That Excel file doesn't seem to have any data.",
            )
            return
        choice = ExcelColumnPicker.ask(self, summaries=summaries)
        if not choice:
            return
        sheet_name, email_col, subject_col = choice
        try:
            pairs = extract_email_subject_pairs(
                path,
                sheet_name=sheet_name,
                email_column=email_col,
                subject_column=subject_col,
            )
        except Exception as exc:  # pragma: no cover - GUI path
            messagebox.showerror("Import failed", f"Could not read file:\n{exc}")
            return
        if not pairs:
            messagebox.showinfo(
                "No emails found",
                f"No email addresses were found in column {email_col} on sheet "
                f"'{sheet_name}'.",
            )
            return

        # Update the per-recipient subject map, then merge the emails
        # into the recipients textbox just like the simpler flow.
        with_subjects = 0
        for email, subject in pairs:
            if subject:
                self._excel_subjects[email.lower()] = subject
                with_subjects += 1
        emails = [email for email, _ in pairs]
        self._merge_imported_emails(emails)
        self._refresh_excel_subjects_status()
        self._refresh_subject_section_banner()
        self._log(
            f"Imported {len(emails)} email(s) from sheet '{sheet_name}' "
            f"(column {email_col}); {with_subjects} have a per-recipient "
            f"subject (column {subject_col or 'none'})."
        )

    def _merge_imported_emails(self, emails: list[str]) -> None:
        existing = self.recipients_text.get("1.0", "end").strip()
        new_block = "\n".join(emails)
        merged = f"{existing}\n{new_block}" if existing else new_block
        self.recipients_text.delete("1.0", "end")
        self.recipients_text.insert("1.0", merged)
        self._refresh_recipient_count()
        self._refresh_preview()

    def _on_clear_recipients(self) -> None:
        self.recipients_text.delete("1.0", "end")
        # Also drop any per-recipient Excel subjects — they were tied
        # to the previous import and would be confusing if a different
        # paste/import comes next.
        self._excel_subjects.clear()
        self._refresh_excel_subjects_status()
        if hasattr(self, "subject_section_status_label"):
            self._refresh_subject_section_banner()
        self._refresh_recipient_count()
        self._refresh_preview()

    def _on_use_excel_subjects_toggled(self) -> None:
        self.state_data["settings"]["use_excel_subjects"] = bool(
            self.use_excel_subjects_var.get()
        )
        storage.save(self.state_data)
        self._refresh_excel_subjects_status()
        if hasattr(self, "subject_section_status_label"):
            self._refresh_subject_section_banner()

    def _refresh_excel_subjects_status(self) -> None:
        if not hasattr(self, "excel_subjects_status"):
            return
        if not self.use_excel_subjects_var.get():
            self.excel_subjects_status.configure(
                text="(toggle off — using one shared subject for everyone)"
            )
        elif not self._excel_subjects:
            self.excel_subjects_status.configure(
                text="(import an Excel file and the program will ask which column has subjects)"
            )
        else:
            self.excel_subjects_status.configure(
                text=f"({len(self._excel_subjects)} per-recipient subject(s) loaded)"
            )

    def _refresh_recipient_count(self) -> None:
        emails = _parse_recipients(self.recipients_text.get("1.0", "end"))
        self.recipient_count_label.configure(text=f"{len(emails)} recipient(s)")

    # -- Priority keywords + Auto preview ----------------------------
    def _build_priority_section(self, parent: ctk.CTkFrame) -> None:
        self.priority_section_wrapper = ctk.CTkFrame(parent)
        self.priority_section_wrapper.pack(fill="x", pady=6, padx=2)
        ctk.CTkLabel(
            self.priority_section_wrapper,
            text="2b. Priority keywords (Auto mode)",
            font=ctk.CTkFont(size=15, weight="bold"),
        ).pack(anchor="w", padx=14, pady=(12, 2))
        ctk.CTkLabel(
            self.priority_section_wrapper,
            text=(
                "When grouping by company in Auto mode, an address whose local "
                "part starts with one of these keywords (case-insensitive) goes "
                "in the 'To' field. The rest of the company group goes in CC. "
                "Order matters: earlier keywords win over later ones. "
                "If no keyword matches, the first email in the group is used "
                "as 'To' so each company still gets a single merged send."
            ),
            text_color=("gray40", "gray70"),
            wraplength=900,
            justify="left",
            font=ctk.CTkFont(size=12),
        ).pack(anchor="w", padx=14)

        body = ctk.CTkFrame(self.priority_section_wrapper, fg_color="transparent")
        body.pack(fill="x", padx=14, pady=(8, 12))

        chips_row_outer = ctk.CTkFrame(body, fg_color="transparent")
        chips_row_outer.pack(fill="x")
        ctk.CTkLabel(chips_row_outer, text="Keywords:").pack(side="left", padx=(0, 6))
        self.keyword_chips_frame = ctk.CTkFrame(chips_row_outer, fg_color="transparent")
        self.keyword_chips_frame.pack(side="left", fill="x", expand=True)

        add_row = ctk.CTkFrame(body, fg_color="transparent")
        add_row.pack(fill="x", pady=(8, 0))
        ctk.CTkLabel(add_row, text="Add keyword:").pack(side="left", padx=(0, 6))
        self.new_keyword_var = ctk.StringVar()
        entry = ctk.CTkEntry(add_row, textvariable=self.new_keyword_var, width=200)
        entry.pack(side="left")
        entry.bind("<Return>", lambda _e: self._on_add_keyword())
        ctk.CTkButton(
            add_row,
            text="+ Add",
            command=self._on_add_keyword,
            width=80,
        ).pack(side="left", padx=6)
        ctk.CTkButton(
            add_row,
            text="Reset to defaults",
            command=self._on_reset_keywords,
            width=140,
            fg_color="transparent",
            border_width=1,
        ).pack(side="left", padx=6)

        # Live preview pane for Auto mode.
        preview_label = ctk.CTkLabel(
            body,
            text="Auto-mode preview:",
            font=ctk.CTkFont(size=13, weight="bold"),
        )
        preview_label.pack(anchor="w", pady=(12, 4))
        self.auto_preview_text = ctk.CTkTextbox(body, height=140)
        self.auto_preview_text.pack(fill="x")
        self.auto_preview_text.configure(state="disabled")

        self._render_keyword_chips()

    def _refresh_priority_section_visibility(self) -> None:
        if not hasattr(self, "priority_section_wrapper"):
            return
        if self.send_mode_var.get() == "auto":
            # Re-pack BEFORE the subject section if we know it, so toggling
            # the visibility doesn't push the section to the end of the
            # parent's pack order.
            kwargs: dict = {"fill": "x", "pady": 6, "padx": 2}
            anchor = getattr(self, "_subject_section_wrapper", None)
            if anchor is not None and anchor.winfo_exists():
                kwargs["before"] = anchor
            self.priority_section_wrapper.pack(**kwargs)
        else:
            self.priority_section_wrapper.pack_forget()

    def _render_keyword_chips(self) -> None:
        for child in self.keyword_chips_frame.winfo_children():
            child.destroy()
        keywords = self.state_data.get("priority_keywords", [])
        if not keywords:
            ctk.CTkLabel(
                self.keyword_chips_frame,
                text=(
                    "(none — Auto mode will still group company emails, "
                    "but the first email in each group becomes 'To')"
                ),
                text_color=("gray40", "gray70"),
            ).pack(side="left")
            return
        for index, keyword in enumerate(keywords):
            chip = ctk.CTkFrame(
                self.keyword_chips_frame,
                fg_color=("gray85", "gray25"),
                corner_radius=12,
            )
            chip.pack(side="left", padx=3, pady=2)
            ctk.CTkLabel(
                chip,
                text=f"{index + 1}. {keyword}",
                padx=4,
            ).pack(side="left", padx=(8, 2), pady=2)
            ctk.CTkButton(
                chip,
                text="✕",
                width=24,
                height=22,
                fg_color="transparent",
                hover_color=("gray70", "gray35"),
                command=lambda k=keyword: self._on_remove_keyword(k),
            ).pack(side="left", padx=(0, 4), pady=2)

    def _on_add_keyword(self) -> None:
        value = self.new_keyword_var.get().strip()
        if not value:
            return
        # Strip an "@" suffix if the user typed e.g. "purchasing@".
        value = value.rstrip("@").strip()
        if not value:
            return
        existing_lc = {k.lower() for k in self.state_data.get("priority_keywords", [])}
        if value.lower() in existing_lc:
            messagebox.showinfo("Already added", f"'{value}' is already in the list.")
            return
        self.state_data.setdefault("priority_keywords", []).append(value)
        storage.save(self.state_data)
        self.new_keyword_var.set("")
        self._render_keyword_chips()
        self._refresh_preview()
        self._log(f"Added priority keyword: {value}")

    def _on_remove_keyword(self, keyword: str) -> None:
        keywords = self.state_data.get("priority_keywords", [])
        if keyword in keywords:
            keywords.remove(keyword)
            storage.save(self.state_data)
            self._render_keyword_chips()
            self._refresh_preview()
            self._log(f"Removed priority keyword: {keyword}")

    def _on_reset_keywords(self) -> None:
        if not messagebox.askyesno(
            "Reset keywords",
            "Reset the priority keyword list to the defaults "
            f"({', '.join(storage.DEFAULT_PRIORITY_KEYWORDS)})?",
        ):
            return
        self.state_data["priority_keywords"] = list(storage.DEFAULT_PRIORITY_KEYWORDS)
        storage.save(self.state_data)
        self._render_keyword_chips()
        self._refresh_preview()

    def _refresh_preview(self) -> None:
        if not hasattr(self, "auto_preview_text"):
            return
        recipients = _parse_recipients(self.recipients_text.get("1.0", "end"))
        envelopes = build_envelopes(
            recipients,
            "auto",
            self.state_data.get("priority_keywords", []),
        )
        text = describe_envelopes(envelopes) if recipients else "(no recipients)"
        self.auto_preview_text.configure(state="normal")
        self.auto_preview_text.delete("1.0", "end")
        self.auto_preview_text.insert("1.0", text)
        self.auto_preview_text.configure(state="disabled")

    # -- Subject ------------------------------------------------------
    def _build_subject_section(self, parent: ctk.CTkFrame) -> None:
        body = self._section(
            parent,
            "3. Subject",
            hint="Pick a saved subject from the list, or click '+ New' to add one.",
        )
        # Remember the section's outer wrapper so the priority section
        # can re-insert itself directly above it when the user toggles
        # back to Auto mode.
        self._subject_section_wrapper = body.master

        row = ctk.CTkFrame(body, fg_color="transparent")
        row.pack(fill="x")
        ctk.CTkLabel(row, text="Preset:").pack(side="left", padx=(0, 6))

        self.subject_combo = ttk.Combobox(
            row,
            values=self.state_data["subjects"],
            state="readonly",
            width=50,
        )
        self.subject_combo.pack(side="left", fill="x", expand=True)
        self.subject_combo.bind("<<ComboboxSelected>>", self._on_subject_preset_pick)

        ctk.CTkButton(
            row, text="+ New", command=self._new_subject_preset, width=80
        ).pack(side="left", padx=(6, 4))
        ctk.CTkButton(
            row, text="Save edits", command=self._save_subject_preset, width=100,
            fg_color="transparent", border_width=1,
        ).pack(side="left", padx=(0, 4))
        ctk.CTkButton(
            row,
            text="Delete",
            command=self._delete_subject_preset,
            width=80,
            fg_color="transparent",
            border_width=1,
        ).pack(side="left")

        self.subject_var = ctk.StringVar(value="")
        ctk.CTkEntry(body, textvariable=self.subject_var).pack(fill="x", pady=(8, 0))

        # Banner shown when "Use subjects from Excel" is on. Tells the
        # user that the subject they type here is now a fallback for
        # any recipient that didn't have a subject in the imported
        # file (or for CC/Auto envelopes that pool many recipients
        # into one message).
        self.subject_section_status_label = ctk.CTkLabel(
            body,
            text="",
            text_color=("gray35", "gray70"),
            wraplength=900,
            justify="left",
            font=ctk.CTkFont(size=12),
        )
        self.subject_section_status_label.pack(anchor="w", pady=(6, 0))
        self._refresh_subject_section_banner()

    def _refresh_subject_section_banner(self) -> None:
        if not hasattr(self, "subject_section_status_label"):
            return
        if self.use_excel_subjects_var.get():
            n = len(self._excel_subjects)
            if n:
                msg = (
                    f"\u2139\ufe0f  {n} per-recipient subject(s) loaded from "
                    f"Excel \u2014 each recipient will get their own subject. "
                    f"The subject above is the fallback for recipients "
                    f"without one (and for CC/Auto envelopes)."
                )
            else:
                msg = (
                    "\u2139\ufe0f  'Use subjects from Excel' is on, but no "
                    "Excel file with a subject column has been imported "
                    "yet. The subject above will be used for everyone."
                )
        else:
            msg = ""
        self.subject_section_status_label.configure(text=msg)

    def _on_subject_preset_pick(self, _event: object) -> None:
        value = self.subject_combo.get()
        if value:
            self.subject_var.set(value)

    def _new_subject_preset(self) -> None:
        value = PresetDialog.ask(
            self,
            title="New subject preset",
            prompt="Subject:",
            multiline=False,
            initial=self.subject_var.get(),
        )
        if not value:
            return
        if value in self.state_data["subjects"]:
            messagebox.showinfo("Already saved", "That subject is already in the list.")
        else:
            self.state_data["subjects"].append(value)
            storage.save(self.state_data)
            self.subject_combo.configure(values=self.state_data["subjects"])
            self._log(f"Added subject preset: {value}")
        self.subject_combo.set(value)
        self.subject_var.set(value)

    def _save_subject_preset(self) -> None:
        value = self.subject_var.get().strip()
        if not value:
            messagebox.showwarning("Empty subject", "Type the subject first.")
            return
        if value in self.state_data["subjects"]:
            messagebox.showinfo("Already saved", "That subject is already in the preset list.")
            return
        self.state_data["subjects"].append(value)
        storage.save(self.state_data)
        self.subject_combo.configure(values=self.state_data["subjects"])
        self.subject_combo.set(value)
        self._log(f"Saved subject preset: {value}")

    def _delete_subject_preset(self) -> None:
        value = self.subject_combo.get()
        if not value:
            return
        if value not in self.state_data["subjects"]:
            return
        if not messagebox.askyesno("Delete preset", f"Delete subject preset:\n\n{value}"):
            return
        self.state_data["subjects"].remove(value)
        storage.save(self.state_data)
        self.subject_combo.configure(values=self.state_data["subjects"])
        self.subject_combo.set("")

    # -- Body ---------------------------------------------------------
    def _build_body_section(self, parent: ctk.CTkFrame) -> None:
        body = self._section(
            parent,
            "4. Body",
            hint=(
                "Pick a saved body, or click '+ New' to add one. Use the "
                "Format toolbar below to add bold/italic/colour/links/images."
            ),
        )

        row = ctk.CTkFrame(body, fg_color="transparent")
        row.pack(fill="x")
        ctk.CTkLabel(row, text="Preset:").pack(side="left", padx=(0, 6))

        self.body_combo = ttk.Combobox(
            row,
            values=self._body_preview_values(),
            state="readonly",
            width=50,
        )
        self.body_combo.pack(side="left", fill="x", expand=True)
        self.body_combo.bind("<<ComboboxSelected>>", self._on_body_preset_pick)

        ctk.CTkButton(
            row, text="+ New", command=self._new_body_preset, width=80
        ).pack(side="left", padx=(6, 4))
        ctk.CTkButton(
            row, text="Save edits", command=self._save_body_preset, width=100,
            fg_color="transparent", border_width=1,
        ).pack(side="left", padx=(0, 4))
        ctk.CTkButton(
            row,
            text="Delete",
            command=self._delete_body_preset,
            width=80,
            fg_color="transparent",
            border_width=1,
        ).pack(side="left")

        # Format toolbar: B / I / U / 🎨 Color / 🔗 Link / 🖼 Image / 👁 Preview
        # plus an HTML/plain-text toggle on the right.
        toolbar = ctk.CTkFrame(body, fg_color=("gray90", "gray20"))
        toolbar.pack(fill="x", pady=(10, 0))

        def _tool(text: str, command, width: int = 38) -> ctk.CTkButton:
            return ctk.CTkButton(
                toolbar,
                text=text,
                width=width,
                height=30,
                command=command,
                fg_color="transparent",
                hover_color=("gray80", "gray30"),
                text_color=("gray10", "gray90"),
            )

        _tool("B", self._fmt_bold).pack(side="left", padx=(8, 2), pady=4)
        _tool("I", self._fmt_italic).pack(side="left", padx=2, pady=4)
        _tool("U", self._fmt_underline).pack(side="left", padx=2, pady=4)
        _tool("🎨 Color", self._fmt_color, width=80).pack(side="left", padx=(10, 2), pady=4)
        _tool("🔗 Link", self._insert_link, width=80).pack(side="left", padx=2, pady=4)
        _tool("🖼 Image", self._insert_image, width=90).pack(side="left", padx=2, pady=4)
        _tool("👁 Preview", self._open_html_preview, width=110).pack(side="left", padx=(10, 2), pady=4)

        self.is_html_var = ctk.BooleanVar(
            value=bool(self.state_data["settings"].get("is_html_body", True))
        )
        ctk.CTkSwitch(
            toolbar,
            text="Send as HTML",
            variable=self.is_html_var,
            command=self._on_html_mode_toggled,
        ).pack(side="right", padx=10, pady=4)

        self.body_text = ctk.CTkTextbox(body, height=200)
        self.body_text.pack(fill="x", pady=(6, 0))

        # Friendly hint text underneath the editor.
        self.body_format_hint = ctk.CTkLabel(
            body,
            text="",
            text_color=("gray45", "gray65"),
            wraplength=900,
            justify="left",
            font=ctk.CTkFont(size=12),
        )
        self.body_format_hint.pack(anchor="w", pady=(4, 0))
        self._refresh_body_format_hint()

    def _refresh_body_format_hint(self) -> None:
        if not hasattr(self, "body_format_hint"):
            return
        if self.is_html_var.get():
            self.body_format_hint.configure(
                text=(
                    "HTML mode: Bold/Italic/Underline/Color wrap selected text. "
                    "Use Link/Image to insert hyperlinks and inline images. "
                    "Click 'Preview' to see how Outlook will render the message."
                )
            )
        else:
            self.body_format_hint.configure(
                text=(
                    "Plain text mode: the message will be sent without formatting. "
                    "Toolbar buttons still insert HTML markup but it will appear "
                    "as raw text in the recipient's inbox."
                )
            )

    def _on_html_mode_toggled(self) -> None:
        self.state_data["settings"]["is_html_body"] = bool(self.is_html_var.get())
        storage.save(self.state_data)
        self._refresh_body_format_hint()

    # ---- Format toolbar callbacks ------------------------------------
    def _wrap_selection(self, open_tag: str, close_tag: str) -> None:
        """Wrap the current selection in ``open_tag`` ... ``close_tag``.

        If nothing is selected, just inserts the empty pair at the
        cursor and positions the caret between them.
        """
        try:
            start = self.body_text.index("sel.first")
            end = self.body_text.index("sel.last")
            selected = self.body_text.get(start, end)
            self.body_text.delete(start, end)
            self.body_text.insert(start, f"{open_tag}{selected}{close_tag}")
        except tk.TclError:
            # No selection — insert an empty wrapper at the cursor and
            # leave the caret right between the tags.
            cursor = self.body_text.index("insert")
            self.body_text.insert(cursor, f"{open_tag}{close_tag}")
            self.body_text.mark_set(
                "insert",
                f"{cursor} + {len(open_tag)} chars",
            )
        self.body_text.focus_set()

    def _fmt_bold(self) -> None:
        self._wrap_selection("<b>", "</b>")

    def _fmt_italic(self) -> None:
        self._wrap_selection("<i>", "</i>")

    def _fmt_underline(self) -> None:
        self._wrap_selection("<u>", "</u>")

    def _fmt_color(self) -> None:
        result = colorchooser.askcolor(parent=self, title="Pick text colour")
        if not result or not result[1]:
            return
        hex_color = result[1]
        self._wrap_selection(
            f'<span style="color:{hex_color}">',
            "</span>",
        )

    def _insert_link(self) -> None:
        """Insert ``<a href="URL">text</a>`` at the cursor.

        If the user has selected text first, that text becomes the link
        text and only the URL is asked for.
        """
        try:
            start = self.body_text.index("sel.first")
            end = self.body_text.index("sel.last")
            selected_text = self.body_text.get(start, end)
        except tk.TclError:
            start = end = None
            selected_text = ""

        url = LinkDialog.ask(self, prefilled_text=selected_text)
        if not url:
            return
        href, display = url
        if not display:
            display = href
        anchor = f'<a href="{html_lib.escape(href, quote=True)}">{html_lib.escape(display)}</a>'
        if start is not None and end is not None:
            self.body_text.delete(start, end)
            self.body_text.insert(start, anchor)
        else:
            self.body_text.insert("insert", anchor)
        self.body_text.focus_set()

    def _insert_image(self) -> None:
        path = filedialog.askopenfilename(
            title="Pick an image to embed in the body",
            filetypes=[
                ("Images", "*.png *.jpg *.jpeg *.gif *.bmp *.webp"),
                ("All files", "*.*"),
            ],
        )
        if not path:
            return
        cid = f"img{self._next_cid}"
        self._next_cid += 1
        self._inline_images[cid] = str(Path(path).resolve())
        filename = html_lib.escape(Path(path).name, quote=True)
        snippet = (
            f'<img src="cid:{cid}" alt="{filename}" '
            f'style="max-width:600px;height:auto;display:block;">'
        )
        self.body_text.insert("insert", snippet)
        self.body_text.focus_set()
        self._log(f"Embedded image '{Path(path).name}' as cid:{cid}")

    def _open_html_preview(self) -> None:
        body_text = self.body_text.get("1.0", "end").rstrip()
        if not body_text:
            messagebox.showinfo("Nothing to preview", "Write a body first.")
            return
        preview = HtmlPreviewDialog(self, html_body=body_text, inline_images=self._inline_images)
        preview.focus_set()

    def _body_preview_values(self) -> list[str]:
        return [self._preview(b) for b in self.state_data["bodies"]]

    @staticmethod
    def _preview(body: str) -> str:
        first_line = body.strip().splitlines()[0] if body.strip() else "(empty)"
        return first_line[:80]

    def _on_body_preset_pick(self, _event: object) -> None:
        idx = self.body_combo.current()
        if idx < 0:
            return
        body = self.state_data["bodies"][idx]
        self.body_text.delete("1.0", "end")
        self.body_text.insert("1.0", body)

    def _new_body_preset(self) -> None:
        existing = self.body_text.get("1.0", "end").rstrip()
        value = PresetDialog.ask(
            self,
            title="New body preset",
            prompt="Body:",
            multiline=True,
            initial=existing,
        )
        if not value:
            return
        if value in self.state_data["bodies"]:
            messagebox.showinfo("Already saved", "That body is already in the list.")
        else:
            self.state_data["bodies"].append(value)
            storage.save(self.state_data)
            self.body_combo.configure(values=self._body_preview_values())
            self._log("Added body preset")
        self.body_combo.set(self._preview(value))
        self.body_text.delete("1.0", "end")
        self.body_text.insert("1.0", value)

    def _save_body_preset(self) -> None:
        value = self.body_text.get("1.0", "end").rstrip()
        if not value:
            messagebox.showwarning("Empty body", "Write the body first.")
            return
        if value in self.state_data["bodies"]:
            messagebox.showinfo("Already saved", "That body is already in the preset list.")
            return
        self.state_data["bodies"].append(value)
        storage.save(self.state_data)
        self.body_combo.configure(values=self._body_preview_values())
        self.body_combo.set(self._preview(value))
        self._log("Saved body preset")

    def _delete_body_preset(self) -> None:
        idx = self.body_combo.current()
        if idx < 0:
            return
        if not messagebox.askyesno("Delete preset", "Delete this body preset?"):
            return
        del self.state_data["bodies"][idx]
        storage.save(self.state_data)
        self.body_combo.configure(values=self._body_preview_values())
        self.body_combo.set("")

    # -- Attachments --------------------------------------------------
    def _build_attachments_section(self, parent: ctk.CTkFrame) -> None:
        body = self._section(parent, "5. Attachments")

        controls = ctk.CTkFrame(body, fg_color="transparent")
        controls.pack(fill="x")
        ctk.CTkButton(controls, text="Add files…", command=self._on_add_attachments).pack(side="left")
        ctk.CTkButton(
            controls,
            text="Remove selected",
            command=self._on_remove_attachment,
            fg_color="transparent",
            border_width=1,
        ).pack(side="left", padx=6)
        ctk.CTkButton(
            controls,
            text="Clear all",
            command=self._on_clear_attachments,
            fg_color="transparent",
            border_width=1,
        ).pack(side="left")

        self.attachment_listbox = tk.Listbox(body, height=4, activestyle="dotbox")
        self.attachment_listbox.pack(fill="x", pady=(6, 0))

    def _on_add_attachments(self) -> None:
        paths = filedialog.askopenfilenames(title="Choose attachments")
        for path in paths:
            if path not in self._attachments:
                self._attachments.append(path)
                self.attachment_listbox.insert("end", path)

    def _on_remove_attachment(self) -> None:
        for index in reversed(self.attachment_listbox.curselection()):
            self.attachment_listbox.delete(index)
            del self._attachments[index]

    def _on_clear_attachments(self) -> None:
        self._attachments.clear()
        self.attachment_listbox.delete(0, "end")

    # -- Schedule -----------------------------------------------------
    def _build_schedule_section(self, parent: ctk.CTkFrame) -> None:
        body = self._section(
            parent,
            "6. Schedule",
            hint=(
                "Outlook itself releases scheduled messages from its Outbox "
                "at the chosen time, so you can close this program afterwards "
                "— but Outlook must be running on this PC at that moment."
            ),
        )

        self.schedule_mode_var = ctk.StringVar(value="now")
        ctk.CTkRadioButton(
            body,
            text="Send now",
            variable=self.schedule_mode_var,
            value="now",
            command=self._update_schedule_state,
        ).pack(anchor="w")
        ctk.CTkRadioButton(
            body,
            text="Send at the time below (uses Outlook's deferred delivery)",
            variable=self.schedule_mode_var,
            value="later",
            command=self._update_schedule_state,
        ).pack(anchor="w", pady=(2, 6))

        time_row = ctk.CTkFrame(body, fg_color="transparent")
        time_row.pack(anchor="w")
        ctk.CTkLabel(time_row, text="Date:").pack(side="left", padx=(0, 6))
        default_dt = dt.datetime.now() + dt.timedelta(minutes=5)
        self.date_entry = DateEntry(
            time_row,
            year=default_dt.year,
            month=default_dt.month,
            day=default_dt.day,
            date_pattern="yyyy-mm-dd",
            width=12,
        )
        self.date_entry.pack(side="left")

        ctk.CTkLabel(time_row, text=" Time:").pack(side="left", padx=(12, 6))
        self.hour_var = ctk.StringVar(value=f"{default_dt.hour:02d}")
        self.minute_var = ctk.StringVar(value=f"{default_dt.minute:02d}")
        self.hour_spin = tk.Spinbox(
            time_row,
            from_=0,
            to=23,
            width=3,
            textvariable=self.hour_var,
            format="%02.0f",
            wrap=True,
        )
        self.hour_spin.pack(side="left")
        ctk.CTkLabel(time_row, text=":").pack(side="left")
        self.minute_spin = tk.Spinbox(
            time_row,
            from_=0,
            to=59,
            width=3,
            textvariable=self.minute_var,
            format="%02.0f",
            wrap=True,
        )
        self.minute_spin.pack(side="left")

        # "Wait between sends" delay applies to *both* immediate and
        # scheduled jobs (scheduled messages are simply staggered by
        # the same offset in their DeferredDeliveryTime).
        delay_row = ctk.CTkFrame(body, fg_color="transparent")
        delay_row.pack(anchor="w", pady=(10, 0))
        ctk.CTkLabel(delay_row, text="Wait between sends:").pack(side="left", padx=(0, 6))
        initial_delay = int(
            self.state_data["settings"].get("delay_between_sends_seconds", 0) or 0
        )
        self.delay_var = ctk.StringVar(value=str(initial_delay))
        self.delay_spin = tk.Spinbox(
            delay_row,
            from_=0,
            to=3600,
            increment=5,
            width=5,
            textvariable=self.delay_var,
        )
        self.delay_spin.pack(side="left")
        ctk.CTkLabel(delay_row, text="seconds (0 = no wait)").pack(side="left", padx=(6, 0))
        self.delay_var.trace_add("write", lambda *_a: self._on_delay_changed())

        self._update_schedule_state()

    def _on_delay_changed(self) -> None:
        try:
            value = max(0, int(self.delay_var.get() or "0"))
        except ValueError:
            return
        if self.state_data["settings"].get("delay_between_sends_seconds") == value:
            return
        self.state_data["settings"]["delay_between_sends_seconds"] = value
        storage.save(self.state_data)

    def _update_schedule_state(self) -> None:
        enabled = self.schedule_mode_var.get() == "later"
        state = "normal" if enabled else "disabled"
        try:
            self.date_entry.configure(state=state)
        except tk.TclError:
            pass
        self.hour_spin.configure(state=state)
        self.minute_spin.configure(state=state)

    # -- Actions ------------------------------------------------------
    def _build_actions_section(self, parent: ctk.CTkFrame) -> None:
        bar = ctk.CTkFrame(parent)
        bar.pack(fill="x", pady=(10, 0))

        self.send_button = ctk.CTkButton(
            bar,
            text="Send",
            command=self._on_send_clicked,
            font=ctk.CTkFont(size=16, weight="bold"),
            height=46,
            width=180,
        )
        self.send_button.pack(side="left", padx=12, pady=10)

        self.status_label = ctk.CTkLabel(
            bar,
            text="Idle",
            text_color=("gray30", "gray70"),
            font=ctk.CTkFont(size=13),
        )
        self.status_label.pack(side="left", padx=12)

    # -- Log ----------------------------------------------------------
    def _build_log_section(self, parent: ctk.CTkFrame) -> None:
        wrapper = ctk.CTkFrame(parent)
        wrapper.pack(fill="both", expand=False, pady=(8, 0))
        ctk.CTkLabel(
            wrapper,
            text="Activity log",
            font=ctk.CTkFont(size=13, weight="bold"),
        ).pack(anchor="w", padx=12, pady=(8, 4))
        self.log_text = ctk.CTkTextbox(wrapper, height=140)
        self.log_text.pack(fill="both", expand=True, padx=12, pady=(0, 10))
        self.log_text.configure(state="disabled")

    # ------------------------------------------------------------------
    # Behaviour
    # ------------------------------------------------------------------
    def _apply_initial_settings(self) -> None:
        if self.state_data["subjects"]:
            self.subject_combo.set(self.state_data["subjects"][0])
            self.subject_var.set(self.state_data["subjects"][0])
        if self.state_data["bodies"]:
            self.body_combo.current(0)
            self.body_text.delete("1.0", "end")
            self.body_text.insert("1.0", self.state_data["bodies"][0])
        self._refresh_recipient_count()
        self._refresh_preview()
        # Now that every section is built, apply the priority section's
        # visibility based on the persisted send mode. (During the first
        # `_set_mode` call inside `_build_recipients_section` the wrapper
        # didn't exist yet, so the visibility update was a no-op.)
        self._refresh_priority_section_visibility()

    def _on_theme_change(self, value: str) -> None:
        ctk.set_appearance_mode(value)
        self.state_data["settings"]["theme"] = value
        storage.save(self.state_data)

    def _persist_settings(self) -> None:
        s = self.state_data["settings"]
        s["account_smtp"] = self._selected_account_smtp()
        s["send_mode"] = self.send_mode_var.get()
        storage.save(self.state_data)

    # -- Send entry point --------------------------------------------
    def _on_send_clicked(self) -> None:
        self._persist_settings()
        try:
            job, scheduled = self._build_job()
        except ValueError as exc:
            messagebox.showerror("Cannot send", str(exc))
            return
        self._launch_send(job, scheduled)

    def _build_job(self) -> tuple[EmailJob, dt.datetime | None]:
        recipients = _parse_recipients(self.recipients_text.get("1.0", "end"))
        if not recipients:
            raise ValueError("Add at least one recipient email address.")

        subject = self.subject_var.get().strip()
        if not subject:
            raise ValueError("The subject is empty.")

        body_text = self.body_text.get("1.0", "end").strip()
        if not body_text:
            raise ValueError("The body is empty.")

        scheduled: dt.datetime | None = None
        if self.schedule_mode_var.get() == "later":
            scheduled = self._scheduled_datetime()
            if scheduled is None:
                raise ValueError("Pick a valid date and time.")
            if scheduled <= dt.datetime.now():
                raise ValueError("The scheduled time is in the past.")

        mode = self.send_mode_var.get()
        envelopes = build_envelopes(
            recipients,
            mode,
            self.state_data.get("priority_keywords", []),
        )
        if not envelopes:
            raise ValueError("Could not build any messages from the recipient list.")

        is_html = bool(self.is_html_var.get()) and _looks_like_html(body_text)
        if is_html:
            # Outlook's HTML renderer collapses bare newlines into a
            # single space, so a body the user typed as plain text
            # (e.g. a default preset with "Hello,\n\nWe are excited…")
            # would arrive as a single run-on line as soon as any
            # toolbar formatting is applied. Convert each \n into a
            # <br> so the visible line breaks are preserved.
            body_text = _newlines_to_br(body_text)
        # Only attach the inline images that are still referenced by a
        # ``cid:<id>`` in the current body (the user may have deleted
        # an image they previously inserted).
        used_cids = set(_CID_REGEX.findall(body_text))
        inline_images = {
            cid: path
            for cid, path in self._inline_images.items()
            if cid in used_cids
        }

        # Per-recipient subject overrides only make sense in Individual
        # mode (one recipient = one message = one subject). In CC and
        # Auto modes a single message goes to multiple recipients, so
        # there's no meaningful "per-recipient" subject — the global
        # subject is used for everyone in those modes.
        subject_overrides: dict[str, str] = {}
        if (
            mode == "individual"
            and self.use_excel_subjects_var.get()
            and self._excel_subjects
        ):
            subject_overrides = dict(self._excel_subjects)

        try:
            delay_seconds = max(0, int(self.delay_var.get() or "0"))
        except ValueError:
            delay_seconds = 0

        job = EmailJob(
            envelopes=envelopes,
            subject=subject,
            body=body_text,
            attachments=list(self._attachments),
            account_smtp=self._selected_account_smtp(),
            mode_label=mode,
            is_html=is_html,
            inline_images=inline_images,
            subject_overrides=subject_overrides,
            delay_seconds=float(delay_seconds),
        )
        return job, scheduled

    def _scheduled_datetime(self) -> dt.datetime | None:
        try:
            date_value = self.date_entry.get_date()
            hour = int(self.hour_var.get())
            minute = int(self.minute_var.get())
            return dt.datetime.combine(date_value, dt.time(hour=hour, minute=minute))
        except (ValueError, tk.TclError):
            return None

    def _launch_send(self, job: EmailJob, scheduled: dt.datetime | None) -> None:
        if not self._sending_lock.acquire(blocking=False):
            return
        self.send_button.configure(state="disabled")
        envelope_count = len(job.envelopes)
        if scheduled:
            self.status_label.configure(
                text=f"Queueing {envelope_count} message(s) for {scheduled:%Y-%m-%d %H:%M}…"
            )
            self._log(
                f"Queueing {envelope_count} message(s) with deferred delivery "
                f"for {scheduled:%Y-%m-%d %H:%M} (mode={job.mode_label})"
            )
        else:
            self.status_label.configure(text=f"Sending {envelope_count} message(s)…")
            self._log(
                f"Sending {envelope_count} message(s) (mode={job.mode_label})"
            )

        thread = threading.Thread(
            target=self._do_send, args=(job, scheduled), daemon=True
        )
        thread.start()

    def _do_send(self, job: EmailJob, scheduled: dt.datetime | None) -> None:
        try:
            sent, failed = send(
                job,
                scheduled_time=scheduled,
                progress=lambda msg: self.after(0, self._log, msg),
            )
            self.after(0, self._on_send_finished, sent, failed, scheduled, None)
        except Exception as exc:  # pragma: no cover - GUI path
            self.after(0, self._on_send_finished, 0, len(job.envelopes), scheduled, exc)
        finally:
            self._sending_lock.release()

    def _on_send_finished(
        self,
        sent: int,
        failed: int,
        scheduled: dt.datetime | None,
        error: Exception | None,
    ) -> None:
        self.send_button.configure(state="normal")
        if error is not None:
            self.status_label.configure(text="Failed")
            self._log(f"Send failed: {error}")
            messagebox.showerror("Send failed", str(error))
            return
        if scheduled is not None:
            self.status_label.configure(
                text=f"{sent} message(s) queued for {scheduled:%Y-%m-%d %H:%M}"
            )
            self._log(
                f"Queued {sent} message(s) in Outlook Outbox for "
                f"{scheduled:%Y-%m-%d %H:%M} (failed: {failed})"
            )
            messagebox.showinfo(
                "Scheduled",
                (
                    f"{sent} message(s) are sitting in Outlook's Outbox and will be "
                    f"sent at {scheduled:%Y-%m-%d %H:%M}.\n\nKeep Outlook running on "
                    "this PC so the messages can leave the Outbox at that time."
                ),
            )
            return
        self.status_label.configure(text=f"Done. Sent {sent}, failed {failed}.")
        self._log(f"Finished. Sent: {sent}, failed: {failed}")
        if failed:
            messagebox.showwarning("Some failed", f"Sent {sent}, failed {failed}. See the log.")
        else:
            messagebox.showinfo(
                "Done",
                f"Sent {sent} email(s). They should appear in Outlook's Sent Items shortly.",
            )

    # ------------------------------------------------------------------
    # Util
    # ------------------------------------------------------------------
    def _log(self, message: str) -> None:
        timestamp = dt.datetime.now().strftime("%H:%M:%S")
        self.log_text.configure(state="normal")
        self.log_text.insert("end", f"[{timestamp}] {message}\n")
        self.log_text.see("end")
        self.log_text.configure(state="disabled")

    def _on_close(self) -> None:
        self._persist_settings()
        self.destroy()


def main() -> None:
    app = BulkEmailerApp()
    app.mainloop()


if __name__ == "__main__":
    main()
