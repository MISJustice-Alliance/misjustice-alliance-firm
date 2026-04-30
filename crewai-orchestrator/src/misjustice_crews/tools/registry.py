"""Tool registry: maps tool names from tools.yaml to instantiated CrewAI tools."""

from crewai.tools import BaseTool

from misjustice_crews.tools.custom_tools import (
    CitationFormatterTool,
    DeadlineTrackerTool,
    TimelineBuilderTool,
)
from misjustice_crews.tools.document_tools import (
    AnomalyDetectionTool,
    DocumentClassificationTool,
    OCRDocumentTool,
    PIIRedactionTool,
)
from misjustice_crews.tools.mcas_tools import (
    DocumentAnalyzeTool,
    DocumentReadTool,
    MatterCreateTool,
    MatterReadTool,
    MatterWriteTool,
)
from misjustice_crews.tools.mcp_tools import (
    MCPCasesGetTool,
    MCPCitationsResolveTool,
    MCPStatutesSearchTool,
)
from misjustice_crews.tools.web_search_tools import (
    LegalSearchTool,
    NewsSearchTool,
    WebSearchTool,
)

_TOOL_MAP: dict[str, type[BaseTool]] = {
    # MCAS
    "matter_read": MatterReadTool,
    "matter_write": MatterWriteTool,
    "matter_create": MatterCreateTool,
    "document_read": DocumentReadTool,
    "document_analyze": DocumentAnalyzeTool,
    # MCP
    "mcp_cases_get": MCPCasesGetTool,
    "mcp_citations_resolve": MCPCitationsResolveTool,
    "mcp_statutes_search": MCPStatutesSearchTool,
    # Web search
    "web_search": WebSearchTool,
    "legal_search": LegalSearchTool,
    "news_search": NewsSearchTool,
    # Document
    "pii_redaction": PIIRedactionTool,
    "document_anomaly_check": AnomalyDetectionTool,
    "document_classify": DocumentClassificationTool,
    "document_ocr": OCRDocumentTool,
    # Custom
    "timeline_build": TimelineBuilderTool,
    "citation_format": CitationFormatterTool,
    "deadline_tracker": DeadlineTrackerTool,
}


def resolve_tools(tool_names: list[str]) -> list[BaseTool]:
    """Instantiate tools by name list (from tools.yaml)."""
    tools: list[BaseTool] = []
    for name in tool_names:
        cls = _TOOL_MAP.get(name)
        if cls:
            tools.append(cls())
    return tools


def list_available_tools() -> list[str]:
    return sorted(_TOOL_MAP.keys())
