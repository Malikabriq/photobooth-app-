import os
from dotenv import load_dotenv

load_dotenv()

import socketio
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from app.api.rooms import router as rooms_router
from app.websocket.events import sio
from app.database.connection import engine, Base

# Create tables
Base.metadata.create_all(bind=engine)

fastapi_app = FastAPI(title="Photobooth API")

# Configure CORS
origins = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    os.getenv("CORS_ORIGINS", "")
]

fastapi_app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

fastapi_app.include_router(rooms_router, prefix="/api")

@fastapi_app.get("/api/health")
def read_root():
    return {"message": "Welcome to Together Booth API"}

frontend_dist = os.path.abspath(os.path.join(os.path.dirname(__file__), "../../frontend/dist"))

@fastapi_app.get("/{full_path:path}")
async def serve_frontend(full_path: str):
    full_file_path = os.path.join(frontend_dist, full_path)
    
    # Security check to prevent directory traversal
    if not os.path.abspath(full_file_path).startswith(frontend_dist):
        return {"error": "Access denied"}
        
    if os.path.isfile(full_file_path):
        return FileResponse(full_file_path)
        
    # SPA routing fallback
    index_file = os.path.join(frontend_dist, "index.html")
    if os.path.isfile(index_file):
        return FileResponse(index_file)
        
    return {"message": "Frontend not built yet. Run 'npm run build' in the frontend directory."}

# Wrap FastAPI app with Socket.IO ASGI app as the main entrypoint
app = socketio.ASGIApp(sio, other_asgi_app=fastapi_app)
