from unittest.mock import MagicMock, patch

import pytest

from misjustice_crews.tools.mcas_tools import (
    BaseMCASTool,
    DocumentAnalyzeTool,
    DocumentReadTool,
    MatterCreateTool,
    MatterReadTool,
    MatterWriteTool,
)
from misjustice_crews.tools.mcp_tools import (
    BaseMCPTool,
    MCPCasesGetTool,
    MCPCitationsResolveTool,
    MCPStatutesSearchTool,
)


class TestMCASTools:
    @patch("misjustice_crews.tools.mcas_tools.settings")
    def test_auth_header(self, mock_settings):
        mock_settings.mcas_api_url = "https://mcas.example.com"
        mock_settings.mcas_api_token = "test-token"

        tool = MatterReadTool()
        with patch("misjustice_crews.tools.mcas_tools.httpx.Client") as mock_client_cls:
            mock_response = MagicMock()
            mock_response.status_code = 200
            mock_response.text = "{}"
            mock_response.raise_for_status = MagicMock()
            mock_client = MagicMock()
            mock_client.request.return_value = mock_response
            mock_client_cls.return_value.__enter__.return_value = mock_client

            tool._run(matter_id="abc-123")
            call_args = mock_client.request.call_args
            headers = call_args.kwargs["headers"]
            assert headers["Authorization"] == "Bearer test-token"
            assert headers["Content-Type"] == "application/json"

    @patch("misjustice_crews.tools.mcas_tools.settings")
    def test_error_handling(self, mock_settings):
        mock_settings.mcas_api_url = "https://mcas.example.com"
        mock_settings.mcas_api_token = "test-token"

        tool = MatterReadTool()
        with patch("misjustice_crews.tools.mcas_tools.httpx.Client") as mock_client_cls:
            from httpx import HTTPStatusError, Response

            mock_response = MagicMock(spec=Response)
            mock_response.status_code = 404
            mock_response.text = "Not found"
            mock_response.raise_for_status.side_effect = HTTPStatusError(
                "Not found", request=MagicMock(), response=mock_response
            )
            mock_client = MagicMock()
            mock_client.request.return_value = mock_response
            mock_client_cls.return_value.__enter__.return_value = mock_client

            result = tool._run(matter_id="missing")
            assert "MCAS API error: 404" in result


class TestMCPTools:
    @patch("misjustice_crews.tools.mcp_tools.settings")
    def test_request_formatting(self, mock_settings):
        mock_settings.mcp_server_url = "https://mcp.example.com"

        tool = MCPCasesGetTool()
        with patch("misjustice_crews.tools.mcp_tools.httpx.Client") as mock_client_cls:
            mock_response = MagicMock()
            mock_response.status_code = 200
            mock_response.text = '{"result": "ok"}'
            mock_response.raise_for_status = MagicMock()
            mock_client = MagicMock()
            mock_client.post.return_value = mock_response
            mock_client_cls.return_value.__enter__.return_value = mock_client

            tool._run(case_id="CASE-001")
            call_args = mock_client.post.call_args
            assert call_args.args[0] == "https://mcp.example.com/mcp"
            payload = call_args.kwargs["json"]
            assert payload["jsonrpc"] == "2.0"
            assert payload["method"] == "tools/call"
            assert payload["params"]["name"] == "cases_get"
            assert payload["params"]["arguments"]["case_id"] == "CASE-001"

    @patch("misjustice_crews.tools.mcp_tools.settings")
    def test_missing_server_url(self, mock_settings):
        mock_settings.mcp_server_url = ""

        tool = MCPStatutesSearchTool()
        result = tool._run(query="due process")
        assert "MCP server URL not configured" in result
