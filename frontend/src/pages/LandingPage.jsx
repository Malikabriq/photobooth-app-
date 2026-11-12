import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Camera, Heart, Users, Sparkles } from 'lucide-react';

export default function LandingPage() {
  const [loading, setLoading] = useState(false);
  const [joinCode, setJoinCode] = useState('');
  const navigate = useNavigate();

  const handleStart = async () => {
    setLoading(true);
    try {
      const apiUrl = import.meta.env.VITE_API_URL || '';
      const response = await fetch(`${apiUrl}/api/rooms`, {
        method: 'POST',
        headers: {
          "Bypass-Tunnel-Reminder": "true",
          "ngrok-skip-browser-warning": "true"
        }
      });
      const data = await response.json();
      navigate(`/room/${data.room_code}`);
    } catch (error) {
      console.error('Failed to create room', error);
      alert('Failed to start booth. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleJoin = (e) => {
    e.preventDefault();
    if (!joinCode.trim()) return;
    
    let code = joinCode.trim();
    try {
      // If it's a URL, extract the last part of the path
      if (code.includes('http')) {
        const url = new URL(code);
        const parts = url.pathname.split('/').filter(Boolean);
        code = parts[parts.length - 1];
      }
    } catch (err) {
      // Fallback to the raw string if URL parsing fails
    }
    
    if (code) {
      navigate(`/room/${code}`);
    }
  };

  return (
    <div className="flex-grow flex flex-col items-center justify-center p-6 text-center z-10 relative">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="max-w-2xl w-full"
      >
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass-panel mb-8">
          <Heart className="w-4 h-4 text-primary" />
          <span className="text-sm font-medium tracking-wide">Together Booth</span>
        </div>

        <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight mb-6">
          Capture moments,<br/>
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-secondary">
            together anywhere.
          </span>
        </h1>
        
        <p className="text-lg md:text-xl text-gray-400 mb-10 max-w-lg mx-auto">
          A real-time dual-camera photobooth for you and your partner. Share a link, smile, and create instant HD memories.
        </p>

        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={handleStart}
          disabled={loading}
          className="relative group px-8 py-4 rounded-full bg-white text-black font-bold text-lg overflow-hidden transition-all shadow-[0_0_40px_rgba(244,63,94,0.3)] hover:shadow-[0_0_60px_rgba(244,63,94,0.5)] disabled:opacity-70"
        >
          <div className="absolute inset-0 w-full h-full bg-gradient-to-r from-primary to-secondary opacity-0 group-hover:opacity-10 transition-opacity" />
          <span className="relative flex items-center justify-center gap-2">
            {loading ? 'Creating Booth...' : (
              <>
                Start Booth <Camera className="w-5 h-5" />
              </>
            )}
          </span>
        </motion.button>

        <div className="mt-10 flex items-center justify-center gap-4">
          <div className="h-px bg-white/20 w-16" />
          <span className="text-gray-400 text-sm font-medium tracking-wider uppercase">or</span>
          <div className="h-px bg-white/20 w-16" />
        </div>

        <form onSubmit={handleJoin} className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
          <input
            type="text"
            placeholder="Paste invite link or code..."
            value={joinCode}
            onChange={(e) => setJoinCode(e.target.value)}
            className="px-6 py-4 rounded-full bg-white/5 border border-white/10 text-white placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-secondary/50 focus:border-transparent w-full sm:w-80 transition-all backdrop-blur-md"
          />
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            type="submit"
            disabled={!joinCode.trim()}
            className="px-8 py-4 rounded-full bg-white/10 hover:bg-white/20 text-white font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed border border-white/20 w-full sm:w-auto"
          >
            Join
          </motion.button>
        </form>
      </motion.div>

      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.4, duration: 0.8 }}
        className="mt-24 grid grid-cols-1 md:grid-cols-3 gap-8 w-full max-w-4xl"
      >
        <FeatureCard icon={<Users />} title="Real-time Connection" desc="See each other live through your browsers." />
        <FeatureCard icon={<Camera />} title="Dual Capture" desc="Both cameras snap simultaneously in HD." />
        <FeatureCard icon={<Sparkles />} title="Instant Merge" desc="Beautifully combined into a single photo." />
      </motion.div>
    </div>
  );
}

function FeatureCard({ icon, title, desc }) {
  return (
    <div className="glass-panel p-6 rounded-2xl flex flex-col items-center text-center">
      <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center mb-4 text-white">
        {icon}
      </div>
      <h3 className="font-semibold text-lg mb-2">{title}</h3>
      <p className="text-gray-400 text-sm">{desc}</p>
    </div>
  );
}
