import string
import random
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database.connection import get_db
from app.models.models import Room
from pydantic import BaseModel
import os
import uuid
from livekit import api

router = APIRouter()

class RoomResponse(BaseModel):
    id: int
    room_code: str
    status: str

    class Config:
        from_attributes = True

def generate_room_code(length=6):
    return ''.join(random.choices(string.ascii_uppercase + string.digits, k=length))

@router.post("/rooms", response_model=RoomResponse)
def create_room(db: Session = Depends(get_db)):
    code = generate_room_code()
    # Check if exists (simple check, assume no collision for MVP)
    new_room = Room(room_code=code)
    db.add(new_room)
    db.commit()
    db.refresh(new_room)
    return new_room

@router.get("/rooms/{room_code}", response_model=RoomResponse)
def get_room(room_code: str, db: Session = Depends(get_db)):
    room = db.query(Room).filter(Room.room_code == room_code).first()
    if not room:
        raise HTTPException(status_code=404, detail="Room not found")
    return room

@router.get("/rooms/{room_code}/token")
async def get_room_token(room_code: str):
    api_key = os.getenv('LIVEKIT_API_KEY')
    api_secret = os.getenv('LIVEKIT_API_SECRET')
    
    if not api_key or not api_secret:
        raise HTTPException(status_code=500, detail="LiveKit credentials missing")

    # The participant identity needs to be unique for LiveKit to accept multiple users
    identity = f"user_{str(uuid.uuid4())[:8]}"
    
    token = api.AccessToken(api_key, api_secret) \
        .with_identity(identity) \
        .with_name("Participant") \
        .with_grants(api.VideoGrants(
            room_join=True,
            room=room_code,
        ))
        
    return {
        "token": token.to_jwt(),
        "livekit_url": os.getenv('LIVEKIT_URL')
    }
