# Outlook Bulk Emailer (Windows / Outlook desktop)

A simple desktop app that sends marketing emails through the user's
locally-installed **Microsoft Outlook desktop application**. Designed
so a non-technical employee can run it without ever opening Outlook
themselves.

Because the program talks to Outlook over the COM API, it uses
whichever account is already signed in to Outlook on the PC — there is
**no password to type and no SMTP setup**.

## Features

- Recipient input: paste a free-form list (comma / semicolon / space /
  newline separated) **or** import from an Excel (`.xlsx`) file
  (every cell of every sheet is scanned for email addresses).
- Three send modes:
  - **Individual** – one separate email per recipient (recipients do
    NOT see each other's addresses).
  - **Single CC** – a single email with everyone in CC.
  - **Auto** – group recipients by company (the part after `@`).
    For each company, a *priority* address such as
    `purchasing@…`, `operation@…`, or `ops@…` goes in the To field
    and every other address from the same company goes in CC.
    Singletons and personal-mail domains (gmail, outlook, yahoo, …)
    are sent as individual one-to-one emails. The priority keyword
    list is fully editable in the app, and a live preview shows you
    exactly how the program is going to group your list before you
    click Send.
- Pick which Outlook account to send from when several are configured
  (otherwise the program uses Outlook's default account).
- Subject and body **presets**: pick from a list, save your own, delete
  the ones you don't need.
- **Attachments**: attach any number of files.
- **Schedule send**: pick a date and time; messages are queued in
  Outlook's Outbox with `DeferredDeliveryTime`, so Outlook itself
  releases them at the chosen time. **Outlook must be running on this
  PC at that time** for the messages to leave the Outbox — but our app
  can be closed.
- **Light / Dark / System theme** with one click, persisted between runs.
- Local activity log so you can see exactly what happened.

## Requirements

- Windows 10 or 11
- Microsoft Outlook desktop (signed in to a business / Office 365
  account)
- Python 3.10+

## Install

Double-click `run.bat` — on the first run it creates a virtualenv and
installs the dependencies, then launches the app. On subsequent runs it
just launches.

Or run manually:

```cmd
cd tools\bulk-emailer
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
python main.py
```

## How send modes work

- **Individual**: the program creates a separate Outlook `MailItem`
  for each recipient with only that person in `To:`. Recipients cannot
  see each other.
- **Single CC**: a single `MailItem` is created with the first
  recipient in `To:` and the rest in `Cc:`. Everyone sees the full
  distribution.
- **Auto**: recipients are grouped by domain. Within each company
  group of 2+ addresses, the first address whose local part starts
  with one of your priority keywords goes in `To:` and the rest of
  the group goes in `Cc:`. Companies with no priority match, free
  mail addresses (gmail / outlook / yahoo / …) and singletons are
  sent as individual one-to-one emails. The mode reveals an editable
  list of priority keywords (defaults: `purchasing`, `operation`,
  `ops`) and a live preview pane that shows you the exact To/Cc
  layout the program will use.

## Schedule send

Pick **Send at the time below**, choose a date and time, then click
**Send**. Each message is composed with Outlook's `DeferredDeliveryTime`
property and dropped into the Outbox. Outlook itself will release them
at the chosen time, so you can close this program afterwards.

> Outlook must be running on this PC at the scheduled time for the
> messages to leave the Outbox. If Outlook is closed, the messages stay
> in the Outbox until you start Outlook again.

To cancel a scheduled send, open Outlook, go to the Outbox, and delete
the messages.

## Where data is stored

User data lives in `~/.bulk_emailer/data.json` (Windows:
`C:\Users\<you>\.bulk_emailer\data.json`):

- Saved subject and body presets.
- Priority keywords used by Auto mode.
- Last-used "From account" choice, theme, and send mode.

No password is ever stored, because the program does not need one — it
relies on Outlook's existing sign-in.

## Troubleshooting

- **"Outlook not detected"** in the From-account dropdown: Outlook
  desktop is not installed, not signed in, or `pywin32` was not
  installed. Run `pip install pywin32`, sign in to Outlook, then click
  **Refresh** in the app.
- **The Send button is disabled / nothing happens**: check the Activity
  log at the bottom of the window for the exact error.
- **Outlook security prompt about a program sending mail on your
  behalf**: this is a Windows / Outlook security feature triggered by
  COM automation on some versions of Outlook. Click **Allow**. If you
  see it constantly, your IT admin can disable
  `Programmatic Access Security` for trusted machines.
- **"It says Sent but the message is in the Outbox"**: this used to
  happen when Outlook held the message in the Outbox until the next
  send/receive cycle. The app now calls Outlook's `SendAndReceive`
  right after queuing immediate sends, which flushes the Outbox to
  the server. If a message still sits in the Outbox, press **F9** in
  Outlook to force send/receive.
- **Scheduled messages did not go out**: Outlook needs to be running
  at the scheduled time. Check the Outbox — if they are still there,
  Outlook was closed, and they will go out as soon as you open Outlook
  again. Note: closing the laptop lid suspends the PC; either disable
  lid-close sleep in Windows Power settings or run the program on an
  always-on PC if you need overnight sends.

## File layout

| File | Purpose |
| --- | --- |
| `main.py` | GUI (`BulkEmailerApp`) |
| `sender.py` | Outlook COM send logic; no GUI imports |
| `auto_mode.py` | Grouping logic for Auto send mode (no Outlook deps) |
| `excel_import.py` | Extracts emails from `.xlsx` via regex |
| `storage.py` | JSON persistence for presets, settings, and priority keywords |
| `requirements.txt` | Python dependencies |
| `run.bat` / `run.sh` | One-click launchers |
