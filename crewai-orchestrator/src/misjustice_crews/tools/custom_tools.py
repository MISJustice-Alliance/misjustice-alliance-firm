import re
from datetime import datetime
from typing import Type

from crewai.tools import BaseTool
from pydantic import BaseModel, Field


class TimelineBuildInput(BaseModel):
    events: list[dict] = Field(
        description="List of event dicts with 'date' (YYYY-MM-DD or free text) and 'description' keys"
    )


class TimelineBuilderTool(BaseTool):
    """Build a chronological timeline from a list of events."""

    name: str = "timeline_build"
    description: str = (
        "Build a chronological timeline from a list of events. "
        "Input: list of dicts with 'date' and 'description'. "
        "Output: sorted Markdown timeline with conflict flags."
    )
    args_schema: Type[BaseModel] = TimelineBuildInput

    def _run(self, events: list[dict]) -> str:
        if not events:
            return "No events provided."

        parsed = []
        for ev in events:
            date_str = ev.get("date", "")
            desc = ev.get("description", "")
            parsed_dt = None
            try:
                parsed_dt = datetime.strptime(date_str, "%Y-%m-%d")
            except (ValueError, TypeError):
                pass
            parsed.append({"raw_date": date_str, "parsed": parsed_dt, "description": desc})

        # Sort: parsed dates first, then raw strings
        parsed.sort(key=lambda x: (x["parsed"] is None, x["parsed"] or x["raw_date"]))

        lines = ["# Chronology", ""]
        prev_dt = None
        for ev in parsed:
            dt = ev["parsed"]
            flag = ""
            if dt and prev_dt and dt < prev_dt:
                flag = " **[DATE CONFLICT]**"
            lines.append(f"- **{ev['raw_date']}**: {ev['description']}{flag}")
            if dt:
                prev_dt = dt

        return "\n".join(lines)


class CitationFormatInput(BaseModel):
    citations: list[str] = Field(description="List of raw citation strings to format")
    style: str = Field(default="bluebook", description="Citation style: bluebook, apa, mla")


class CitationFormatterTool(BaseTool):
    """Format legal citations to a standard style (heuristic)."""

    name: str = "citation_format"
    description: str = (
        "Format legal citations to Bluebook, APA, or MLA style. "
        "Handles case citations, statute citations, and regulatory citations heuristically."
    )
    args_schema: Type[BaseModel] = CitationFormatInput

    def _run(self, citations: list[str], style: str = "bluebook") -> str:
        style = style.lower().strip()
        formatted = []
        for raw in citations:
            formatted.append(self._format_one(raw, style))
        return "\n".join(formatted)

    def _format_one(self, raw: str, style: str) -> str:
        raw = raw.strip()
        # Case citation heuristic: Name v. Name, 123 F.3d 456 (9th Cir. 2024)
        case_match = re.match(r"^(.*v\.\s*.*?),?\s*(\d+)\s+([A-Za-z\.\d]+)\s+(\d+).*?\((.*?)\)\s*(\d{4})?", raw)
        if case_match:
            parties, vol, reporter, page, court, year = case_match.groups()
            parties = parties.strip()
            if style == "bluebook":
                yr = year or ""
                return f"{parties}, {vol} {reporter} {page} ({court} {yr}).".replace("  ", " ")
            if style == "apa":
                return f"{parties} ({year}) {vol} {reporter} {page}."
            return raw

        # Statute heuristic: 42 U.S.C. § 1983
        statute_match = re.match(r"^(\d+)\s+([A-Za-z\.]+)\s+§\s*([\d\(\)a-z]+)", raw)
        if statute_match:
            title, code, section = statute_match.groups()
            if style == "bluebook":
                return f"{title} {code} § {section}."
            return raw

        # Fallback
        return raw


class DeadlineTrackerInput(BaseModel):
    deadlines: list[dict] = Field(
        description="List of deadline dicts with 'date' (YYYY-MM-DD), 'description', and optional 'matter_id'"
    )


class DeadlineTrackerTool(BaseTool):
    """Track deadlines and flag upcoming or overdue items."""

    name: str = "deadline_tracker"
    description: str = (
        "Track legal deadlines. Input: list of dicts with 'date', 'description', 'matter_id'. "
        "Output: sorted list with status (overdue, upcoming, ok)."
    )
    args_schema: Type[BaseModel] = DeadlineTrackerInput

    def _run(self, deadlines: list[dict]) -> str:
        if not deadlines:
            return "No deadlines provided."

        today = datetime.now().date()
        items = []
        for d in deadlines:
            date_str = d.get("date", "")
            desc = d.get("description", "")
            matter = d.get("matter_id", "")
            try:
                dt = datetime.strptime(date_str, "%Y-%m-%d").date()
            except (ValueError, TypeError):
                items.append(f"- {date_str}: {desc} (matter: {matter}) [INVALID DATE]")
                continue

            delta = (dt - today).days
            if delta < 0:
                status = f"OVERDUE by {abs(delta)} days"
            elif delta <= 7:
                status = f"UPCOMING ({delta} days)"
            else:
                status = "OK"
            items.append(f"- {date_str}: {desc} (matter: {matter}) [{status}]")

        return "# Deadlines\n" + "\n".join(items)
