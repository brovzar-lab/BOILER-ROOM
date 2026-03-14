import { useOfficeStore } from '@/store/officeStore';
import { startAnimatedZoom, nearestHalf, MAX_ZOOM } from '@/engine/zoomController';
import { zoomState } from '@/engine/input';
import { computeAutoFitZoom } from '@/engine/camera';

/**
 * Minimal +/- zoom overlay buttons.
 *
 * Calls startAnimatedZoom for smooth 0.5-step transitions.
 * Positioned at bottom-right corner. Semi-transparent with hover reveal.
 */
export function ZoomControls() {
  const zoomLevel = useOfficeStore((s) => s.zoomLevel);
  const setZoomLevel = useOfficeStore((s) => s.setZoomLevel);

  const minZoom = computeAutoFitZoom(window.innerWidth, window.innerHeight);

  function handleZoomIn(): void {
    const target = Math.min(nearestHalf(zoomLevel) + 0.5, MAX_ZOOM);
    startAnimatedZoom(zoomState, target, window.innerWidth / 2, window.innerHeight / 2);
    setZoomLevel(target);
  }

  function handleZoomOut(): void {
    const target = Math.max(nearestHalf(zoomLevel) - 0.5, minZoom);
    startAnimatedZoom(zoomState, target, window.innerWidth / 2, window.innerHeight / 2);
    setZoomLevel(target);
  }

  const zoomInDisabled = nearestHalf(zoomLevel) + 0.5 > MAX_ZOOM;
  const zoomOutDisabled = nearestHalf(zoomLevel) - 0.5 < minZoom;

  return (
    <div className="absolute bottom-6 right-6 z-10 flex flex-col gap-1">
      <button
        type="button"
        onClick={handleZoomIn}
        disabled={zoomInDisabled}
        className="w-6 h-6 flex items-center justify-center rounded
          bg-[--color-surface-card]/80 border border-[--color-surface-border]
          text-[--color-text-primary] text-xs font-bold
          opacity-40 hover:opacity-100
          disabled:opacity-20 disabled:cursor-not-allowed
          transition-all cursor-pointer"
        aria-label="Zoom in"
        title="Zoom in (+/=)"
      >
        +
      </button>
      <button
        type="button"
        onClick={handleZoomOut}
        disabled={zoomOutDisabled}
        className="w-6 h-6 flex items-center justify-center rounded
          bg-[--color-surface-card]/80 border border-[--color-surface-border]
          text-[--color-text-primary] text-xs font-bold
          opacity-40 hover:opacity-100
          disabled:opacity-20 disabled:cursor-not-allowed
          transition-all cursor-pointer"
        aria-label="Zoom out"
        title="Zoom out (-)"
      >
        -
      </button>
    </div>
  );
}
