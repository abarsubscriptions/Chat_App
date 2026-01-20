from fastapi import FastAPI, HTTPException, Depends, status, WebSocket, WebSocketDisconnect, Query
from fastapi.responses import FileResponse
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from typing import Annotated, List
from datetime import datetime, timedelta
from bson import ObjectId
from motor.motor_asyncio import AsyncIOMotorDatabase
import pymongo

from api.models import UserModel, UserResponse, Token, TokenData, MessageModel, GroupModel, AddMembersRequest, ConversationStatus
from api.database import get_db, db
from api.auth import (
    get_password_hash,
    verify_password,
    create_access_token,
    ACCESS_TOKEN_EXPIRE_MINUTES,
    SECRET_KEY,
    ALGORITHM,
)
from jose import JWTError, jwt
from api.sockets import manager

app = FastAPI()

from fastapi.middleware.cors import CORSMiddleware

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="token")

async def get_current_user(token: Annotated[str, Depends(oauth2_scheme)]):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id: str = payload.get("sub")
        if user_id is None:
            raise credentials_exception
        token_data = TokenData(id=user_id)
    except JWTError:
        raise credentials_exception
    
    user = await db.users.find_one({"_id": ObjectId(token_data.id)})
    if user is None:
        raise credentials_exception
    return user

async def get_user_from_token(token: str):
    """Helper for WebSocket auth"""
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id: str = payload.get("sub")
        if user_id is None:
            return None
        return user_id
    except JWTError:
        return None

@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket, token: str = Query(...)):
    user_id = await get_user_from_token(token)
    if not user_id:
        await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
        return

    await manager.connect(websocket, user_id)
    try:
        while True:
            data = await websocket.receive_json()
            message_type = data.get("type", "message")
            
            if message_type == "typing":
                recipient_id = data.get("recipient_id")
                is_group = data.get("is_group", False)
                if recipient_id:
                     await manager.broadcast_typing(user_id, recipient_id, is_group)
            
            elif message_type == "message":
                recipient_id = data.get("recipient_id")
                content = data.get("content")
                is_group = data.get("is_group", False)

                if recipient_id and content:
                    if is_group:
                        await manager.send_group_message(content, user_id, recipient_id)
                    else:
                        await manager.send_personal_message(content, user_id, recipient_id)
    except WebSocketDisconnect:
        await manager.disconnect(websocket, user_id)

@app.post("/register", response_model=UserResponse)
async def register(user: UserModel):
    # Check if existing
    existing_user = await db.users.find_one({"email": user.email})
    if existing_user:
        raise HTTPException(
            status_code=400,
            detail="Email already registered"
        )
    
    user_dict = user.model_dump(exclude={"id"})
    user_dict["password"] = get_password_hash(user_dict["password"])
    
    new_user = await db.users.insert_one(user_dict)
    created_user = await db.users.find_one({"_id": new_user.inserted_id})
    return created_user

@app.post("/token", response_model=Token)
async def login_for_access_token(form_data: Annotated[OAuth2PasswordRequestForm, Depends()]):
    user = await db.users.find_one({"email": form_data.username})
    if not user or not verify_password(form_data.password, user["password"]):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": str(user["_id"])}, expires_delta=access_token_expires
    )
    return {"access_token": access_token, "token_type": "bearer"}

@app.get("/users/me", response_model=UserResponse)
async def read_users_me(current_user: Annotated[dict, Depends(get_current_user)]):
    return current_user

@app.get("/users/{user_id}", response_model=UserResponse)
async def get_user_data(user_id: str):
    if not ObjectId.is_valid(user_id):
        raise HTTPException(status_code=400, detail="Invalid user ID format")
        
    user = await db.users.find_one({"_id": ObjectId(user_id)})
    if user:
        return user
    raise HTTPException(status_code=404, detail="User not found")

@app.get("/users", response_model=List[UserResponse])
async def list_users(current_user: Annotated[dict, Depends(get_current_user)]):
    current_uid = str(current_user["_id"])
    users = await db.users.find().to_list(length=100)
    
    results = []
    for u in users:
        other_uid = str(u["_id"])
        
        # 1. Last Message (either direction)
        last_msg = await db.messages.find_one(
            {
                "is_group": False,
                "$or": [
                    {"sender_id": current_uid, "recipient_id": other_uid},
                    {"sender_id": other_uid, "recipient_id": current_uid}
                ]
            },
            sort=[("timestamp", pymongo.DESCENDING)]
        )
        
        # 2. Unread Count (messages FROM other TO me)
        status = await db.conversation_status.find_one({"user_id": current_uid, "conversation_id": other_uid})
        last_read = status["last_read_at"] if status else datetime.min
        
        unread = await db.messages.count_documents({
            "is_group": False,
            "sender_id": other_uid,
            "recipient_id": current_uid,
            "timestamp": {"$gt": last_read}
        })
        
        u["last_message"] = last_msg["content"] if last_msg else None
        u["last_message_time"] = last_msg["timestamp"] if last_msg else None
        u["unread_count"] = unread
        results.append(u)
        
    # Sort by last_message_time desc
    results.sort(key=lambda x: x.get("last_message_time") or datetime.min, reverse=True)
    return results

@app.get("/messages/{recipient_id}", response_model=List[MessageModel])
async def get_personal_messages(
    recipient_id: str, 
    current_user: Annotated[dict, Depends(get_current_user)]
):
    current_user_id = str(current_user["_id"])
    messages = await db.messages.find({
        "is_group": False,
        "$or": [
            {"sender_id": current_user_id, "recipient_id": recipient_id},
            {"sender_id": recipient_id, "recipient_id": current_user_id}
        ]
    }).sort("timestamp", pymongo.ASCENDING).to_list(length=100)
    return messages

@app.post("/groups", response_model=GroupModel)
async def create_group(group: GroupModel, current_user: Annotated[dict, Depends(get_current_user)]):
    group_dict = group.model_dump(exclude={"id"})
    group_dict["created_by"] = str(current_user["_id"])
    
    # Ensure creator is a member
    if group_dict["created_by"] not in group_dict["members"]:
        group_dict["members"].append(group_dict["created_by"])
        
    created_group = await db.groups.insert_one(group_dict)
    
    # Notify members? For now just return
    return await db.groups.find_one({"_id": created_group.inserted_id})

@app.get("/groups", response_model=List[GroupModel])
async def list_groups(current_user: Annotated[dict, Depends(get_current_user)]):
    user_id = str(current_user["_id"])
    groups = await db.groups.find({"members": user_id}).to_list(1000)
    
    results = []
    for g in groups:
        group_id = str(g["_id"])
        
        # 1. Last Message
        last_msg = await db.messages.find_one(
            {"recipient_id": group_id, "is_group": True},
            sort=[("timestamp", pymongo.DESCENDING)]
        )
        
        # 2. Unread Count
        status = await db.conversation_status.find_one({"user_id": user_id, "conversation_id": group_id})
        last_read = status["last_read_at"] if status else datetime.min
        
        unread = await db.messages.count_documents({
            "recipient_id": group_id,
            "is_group": True,
            "timestamp": {"$gt": last_read},
            "sender_id": {"$ne": user_id}
        })
        
        g["last_message"] = last_msg["content"] if last_msg else None
        g["last_message_time"] = last_msg["timestamp"] if last_msg else None
        g["unread_count"] = unread
        results.append(g)
        
    # Sort by last_message_time desc
    results.sort(key=lambda x: x.get("last_message_time") or datetime.min, reverse=True)
    return results

@app.put("/groups/{group_id}/members", response_model=GroupModel)
async def add_group_members(group_id: str, request: AddMembersRequest, current_user: Annotated[dict, Depends(get_current_user)]):
    if not ObjectId.is_valid(group_id):
        raise HTTPException(status_code=400, detail="Invalid group ID")
    
    group = await db.groups.find_one({"_id": ObjectId(group_id)})
    if not group:
        raise HTTPException(status_code=404, detail="Group not found")
    
    # Check if user is in group
    user_id = str(current_user["_id"])
    if user_id not in group["members"]:
         raise HTTPException(status_code=403, detail="You are not a member of this group")

    # Filter out existing members
    new_members = [m for m in request.members if m not in group["members"]]
    
    if new_members:
        await db.groups.update_one(
            {"_id": ObjectId(group_id)},
            {"$push": {"members": {"$each": new_members}}}
        )
        
    return await db.groups.find_one({"_id": ObjectId(group_id)})

@app.delete("/groups/{group_id}")
async def delete_group(group_id: str, current_user: Annotated[dict, Depends(get_current_user)]):
    if not ObjectId.is_valid(group_id):
        raise HTTPException(status_code=400, detail="Invalid group ID")
        
    group = await db.groups.find_one({"_id": ObjectId(group_id)})
    if not group:
        raise HTTPException(status_code=404, detail="Group not found")
        
    if str(group["created_by"]) != str(current_user["_id"]):
         raise HTTPException(status_code=403, detail="Only the group creator can delete this group")
         
    await db.groups.delete_one({"_id": ObjectId(group_id)})
    return {"detail": "Group deleted"}

@app.post("/conversations/read/{conversation_id}")
async def mark_conversation_read(
        conversation_id: str, 
        current_user: Annotated[dict, Depends(get_current_user)]
    ):
    user_id = str(current_user["_id"])
    now = datetime.utcnow()
    
    # Upsert status
    await db.conversation_status.update_one(
        {"user_id": user_id, "conversation_id": conversation_id},
        {"$set": {"last_read_at": now, "type": "unknown"}}, # Type is less critical here
        upsert=True
    )
    return {"status": "ok"}

@app.get("/messages/group/{group_id}", response_model=List[MessageModel])
async def get_group_messages(
    group_id: str,
    current_user: Annotated[dict, Depends(get_current_user)]
):
    # Verify membership (Optional but recommended)
    group = await db.groups.find_one({"_id": ObjectId(group_id), "members": str(current_user["_id"])})
    if not group:
         raise HTTPException(status_code=403, detail="Not a member of this group")

    messages = await db.messages.find({
        "is_group": True,
        "recipient_id": group_id
    }).sort("timestamp", pymongo.ASCENDING).to_list(length=100)

    # Store sender names for client convenience?
    # For now, client resolves names from /users list
    return messages

@app.get("/")
async def read_index():
    return FileResponse("index.html")

if __name__ == "__main__":
    import uvicorn
    import os
    port = int(os.environ.get("PORT", 8003))
    uvicorn.run("api.main:app", host="0.0.0.0", port=port, reload=True)
