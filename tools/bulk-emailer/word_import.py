"""Convert a Microsoft Word ``.docx`` file to HTML suitable for an email body.

This is a deliberately small, email-focused converter. It preserves the
formatting that actually matters when the result is sent through
Outlook's ``HTMLBody`` field:

* Run-level **bold / italic / underline / strikethrough**.
* Run-level **colour**, **font size**, **font family**, **highlight**.
* Paragraph alignment.
* **Headings** (Word's "Heading N" styles → ``<h1>`` … ``<h6>``).
* **Hyperlinks** (both external rId-based ones and document anchors).
* **Bullet / numbered lists** (heuristic — anything with a numbering
  property or a "List Bullet" / "List Number" style).
* **Tables** (with simple light-grey borders).
* **Inline pictures**: each embedded image is handed to a caller-provided
  ``register_image`` callback that returns the CID it allocated; an
  ``<img src="cid:…">`` tag is emitted in its place. The caller is then
  responsible for attaching the picture to the outgoing email tagged
  with the matching ``PR_ATTACH_CONTENT_ID`` (which is exactly what the
  bulk emailer already does for inline images dropped via the toolbar).

Mammoth (the popular ``.docx`` → HTML library) intentionally drops
inline colour and font-size, since it targets clean semantic HTML for
the web. Email is the opposite — without inline styles, formatting
disappears in most clients. That's why we ship our own converter.
"""

from __future__ import annotations

import html
import re
from dataclasses import dataclass, field
from pathlib import Path
from typing import Callable, Iterable

from docx import Document
from docx.document import Document as DocType
from docx.oxml.ns import qn
from docx.oxml.table import CT_Tbl
from docx.oxml.text.paragraph import CT_P
from docx.table import Table, _Cell
from docx.text.paragraph import Paragraph

# Caller signature: ``register_image(image_bytes, file_extension) -> cid``.
# ``file_extension`` is something like "png" or "jpeg" without a dot.
ImageRegistrar = Callable[[bytes, str], str]


@dataclass
class ConversionResult:
    html: str
    warnings: list[str] = field(default_factory=list)


def convert_docx_to_html(
    path: str | Path,
    register_image: ImageRegistrar,
) -> ConversionResult:
    """Read ``path`` and return its HTML rendering plus any warnings."""
    document = Document(str(path))
    warnings: list[str] = []
    parts: list[str] = []

    list_buffer: list[str] = []
    list_kind: str | None = None  # "ul" or "ol"

    def flush_list() -> None:
        nonlocal list_buffer, list_kind
        if list_buffer:
            tag = list_kind or "ul"
            parts.append(f"<{tag}>{''.join(list_buffer)}</{tag}>")
            list_buffer = []
            list_kind = None

    for block in _iter_block_items(document):
        if isinstance(block, Paragraph):
            kind = _detect_list(block)
            inner = _render_runs(block, document, register_image, warnings)
            if kind:
                if list_kind is None:
                    list_kind = kind
                elif list_kind != kind:
                    flush_list()
                    list_kind = kind
                list_buffer.append(f"<li>{inner or '&nbsp;'}</li>")
                continue
            flush_list()
            heading = _heading_level(block)
            attr = _paragraph_attr(block)
            if heading:
                parts.append(f"<h{heading}{attr}>{inner}</h{heading}>")
            else:
                parts.append(f"<p{attr}>{inner or '&nbsp;'}</p>")
        elif isinstance(block, Table):
            flush_list()
            parts.append(_render_table(block, document, register_image, warnings))

    flush_list()
    return ConversionResult(html="\n".join(parts), warnings=warnings)


# ---------------------------------------------------------------- helpers


def _iter_block_items(parent: DocType | _Cell) -> Iterable[Paragraph | Table]:
    """Yield ``Paragraph`` and ``Table`` objects in document order."""
    if isinstance(parent, DocType):
        elem = parent.element.body
    else:  # table cell
        elem = parent._tc
    for child in elem.iterchildren():
        if isinstance(child, CT_P):
            yield Paragraph(child, parent)
        elif isinstance(child, CT_Tbl):
            yield Table(child, parent)


def _heading_level(paragraph: Paragraph) -> int | None:
    if paragraph.style is None:
        return None
    name = paragraph.style.name or ""
    match = re.match(r"^Heading (\d)$", name)
    return int(match.group(1)) if match else None


_ALIGN_MAP = {
    0: "left",
    1: "center",
    2: "right",
    3: "justify",
}


def _paragraph_attr(paragraph: Paragraph) -> str:
    """Return a ``" style=…"`` snippet for paragraph-level CSS."""
    css: list[str] = []
    align = paragraph.alignment
    if align is not None:
        mapped = _ALIGN_MAP.get(int(align))
        if mapped:
            css.append(f"text-align:{mapped}")
    return f' style="{";".join(css)}"' if css else ""


def _detect_list(paragraph: Paragraph) -> str | None:
    """Return ``"ul"`` / ``"ol"`` / ``None`` for this paragraph."""
    pPr = paragraph._p.pPr
    if pPr is not None and pPr.find(qn("w:numPr")) is not None:
        # We don't crack open numbering.xml here; default to bullet.
        # A user who really cares can edit the resulting HTML.
        style_name = (paragraph.style.name or "").lower() if paragraph.style else ""
        if "number" in style_name:
            return "ol"
        return "ul"
    if paragraph.style is not None:
        name = (paragraph.style.name or "").lower()
        if "list bullet" in name:
            return "ul"
        if "list number" in name:
            return "ol"
    return None


def _render_runs(
    paragraph: Paragraph,
    document: DocType,
    register_image: ImageRegistrar,
    warnings: list[str],
) -> str:
    """Walk the paragraph's runs and hyperlinks; return inline HTML."""
    out: list[str] = []
    for child in paragraph._p.iterchildren():
        tag = child.tag
        if tag == qn("w:r"):
            out.append(_render_run(child, document, register_image, warnings))
        elif tag == qn("w:hyperlink"):
            href = _hyperlink_href(child, document)
            inner = "".join(
                _render_run(r, document, register_image, warnings)
                for r in child.findall(qn("w:r"))
            )
            if href:
                out.append(f'<a href="{html.escape(href, quote=True)}">{inner}</a>')
            else:
                out.append(inner)
    return "".join(out)


def _hyperlink_href(hyperlink_el, document: DocType) -> str | None:
    rid = hyperlink_el.get(qn("r:id"))
    if rid:
        rel = document.part.rels.get(rid)
        if rel is not None:
            return rel.target_ref
    anchor = hyperlink_el.get(qn("w:anchor"))
    return f"#{anchor}" if anchor else None


_OOXML_OFF_VALUES = {"0", "false", "off"}


def _is_on_toggle(el) -> bool:
    """Return ``True`` if a boolean OOXML property element is enabled.

    In OOXML, a property like ``<w:b/>`` (or ``<w:b w:val="true"/>``)
    means the toggle is **on**, but ``<w:b w:val="false"/>`` (or
    ``"0"`` / ``"off"``) means it is **explicitly off** — typically
    used to override an inherited style (e.g. non-bold text inside a
    Heading paragraph). Treating those as on produces wrong markup.
    """
    if el is None:
        return False
    val = el.get(qn("w:val"))
    if val is None:
        return True
    return val.strip().lower() not in _OOXML_OFF_VALUES


def _is_underline_on(el) -> bool:
    """Underline uses ``w:val`` to encode the line pattern, not a bool.

    ``"none"`` means no underline; any other value (or absence) means
    "draw an underline of that pattern". For our purposes we just want
    to know whether the run is underlined at all.
    """
    if el is None:
        return False
    val = el.get(qn("w:val"))
    if val is None:
        return True
    return val.strip().lower() != "none"


def _render_run(
    r_el,
    document: DocType,
    register_image: ImageRegistrar,
    warnings: list[str],
) -> str:
    rPr = r_el.find(qn("w:rPr"))
    text_pieces: list[str] = []
    for child in r_el.iterchildren():
        tag = child.tag
        if tag == qn("w:t"):
            text_pieces.append(html.escape(child.text or ""))
        elif tag == qn("w:tab"):
            text_pieces.append("&emsp;")
        elif tag == qn("w:br"):
            text_pieces.append("<br>")
        elif tag == qn("w:drawing"):
            piece = _render_drawing(child, document, register_image, warnings)
            if piece:
                text_pieces.append(piece)
    text = "".join(text_pieces)
    if not text:
        return ""

    if rPr is None:
        return text

    if _is_on_toggle(rPr.find(qn("w:b"))):
        text = f"<b>{text}</b>"
    if _is_on_toggle(rPr.find(qn("w:i"))):
        text = f"<i>{text}</i>"
    if _is_underline_on(rPr.find(qn("w:u"))):
        text = f"<u>{text}</u>"
    if _is_on_toggle(rPr.find(qn("w:strike"))):
        text = f"<s>{text}</s>"

    css: list[str] = []
    color_el = rPr.find(qn("w:color"))
    if color_el is not None:
        val = color_el.get(qn("w:val"))
        if val and val.lower() != "auto":
            css.append(f"color:#{val}")
    sz_el = rPr.find(qn("w:sz"))
    if sz_el is not None:
        val = sz_el.get(qn("w:val"))
        if val and val.isdigit():
            # ``w:val`` is in half-points.
            pt = int(val) / 2
            css.append(f"font-size:{pt:g}pt")
    rFonts = rPr.find(qn("w:rFonts"))
    if rFonts is not None:
        fname = (
            rFonts.get(qn("w:ascii"))
            or rFonts.get(qn("w:hAnsi"))
            or rFonts.get(qn("w:cs"))
        )
        if fname:
            css.append(f"font-family:'{fname}'")
    highlight = rPr.find(qn("w:highlight"))
    if highlight is not None:
        val = highlight.get(qn("w:val"))
        if val and val.lower() != "none":
            css.append(f"background-color:{val}")
    if css:
        text = f'<span style="{";".join(css)}">{text}</span>'
    return text


def _render_drawing(
    drawing_el,
    document: DocType,
    register_image: ImageRegistrar,
    warnings: list[str],
) -> str | None:
    blip = drawing_el.find(".//" + qn("a:blip"))
    if blip is None:
        return None
    rid = blip.get(qn("r:embed"))
    if not rid:
        return None
    rel = document.part.rels.get(rid)
    if rel is None or rel.target_part is None:
        warnings.append(f"Picture relationship {rid} not found; skipped.")
        return None
    blob = rel.target_part.blob
    ext = Path(rel.target_part.partname or "").suffix.lstrip(".") or "png"
    cid = register_image(blob, ext)

    width_px: int | None = None
    height_px: int | None = None
    extent = drawing_el.find(".//" + qn("wp:extent"))
    if extent is not None:
        try:
            cx = int(extent.get("cx", 0))
            cy = int(extent.get("cy", 0))
            if cx and cy:
                # 914400 English Metric Units per inch * 96 px / inch.
                width_px = round(cx / 914400 * 96)
                height_px = round(cy / 914400 * 96)
        except ValueError:
            pass

    style = "max-width:100%;height:auto"
    if width_px:
        style = f"max-width:100%;width:{width_px}px;height:auto"
    return f'<img src="cid:{cid}" style="{style}">'


def _render_table(
    table: Table,
    document: DocType,
    register_image: ImageRegistrar,
    warnings: list[str],
) -> str:
    """Render a Word table to HTML, honouring horizontal and vertical merges.

    python-docx's ``row.cells`` helpfully repeats the same ``_Cell``
    once per grid column it spans (so a 3-wide merged cell shows up as
    three identical cells), and follows ``vMerge="continue"`` to the
    cell above (so vertically merged cells get the upper cell's
    contents duplicated row after row). Iterating the underlying
    ``<w:tc>`` elements directly side-steps both, after which we can
    emit proper ``colspan`` / ``rowspan`` attributes.
    """
    # Build a per-row layout: each entry is (tc, grid_offset, grid_span, vmerge)
    # where vmerge is "continue", "restart", or None.
    # ``findall`` only matches direct children, so nested tables stay
    # inside their parent ``<w:tc>`` and don't pollute the outer rows.
    rows_xml = list(table._tbl.findall(qn("w:tr")))
    layout: list[list[tuple[object, int, int, object]]] = []
    for tr in rows_xml:
        row: list[tuple[object, int, int, object]] = []
        offset = 0
        for tc in tr.findall(qn("w:tc")):
            span = max(1, getattr(tc, "grid_span", 1) or 1)
            vmerge = getattr(tc, "vMerge", None)
            row.append((tc, offset, span, vmerge))
            offset += span
        layout.append(row)

    rows_html: list[str] = []
    for row_idx, row in enumerate(layout):
        cell_html: list[str] = []
        for tc, off, span, vmerge in row:
            if vmerge == "continue":
                # This cell is the lower half of a vertical merge — its
                # content was already rendered by the originating cell
                # via rowspan, so skip it here.
                continue
            # Walk subsequent rows to find how far this vertical merge
            # extends. Only kicks in when vmerge=="restart"; for None
            # the loop body never executes because no row below will
            # have a continuation at this offset.
            rowspan = 1
            for r2 in range(row_idx + 1, len(layout)):
                if any(
                    o2 == off and vm2 == "continue" for (_, o2, _, vm2) in layout[r2]
                ):
                    rowspan += 1
                else:
                    break

            cell = _Cell(tc, table)
            inner = "".join(
                '<p style="margin:0">'
                + (_render_runs(p, document, register_image, warnings) or "&nbsp;")
                + "</p>"
                for p in cell.paragraphs
            )
            attrs = ""
            if span > 1:
                attrs += f' colspan="{span}"'
            if rowspan > 1:
                attrs += f' rowspan="{rowspan}"'
            cell_html.append(
                f'<td{attrs} style="border:1px solid #cccccc;padding:6px;vertical-align:top">'
                + inner
                + "</td>"
            )
        rows_html.append(f"<tr>{''.join(cell_html)}</tr>")
    return (
        '<table style="border-collapse:collapse;border:1px solid #cccccc">'
        + "".join(rows_html)
        + "</table>"
    )
