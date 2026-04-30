"""Extract email addresses from an Excel (.xlsx) file.

Strategy: walk every cell on every sheet and collect strings that look
like an email address. This means the user does not need to format the
spreadsheet in any particular way — emails can be in any column or row.
"""

from __future__ import annotations

import re
from pathlib import Path

from openpyxl import load_workbook

EMAIL_REGEX = re.compile(r"[A-Za-z0-9._%+\-]+@[A-Za-z0-9.\-]+\.[A-Za-z]{2,}")


def extract_emails(xlsx_path: str | Path) -> list[str]:
    """Return a de-duplicated list of email addresses found in the file.

    Order is preserved (first occurrence wins).
    """
    wb = load_workbook(filename=str(xlsx_path), read_only=True, data_only=True)
    seen: set[str] = set()
    ordered: list[str] = []
    try:
        for ws in wb.worksheets:
            for row in ws.iter_rows(values_only=True):
                for value in row:
                    if not isinstance(value, str):
                        continue
                    for match in EMAIL_REGEX.findall(value):
                        normalized = match.strip().lower()
                        if normalized in seen:
                            continue
                        seen.add(normalized)
                        ordered.append(match.strip())
    finally:
        wb.close()
    return ordered
