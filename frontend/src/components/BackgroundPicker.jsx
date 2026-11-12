import { motion } from 'framer-motion';

// ── Free Unsplash images (no API key needed) ───────────────────────────────
export const BACKGROUNDS = [
  {
    id: 'none',
    label: 'None',
    emoji: '🚫',
    url: null,
    thumb: null,
  },
  {
    id: 'paris',
    label: 'Paris',
    emoji: '🗼',
    url: 'https://images.unsplash.com/photo-1502602898657-3e91760cbb34?w=1280&q=80',
    thumb: 'https://images.unsplash.com/photo-1502602898657-3e91760cbb34?w=160&q=60',
  },
  {
    id: 'galaxy',
    label: 'Galaxy',
    emoji: '🌌',
    url: 'https://images.unsplash.com/photo-1464802686167-b939a6910659?w=1280&q=80',
    thumb: 'https://images.unsplash.com/photo-1464802686167-b939a6910659?w=160&q=60',
  },
  {
    id: 'beach',
    label: 'Beach',
    emoji: '🏖️',
    url: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=1280&q=80',
    thumb: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=160&q=60',
  },
  {
    id: 'tokyo',
    label: 'Tokyo Night',
    emoji: '🌃',
    url: 'https://images.unsplash.com/photo-1540959733332-eab4deabeeaf?w=1280&q=80',
    thumb: 'https://images.unsplash.com/photo-1540959733332-eab4deabeeaf?w=160&q=60',
  },
  {
    id: 'sakura',
    label: 'Sakura',
    emoji: '🌸',
    url: 'https://images.unsplash.com/photo-1522383225653-ed111181a951?w=1280&q=80',
    thumb: 'https://images.unsplash.com/photo-1522383225653-ed111181a951?w=160&q=60',
  },
  {
    id: 'mountains',
    label: 'Mountains',
    emoji: '🏔️',
    url: 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=1280&q=80',
    thumb: 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=160&q=60',
  },
  {
    id: 'aurora',
    label: 'Aurora',
    emoji: '🌈',
    url: 'https://images.unsplash.com/photo-1531366936337-7c912a4589a7?w=1280&q=80',
    thumb: 'https://images.unsplash.com/photo-1531366936337-7c912a4589a7?w=160&q=60',
  },
];

export default function BackgroundPicker({ selectedId, onSelect }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="w-full max-w-6xl"
    >
      {/* Label */}
      <p className="text-xs text-gray-400 font-semibold uppercase tracking-widest mb-3 text-center">
        🖼️ Background — applies to both
      </p>

      {/* Scrollable row */}
      <div className="flex items-center gap-3 overflow-x-auto pb-2 px-1 scrollbar-thin scrollbar-thumb-white/10">
        {BACKGROUNDS.map((bg) => {
          const isActive = selectedId === bg.id;
          return (
            <motion.button
              key={bg.id}
              whileHover={{ scale: 1.08 }}
              whileTap={{ scale: 0.94 }}
              onClick={() => onSelect(bg)}
              title={bg.label}
              className={`
                relative flex-shrink-0 rounded-xl overflow-hidden border-2 transition-all
                ${isActive
                  ? 'border-rose-500 shadow-[0_0_16px_rgba(244,63,94,0.6)]'
                  : 'border-white/10 hover:border-white/30'}
              `}
              style={{ width: 96, height: 64 }}
            >
              {bg.thumb ? (
                <img
                  src={bg.thumb}
                  alt={bg.label}
                  className="w-full h-full object-cover"
                  crossOrigin="anonymous"
                />
              ) : (
                // "None" card
                <div className="w-full h-full bg-white/5 flex flex-col items-center justify-center gap-1">
                  <span className="text-xl">{bg.emoji}</span>
                </div>
              )}

              {/* Label overlay */}
              <div className="absolute inset-x-0 bottom-0 bg-black/60 text-[10px] text-center py-0.5 font-medium">
                {bg.emoji} {bg.label}
              </div>

              {/* Active ring */}
              {isActive && (
                <div className="absolute inset-0 ring-2 ring-rose-500 rounded-xl pointer-events-none" />
              )}
            </motion.button>
          );
        })}
      </div>
    </motion.div>
  );
}
