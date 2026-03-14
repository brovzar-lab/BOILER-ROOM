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
import { TILE_SIZE, ZOOM_OVERVIEW_THRESHOLD } from './types';
import { updateCamera, computeAutoFitZoom } from './camera';
import { updateAllCharacters } from './characters';
import { OFFICE_TILE_MAP } from './officeLayout';
import { renderFrame } from './renderer';
import { getAudioManager } from './audioManager';
import type { AgentStatus } from '@/types/agent';

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

  // Auto-fit zoom tracking: true until user manually overrides via ZoomControls
  let isAutoFitZoom = true;
  let firstFrame = true;

  // Audio tracking state
  let footstepTimer = 0;
  let prevActiveRoomId: string | null = null;
  let prevAgentStatuses: Record<string, AgentStatus> = {};

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

      // Recalculate auto-fit zoom on resize (only if user hasn't manually overridden)
      if (isAutoFitZoom && rect.width > 0 && rect.height > 0) {
        const fitZoom = computeAutoFitZoom(rect.width, rect.height);
        state.camera.zoom = fitZoom;
        useOfficeStore.getState().setZoomLevel(fitZoom);
      }
    }

    // On first frame, apply auto-fit zoom
    if (firstFrame && prevWidth > 0 && prevHeight > 0) {
      firstFrame = false;
      const fitZoom = computeAutoFitZoom(prevWidth, prevHeight);
      state.camera.zoom = fitZoom;
      useOfficeStore.getState().setZoomLevel(fitZoom);
    }

    // Detect manual zoom override: if store zoom differs from camera zoom
    // and it wasn't set by our auto-fit code, mark as manual override
    if (state.zoomLevel !== state.camera.zoom) {
      state.camera.zoom = state.zoomLevel;
      isAutoFitZoom = false;
    }

    // Expose auto-fit reset via a module-level flag
    if ((globalThis as Record<string, unknown>).__boiler_reset_autofit) {
      (globalThis as Record<string, unknown>).__boiler_reset_autofit = false;
      isAutoFitZoom = true;
      if (prevWidth > 0 && prevHeight > 0) {
        const fitZoom = computeAutoFitZoom(prevWidth, prevHeight);
        state.camera.zoom = fitZoom;
        useOfficeStore.getState().setZoomLevel(fitZoom);
      }
    }

    // Use CSS dimensions (logical pixels) for rendering calculations
    const canvasWidth = prevWidth;
    const canvasHeight = prevHeight;

    // Update all characters (movement, animation, room entry detection)
    updateAllCharacters(dt, OFFICE_TILE_MAP);

    // --- Audio triggers ---
    const audio = getAudioManager();

    // Footstep SFX: every ~0.3s during BILLY walk state
    const billy = state.characters.find((c) => c.id === 'billy');
    if (billy && billy.state === 'walk') {
      footstepTimer += dt;
      if (footstepTimer >= 0.3) {
        footstepTimer -= 0.3;
        void audio.playSfx('footstep');
      }
    } else {
      footstepTimer = 0;
    }

    // Room change: update ambient volume
    if (state.activeRoomId !== prevActiveRoomId) {
      prevActiveRoomId = state.activeRoomId;
      audio.updateAmbientForRoom(state.activeRoomId);
    }

    // Agent status transitions: chime when 'thinking' -> 'idle'/'needs-attention'
    const currentStatuses = state.agentStatuses ?? {};
    for (const [agentId, currentStatus] of Object.entries(currentStatuses)) {
      const prevStatus = prevAgentStatuses[agentId];
      if (
        prevStatus === 'thinking' &&
        (currentStatus === 'idle' || currentStatus === 'needs-attention')
      ) {
        void audio.playSfx('chime');
      }
    }
    prevAgentStatuses = { ...currentStatuses };

    // If BILLY is walking, set camera target to follow BILLY's pixel position
    if (billy && state.camera.followTarget === 'billy' && state.camera.zoom >= ZOOM_OVERVIEW_THRESHOLD) {
      // Camera targets BILLY's center pixel position, offset to center in viewport
      state.camera.targetX = billy.x * state.camera.zoom - canvasWidth / 2 + (TILE_SIZE * state.camera.zoom) / 2;
      state.camera.targetY = billy.y * state.camera.zoom - canvasHeight / 2 + (TILE_SIZE * state.camera.zoom) / 2;
    } else if (state.camera.zoom < ZOOM_OVERVIEW_THRESHOLD) {
      // Overview mode: center camera on the map
      state.camera.targetX = 0;
      state.camera.targetY = 0;
    }

    // Update camera (smooth follow toward target)
    updateCamera(state.camera, dt, canvasWidth, canvasHeight);

    // Render the frame (pass agentStatuses for canvas status overlays)
    renderFrame(
      ctx,
      state.camera,
      state.characters,
      state.activeRoomId,
      canvasWidth,
      canvasHeight,
      state.agentStatuses,
    );

    rafId = requestAnimationFrame(frame);
  }

  rafId = requestAnimationFrame(frame);

  return () => {
    stopped = true;
    cancelAnimationFrame(rafId);
  };
}
