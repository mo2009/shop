"""Bulk Outlook email sender — desktop GUI.

A simple, single-window application for sending marketing emails through
an Outlook business / Office 365 account. Designed to be runnable by a
non-technical user.

Run: ``python main.py``
"""

from __future__ import annotations

import datetime as dt
import threading
import tkinter as tk
from tkinter import filedialog, messagebox, ttk

import customtkinter as ctk
from tkcalendar import DateEntry

import storage
from excel_import import EMAIL_REGEX, extract_emails
from sender import EmailJob, SmtpConfig, send

APP_TITLE = "Outlook Bulk Emailer"
APP_VERSION = "1.0.0"


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


class BulkEmailerApp(ctk.CTk):
    def __init__(self) -> None:
        super().__init__()
        self.title(f"{APP_TITLE} v{APP_VERSION}")
        self.geometry("900x780")
        self.minsize(820, 720)

        self.state_data = storage.load()
        settings = self.state_data["settings"]

        ctk.set_appearance_mode(settings.get("theme", "system"))
        ctk.set_default_color_theme("blue")

        self._scheduled_timer: threading.Timer | None = None
        self._sending_lock = threading.Lock()
        self._attachments: list[str] = []

        self._build_ui()
        self._apply_initial_settings()

        self.protocol("WM_DELETE_WINDOW", self._on_close)

    # ------------------------------------------------------------------
    # UI construction
    # ------------------------------------------------------------------
    def _build_ui(self) -> None:
        outer = ctk.CTkFrame(self, fg_color="transparent")
        outer.pack(fill="both", expand=True, padx=12, pady=12)

        self._build_header(outer)

        scrollable = ctk.CTkScrollableFrame(outer, fg_color="transparent")
        scrollable.pack(fill="both", expand=True, pady=(8, 0))

        self._build_account_section(scrollable)
        self._build_recipients_section(scrollable)
        self._build_subject_section(scrollable)
        self._build_body_section(scrollable)
        self._build_attachments_section(scrollable)
        self._build_schedule_section(scrollable)
        self._build_actions_section(outer)
        self._build_log_section(outer)

    def _build_header(self, parent: ctk.CTkFrame) -> None:
        header = ctk.CTkFrame(parent, fg_color="transparent")
        header.pack(fill="x")
        ctk.CTkLabel(
            header,
            text=APP_TITLE,
            font=ctk.CTkFont(size=22, weight="bold"),
        ).pack(side="left")

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

    def _section(self, parent: ctk.CTkFrame, title: str) -> ctk.CTkFrame:
        wrapper = ctk.CTkFrame(parent)
        wrapper.pack(fill="x", pady=6, padx=2)
        ctk.CTkLabel(
            wrapper,
            text=title,
            font=ctk.CTkFont(size=14, weight="bold"),
        ).pack(anchor="w", padx=12, pady=(10, 4))
        body = ctk.CTkFrame(wrapper, fg_color="transparent")
        body.pack(fill="x", padx=12, pady=(0, 12))
        return body

    # -- Account ------------------------------------------------------
    def _build_account_section(self, parent: ctk.CTkFrame) -> None:
        body = self._section(parent, "1. Outlook account")
        settings = self.state_data["settings"]

        grid = ctk.CTkFrame(body, fg_color="transparent")
        grid.pack(fill="x")
        grid.columnconfigure(1, weight=1)
        grid.columnconfigure(3, weight=1)

        ctk.CTkLabel(grid, text="Your email:").grid(row=0, column=0, sticky="w", padx=(0, 6), pady=4)
        self.from_email_var = ctk.StringVar(value=settings.get("from_email", ""))
        ctk.CTkEntry(grid, textvariable=self.from_email_var).grid(
            row=0, column=1, columnspan=3, sticky="ew", pady=4
        )

        ctk.CTkLabel(grid, text="Password:").grid(row=1, column=0, sticky="w", padx=(0, 6), pady=4)
        self.password_var = ctk.StringVar(value=settings.get("saved_password", ""))
        self.password_entry = ctk.CTkEntry(grid, textvariable=self.password_var, show="•")
        self.password_entry.grid(row=1, column=1, sticky="ew", pady=4)

        self.show_password_var = ctk.BooleanVar(value=False)
        ctk.CTkCheckBox(
            grid,
            text="Show",
            variable=self.show_password_var,
            command=self._toggle_password_visibility,
        ).grid(row=1, column=2, padx=(8, 0), pady=4)

        self.remember_password_var = ctk.BooleanVar(value=settings.get("remember_password", False))
        ctk.CTkCheckBox(
            grid,
            text="Remember on this computer",
            variable=self.remember_password_var,
        ).grid(row=1, column=3, padx=(8, 0), pady=4, sticky="w")

        ctk.CTkLabel(grid, text="SMTP host:").grid(row=2, column=0, sticky="w", padx=(0, 6), pady=4)
        self.smtp_host_var = ctk.StringVar(value=settings.get("smtp_host", "smtp.office365.com"))
        ctk.CTkEntry(grid, textvariable=self.smtp_host_var).grid(row=2, column=1, sticky="ew", pady=4)

        ctk.CTkLabel(grid, text="Port:").grid(row=2, column=2, sticky="e", padx=(8, 6), pady=4)
        self.smtp_port_var = ctk.StringVar(value=str(settings.get("smtp_port", 587)))
        ctk.CTkEntry(grid, textvariable=self.smtp_port_var, width=80).grid(
            row=2, column=3, sticky="w", pady=4
        )

        ctk.CTkLabel(
            body,
            text=(
                "Tip: if your account uses MFA, generate an app password at "
                "https://account.microsoft.com/security and use it here."
            ),
            text_color=("gray40", "gray70"),
            wraplength=820,
            justify="left",
        ).pack(anchor="w", pady=(6, 0))

    def _toggle_password_visibility(self) -> None:
        self.password_entry.configure(show="" if self.show_password_var.get() else "•")

    # -- Recipients ---------------------------------------------------
    def _build_recipients_section(self, parent: ctk.CTkFrame) -> None:
        body = self._section(parent, "2. Recipients")

        ctk.CTkLabel(
            body,
            text=(
                "Paste email addresses separated by comma, semicolon, space, "
                "or new line. You can also import them from an Excel file."
            ),
            text_color=("gray40", "gray70"),
            wraplength=820,
            justify="left",
        ).pack(anchor="w")

        self.recipients_text = ctk.CTkTextbox(body, height=110)
        self.recipients_text.pack(fill="x", pady=(6, 6))

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

        mode_row = ctk.CTkFrame(body, fg_color="transparent")
        mode_row.pack(fill="x", pady=(8, 0))
        ctk.CTkLabel(mode_row, text="Send mode:").pack(side="left", padx=(0, 8))
        self.send_mode_var = ctk.StringVar(
            value=self.state_data["settings"].get("send_mode", "individual")
        )
        ctk.CTkRadioButton(
            mode_row,
            text="Individual (one email per recipient — recipients do NOT see each other)",
            variable=self.send_mode_var,
            value="individual",
        ).pack(side="left", padx=(0, 16))
        ctk.CTkRadioButton(
            mode_row,
            text="Single email with everyone in CC",
            variable=self.send_mode_var,
            value="cc",
        ).pack(side="left")

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
        self._log(f"Imported {len(emails)} email address(es) from {path}")

    def _refresh_recipient_count(self) -> None:
        emails = _parse_recipients(self.recipients_text.get("1.0", "end"))
        self.recipient_count_label.configure(text=f"{len(emails)} recipient(s)")

    # -- Subject ------------------------------------------------------
    def _build_subject_section(self, parent: ctk.CTkFrame) -> None:
        body = self._section(parent, "3. Subject")

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
            row, text="Save current as preset", command=self._save_subject_preset, width=170
        ).pack(side="left", padx=6)
        ctk.CTkButton(
            row,
            text="Delete preset",
            command=self._delete_subject_preset,
            width=120,
            fg_color="transparent",
            border_width=1,
        ).pack(side="left")

        self.subject_var = ctk.StringVar(value="")
        ctk.CTkEntry(body, textvariable=self.subject_var).pack(fill="x", pady=(8, 0))

    def _on_subject_preset_pick(self, _event: object) -> None:
        value = self.subject_combo.get()
        if value:
            self.subject_var.set(value)

    def _save_subject_preset(self) -> None:
        value = self.subject_var.get().strip()
        if not value:
            messagebox.showwarning("Empty subject", "Type the subject first, then save it as a preset.")
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
        body = self._section(parent, "4. Body")

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
            row, text="Save current as preset", command=self._save_body_preset, width=170
        ).pack(side="left", padx=6)
        ctk.CTkButton(
            row,
            text="Delete preset",
            command=self._delete_body_preset,
            width=120,
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

    def _save_body_preset(self) -> None:
        value = self.body_text.get("1.0", "end").strip()
        if not value:
            messagebox.showwarning("Empty body", "Write the body first, then save it as a preset.")
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
        body = self._section(parent, "6. Schedule")

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
            text="Send at the time below",
            variable=self.schedule_mode_var,
            value="later",
            command=self._update_schedule_state,
        ).pack(anchor="w", pady=(2, 6))

        time_row = ctk.CTkFrame(body, fg_color="transparent")
        time_row.pack(anchor="w")
        ctk.CTkLabel(time_row, text="Date:").pack(side="left", padx=(0, 6))
        today = dt.date.today()
        self.date_entry = DateEntry(
            time_row,
            year=today.year,
            month=today.month,
            day=today.day,
            date_pattern="yyyy-mm-dd",
            width=12,
        )
        self.date_entry.pack(side="left")

        ctk.CTkLabel(time_row, text=" Time:").pack(side="left", padx=(12, 6))
        now = dt.datetime.now()
        self.hour_var = ctk.StringVar(value=f"{now.hour:02d}")
        self.minute_var = ctk.StringVar(value=f"{(now.minute + 5) % 60:02d}")
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

        ctk.CTkLabel(
            body,
            text="Note: leave the program running until the scheduled time.",
            text_color=("gray40", "gray70"),
        ).pack(anchor="w", pady=(8, 0))

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
        bar = ctk.CTkFrame(parent, fg_color="transparent")
        bar.pack(fill="x", pady=(8, 0))

        self.send_button = ctk.CTkButton(
            bar,
            text="Send",
            command=self._on_send_clicked,
            font=ctk.CTkFont(size=14, weight="bold"),
            height=40,
        )
        self.send_button.pack(side="left")

        self.cancel_button = ctk.CTkButton(
            bar,
            text="Cancel scheduled send",
            command=self._cancel_scheduled,
            fg_color="transparent",
            border_width=1,
            state="disabled",
        )
        self.cancel_button.pack(side="left", padx=8)

        self.status_label = ctk.CTkLabel(bar, text="Idle", text_color=("gray30", "gray70"))
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

    def _on_theme_change(self, value: str) -> None:
        ctk.set_appearance_mode(value)
        self.state_data["settings"]["theme"] = value
        storage.save(self.state_data)

    def _persist_settings(self) -> None:
        s = self.state_data["settings"]
        s["from_email"] = self.from_email_var.get().strip()
        s["smtp_host"] = self.smtp_host_var.get().strip() or "smtp.office365.com"
        try:
            s["smtp_port"] = int(self.smtp_port_var.get())
        except ValueError:
            s["smtp_port"] = 587
        s["send_mode"] = self.send_mode_var.get()
        s["remember_password"] = bool(self.remember_password_var.get())
        s["saved_password"] = self.password_var.get() if s["remember_password"] else ""
        storage.save(self.state_data)

    # -- Send entry point --------------------------------------------
    def _on_send_clicked(self) -> None:
        self._persist_settings()
        try:
            smtp, job = self._build_smtp_and_job()
        except ValueError as exc:
            messagebox.showerror("Cannot send", str(exc))
            return

        if self.schedule_mode_var.get() == "later":
            target = self._scheduled_datetime()
            if target is None:
                return
            delay = (target - dt.datetime.now()).total_seconds()
            if delay <= 0:
                messagebox.showerror("Invalid time", "The scheduled time is in the past.")
                return
            self._schedule_send(smtp, job, target, delay)
        else:
            self._launch_send(smtp, job)

    def _build_smtp_and_job(self) -> tuple[SmtpConfig, EmailJob]:
        from_email = self.from_email_var.get().strip()
        if not from_email:
            raise ValueError("Enter your Outlook email address.")
        password = self.password_var.get()
        if not password:
            raise ValueError("Enter your password (or app password).")
        try:
            port = int(self.smtp_port_var.get())
        except ValueError as exc:
            raise ValueError("SMTP port must be a number.") from exc

        recipients = _parse_recipients(self.recipients_text.get("1.0", "end"))
        if not recipients:
            raise ValueError("Add at least one recipient email address.")

        subject = self.subject_var.get().strip()
        if not subject:
            raise ValueError("The subject is empty.")

        body_text = self.body_text.get("1.0", "end").strip()
        if not body_text:
            raise ValueError("The body is empty.")

        smtp = SmtpConfig(
            host=self.smtp_host_var.get().strip() or "smtp.office365.com",
            port=port,
            username=from_email,
            password=password,
            use_starttls=True,
        )
        job = EmailJob(
            recipients=recipients,
            subject=subject,
            body=body_text,
            attachments=list(self._attachments),
            mode=self.send_mode_var.get(),
        )
        return smtp, job

    def _scheduled_datetime(self) -> dt.datetime | None:
        try:
            date_value = self.date_entry.get_date()
            hour = int(self.hour_var.get())
            minute = int(self.minute_var.get())
        except (ValueError, tk.TclError):
            messagebox.showerror("Invalid time", "Pick a valid date and time.")
            return None
        return dt.datetime.combine(date_value, dt.time(hour=hour, minute=minute))

    def _schedule_send(
        self,
        smtp: SmtpConfig,
        job: EmailJob,
        target: dt.datetime,
        delay: float,
    ) -> None:
        if self._scheduled_timer is not None:
            self._scheduled_timer.cancel()
        self._scheduled_timer = threading.Timer(delay, lambda: self._launch_send(smtp, job))
        self._scheduled_timer.daemon = True
        self._scheduled_timer.start()
        self.cancel_button.configure(state="normal")
        self.send_button.configure(state="disabled")
        self.status_label.configure(text=f"Scheduled for {target:%Y-%m-%d %H:%M}")
        self._log(
            f"Scheduled send for {target:%Y-%m-%d %H:%M} "
            f"({len(job.recipients)} recipient(s), mode={job.mode})"
        )

    def _cancel_scheduled(self) -> None:
        if self._scheduled_timer is not None:
            self._scheduled_timer.cancel()
            self._scheduled_timer = None
        self.cancel_button.configure(state="disabled")
        self.send_button.configure(state="normal")
        self.status_label.configure(text="Scheduled send cancelled")
        self._log("Scheduled send cancelled")

    def _launch_send(self, smtp: SmtpConfig, job: EmailJob) -> None:
        if not self._sending_lock.acquire(blocking=False):
            return
        self.after(0, lambda: self.send_button.configure(state="disabled"))
        self.after(0, lambda: self.cancel_button.configure(state="disabled"))
        self.after(0, lambda: self.status_label.configure(text="Sending…"))
        self.after(0, lambda: self._log(f"Starting send to {len(job.recipients)} recipient(s)"))

        thread = threading.Thread(target=self._do_send, args=(smtp, job), daemon=True)
        thread.start()

    def _do_send(self, smtp: SmtpConfig, job: EmailJob) -> None:
        try:
            sent, failed = send(
                smtp,
                job,
                progress=lambda msg: self.after(0, self._log, msg),
            )
            self.after(0, self._on_send_finished, sent, failed, None)
        except Exception as exc:  # pragma: no cover - GUI path
            self.after(0, self._on_send_finished, 0, len(job.recipients), exc)
        finally:
            self._sending_lock.release()

    def _on_send_finished(self, sent: int, failed: int, error: Exception | None) -> None:
        self.send_button.configure(state="normal")
        self.cancel_button.configure(state="disabled")
        self._scheduled_timer = None
        if error is not None:
            self.status_label.configure(text="Failed")
            self._log(f"Send failed: {error}")
            messagebox.showerror("Send failed", str(error))
            return
        self.status_label.configure(text=f"Done. Sent {sent}, failed {failed}.")
        self._log(f"Finished. Sent: {sent}, failed: {failed}")
        if failed:
            messagebox.showwarning("Some failed", f"Sent {sent}, failed {failed}. See the log.")
        else:
            messagebox.showinfo("Done", f"Sent {sent} email(s).")

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
        if self._scheduled_timer is not None:
            if not messagebox.askyesno(
                "Pending scheduled send",
                "A scheduled send is still pending and will be lost if you close the program now. "
                "Close anyway?",
            ):
                return
            self._scheduled_timer.cancel()
        self._persist_settings()
        self.destroy()


def main() -> None:
    app = BulkEmailerApp()
    app.mainloop()


if __name__ == "__main__":
    main()
