import socketio

sio = socketio.AsyncServer(async_mode='asgi', cors_allowed_origins='*')

room_images = {} # room_id -> {sid: img_data}
room_members = {} # room_id -> set of sids

@sio.event
async def connect(sid, environ):
    print("connect ", sid)

@sio.event
async def disconnect(sid):
    print("disconnect ", sid)
    # Handle leaving rooms if necessary
    rooms = sio.rooms(sid)
    for room in rooms:
        if room != sid:
            await sio.leave_room(sid, room)
            await sio.emit('user_left', {'sid': sid}, room=room)
            if room in room_members and sid in room_members[room]:
                room_members[room].remove(sid)
                if not room_members[room]:
                    del room_members[room]

@sio.event
async def join_room(sid, data):
    room = data.get('room_code')
    if room:
        await sio.enter_room(sid, room)
        
        if room not in room_members:
            room_members[room] = set()
        room_members[room].add(sid)
        
        print(f"User {sid} joined room {room}")
        # Notify others in the room
        await sio.emit('user_joined', {'sid': sid}, room=room, skip_sid=sid)
        
        # Determine room state
        if len(room_members[room]) >= 2:
            await sio.emit('room_ready', {}, room=room)

@sio.event
async def leave_room(sid, data):
    room = data.get('room_code')
    if room:
        await sio.leave_room(sid, room)
        await sio.emit('user_left', {'sid': sid}, room=room)
        if room in room_members and sid in room_members[room]:
            room_members[room].remove(sid)
            if not room_members[room]:
                del room_members[room]

@sio.event
async def change_background(sid, data):
    """Broadcast chosen background to all room members (keeps both in sync)."""
    room = data.get('room_code')
    bg_id = data.get('bg_id')
    if room and bg_id is not None:
        await sio.emit('background_changed', {'bg_id': bg_id}, room=room)

@sio.event
async def start_countdown(sid, data):
    room = data.get('room_code')
    if room:
        # Emit countdown started to all clients in the room
        await sio.emit('countdown_started', {}, room=room)

@sio.event
async def capture_frame(sid, data):
    room = data.get('room_code')
    img_data = data.get('image')
    
    if not room or not img_data:
        return
        
    if room not in room_images:
        room_images[room] = {}
        
    room_images[room][sid] = img_data
    
    if len(room_images[room]) >= 2:
        # Both images received
        images = list(room_images[room].values())
        del room_images[room] # clean up
        # Trigger processing (should be background task, but simple await for now)
        from app.services.image_processor import process_and_upload_image
        try:
            # Need to run blocking code in executor in real scenario, but for MVP asyncio is fine if fast enough
            secure_url = process_and_upload_image(images[0], images[1])
            
            # Save to db
            from app.database.connection import SessionLocal
            from app.models.models import Photo, Room
            db = SessionLocal()
            try:
                db_room = db.query(Room).filter(Room.room_code == room).first()
                if db_room:
                    new_photo = Photo(room_id=db_room.id, image_url=secure_url)
                    db.add(new_photo)
                    db.commit()
            finally:
                db.close()
                
            await sio.emit('photo_ready', {'url': secure_url}, room=room)
        except Exception as e:
            print("Error processing image:", e)
            await sio.emit('photo_error', {'error': str(e)}, room=room)

# WebRTC Signaling
@sio.event
async def offer(sid, data):
    room = data.get('room')
    if room:
        await sio.emit('offer', data, room=room, skip_sid=sid)

@sio.event
async def answer(sid, data):
    room = data.get('room')
    if room:
        await sio.emit('answer', data, room=room, skip_sid=sid)

@sio.event
async def ice_candidate(sid, data):
    room = data.get('room')
    if room:
        await sio.emit('ice_candidate', data, room=room, skip_sid=sid)
