import { useState, useEffect, useRef, useCallback } from 'react';
import { Room, RoomEvent, LocalVideoTrack, LocalAudioTrack, Track } from 'livekit-client';
import { socket } from '../lib/socket';
import { useVirtualBackground } from './useVirtualBackground';
import { BACKGROUNDS } from '../components/BackgroundPicker';

export function useWebRTC(roomId) {
  const [isReady, setIsReady] = useState(false);
  const [countdown, setCountdown] = useState(null);
  const [isCapturing, setIsCapturing] = useState(false);
  const [resultImage, setResultImage] = useState(null);
  const [selectedBg, setSelectedBg] = useState(BACKGROUNDS[0]);

  const localVideoRef = useRef(null); // hidden <video> — raw camera feed
  const remoteVideoRef = useRef(null);
  const roomRef = useRef(null);
  const rawStreamRef = useRef(null);

  // Processed canvas (virtual background applied) — returned as ref
  const localCanvasRef = useVirtualBackground(localVideoRef, selectedBg?.url ?? null);

  useEffect(() => {
    if (!roomId) return;
    let isMounted = true;

    const room = new Room({ adaptiveStream: true, dynacast: true });
    roomRef.current = room;

    const connectServices = async () => {
      try {
        // 1. Get raw camera stream → feed into hidden video for MediaPipe
        const rawStream = await navigator.mediaDevices.getUserMedia({
          video: { width: 1280, height: 720, facingMode: 'user' },
          audio: true,
        });
        rawStreamRef.current = rawStream;

        if (localVideoRef.current) {
          localVideoRef.current.srcObject = rawStream;
          await localVideoRef.current.play().catch(() => {});
        }

        // 2. Fetch LiveKit token
        const apiUrl = import.meta.env.VITE_API_URL || '';
        const res = await fetch(`${apiUrl}/api/rooms/${roomId}/token`, {
          headers: {
            'Bypass-Tunnel-Reminder': 'true',
            'ngrok-skip-browser-warning': 'true',
          },
        });
        if (!res.ok) throw new Error('Failed to fetch token');
        const data = await res.json();
        if (!isMounted) return;

        // 3. Wire remote track display
        room.on(RoomEvent.TrackSubscribed, (track) => {
          if (track.kind === 'video' && remoteVideoRef.current) {
            track.attach(remoteVideoRef.current);
          }
        });
        room.on(RoomEvent.TrackUnsubscribed, (track) => track.detach());

        // 4. Connect to LiveKit
        await room.connect(data.livekit_url, data.token);

        // 5. Wait for MediaPipe to init & canvas to mount (~1s)
        await new Promise((r) => setTimeout(r, 1200));
        if (!isMounted) return;

        // 6. ✅ KEY FIX: Publish CANVAS stream (with background) — not raw camera
        //    Remote user now sees the virtual background in real-time
        if (localCanvasRef.current) {
          const canvasStream = localCanvasRef.current.captureStream(15);
          const videoMediaTrack = canvasStream.getVideoTracks()[0];
          if (videoMediaTrack) {
            const livekitVideo = new LocalVideoTrack(videoMediaTrack);
            await room.localParticipant.publishTrack(livekitVideo, {
              source: Track.Source.Camera,
              simulcast: false,
            });
          }
        }

        // 7. Publish audio from raw stream
        const audioMediaTrack = rawStream.getAudioTracks()[0];
        if (audioMediaTrack) {
          const livekitAudio = new LocalAudioTrack(audioMediaTrack);
          await room.localParticipant.publishTrack(livekitAudio, {
            source: Track.Source.Microphone,
          });
        }

        // 8. Socket.IO for booth logic
        socket.connect();
        socket.emit('join_room', { room_code: roomId });
      } catch (err) {
        console.error('Connection error', err);
      }
    };

    connectServices();

    // ── Socket listeners ──────────────────────────────────────────────────────
    const onRoomReady = () => setIsReady(true);

    const onCountdownStarted = () => {
      let count = 3;
      setCountdown(count);
      const interval = setInterval(() => {
        count -= 1;
        if (count > 0) {
          setCountdown(count);
        } else {
          clearInterval(interval);
          setCountdown('📸');
          // capture after short delay so emoji renders
          setTimeout(() => {
            const src = localCanvasRef.current ?? localVideoRef.current;
            if (!src) return;
            setIsCapturing(true);
            const cap = document.createElement('canvas');
            cap.width = 1280; cap.height = 720;
            cap.getContext('2d').drawImage(src, 0, 0, 1280, 720);
            socket.emit('capture_frame', {
              room_code: roomId,
              image: cap.toDataURL('image/png'),
            });
          }, 200);
          setTimeout(() => setCountdown(null), 1000);
        }
      }, 1000);
    };

    const onPhotoReady = (data) => {
      setResultImage(data.url);
      setIsCapturing(false);
    };

    // When background changes (from server), update local state → canvas redraws
    const onBackgroundChanged = ({ bg_id }) => {
      const found = BACKGROUNDS.find((b) => b.id === bg_id);
      if (found) setSelectedBg(found);
      // Canvas captureStream is already published to LiveKit, so remote user
      // automatically sees the new background on the next canvas frame
    };

    socket.on('room_ready', onRoomReady);
    socket.on('countdown_started', onCountdownStarted);
    socket.on('photo_ready', onPhotoReady);
    socket.on('background_changed', onBackgroundChanged);

    return () => {
      isMounted = false;
      socket.off('room_ready', onRoomReady);
      socket.off('countdown_started', onCountdownStarted);
      socket.off('photo_ready', onPhotoReady);
      socket.off('background_changed', onBackgroundChanged);
      socket.emit('leave_room', { room_code: roomId });
      socket.disconnect();
      roomRef.current?.disconnect();
      rawStreamRef.current?.getTracks().forEach((t) => t.stop());
    };
  }, [roomId]);

  // Pick background → broadcast to room (server re-emits to everyone)
  const chooseBg = useCallback((bg) => {
    setSelectedBg(bg);
    socket.emit('change_background', { room_code: roomId, bg_id: bg.id });
  }, [roomId]);

  const startBooth = () => socket.emit('start_countdown', { room_code: roomId });

  return {
    localVideoRef,
    remoteVideoRef,
    localCanvasRef,
    isReady,
    countdown,
    isCapturing,
    resultImage,
    selectedBg,
    chooseBg,
    startBooth,
  };
}
