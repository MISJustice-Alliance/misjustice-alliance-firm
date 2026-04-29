"""Tests for PaperclipClient — API, local-registry, and stub fallback paths."""

from unittest.mock import AsyncMock, MagicMock, patch

import httpx
import pytest
import yaml

from misjustice_crews.bridge.paperclip_client import PaperclipClient, _tier_leq


@pytest.fixture
def stub_client():
    """Client with no base_url and no registry → always stub fallback."""
    with patch(
        "misjustice_crews.bridge.paperclip_client._find_registry_path", return_value=None
    ):
        return PaperclipClient(base_url="", registry_path="/dev/null")


@pytest.fixture
def local_registry(tmp_path):
    """Minimal agent-registry.yaml for local-policy tests."""
    reg = {
        "registry": {
            "rae": {
                "policy": {
                    "tier_ceiling": "T2",
                    "allowed_tools": ["MatterReadTool", "VictimImpactTool"],
                    "denied_tools": ["PublishTool", "ExternalTransmitTool"],
                    "status": "active",
                }
            },
            "atlas": {
                "policy": {
                    "tier_ceiling": "T1",
                    "allowed_tools": [],
                    "denied_tools": [],
                    "status": "active",
                }
            },
            "suspended_agent": {
                "policy": {
                    "tier_ceiling": "T3",
                    "allowed_tools": ["PublishTool"],
                    "denied_tools": [],
                    "status": "suspended",
                }
            },
        }
    }
    p = tmp_path / "agent-registry.yaml"
    p.write_text(yaml.dump(reg), encoding="utf-8")
    return str(p)


# ------------------------------------------------------------------
# Tier helpers
# ------------------------------------------------------------------

def test_tier_leq():
    assert _tier_leq("T0", "T1") is True
    assert _tier_leq("T1", "T1") is True
    assert _tier_leq("T2", "T1") is False
    assert _tier_leq("T3", "T0") is False
    assert _tier_leq("T2", "T3") is True


# ------------------------------------------------------------------
# Stub fallback (no base_url, no registry)
# ------------------------------------------------------------------

@pytest.mark.asyncio
async def test_stub_always_allows(stub_client):
    assert await stub_client.check_agent_deployment("anyone") is True
    assert await stub_client.check_tool_allowed("anyone", "AnyTool") is True
    assert await stub_client.check_classification_ceiling("anyone", "T0") is True

    result = await stub_client.validate_task(["foo"], "T0", ["BarTool"])
    assert result["allowed"] is True
    assert result["source"] == "stub"


# ------------------------------------------------------------------
# Local registry fallback
# ------------------------------------------------------------------

@pytest.mark.asyncio
async def test_local_registry_deployment(local_registry):
    client = PaperclipClient(base_url="", registry_path=local_registry)
    assert await client.check_agent_deployment("rae") is True
    assert await client.check_agent_deployment("suspended_agent") is False
    assert await client.check_agent_deployment("unknown") is True  # stub fallback


@pytest.mark.asyncio
async def test_local_registry_tool_allowed(local_registry):
    client = PaperclipClient(base_url="", registry_path=local_registry)
    assert await client.check_tool_allowed("rae", "MatterReadTool") is True
    assert await client.check_tool_allowed("rae", "VictimImpactTool") is True
    assert await client.check_tool_allowed("rae", "PublishTool") is False
    assert await client.check_tool_allowed("rae", "ExternalTransmitTool") is False
    # unknown agent → stub fallback
    assert await client.check_tool_allowed("nobody", "PublishTool") is True


@pytest.mark.asyncio
async def test_local_registry_tool_allowlist(local_registry):
    client = PaperclipClient(base_url="", registry_path=local_registry)
    # atlas has empty allowed_tools list → nothing is allowed
    assert await client.check_tool_allowed("atlas", "MatterReadTool") is False
    assert await client.check_tool_allowed("atlas", "AnyTool") is False


@pytest.mark.asyncio
async def test_local_registry_classification_ceiling(local_registry):
    client = PaperclipClient(base_url="", registry_path=local_registry)
    assert await client.check_classification_ceiling("rae", "T2") is True
    assert await client.check_classification_ceiling("rae", "T3") is True
    assert await client.check_classification_ceiling("rae", "T1") is False
    assert await client.check_classification_ceiling("atlas", "T1") is True
    assert await client.check_classification_ceiling("atlas", "T2") is True


@pytest.mark.asyncio
async def test_local_registry_validate_task(local_registry):
    client = PaperclipClient(base_url="", registry_path=local_registry)
    result = await client.validate_task(
        agent_ids=["rae", "suspended_agent"],
        data_tier="T2",
        tool_names=["MatterReadTool", "PublishTool"],
    )
    assert result["allowed"] is False
    assert result["source"] == "local_registry"
    violations = result["violations"]
    assert any(v["check"] == "deployment" and v["agent"] == "suspended_agent" for v in violations)
    assert any(v["check"] == "tool" and v["tool"] == "PublishTool" for v in violations)


# ------------------------------------------------------------------
# Paperclip API path
# ------------------------------------------------------------------

@pytest.mark.asyncio
async def test_api_agent_deployment_success():
    client = PaperclipClient(base_url="http://paperclip.test", api_token="tok")
    mock_resp = MagicMock()
    mock_resp.status_code = 200
    mock_resp.json.return_value = {"status": "active"}

    with patch.object(client._client, "get", new_callable=AsyncMock, return_value=mock_resp):
        assert await client.check_agent_deployment("rae") is True


@pytest.mark.asyncio
async def test_api_agent_deployment_not_found():
    client = PaperclipClient(base_url="http://paperclip.test")
    mock_resp = MagicMock()
    mock_resp.status_code = 404

    with patch.object(client._client, "get", new_callable=AsyncMock, return_value=mock_resp):
        assert await client.check_agent_deployment("rae") is False


@pytest.mark.asyncio
async def test_api_tool_allowed():
    client = PaperclipClient(base_url="http://paperclip.test")
    mock_resp = MagicMock()
    mock_resp.status_code = 200
    mock_resp.json.return_value = {"allowed": False}

    with patch.object(client._client, "get", new_callable=AsyncMock, return_value=mock_resp):
        assert await client.check_tool_allowed("rae", "PublishTool") is False


@pytest.mark.asyncio
async def test_api_classification_ceiling():
    client = PaperclipClient(base_url="http://paperclip.test")
    mock_resp = MagicMock()
    mock_resp.status_code = 200
    mock_resp.json.return_value = {"allowed": True}

    with patch.object(client._client, "get", new_callable=AsyncMock, return_value=mock_resp):
        assert await client.check_classification_ceiling("rae", "T1") is True


@pytest.mark.asyncio
async def test_api_unreachable_falls_back_to_local(local_registry):
    client = PaperclipClient(
        base_url="http://paperclip.test",
        registry_path=local_registry,
    )
    exc = httpx.ConnectError("Connection refused")

    with patch.object(client._client, "get", new_callable=AsyncMock, side_effect=exc):
        # Falls back to local registry → rae is active, tier T2
        assert await client.check_agent_deployment("rae") is True
        assert await client.check_classification_ceiling("rae", "T3") is True
        assert await client.check_tool_allowed("rae", "PublishTool") is False


@pytest.mark.asyncio
async def test_api_unreachable_no_local_registry():
    with patch(
        "misjustice_crews.bridge.paperclip_client._find_registry_path", return_value=None
    ):
        client = PaperclipClient(base_url="http://paperclip.test", registry_path="/dev/null")
    exc = httpx.ConnectError("Connection refused")

    with patch.object(client._client, "get", new_callable=AsyncMock, side_effect=exc):
        # Falls back all the way to stub (no local registry loaded)
        assert await client.check_agent_deployment("rae") is True
        assert await client.check_tool_allowed("rae", "Anything") is True


@pytest.mark.asyncio
async def test_close():
    client = PaperclipClient(base_url="http://paperclip.test")
    client._http = AsyncMock()
    mock_http = client._http
    await client.close()
    mock_http.aclose.assert_awaited_once()
    assert client._http is None
