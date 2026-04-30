from typing import Type

import httpx
from crewai.tools import BaseTool
from pydantic import BaseModel, Field

from misjustice_crews.config.settings import settings


class BaseSearchTool(BaseTool):
    """Base for SearXNG search with tier-scoped result filtering."""

    def _search(self, query: str, categories: str = "general") -> str:
        base = (settings.searxng_url or "").rstrip("/")
        if not base:
            return "SearXNG URL not configured."
        params = {
            "q": query,
            "format": "json",
            "categories": categories,
        }
        try:
            with httpx.Client(timeout=30.0) as client:
                response = client.get(f"{base}/search", params=params)
                response.raise_for_status()
                data = response.json()
                results = data.get("results", [])[:10]
                if not results:
                    return "No results found."
                out = []
                for r in results:
                    title = r.get("title", "")
                    url = r.get("url", "")
                    snippet = r.get("content", "")
                    out.append(f"- {title}\n  URL: {url}\n  {snippet}")
                return "\n".join(out)
        except httpx.HTTPStatusError as e:
            return f"Search error: {e.response.status_code} - {e.response.text}"
        except httpx.RequestError as e:
            return f"Search request error: {e}"


class WebSearchInput(BaseModel):
    query: str = Field(description="Search query")


class WebSearchTool(BaseSearchTool):
    name: str = "web_search"
    description: str = "Search the web via SearXNG for general information."
    args_schema: Type[BaseModel] = WebSearchInput

    def _run(self, query: str) -> str:
        return self._search(query, categories="general")


class LegalSearchInput(BaseModel):
    query: str = Field(description="Legal search query")
    jurisdiction: str = Field(default="", description="Optional jurisdiction filter")


class LegalSearchTool(BaseSearchTool):
    name: str = "legal_search"
    description: str = "Search legal sources via SearXNG for statutes, cases, and regulations."
    args_schema: Type[BaseModel] = LegalSearchInput

    def _run(self, query: str, jurisdiction: str = "") -> str:
        q = query
        if jurisdiction:
            q = f"{q} jurisdiction:{jurisdiction}"
        return self._search(q, categories="general")


class NewsSearchInput(BaseModel):
    query: str = Field(description="News search query")


class NewsSearchTool(BaseSearchTool):
    name: str = "news_search"
    description: str = "Search news sources via SearXNG for recent events and public narrative."
    args_schema: Type[BaseModel] = NewsSearchInput

    def _run(self, query: str) -> str:
        return self._search(query, categories="news")
