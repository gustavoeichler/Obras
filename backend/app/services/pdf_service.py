"""HTML/CSS → PDF helper.

Uses WeasyPrint when installed; otherwise falls back to a minimal HTML
'PDF' (just the rendered HTML bytes) so that development environments
without GTK can still exercise the flow. The fallback is clearly marked
in the response Content-Type by the calling route.
"""
from __future__ import annotations

import os
from typing import Any

from flask import render_template


def _flask_template_dir() -> str:
    return os.path.join(os.path.dirname(__file__), "..", "templates")


def render_pdf(template_name: str, context: dict[str, Any]) -> tuple[bytes, str]:
    """Return (bytes, mimetype). Mimetype tells the caller whether the
    output is a real PDF or an HTML fallback."""
    html = render_template(template_name, **context)

    try:
        from weasyprint import HTML  # type: ignore
        pdf = HTML(string=html, base_url=_flask_template_dir()).write_pdf()
        return pdf, "application/pdf"
    except Exception:
        # WeasyPrint not available (Windows dev without GTK, etc.).
        # Return the HTML so the user still sees a printable artifact.
        return html.encode("utf-8"), "text/html"


def write_to_uploads(content: bytes, project_id: int, filename: str) -> str:
    """Persist generated artifacts under UPLOAD_FOLDER/generated/<project_id>/.

    Returns the stored filename (relative to UPLOAD_FOLDER) so the caller
    can record it on a Document row.
    """
    from flask import current_app

    base = os.path.join(current_app.config["UPLOAD_FOLDER"], "generated", str(project_id))
    os.makedirs(base, exist_ok=True)
    full = os.path.join(base, filename)
    with open(full, "wb") as f:
        f.write(content)
    return os.path.relpath(full, current_app.config["UPLOAD_FOLDER"]).replace("\\", "/")
