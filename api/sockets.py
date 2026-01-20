from fastapi import WebSocket
from typing import Dict, List
import json
from api.database import db
from api.models import MessageModel
from datetime import datetime

class ConnectionManager:
    def __init__(self):
        # user_id -> List of WebSockets (user might be connected from multiple devices)
        self.active_connections: Dict[str, List[WebSocket]] = {}
        # group_id -> List of user_ids (This could be cached, but fetching from DB is safer for now)

    async def connect(self, websocket: WebSocket, user_id: str):
        await websocket.accept()
        if user_id not in self.active_connections:
            self.active_connections[user_id] = []
        self.active_connections[user_id].append(websocket)
        
        # 1. Send current online users
        online_users = list(self.active_connections.keys())
        await websocket.send_json({
            "type": "online_users",
            "users": online_users
        })
        
        # 2. Notify others
        await self.notify_online_status(user_id, "online")

    async def disconnect(self, websocket: WebSocket, user_id: str):
        if user_id in self.active_connections:
            if websocket in self.active_connections[user_id]:
                self.active_connections[user_id].remove(websocket)
            if not self.active_connections[user_id]:
                del self.active_connections[user_id]
                
                # Update Last Seen
                from bson import ObjectId
                now = datetime.utcnow()
                await db.users.update_one(
                    {"_id": ObjectId(user_id)}, 
                    {"$set": {"last_seen": now}}
                )
                
                await self.notify_online_status(user_id, "offline", last_seen=now)

    async def notify_online_status(self, user_id: str, status: str, last_seen: datetime = None):
        payload = {
            "type": "status",
            "user_id": user_id,
            "status": status
        }
        if last_seen:
            payload["last_seen"] = last_seen.isoformat()
            
        for uid, connections in self.active_connections.items():
            for connection in connections:
                try:
                    await connection.send_json(payload)
                except:
                    pass

    async def broadcast_typing(self, sender_id: str, recipient_id: str, is_group: bool):
        if is_group:
            # Group Logic
            from bson import ObjectId
            group = await db.groups.find_one({"_id": ObjectId(recipient_id)})
            if group:
                members = group.get("members", [])
                for member_id in members:
                    if member_id == sender_id: continue
                    if member_id in self.active_connections:
                        for connection in self.active_connections[member_id]:
                            await connection.send_json({
                                "type": "typing",
                                "sender_id": sender_id,
                                "group_id": recipient_id,
                                "is_group": True
                            })
        else:
            # Direct Message
            if recipient_id in self.active_connections:
                for connection in self.active_connections[recipient_id]:
                    await connection.send_json({
                        "type": "typing",
                        "sender_id": sender_id,
                        "is_group": False
                    })

    async def send_personal_message(self, message: str, sender_id: str, recipient_id: str):
        # 1. Save to DB
        msg_model = MessageModel(
            sender_id=sender_id, 
            recipient_id=recipient_id, 
            content=message,
            is_group=False
        )
        await db.messages.insert_one(msg_model.model_dump(exclude={"id"}))
        
        # 2. Send to Recipient (if online)
        if recipient_id in self.active_connections:
            for connection in self.active_connections[recipient_id]:
                await connection.send_json({
                    "type": "message",
                    "sender_id": sender_id,
                    "content": message,
                    "timestamp": msg_model.timestamp.isoformat(),
                    "is_group": False
                })

    async def send_group_message(self, message: str, sender_id: str, group_id: str):
        # 1. Save to DB
        msg_model = MessageModel(
            sender_id=sender_id,
            recipient_id=group_id,
            content=message,
            is_group=True
        )
        await db.messages.insert_one(msg_model.model_dump(exclude={"id"}))

        # 2. Get Group Members
        from bson import ObjectId
        group = await db.groups.find_one({"_id": ObjectId(group_id)})
        if group:
            members = group.get("members", [])
            for member_id in members:
                if member_id == sender_id:
                     continue # Don't echo back to sender (or do, up to UI)
                
                if member_id in self.active_connections:
                    for connection in self.active_connections[member_id]:
                        await connection.send_json({
                            "type": "message",
                            "sender_id": sender_id,
                            "group_id": group_id,
                            "content": message,
                            "timestamp": msg_model.timestamp.isoformat(),
                            "is_group": True
                        })

manager = ConnectionManager()
