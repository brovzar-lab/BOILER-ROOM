import { useOfficeStore } from '@/store/officeStore';

/**
 * Overlay buttons for zoom control.
 *
 * Two buttons: zoom in (+) and zoom out (-).
 * Toggles between Overview (zoom 1) and Follow (zoom 2).
 * Positioned at bottom-right corner of the canvas area.
 */
export function ZoomControls() {
  const zoomLevel = useOfficeStore((s) => s.zoomLevel);
  const setZoomLevel = useOfficeStore((s) => s.setZoomLevel);

  const isOverview = zoomLevel === 1;
  const modeLabel = isOverview ? 'Overview' : 'Follow';

  function handleZoomIn(): void {
    if (zoomLevel < 2) {
      setZoomLevel(zoomLevel + 1);
    }
  }

  function handleZoomOut(): void {
    if (zoomLevel > 1) {
      setZoomLevel(zoomLevel - 1);
    }
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
          disabled={zoomLevel >= 2}
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
          disabled={zoomLevel <= 1}
          className="w-8 h-8 flex items-center justify-center rounded
            bg-[--color-surface-card]/80 border border-[--color-surface-border]
            text-[--color-text-primary] text-sm font-bold
            hover:bg-[--color-surface-elevated] disabled:opacity-30
            disabled:cursor-not-allowed transition-colors cursor-pointer"
          aria-label="Zoom out"
        >
          -
        </button>
      </div>
    </div>
  );
}
