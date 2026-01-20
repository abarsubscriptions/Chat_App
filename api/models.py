from pydantic import BaseModel, Field, EmailStr, ConfigDict, BeforeValidator
from typing import Optional, Annotated, List
from bson import ObjectId
from datetime import datetime

# Helper to handle ObjectId
PyObjectId = Annotated[str, BeforeValidator(str)]

class UserModel(BaseModel):
    id: Optional[PyObjectId] = Field(alias="_id", default=None)
    name: str
    email: EmailStr
    status: str = "active"
    password: str

class UserResponse(BaseModel):
    id: Optional[PyObjectId] = Field(None, alias="_id")
    email: EmailStr
    name: str
    last_seen: Optional[datetime] = None
    last_message: Optional[str] = None
    last_message_time: Optional[datetime] = None
    unread_count: int = 0

    model_config = ConfigDict(
        populate_by_name=True,
        arbitrary_types_allowed=True,
    )

class Token(BaseModel):
    access_token: str
    token_type: str

class TokenData(BaseModel):
    id: Optional[str] = None

class MessageModel(BaseModel):
    id: Optional[PyObjectId] = Field(alias="_id", default=None)
    sender_id: str
    recipient_id: str # User ID or Group ID
    content: str
    timestamp: datetime = Field(default_factory=datetime.utcnow)
    is_group: bool = False

    model_config = ConfigDict(
        populate_by_name=True,
        arbitrary_types_allowed=True,
    )

class GroupModel(BaseModel):
    id: Optional[PyObjectId] = Field(alias="_id", default=None)
    name: str
    members: List[str] # List of User IDs
    created_by: str
    last_message: Optional[str] = None
    last_message_time: Optional[datetime] = None
    unread_count: int = 0

    model_config = ConfigDict(
        populate_by_name=True,
        arbitrary_types_allowed=True,
    )

class AddMembersRequest(BaseModel):
    members: List[str]

class ConversationStatus(BaseModel):
    id: Optional[PyObjectId] = Field(alias="_id", default=None)
    user_id: str
    conversation_id: str # User ID (DM) or Group ID
    type: str # "dm" or "group"
    last_read_at: datetime = Field(default_factory=datetime.utcnow)

    model_config = ConfigDict(
        populate_by_name=True,
        arbitrary_types_allowed=True,
    )

