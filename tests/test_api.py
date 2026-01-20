from fastapi.testclient import TestClient
from unittest.mock import MagicMock, AsyncMock, patch
from api.main import app
from bson import ObjectId

client = TestClient(app)

# Mock user data
mock_user_id = str(ObjectId())
mock_user_data = {
    "_id": ObjectId(mock_user_id),
    "name": "Test User",
    "email": "test@example.com",
    "password": "hashed_password",
    "status": "active"
}

def test_register_success():
    with patch("api.main.db") as mock_db:
        # Mock find_one to return None (user doesn't exist)
        mock_db.users.find_one = AsyncMock(side_effect=[None, mock_user_data])
        # Mock insert_one
        mock_insert_result = MagicMock()
        mock_insert_result.inserted_id = ObjectId(mock_user_id)
        mock_db.users.insert_one = AsyncMock(return_value=mock_insert_result)
        
        # We also need to mock get_password_hash
        with patch("api.main.get_password_hash") as mock_hash:
             mock_hash.return_value = "hashed"

             response = client.post("/register", json={
                 "name": "Test User",
                 "email": "test@example.com",
                 "password": "password123"
             })
             
             assert response.status_code == 200
             assert response.json()["email"] == "test@example.com"

def test_login_success():
    with patch("api.main.db") as mock_db:
        mock_db.users.find_one = AsyncMock(return_value=mock_user_data)
        
        with patch("api.main.verify_password", return_value=True):
            response = client.post("/token", data={
                "username": "test@example.com",
                "password": "password123"
            })
            assert response.status_code == 200
            assert "access_token" in response.json()

def test_get_user_success():
    with patch("api.main.db") as mock_db:
        mock_db.users.find_one = AsyncMock(return_value=mock_user_data)
        
        response = client.get(f"/users/{mock_user_id}")
        assert response.status_code == 200
        assert response.json()["name"] == "Test User"

def test_websocket_endpoint():
    # We patch the auth helper and connection manager
    with patch("api.main.get_user_from_token", new_callable=AsyncMock) as mock_get_user:
        mock_get_user.return_value = mock_user_id
        
        with patch("api.main.manager.connect", new_callable=AsyncMock) as mock_connect:
            with patch("api.main.manager.disconnect", new_callable=AsyncMock) as mock_disconnect:
                
                with client.websocket_connect("/ws?token=valid_token") as websocket:
                    mock_connect.assert_called_with(websocket, mock_user_id)
                    # We won't test full message loop here as it's infinite, 
                    # but connection success is verified.
