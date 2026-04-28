import time
import uuid
from typing import Any

import httpx

from app.config import settings
from app.schemas import SearchResultItem


class Neo4jClient:
    """Lightweight async Neo4j client (HTTP API) with graceful degradation."""

    def __init__(
        self,
        base_url: str | None = None,
        username: str | None = None,
        password: str | None = None,
    ):
        self.base_url = (base_url or settings.neo4j_url or "").rstrip("/")
        self.username = username or settings.neo4j_user or "neo4j"
        self.password = password or settings.neo4j_password or ""
        self.database = "neo4j"
        self._client: httpx.AsyncClient | None = None

    async def _get_client(self) -> httpx.AsyncClient:
        if self._client is None or self._client.is_closed:
            auth = (
                httpx.BasicAuth(self.username, self.password)
                if self.password
                else None
            )
            self._client = httpx.AsyncClient(
                timeout=5.0, follow_redirects=True, auth=auth
            )
        return self._client

    async def close(self):
        if self._client and not self._client.is_closed:
            await self._client.aclose()
            self._client = None

    async def health(self) -> bool:
        if not self.base_url:
            return False
        try:
            client = await self._get_client()
            response = await client.get(f"{self.base_url}/db/{self.database}/tx/commit")
            # Neo4j returns 200 even for empty commits; 401/403 means creds wrong but reachable.
            return response.status_code in (200, 401, 403)
        except Exception:
            return False

    async def search(
        self, query: str, limit: int = 20
    ) -> tuple[list[SearchResultItem], dict[str, Any]]:
        if not self.base_url:
            return [], {"status": "unavailable", "error": "Not configured"}

        start = time.perf_counter()
        try:
            client = await self._get_client()
            cypher = (
                "MATCH (n) "
                "WHERE toLower(n.title) CONTAINS toLower($query) "
                "OR toLower(n.name) CONTAINS toLower($query) "
                "OR toLower(n.description) CONTAINS toLower($query) "
                "RETURN n LIMIT $limit"
            )
            payload = {
                "statements": [
                    {
                        "statement": cypher,
                        "parameters": {"query": query, "limit": limit},
                    }
                ]
            }
            response = await client.post(
                f"{self.base_url}/db/{self.database}/tx/commit", json=payload
            )
            latency_ms = (time.perf_counter() - start) * 1000

            if response.status_code != 200:
                return [], {
                    "status": "error",
                    "error": f"HTTP {response.status_code}",
                    "latency_ms": latency_ms,
                }

            data = response.json()
            errors = data.get("errors", [])
            if errors:
                return [], {
                    "status": "error",
                    "error": errors[0].get("message", "Neo4j error"),
                    "latency_ms": latency_ms,
                }

            results: list[SearchResultItem] = []
            for result in data.get("results", []):
                for row in result.get("data", []):
                    node = row.get("row", [{}])[0]
                    doc_id = node.get("id")
                    try:
                        doc_uuid = uuid.UUID(doc_id) if doc_id else uuid.uuid4()
                    except ValueError:
                        doc_uuid = uuid.uuid4()
                    results.append(
                        SearchResultItem(
                            type=node.get("type", "entity"),
                            id=doc_uuid,
                            title=node.get("title") or node.get("name"),
                            snippet=node.get("description", "")[:200],
                            score=None,
                            backend="neo4j",
                        )
                    )
            return results, {
                "status": "ok",
                "count": len(results),
                "latency_ms": latency_ms,
            }
        except httpx.ConnectError as exc:
            latency_ms = (time.perf_counter() - start) * 1000
            return [], {
                "status": "unavailable",
                "error": str(exc),
                "latency_ms": latency_ms,
            }
        except Exception as exc:
            latency_ms = (time.perf_counter() - start) * 1000
            return [], {
                "status": "error",
                "error": str(exc),
                "latency_ms": latency_ms,
            }
