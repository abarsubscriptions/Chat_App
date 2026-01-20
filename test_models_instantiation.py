
from datetime import datetime
from bson import ObjectId

try:
    from api.models import UserModel, UserResponse, MessageModel
    
    print("Creating UserResponse...")
    u = UserResponse(id="507f1f77bcf86cd799439011", username="test", email="user@example.com", name="Test User", last_seen=datetime.utcnow())
    print("UserResponse created:", u)

    print("Creating MessageModel...")
    m = MessageModel(sender_id="123", recipient_id="456", content="hello")
    print("MessageModel created:", m)
    
except Exception as e:
    import traceback
    traceback.print_exc()
