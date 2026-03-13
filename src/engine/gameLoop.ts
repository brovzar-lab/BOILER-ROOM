/**
 * Game loop running on requestAnimationFrame, independent of React render cycle.
 *
 * Reads officeStore via getState() (non-reactive) each frame.
 * Updates camera, then renders. Returns a cleanup function that stops the loop.
 *
 * HiDPI setup happens OUTSIDE this module (in the React mount effect).
 * The game loop receives an already-configured canvas.
 */
import { useOfficeStore } from '@/store/officeStore';
import { updateCamera } from './camera';
import { renderFrame } from './renderer';

/**
 * Starts the game loop on the given canvas element.
 * Returns a cleanup function that stops the loop and cancels the animation frame.
 */
export function startGameLoop(canvas: HTMLCanvasElement): () => void {
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('Failed to get 2d context from canvas');
  }

  ctx.imageSmoothingEnabled = false;

  let lastTime = 0;
  let stopped = false;
  let rafId = 0;

  // Track canvas dimensions for resize detection
  let prevWidth = 0;
  let prevHeight = 0;

  function frame(time: number): void {
    if (stopped) return;

    // Delta time with cap at 100ms to prevent jumps on tab switch
    const dt = lastTime === 0 ? 0 : Math.min((time - lastTime) / 1000, 0.1);
    lastTime = time;

    // Read state non-reactively (no re-renders)
    const state = useOfficeStore.getState();

    // Check for canvas resize
    const rect = canvas.getBoundingClientRect();
    if (rect.width !== prevWidth || rect.height !== prevHeight) {
      prevWidth = rect.width;
      prevHeight = rect.height;
      // HiDPI reconfigure
      const dpr = window.devicePixelRatio || 1;
      canvas.width = Math.floor(rect.width * dpr);
      canvas.height = Math.floor(rect.height * dpr);
      ctx.scale(dpr, dpr);
      ctx.imageSmoothingEnabled = false;
    }

    // Use CSS dimensions (logical pixels) for rendering calculations
    const canvasWidth = prevWidth;
    const canvasHeight = prevHeight;

    // Update camera (smooth follow toward target)
    updateCamera(state.camera, dt, canvasWidth, canvasHeight);

    // Render the frame
    renderFrame(
      ctx,
      state.camera,
      state.characters,
      state.activeRoomId,
      canvasWidth,
      canvasHeight,
    );

    rafId = requestAnimationFrame(frame);
  }

  rafId = requestAnimationFrame(frame);

  return () => {
    stopped = true;
    cancelAnimationFrame(rafId);
  };
}
