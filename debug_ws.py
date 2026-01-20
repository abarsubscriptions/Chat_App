import asyncio
import httpx
import websockets
import json

API_URL = "http://localhost:8000"
WS_URL = "ws://localhost:8000/ws"

async def main():
    # 1. Register/Login to get Token
    async with httpx.AsyncClient() as client:
        # Register if not exists (ignore error)
        try:
            r = await client.post(f"{API_URL}/register", json={
                "name": "Debug User", 
                "email": "debug_ws@example.com", 
                "password": "password"
            })
        except:
            pass
        
        # Login
        r = await client.post(f"{API_URL}/token", data={
            "username": "debug_ws@example.com",
            "password": "password"
        })
        if r.status_code != 200:
            print(f"Login failed: {r.text}")
            return
            
        token = r.json()["access_token"]
        print(f"Got token: {token[:10]}...")

        # 2. Connect to WebSocket
        uri = f"{WS_URL}?token={token}"
        try:
            async with websockets.connect(uri) as websocket:
                print("WebSocket Connected!")
                
                # Send a message
                await websocket.send(json.dumps({
                    "recipient_id": "some_id",
                    "content": "Hello World",
                    "is_group": False
                }))
                print("Message sent")
                
        except Exception as e:
            print(f"WebSocket Error: {e}")

if __name__ == "__main__":
    asyncio.run(main())
