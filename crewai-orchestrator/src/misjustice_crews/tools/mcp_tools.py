from typing import Any, Type

import httpx
from crewai.tools import BaseTool
from pydantic import BaseModel, Field

from misjustice_crews.config.settings import settings


class BaseMCPTool(BaseTool):
    """Base tool for MCP server integration via HTTP JSON-RPC."""

    mcp_tool_name: str = ""

    def _call_mcp(self, arguments: dict) -> str:
        base = (settings.mcp_server_url or "").rstrip("/")
        if not base:
            return "MCP server URL not configured."
        payload = {
            "jsonrpc": "2.0",
            "method": "tools/call",
            "params": {"name": self.mcp_tool_name, "arguments": arguments},
            "id": 1,
        }
        try:
            with httpx.Client(timeout=30.0) as client:
                response = client.post(f"{base}/mcp", json=payload)
                response.raise_for_status()
                return response.text
        except httpx.HTTPStatusError as e:
            return f"MCP error: {e.response.status_code} - {e.response.text}"
        except httpx.RequestError as e:
            return f"MCP request error: {e}"


class MCPCasesGetInput(BaseModel):
    case_id: str = Field(description="Case identifier")


class MCPCasesGetTool(BaseMCPTool):
    name: str = "mcp_cases_get"
    description: str = "Retrieve case data from the legal-research MCP server."
    args_schema: Type[BaseModel] = MCPCasesGetInput
    mcp_tool_name: str = "cases_get"

    def _run(self, case_id: str) -> str:
        return self._call_mcp({"case_id": case_id})


class MCPCitationsResolveInput(BaseModel):
    citations: list[str] = Field(description="List of citation strings to resolve")


class MCPCitationsResolveTool(BaseMCPTool):
    name: str = "mcp_citations_resolve"
    description: str = "Resolve legal citations via the MCP server."
    args_schema: Type[BaseModel] = MCPCitationsResolveInput
    mcp_tool_name: str = "citations_resolve"

    def _run(self, citations: list[str]) -> str:
        return self._call_mcp({"citations": citations})


class MCPStatutesSearchInput(BaseModel):
    query: str = Field(description="Search query for statutes")
    jurisdiction: str = Field(default="", description="Optional jurisdiction filter")


class MCPStatutesSearchTool(BaseMCPTool):
    name: str = "mcp_statutes_search"
    description: str = "Search statutes via the MCP server."
    args_schema: Type[BaseModel] = MCPStatutesSearchInput
    mcp_tool_name: str = "statutes_search"

    def _run(self, query: str, jurisdiction: str = "") -> str:
        return self._call_mcp({"query": query, "jurisdiction": jurisdiction})
