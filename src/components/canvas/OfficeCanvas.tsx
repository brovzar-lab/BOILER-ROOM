import { useRef, useEffect } from 'react';
import { loadAllAssets } from '@/engine/spriteSheet';
import { useOfficeStore } from '@/store/officeStore';
import { startGameLoop } from '@/engine/gameLoop';
import { setupInputHandlers } from '@/engine/input';

/**
 * React wrapper mounting the Canvas 2D engine.
 *
 * Manages the canvas DOM element, HiDPI setup, resize handling,
 * asset loading, character initialization, game loop, and input.
 * All rendering happens outside React via requestAnimationFrame.
 */
export function OfficeCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    let stopLoop: (() => void) | null = null;
    let cleanupInput: (() => void) | null = null;
    let resizeObserver: ResizeObserver | null = null;
    let cancelled = false;

    // HiDPI setup: scale canvas internal resolution to match device pixel ratio
    function setupHiDPI(): void {
      if (!canvas) return;
      const dpr = window.devicePixelRatio || 1;
      const rect = canvas.getBoundingClientRect();

      // Set internal resolution to CSS size * DPR
      canvas.width = Math.floor(rect.width * dpr);
      canvas.height = Math.floor(rect.height * dpr);

      // CSS size stays the same (managed by Tailwind)
      canvas.style.width = `${rect.width}px`;
      canvas.style.height = `${rect.height}px`;

      // Scale context so drawing operations use CSS coordinates
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.scale(dpr, dpr);
        ctx.imageSmoothingEnabled = false;
      }
    }

    async function init(): Promise<void> {
      // Initial HiDPI setup
      setupHiDPI();

      // Load all sprite assets (no-op in Phase 2, ready for Phase 8)
      await loadAllAssets();

      if (cancelled) return;

      // Initialize characters in the office store
      useOfficeStore.getState().initializeCharacters();

      // Start the game loop (reads store via getState each frame)
      stopLoop = startGameLoop(canvas);

      // Set up input handlers (click-to-walk, zoom toggle, hover)
      cleanupInput = setupInputHandlers(canvas);

      // ResizeObserver: re-run HiDPI setup when container resizes
      resizeObserver = new ResizeObserver(() => {
        setupHiDPI();
      });
      resizeObserver.observe(canvas.parentElement ?? canvas);
    }

    void init();

    // Cleanup on unmount
    return () => {
      cancelled = true;
      if (stopLoop) stopLoop();
      if (cleanupInput) cleanupInput();
      if (resizeObserver) resizeObserver.disconnect();
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="w-full h-full absolute inset-0"
      style={{ imageRendering: 'pixelated' }}
    />
  );
}
