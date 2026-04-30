"""Persistence for user settings, saved subjects, and saved bodies.

Data is stored as JSON in the user's home directory under
~/.bulk_emailer/data.json so it survives restarts and is per-user.
"""

from __future__ import annotations

import json
import os
from pathlib import Path
from typing import Any

DEFAULT_SUBJECTS = [
    "Special offer just for you",
    "We have something new",
    "Your weekly newsletter",
    "Reminder: limited time deal",
]

DEFAULT_BODIES = [
    (
        "Hello,\n\n"
        "We are excited to share our latest offers with you. "
        "Reply to this email if you would like to know more.\n\n"
        "Best regards,\nThe Team"
    ),
    (
        "Hi,\n\n"
        "Just a quick reminder about our ongoing promotion. "
        "We would love to hear from you.\n\n"
        "Thanks,\nThe Team"
    ),
]

# Default priority keywords used by Auto send mode to decide which email
# in a company group goes in "To" (vs. CC). Match is case-insensitive
# and starts-with, so e.g. ``purchasing`` matches ``purchasing@acme.com``,
# ``purchasing-eu@acme.com``, ``purchasing.team@acme.com``.
DEFAULT_PRIORITY_KEYWORDS = ["purchasing", "operation", "ops"]


def _data_dir() -> Path:
    path = Path.home() / ".bulk_emailer"
    path.mkdir(parents=True, exist_ok=True)
    return path


def _data_file() -> Path:
    return _data_dir() / "data.json"


def load() -> dict[str, Any]:
    """Load the persisted state, returning defaults if missing/corrupt."""
    path = _data_file()
    if not path.exists():
        return _defaults()
    try:
        with path.open("r", encoding="utf-8") as f:
            raw = json.load(f)
    except (json.JSONDecodeError, OSError):
        return _defaults()
    merged = _defaults()
    merged.update(raw)
    # Make sure list/dict shapes are correct even after partial corruption.
    if not isinstance(merged.get("subjects"), list):
        merged["subjects"] = list(DEFAULT_SUBJECTS)
    if not isinstance(merged.get("bodies"), list):
        merged["bodies"] = list(DEFAULT_BODIES)
    if not isinstance(merged.get("priority_keywords"), list):
        merged["priority_keywords"] = list(DEFAULT_PRIORITY_KEYWORDS)
    if not isinstance(merged.get("settings"), dict):
        merged["settings"] = _default_settings()
    return merged


def save(state: dict[str, Any]) -> None:
    """Atomically persist the given state."""
    path = _data_file()
    tmp = path.with_suffix(".json.tmp")
    with tmp.open("w", encoding="utf-8") as f:
        json.dump(state, f, indent=2, ensure_ascii=False)
    os.replace(tmp, path)


def _default_settings() -> dict[str, Any]:
    return {
        "account_smtp": "",  # Empty = use Outlook's default account.
        "theme": "system",  # "light" | "dark" | "system"
        "send_mode": "individual",  # "individual" | "cc" | "auto"
    }


def _defaults() -> dict[str, Any]:
    return {
        "subjects": list(DEFAULT_SUBJECTS),
        "bodies": list(DEFAULT_BODIES),
        "priority_keywords": list(DEFAULT_PRIORITY_KEYWORDS),
        "settings": _default_settings(),
    }
