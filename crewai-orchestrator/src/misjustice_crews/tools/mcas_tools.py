from __future__ import annotations

import json
import os
from dataclasses import dataclass
from typing import Any, Type

import httpx
from crewai.tools import BaseTool
from pydantic import BaseModel, Field

from misjustice_crews.config.settings import settings


class BaseMCASTool(BaseTool):
    """Base tool for MCAS API calls with auth and error handling."""

    def _make_request(self, method: str, path: str, **kwargs) -> str:
        base = settings.mcas_api_url.rstrip("/")
        url = f"{base}{path}"
        headers = {
            "Authorization": f"Bearer {settings.mcas_api_token}",
            "Content-Type": "application/json",
        }
        try:
            with httpx.Client(timeout=30.0) as client:
                response = client.request(method, url, headers=headers, **kwargs)
                response.raise_for_status()
                return response.text
        except httpx.HTTPStatusError as e:
            return f"MCAS API error: {e.response.status_code} - {e.response.text}"
        except httpx.RequestError as e:
            return f"MCAS request error: {e}"


class MatterReadInput(BaseModel):
    matter_id: str = Field(description="Matter UUID or identifier")


class MatterReadTool(BaseMCASTool):
    name: str = "matter_read"
    description: str = "Read a matter record from MCAS by matter_id."
    args_schema: Type[BaseModel] = MatterReadInput

    def _run(self, matter_id: str) -> str:
        return self._make_request("GET", f"/matters/{matter_id}")


class MatterWriteInput(BaseModel):
    matter_id: str = Field(description="Matter UUID or identifier")
    payload: dict = Field(description="Fields to update")


class MatterWriteTool(BaseMCASTool):
    name: str = "matter_write"
    description: str = "Update a matter record in MCAS."
    args_schema: Type[BaseModel] = MatterWriteInput

    def _run(self, matter_id: str, payload: dict) -> str:
        return self._make_request("PATCH", f"/matters/{matter_id}", json=payload)


class MatterCreateInput(BaseModel):
    payload: dict = Field(description="Matter creation payload")


class MatterCreateTool(BaseMCASTool):
    name: str = "matter_create"
    description: str = "Create a new matter record in MCAS."
    args_schema: Type[BaseModel] = MatterCreateInput

    def _run(self, payload: dict) -> str:
        return self._make_request("POST", "/matters", json=payload)


class DocumentReadInput(BaseModel):
    document_id: str = Field(description="Document UUID or identifier")


class DocumentReadTool(BaseMCASTool):
    name: str = "document_read"
    description: str = "Read a document from MCAS by document_id."
    args_schema: Type[BaseModel] = DocumentReadInput

    def _run(self, document_id: str) -> str:
        return self._make_request("GET", f"/documents/{document_id}")


class DocumentAnalyzeInput(BaseModel):
    document_id: str = Field(description="Document UUID or identifier")


class DocumentAnalyzeTool(BaseMCASTool):
    name: str = "document_analyze"
    description: str = "Trigger analysis of a document in MCAS."
    args_schema: Type[BaseModel] = DocumentAnalyzeInput

    def _run(self, document_id: str) -> str:
        return self._make_request("POST", f"/documents/{document_id}/analyze")


class StructuredThinkInput(BaseModel):
    prompt: str = Field(description="De-identified analysis prompt")
    mode: str = Field(default="analytical", description="analytical, critical, synthesis, validation")
    custom_lens: str = Field(default="legal-theory", description="Task-specific lens")
    matter_id: str | None = Field(default=None, description="Associated MCAS matter ID")


class StructuredThinkTool(BaseTool):
    name: str = "structured_think"
    description: str = (
        "Run MindKit structured sequential thinking on de-identified Tier-2 prompts "
        "and return a confidence-scored trace packet."
    )
    args_schema: Type[BaseModel] = StructuredThinkInput

    def _run(self, prompt: str, mode: str = "analytical", custom_lens: str = "legal-theory", matter_id: str | None = None) -> str:
        endpoint = os.getenv("MINDKIT_BASE_URL", "http://127.0.0.1:3100").rstrip("/")
        payload = {
            "prompt": prompt,
            "mode": mode,
            "custom_lens": custom_lens,
            "matter_id": matter_id,
            "data_tier": settings.data_tier_default,
        }
        with httpx.Client(timeout=30.0) as client:
            response = client.post(f"{endpoint}/think", json=payload)
            response.raise_for_status()
            return response.text
