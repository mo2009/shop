"""Auto send-mode grouping logic.

Auto mode looks at a flat list of recipient emails and figures out, for
each company (= email domain), which address should go in "To" (a
"priority" contact like ``purchasing@``) and which addresses should be
CC'd. Free-mail domains and singletons are sent one-to-one.

Design choices (matching the user-confirmed defaults):

* Group by domain, case-insensitive.
* Free-mail / personal domains (gmail, outlook, hotmail, yahoo, …) are
  never grouped.
* In a company group of 2+ emails:
    - If a recipient's local-part starts with one of the configured
      priority keywords (case-insensitive), it goes in **To** and the
      rest of the group goes in **CC**.
    - If multiple priority matches exist, the *earliest priority
      keyword in the user-provided list* wins (so the order of the
      keywords matters: first listed = highest priority).
    - If no priority match exists, the entire group is fanned out as
      individual one-to-one emails.
* Singleton company groups (only one address from that domain) are
  sent as individual one-to-one emails.

This module has no GUI and no Outlook dependency, so it can be imported
on any platform.
"""

from __future__ import annotations

from dataclasses import dataclass, field

# Common free-mail / personal domains we never group under "auto".
# Lower-case. Easy to extend.
FREE_MAIL_DOMAINS: frozenset[str] = frozenset({
    "gmail.com",
    "googlemail.com",
    "outlook.com",
    "hotmail.com",
    "live.com",
    "msn.com",
    "yahoo.com",
    "yahoo.co.uk",
    "ymail.com",
    "icloud.com",
    "me.com",
    "mac.com",
    "aol.com",
    "proton.me",
    "protonmail.com",
    "gmx.com",
    "gmx.net",
    "mail.com",
    "zoho.com",
    "yandex.com",
    "yandex.ru",
})


@dataclass
class Envelope:
    """One outbound message: a To-list and an optional CC-list."""

    to: list[str]
    cc: list[str] = field(default_factory=list)
    # Human-readable label shown in the preview pane / log.
    label: str = ""


def _local_part(email: str) -> str:
    return email.split("@", 1)[0].lower() if "@" in email else email.lower()


def _domain(email: str) -> str:
    return email.split("@", 1)[1].lower() if "@" in email else ""


def _matches_priority(local: str, keywords: list[str]) -> int | None:
    """Return the index of the first matching keyword, or ``None``.

    Lower index = higher priority, so we keep the smallest index seen.
    Match is **starts-with**, case-insensitive.
    """
    local_lc = local.lower()
    for index, keyword in enumerate(keywords):
        keyword_lc = keyword.strip().lower()
        if keyword_lc and local_lc.startswith(keyword_lc):
            return index
    return None


def build_auto_envelopes(
    recipients: list[str],
    priority_keywords: list[str],
) -> list[Envelope]:
    """Group ``recipients`` according to the auto-mode rules.

    Returns a list of :class:`Envelope` objects in stable order:
    company-group envelopes first (by first appearance of the domain in
    the input), then any singleton/individual envelopes.
    """
    by_domain: dict[str, list[str]] = {}
    domain_order: list[str] = []
    free_or_no_domain: list[str] = []

    for email in recipients:
        domain = _domain(email)
        if not domain or domain in FREE_MAIL_DOMAINS:
            free_or_no_domain.append(email)
            continue
        if domain not in by_domain:
            by_domain[domain] = []
            domain_order.append(domain)
        by_domain[domain].append(email)

    grouped: list[Envelope] = []
    individuals: list[str] = list(free_or_no_domain)

    for domain in domain_order:
        group = by_domain[domain]
        if len(group) == 1:
            individuals.extend(group)
            continue

        best_index: int | None = None
        priority_email: str | None = None
        for email in group:
            match = _matches_priority(_local_part(email), priority_keywords)
            if match is None:
                continue
            if best_index is None or match < best_index:
                best_index = match
                priority_email = email

        if priority_email is None:
            # Q1 default: send each individually.
            individuals.extend(group)
            continue

        cc_list = [e for e in group if e != priority_email]
        grouped.append(Envelope(to=[priority_email], cc=cc_list, label=domain))

    for email in individuals:
        grouped.append(Envelope(to=[email], cc=[], label="individual"))

    return grouped


def build_envelopes(
    recipients: list[str],
    mode: str,
    priority_keywords: list[str] | None = None,
) -> list[Envelope]:
    """Build a list of :class:`Envelope` from a flat recipient list.

    ``mode`` is one of ``"individual"``, ``"cc"``, or ``"auto"``.
    """
    if mode == "individual":
        return [Envelope(to=[r], cc=[], label="individual") for r in recipients]
    if mode == "cc":
        if not recipients:
            return []
        return [
            Envelope(
                to=[recipients[0]],
                cc=list(recipients[1:]),
                label="single CC blast",
            )
        ]
    if mode == "auto":
        return build_auto_envelopes(recipients, priority_keywords or [])
    raise ValueError(f"Unknown send mode: {mode!r}")


def describe_envelopes(envelopes: list[Envelope]) -> str:
    """Render a human-readable preview of a list of envelopes."""
    if not envelopes:
        return "(no recipients)"
    lines: list[str] = []
    for index, env in enumerate(envelopes, start=1):
        suffix = f"  [{env.label}]" if env.label else ""
        lines.append(f"{index}. To: {', '.join(env.to)}{suffix}")
        if env.cc:
            lines.append(f"   CC: {', '.join(env.cc)}")
    return "\n".join(lines)
