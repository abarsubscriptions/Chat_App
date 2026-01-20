from pymongo import MongoClient
import os
from dotenv import load_dotenv
from pprint import pprint

load_dotenv()
MONGO_URI = os.getenv("MONGO_URI", "mongodb://localhost:27017")

client = MongoClient(MONGO_URI)
db = client.chat_app


print("Databases:", client.list_database_names())
print(f"Using DB: {db.name}")
try:
    print("--- Messages ---")
    messages = list(db.messages.find())
    print(f"Found {len(messages)} messages")
    for msg in messages:
        print(f"From: {msg.get('sender_id')} To: {msg.get('recipient_id')} Content: {msg.get('content')}")
except Exception as e:
    print(f"Error: {e}")
