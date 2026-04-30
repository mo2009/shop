"""Bulk Outlook email sender — desktop GUI (Outlook COM backend).

A simple, single-window application for sending marketing emails through
the user's locally-installed Microsoft Outlook desktop app. Designed to
be runnable by a non-technical user.

Run on Windows: ``python main.py``
"""

from __future__ import annotations

import datetime as dt
import threading
import tkinter as tk
from tkinter import filedialog, messagebox, ttk

import customtkinter as ctk
from tkcalendar import DateEntry

import storage
from auto_mode import build_envelopes, describe_envelopes
from excel_import import EMAIL_REGEX, extract_emails
from sender import (
    EmailJob,
    OutlookAccount,
    OutlookUnavailableError,
    list_accounts,
    send,
)

APP_TITLE = "Outlook Bulk Emailer"
APP_VERSION = "2.0.0"

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
                "company, the priority address (e.g. purchasing@…) goes in "
                "'To' and the rest go in CC. Singletons and personal mail "
                "domains are sent individually."
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
        try:
            emails = extract_emails(path)
        except Exception as exc:  # pragma: no cover - GUI path
            messagebox.showerror("Import failed", f"Could not read file:\n{exc}")
            return
        if not emails:
            messagebox.showinfo("No emails found", "No email addresses were found in that file.")
            return
        existing = self.recipients_text.get("1.0", "end").strip()
        new_block = "\n".join(emails)
        merged = f"{existing}\n{new_block}" if existing else new_block
        self.recipients_text.delete("1.0", "end")
        self.recipients_text.insert("1.0", merged)
        self._refresh_recipient_count()
        self._refresh_preview()
        self._log(f"Imported {len(emails)} email address(es) from {path}")

    def _on_clear_recipients(self) -> None:
        self.recipients_text.delete("1.0", "end")
        self._refresh_recipient_count()
        self._refresh_preview()

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
                "Order matters: earlier keywords win over later ones."
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
                text="(none — Auto mode will fall back to individual sends)",
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
            hint="Pick a saved body from the list, or click '+ New' to add one.",
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

        self.body_text = ctk.CTkTextbox(body, height=180)
        self.body_text.pack(fill="x", pady=(8, 0))

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

        self._update_schedule_state()

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

        job = EmailJob(
            envelopes=envelopes,
            subject=subject,
            body=body_text,
            attachments=list(self._attachments),
            account_smtp=self._selected_account_smtp(),
            mode_label=mode,
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
