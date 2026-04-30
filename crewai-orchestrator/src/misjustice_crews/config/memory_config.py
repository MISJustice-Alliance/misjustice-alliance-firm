"""Memory backend configuration per agent tier."""

from enum import Enum
from typing import Any

from misjustice_crews.config.settings import settings


class MemoryBackend(str, Enum):
    """Supported memory backends."""

    REDIS = "redis"
    QDRANT = "qdrant"
    LANCEDB = "lancedb"
    IN_MEMORY = "in_memory"


class MemoryConfig:
    """Resolve memory backend and parameters based on agent/data tier."""

    @staticmethod
    def for_agent(agent_id: str, data_tier: str = "T2") -> dict[str, Any]:
        tier = (data_tier or "T2").upper()

        # T0/T1: local-only, in-memory or Redis (if configured)
        if tier in ("T0", "T1"):
            if settings.redis_url:
                return {
                    "backend": MemoryBackend.REDIS,
                    "url": settings.redis_url,
                    "key_prefix": f"misjustice:{agent_id}:memory",
                }
            return {"backend": MemoryBackend.IN_MEMORY}

        # T2: Qdrant for vector memory (if configured)
        if tier == "T2":
            if settings.qdrant_url:
                return {
                    "backend": MemoryBackend.QDRANT,
                    "url": settings.qdrant_url,
                    "collection": f"misjustice_{agent_id}",
                }
            if settings.redis_url:
                return {
                    "backend": MemoryBackend.REDIS,
                    "url": settings.redis_url,
                    "key_prefix": f"misjustice:{agent_id}:memory",
                }
            return {"backend": MemoryBackend.IN_MEMORY}

        # T3: full vector + Redis hybrid
        if settings.qdrant_url and settings.redis_url:
            return {
                "backend": MemoryBackend.QDRANT,
                "url": settings.qdrant_url,
                "collection": f"misjustice_{agent_id}",
                "metadata_store": {
                    "backend": MemoryBackend.REDIS,
                    "url": settings.redis_url,
                    "key_prefix": f"misjustice:{agent_id}:meta",
                },
            }
        if settings.qdrant_url:
            return {
                "backend": MemoryBackend.QDRANT,
                "url": settings.qdrant_url,
                "collection": f"misjustice_{agent_id}",
            }
        if settings.redis_url:
            return {
                "backend": MemoryBackend.REDIS,
                "url": settings.redis_url,
                "key_prefix": f"misjustice:{agent_id}:memory",
            }
        return {"backend": MemoryBackend.IN_MEMORY}

    @staticmethod
    def short_term(agent_id: str) -> dict[str, Any]:
        """Short-term working memory (conversation context)."""
        if settings.redis_url:
            return {
                "backend": MemoryBackend.REDIS,
                "url": settings.redis_url,
                "key_prefix": f"misjustice:{agent_id}:stm",
                "ttl": 3600,
            }
        return {"backend": MemoryBackend.IN_MEMORY}

    @staticmethod
    def long_term(agent_id: str, data_tier: str = "T2") -> dict[str, Any]:
        """Long-term persistent memory (facts, precedents, embeddings)."""
        return MemoryConfig.for_agent(agent_id, data_tier)
