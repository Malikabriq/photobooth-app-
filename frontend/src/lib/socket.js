import { io } from 'socket.io-client';

// Falls back to same-origin (works via the Vite dev proxy in dev, and
// when the built frontend is served by the backend in production).
// Only set VITE_API_URL if the frontend and backend are on different origins.
const URL = import.meta.env.VITE_API_URL || '';

export const socket = io(URL, {
  autoConnect: false,
  extraHeaders: {
    "Bypass-Tunnel-Reminder": "true",
    "ngrok-skip-browser-warning": "true"
  }
});
