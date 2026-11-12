// Loads MediaPipe from CDN (no npm install needed)
const MP_CDN = 'https://cdn.jsdelivr.net/npm/@mediapipe/selfie_segmentation@0.1/selfie_segmentation.js';

let _mpLoaded = false;
let _mpLoadPromise = null;

function loadMediaPipe() {
  if (_mpLoaded) return Promise.resolve();
  if (_mpLoadPromise) return _mpLoadPromise;
  _mpLoadPromise = new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = MP_CDN;
    s.crossOrigin = 'anonymous';
    s.onload = () => { _mpLoaded = true; resolve(); };
    s.onerror = reject;
    document.head.appendChild(s);
  });
  return _mpLoadPromise;
}

import { useEffect, useRef } from 'react';

export function useVirtualBackground(videoRef, backgroundUrl) {
  const canvasRef = useRef(null);
  const bgImageRef = useRef(null);
  const segRef = useRef(null);
  const rafRef = useRef(null);
  const lastTRef = useRef(0);
  // Persistent off-screen canvas for person cutout (avoids GC pressure)
  const tempCanvasRef = useRef(null);

  // ── Preload background image whenever URL changes ──────────────────────────
  useEffect(() => {
    if (!backgroundUrl) { bgImageRef.current = null; return; }
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.src = backgroundUrl;
    img.onload = () => { bgImageRef.current = img; };
  }, [backgroundUrl]);

  // ── Boot MediaPipe + start render loop ─────────────────────────────────────
  useEffect(() => {
    let alive = true;

    // Off-screen canvas stays the same size as our processing resolution
    const PROC_W = 640, PROC_H = 360;
    const temp = document.createElement('canvas');
    temp.width = PROC_W; temp.height = PROC_H;
    tempCanvasRef.current = temp;

    // ── Fallback draw (raw video, no segmentation) ──
    const drawRaw = (ts) => {
      if (!alive) return;
      if (ts - lastTRef.current > 66) {   // ~15 fps
        lastTRef.current = ts;
        const vid = videoRef.current;
        const cvs = canvasRef.current;
        if (vid && cvs && vid.readyState >= 2) {
          cvs.getContext('2d').drawImage(vid, 0, 0, cvs.width, cvs.height);
        }
      }
      rafRef.current = requestAnimationFrame(drawRaw);
    };

    const init = async () => {
      try {
        await loadMediaPipe();
        if (!alive) return;

        const seg = new window.SelfieSegmentation({
          locateFile: (f) =>
            `https://cdn.jsdelivr.net/npm/@mediapipe/selfie_segmentation@0.1/${f}`,
        });
        // model 0 = lightweight landscape model (fast, WebGL-accelerated)
        seg.setOptions({ modelSelection: 0, selfieMode: true });

        seg.onResults((res) => {
          const cvs = canvasRef.current;
          if (!cvs || !alive) return;
          const ctx = cvs.getContext('2d');
          const W = cvs.width, H = cvs.height;
          const tempCtx = tempCanvasRef.current.getContext('2d');

          ctx.clearRect(0, 0, W, H);

          if (bgImageRef.current) {
            // 1. Draw chosen background
            ctx.drawImage(bgImageRef.current, 0, 0, W, H);

            // 2. Cut out person on off-screen canvas
            tempCtx.clearRect(0, 0, PROC_W, PROC_H);
            tempCtx.drawImage(res.image, 0, 0, PROC_W, PROC_H);
            tempCtx.globalCompositeOperation = 'destination-in';
            tempCtx.drawImage(res.segmentationMask, 0, 0, PROC_W, PROC_H);
            tempCtx.globalCompositeOperation = 'source-over';

            // 3. Composite person over background
            ctx.drawImage(tempCanvasRef.current, 0, 0, W, H);
          } else {
            // No background: just draw raw frame
            ctx.drawImage(res.image, 0, 0, W, H);
          }
        });

        segRef.current = seg;

        // ── Render loop — throttled to 15fps ──
        const loop = async (ts) => {
          if (!alive) return;
          if (ts - lastTRef.current > 66) {
            lastTRef.current = ts;
            const vid = videoRef.current;
            if (vid && vid.readyState >= 2 && segRef.current) {
              try { await segRef.current.send({ image: vid }); } catch (_) {}
            }
          }
          rafRef.current = requestAnimationFrame(loop);
        };
        rafRef.current = requestAnimationFrame(loop);

      } catch (err) {
        console.warn('MediaPipe failed, falling back to raw video:', err);
        rafRef.current = requestAnimationFrame(drawRaw);
      }
    };

    init();

    return () => {
      alive = false;
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      if (segRef.current) { segRef.current.close(); segRef.current = null; }
    };
  }, [videoRef]);

  return canvasRef;
}
