from mcp.server.fastmcp import FastMCP
import httpx

mcp = FastMCP("User Data MCP")

API_URL = "http://localhost:8000"

@mcp.tool()
async def get_user_data(user_id: str) -> dict:
    """
    Get user data by user ID from the API.
    
    Args:
        user_id: The ID of the user to retrieve (MongoDB ObjectId string).
    """
    async with httpx.AsyncClient() as client:
        try:
            response = await client.get(f"{API_URL}/users/{user_id}")
            response.raise_for_status()
            return response.json()
        except httpx.HTTPStatusError as e:
            if e.response.status_code == 404:
                return {"error": "User not found"}
            return {"error": f"API error: {str(e)}"}
        except httpx.RequestError as e:
             return {"error": f"Connection error: {str(e)}"}

if __name__ == "__main__":
    mcp.run()
