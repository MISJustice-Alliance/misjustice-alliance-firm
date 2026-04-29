import time
import uuid
from typing import Any

import httpx

from app.config import settings
from app.schemas import SearchResultItem


class ElasticsearchClient:
    """Lightweight async Elasticsearch client with graceful degradation."""

    def __init__(self, base_url: str | None = None) -> None:
        self.base_url = (base_url or settings.elasticsearch_url or "").rstrip("/")
        self.index = "mcas"
        self._client: httpx.AsyncClient | None = None

    async def _get_client(self) -> httpx.AsyncClient:
        if self._client is None or self._client.is_closed:
            self._client = httpx.AsyncClient(timeout=5.0, follow_redirects=True)
        return self._client

    async def close(self) -> None:
        if self._client and not self._client.is_closed:
            await self._client.aclose()
            self._client = None

    async def health(self) -> bool:
        if not self.base_url:
            return False
        try:
            client = await self._get_client()
            response = await client.get(f"{self.base_url}/_cluster/health")
            return response.status_code == 200
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
            payload = {
                "query": {
                    "multi_match": {
                        "query": query,
                        "fields": ["title^3", "content", "filename", "description"],
                    }
                },
                "size": limit,
            }
            response = await client.post(f"{self.base_url}/{self.index}/_search", json=payload)
            latency_ms = (time.perf_counter() - start) * 1000

            if response.status_code != 200:
                return [], {
                    "status": "error",
                    "error": f"HTTP {response.status_code}",
                    "latency_ms": latency_ms,
                }

            data = response.json()
            hits = data.get("hits", {}).get("hits", [])
            results: list[SearchResultItem] = []
            for hit in hits:
                source = hit.get("_source", {})
                doc_id = source.get("id")
                try:
                    doc_uuid = uuid.UUID(doc_id) if doc_id else uuid.uuid4()
                except ValueError:
                    doc_uuid = uuid.uuid4()
                results.append(
                    SearchResultItem(
                        type=source.get("type", "document"),
                        id=doc_uuid,
                        title=source.get("title") or source.get("filename"),
                        snippet=source.get("content", "")[:200],
                        score=hit.get("_score"),
                        backend="elasticsearch",
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
