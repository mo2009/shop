# Outlook Bulk Emailer

A simple desktop app for sending marketing emails through an Outlook
business / Office 365 account. Designed so a non-technical employee can
run it without ever opening Outlook itself.

## Features

- Send to a list of recipients pasted in, or imported from an Excel
  (`.xlsx`) file.
- Two send modes:
  - **Individual** – one separate email per recipient (recipients do
    NOT see each other's addresses).
  - **CC** – a single email with everyone in CC.
- Subject and body **presets**: pick from a list, save your own, delete
  the ones you don't need.
- **Attachments**: attach any number of files.
- **Schedule send**: pick a date and time so the program sends your
  email later (e.g. while you're sleeping). Just leave the program
  running until then.
- **Light / Dark / System theme** with one click.
- Local activity log so you can see exactly what happened.

## Install

You need Python 3.10 or newer.

```bash
cd tools/bulk-emailer
pip install -r requirements.txt
python main.py
```

> On Linux you may need a system Tk: `sudo apt install python3-tk`.

## Outlook / Office 365 setup

The program connects to Outlook business with SMTP at
`smtp.office365.com:587` (STARTTLS).

If your account uses two-factor authentication (most business accounts
do), you must use an **app password** instead of your normal password:

1. Sign in at <https://account.microsoft.com/security>.
2. Go to **Advanced security options → App passwords → Create**.
3. Name it `Bulk Emailer`, click **Next**, and copy the password.
4. Paste that password into the program's **Password** field.

If your tenant disables SMTP AUTH (some companies do), ask your IT
admin to allow `Authenticated SMTP` for your mailbox, or use a shared
mailbox with SMTP enabled.

## How send modes work

- **Individual**: the program opens an SMTP connection once, then sends
  one message per recipient through that same connection. Each message
  has only that person in `To:`. Recipients cannot see each other.
- **CC**: a single message is built with the first recipient in `To:`
  and the rest in `Cc:`. Everyone sees the full distribution.

## Schedule send

Pick **Send at the time below**, choose a date and time, then click
**Send**. The program will keep the window open and fire the send at
the scheduled time. Click **Cancel scheduled send** to abort.

The schedule lives only in this running process — if you close the
program before the scheduled time, the send is cancelled.

## Where data is stored

User data lives in `~/.bulk_emailer/data.json` (Windows:
`C:\Users\<you>\.bulk_emailer\data.json`):

- Saved subject and body presets.
- Last-used SMTP host/port and from-address.
- The password is only saved if you tick
  **Remember on this computer**. It is stored in plain text in that
  file, so untick it on shared computers.

## Troubleshooting

- **`SMTPAuthenticationError 535`**: wrong password, or your tenant
  blocks SMTP AUTH. Use an app password (above) or contact IT.
- **`SMTPSenderRefused`**: the from-address must match the account you
  signed in with. You can't send from an address you don't own.
- **`Could not connect`**: check your firewall — outbound TCP `587`
  must be open.
- **Some recipients failed but others worked**: the log shows the exact
  error per recipient. Common causes are typos in the address or the
  remote mail server rejecting the message as spam.
