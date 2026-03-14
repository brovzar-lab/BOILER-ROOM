import { useOfficeStore } from '@/store/officeStore';

/**
 * Overlay buttons for zoom control.
 *
 * Three actions: zoom in (+), zoom out (-), and auto-fit (reset).
 * Supports zoom levels 1 through 4 (auto-fit may pick any level).
 * Positioned at bottom-right corner of the canvas area.
 */
const MAX_ZOOM = 4;
const MIN_ZOOM = 1;

export function ZoomControls() {
  const zoomLevel = useOfficeStore((s) => s.zoomLevel);
  const setZoomLevel = useOfficeStore((s) => s.setZoomLevel);

  const modeLabel = zoomLevel === 1 ? 'Overview' : zoomLevel >= 2 ? 'Follow' : '';

  function handleZoomIn(): void {
    if (zoomLevel < MAX_ZOOM) {
      setZoomLevel(zoomLevel + 1);
    }
  }

  function handleZoomOut(): void {
    if (zoomLevel > MIN_ZOOM) {
      setZoomLevel(zoomLevel - 1);
    }
  }

  function handleAutoFit(): void {
    // Signal the game loop to recalculate and apply auto-fit zoom
    (globalThis as Record<string, unknown>).__boiler_reset_autofit = true;
  }

  return (
    <div className="absolute bottom-6 right-6 z-10 flex flex-col items-center gap-2">
      {/* Mode label */}
      <span
        className="text-[10px] font-medium tracking-wide uppercase
          text-[--color-text-muted] select-none"
      >
        {modeLabel}
      </span>

      {/* Zoom buttons */}
      <div className="flex flex-col gap-1">
        <button
          type="button"
          onClick={handleZoomIn}
          disabled={zoomLevel >= MAX_ZOOM}
          className="w-8 h-8 flex items-center justify-center rounded
            bg-[--color-surface-card]/80 border border-[--color-surface-border]
            text-[--color-text-primary] text-sm font-bold
            hover:bg-[--color-surface-elevated] disabled:opacity-30
            disabled:cursor-not-allowed transition-colors cursor-pointer"
          aria-label="Zoom in"
        >
          +
        </button>
        <button
          type="button"
          onClick={handleZoomOut}
          disabled={zoomLevel <= MIN_ZOOM}
          className="w-8 h-8 flex items-center justify-center rounded
            bg-[--color-surface-card]/80 border border-[--color-surface-border]
            text-[--color-text-primary] text-sm font-bold
            hover:bg-[--color-surface-elevated] disabled:opacity-30
            disabled:cursor-not-allowed transition-colors cursor-pointer"
          aria-label="Zoom out"
        >
          -
        </button>

        {/* Auto-fit button */}
        <button
          type="button"
          onClick={handleAutoFit}
          className="w-8 h-8 flex items-center justify-center rounded
            bg-[--color-surface-card]/80 border border-[--color-surface-border]
            text-[--color-text-primary] text-xs
            hover:bg-[--color-surface-elevated] transition-colors cursor-pointer"
          aria-label="Auto-fit zoom"
          title="Fit entire office"
        >
          {/* Arrows-inward icon */}
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round"
              d="M4 4l5 5m0-5H4v5m16-5l-5 5m5 0V4h-5M4 20l5-5m-5 0v5h5m11-5l-5-5m5 0v5h-5" />
          </svg>
        </button>
      </div>
    </div>
  );
}
