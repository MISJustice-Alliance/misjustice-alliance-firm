import time
import uuid
from typing import Any

import httpx

from app.config import settings
from app.schemas import SearchResultItem


class QdrantClient:
    """Lightweight async Qdrant client with graceful degradation."""

    def __init__(self, base_url: str | None = None):
        self.base_url = (base_url or settings.qdrant_url or "").rstrip("/")
        self.collection = "mcas_vectors"
        self._client: httpx.AsyncClient | None = None

    async def _get_client(self) -> httpx.AsyncClient:
        if self._client is None or self._client.is_closed:
            self._client = httpx.AsyncClient(timeout=5.0, follow_redirects=True)
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
            response = await client.get(f"{self.base_url}/")
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
            # Qdrant scroll/list points as a proxy for vector search.
            # In production this would call the embedding service first.
            payload = {
                "limit": limit,
                "with_payload": True,
                "with_vector": False,
                "filter": {
                    "must": [
                        {
                            "key": "text",
                            "match": {"text": query},
                        }
                    ]
                },
            }
            response = await client.post(
                f"{self.base_url}/collections/{self.collection}/points/scroll",
                json=payload,
            )
            latency_ms = (time.perf_counter() - start) * 1000

            if response.status_code != 200:
                return [], {
                    "status": "error",
                    "error": f"HTTP {response.status_code}",
                    "latency_ms": latency_ms,
                }

            data = response.json()
            points = data.get("result", {}).get("points", [])
            results: list[SearchResultItem] = []
            for point in points:
                payload_data = point.get("payload", {})
                doc_id = payload_data.get("id")
                try:
                    doc_uuid = uuid.UUID(doc_id) if doc_id else uuid.uuid4()
                except ValueError:
                    doc_uuid = uuid.uuid4()
                results.append(
                    SearchResultItem(
                        type=payload_data.get("type", "document"),
                        id=doc_uuid,
                        title=payload_data.get("title") or payload_data.get("filename"),
                        snippet=payload_data.get("text", "")[:200],
                        score=payload_data.get("score"),
                        backend="qdrant",
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
