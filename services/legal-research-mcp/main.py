"""Legal Research MCP — Model Context Protocol tool registry."""

from fastapi import FastAPI

app = FastAPI(title="Legal Research MCP", version="0.1.0")

MOCK_TOOLS = [
    {
        "name": "statute_lookup",
        "description": "Look up statutes by citation or keyword.",
        "parameters": {"citation": "string", "jurisdiction": "string"},
    },
    {
        "name": "case_law_search",
        "description": "Search case law databases.",
        "parameters": {"query": "string", "court": "string", "year": "integer"},
    },
    {
        "name": "regulation_check",
        "description": "Check federal and state regulations.",
        "parameters": {"topic": "string", "agency": "string"},
    },
    {
        "name": "citation_graph",
        "description": "Build a graph of case citations.",
        "parameters": {"seed_case": "string", "depth": "integer"},
    },
]


@app.get("/health")
async def health() -> dict:
    return {"status": "ok", "service": "legal-research-mcp"}


@app.get("/tools")
async def tools() -> dict:
    """Return the list of available legal research tools."""
    return {"tools": MOCK_TOOLS, "count": len(MOCK_TOOLS)}
