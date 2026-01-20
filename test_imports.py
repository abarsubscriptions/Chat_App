
try:
    from pydantic import BaseModel
    print("pydantic imported")
    from bson import ObjectId
    print("bson imported")
    from datetime import datetime
    print("datetime imported")
    import motor.motor_asyncio
    print("motor imported")
except Exception as e:
    print(e)
