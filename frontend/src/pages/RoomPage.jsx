import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useWebRTC } from '../hooks/useWebRTC';
import BackgroundPicker from '../components/BackgroundPicker';
import { Copy, CheckCircle2, Camera, Image as ImageIcon } from 'lucide-react';
import { useState, useEffect } from 'react';

export default function RoomPage() {
  const { roomId } = useParams();
  const navigate = useNavigate();
  const [copied, setCopied] = useState(false);
  const [showPicker, setShowPicker] = useState(false);

  const {
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
  } = useWebRTC(roomId);

  useEffect(() => {
    if (resultImage) navigate('/result', { state: { resultImage } });
  }, [resultImage, navigate]);

  const inviteLink = `${window.location.origin}/room/${roomId}`;

  const copyLink = () => {
    navigator.clipboard.writeText(inviteLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="flex-grow flex flex-col items-center p-4 md:p-8 z-10 gap-4">

      {/* ── Top bar ────────────────────────────────────────────────────────── */}
      <div className="w-full max-w-6xl flex justify-between items-center">
        <div className="glass-panel px-4 py-2 rounded-full text-sm font-medium">
          Room: <span className="text-primary">{roomId}</span>
        </div>
        <div className="flex items-center gap-2">
          {/* Background toggle */}
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={() => setShowPicker((v) => !v)}
            className={`flex items-center gap-2 px-4 py-2 rounded-full transition text-sm font-medium border
              ${showPicker
                ? 'bg-primary/20 border-primary text-primary'
                : 'bg-white/10 hover:bg-white/20 border-white/10'}`}
          >
            <ImageIcon className="w-4 h-4" />
            {selectedBg?.id === 'none' ? 'Background' : selectedBg?.label}
          </motion.button>

          {!isReady && (
            <button
              onClick={copyLink}
              className="flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 rounded-full transition text-sm font-medium"
            >
              {copied
                ? <CheckCircle2 className="w-4 h-4 text-green-400" />
                : <Copy className="w-4 h-4" />}
              {copied ? 'Copied!' : 'Invite Link'}
            </button>
          )}
        </div>
      </div>

      {/* ── Video grid ─────────────────────────────────────────────────────── */}
      <div className="w-full max-w-6xl grid grid-cols-1 md:grid-cols-2 gap-4 flex-grow relative">

        {/* Local — show processed canvas, raw video hidden */}
        <div className="relative rounded-2xl overflow-hidden glass-panel bg-black aspect-video md:aspect-auto">
          {/* Hidden raw video (LiveKit attaches here) */}
          <video
            ref={localVideoRef}
            autoPlay playsInline muted
            className="absolute inset-0 w-0 h-0 opacity-0 pointer-events-none"
          />
          {/* Processed canvas with virtual background */}
          <canvas
            ref={localCanvasRef}
            width={640}
            height={360}
            className="absolute inset-0 w-full h-full object-cover transform -scale-x-100"
          />
          <div className="absolute bottom-4 left-4 bg-black/50 px-3 py-1 rounded-full text-xs font-semibold backdrop-blur-md">
            You
          </div>
        </div>

        {/* Remote — show raw video (partner applies bg on their own side) */}
        <div className="relative rounded-2xl overflow-hidden glass-panel bg-black/40 aspect-video md:aspect-auto flex flex-col items-center justify-center">
          <video
            ref={remoteVideoRef}
            autoPlay playsInline
            className={`absolute inset-0 w-full h-full object-cover transform -scale-x-100 ${!isReady ? 'hidden' : ''}`}
          />

          {!isReady && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center p-6"
            >
              <div className="w-16 h-16 rounded-full border-4 border-primary/30 border-t-primary animate-spin mx-auto mb-4" />
              <h3 className="text-xl font-bold mb-2">Waiting for partner...</h3>
              <p className="text-gray-400 text-sm">Share the invite link to connect.</p>
            </motion.div>
          )}

          {isReady && (
            <div className="absolute bottom-4 left-4 bg-black/50 px-3 py-1 rounded-full text-xs font-semibold backdrop-blur-md">
              Partner
            </div>
          )}
        </div>

        {/* Countdown overlay */}
        <AnimatePresence>
          {countdown && (
            <motion.div
              key={countdown}
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 1.5, opacity: 0 }}
              className="absolute inset-0 flex items-center justify-center z-50 pointer-events-none"
            >
              <div className="text-9xl md:text-[12rem] font-black text-white drop-shadow-[0_0_40px_rgba(244,63,94,0.8)]">
                {countdown}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ── Background picker (slide in/out) ──────────────────────────────── */}
      <AnimatePresence>
        {showPicker && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="w-full max-w-6xl overflow-hidden"
          >
            <BackgroundPicker selectedId={selectedBg?.id} onSelect={chooseBg} />
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Controls ───────────────────────────────────────────────────────── */}
      <div className="mt-2">
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={startBooth}
          disabled={!isReady || countdown || isCapturing}
          className="px-10 py-4 rounded-full bg-primary hover:bg-rose-500 text-white font-bold text-xl shadow-[0_0_30px_rgba(244,63,94,0.4)] transition disabled:opacity-50 disabled:grayscale flex items-center gap-3"
        >
          {isCapturing
            ? 'Merging...'
            : <><Camera className="w-6 h-6" /> Take Photo</>}
        </motion.button>
      </div>

    </div>
  );
}
