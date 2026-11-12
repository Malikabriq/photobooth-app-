from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Boolean
from sqlalchemy.orm import relationship
from datetime import datetime
from app.database.connection import Base

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, index=True)
    created_at = Column(DateTime, default=datetime.utcnow)

class Room(Base):
    __tablename__ = "rooms"

    id = Column(Integer, primary_key=True, index=True)
    room_code = Column(String, unique=True, index=True)
    owner_id = Column(Integer, ForeignKey("users.id"))
    status = Column(String, default="waiting") # waiting, capturing, finished
    created_at = Column(DateTime, default=datetime.utcnow)

    photos = relationship("Photo", back_populates="room")

class Photo(Base):
    __tablename__ = "photos"

    id = Column(Integer, primary_key=True, index=True)
    room_id = Column(Integer, ForeignKey("rooms.id"))
    image_url = Column(String)
    created_at = Column(DateTime, default=datetime.utcnow)

    room = relationship("Room", back_populates="photos")
