import pytest
from unittest.mock import MagicMock, patch
from mcp_server.server import get_user_data

@pytest.mark.asyncio
async def test_get_user_data_success():
    mock_response = MagicMock()
    mock_response.status_code = 200
    mock_response.json.return_value = {"id": "some_id", "name": "Alice", "status": "active"}

    with patch("httpx.AsyncClient") as mock_client_cls:
        mock_client = mock_client_cls.return_value
        mock_client.__aenter__.return_value.get.return_value = mock_response

        # Pass a string ID now
        result = await get_user_data("some_id")
        assert result["name"] == "Alice"

@pytest.mark.asyncio
async def test_get_user_data_not_found():
    mock_response = MagicMock()
    mock_response.status_code = 404
    from httpx import HTTPStatusError, Request
    request = Request("GET", "http://test")
    error = HTTPStatusError("404 Not Found", request=request, response=mock_response)
    
    with patch("httpx.AsyncClient") as mock_client_cls:
        mock_client = mock_client_cls.return_value
        mock_get = mock_client.__aenter__.return_value.get
        mock_response.raise_for_status.side_effect = error
        mock_get.return_value = mock_response

        result = await get_user_data("non_existent_id")
        assert result == {"error": "User not found"}
