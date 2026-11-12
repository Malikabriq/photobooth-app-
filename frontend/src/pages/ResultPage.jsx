import { useLocation, useNavigate, Navigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Download, Share2, Home } from 'lucide-react';

export default function ResultPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const resultImage = location.state?.resultImage;

  if (!resultImage) {
    return <Navigate to="/" replace />;
  }

  const handleDownload = () => {
    const link = document.createElement('a');
    link.href = resultImage;
    link.download = `together-booth-${Date.now()}.jpg`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleShare = async () => {
    try {
      if (navigator.share) {
        await navigator.share({
          title: 'Our Together Booth Photo',
          text: 'Check out our photo from Together Booth!',
          url: resultImage,
        });
      } else {
        // Fallback copy to clipboard
        navigator.clipboard.writeText(resultImage);
        alert('Image link copied to clipboard!');
      }
    } catch (err) {
      console.error('Share failed', err);
    }
  };

  return (
    <div className="flex-grow flex flex-col items-center justify-center p-4 md:p-8 z-10 overflow-y-auto">
      <motion.div 
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: 'spring', damping: 20 }}
        className="max-w-4xl w-full flex flex-col items-center gap-8"
      >
        <div className="text-center">
          <h2 className="text-4xl font-bold mb-2">Beautiful! 📸</h2>
          <p className="text-gray-400">Here is your HD captured moment.</p>
        </div>

        <div className="glass-panel p-4 md:p-6 rounded-3xl shadow-2xl relative group">
          <img 
            src={resultImage} 
            alt="Merged Booth" 
            className="w-full max-h-[60vh] object-contain rounded-xl"
          />
        </div>

        <div className="flex flex-wrap items-center justify-center gap-4">
          <button
            onClick={handleDownload}
            className="px-6 py-3 rounded-full bg-primary hover:bg-rose-500 text-white font-semibold flex items-center gap-2 transition shadow-lg"
          >
            <Download className="w-5 h-5" /> Download HD
          </button>
          
          <button
            onClick={handleShare}
            className="px-6 py-3 rounded-full bg-white/10 hover:bg-white/20 text-white font-semibold flex items-center gap-2 transition border border-white/10"
          >
            <Share2 className="w-5 h-5" /> Share
          </button>

          <button
            onClick={() => navigate('/')}
            className="px-6 py-3 rounded-full bg-white/5 hover:bg-white/10 text-white font-semibold flex items-center gap-2 transition"
          >
            <Home className="w-5 h-5" /> Back Home
          </button>
        </div>
      </motion.div>
    </div>
  );
}
