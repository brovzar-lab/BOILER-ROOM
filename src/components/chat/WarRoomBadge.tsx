/**
 * Small inline badge indicating a message originated from a War Room broadcast.
 * Displayed next to agent name in individual conversation threads.
 */
export function WarRoomBadge() {
  return (
    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-amber-900/40 text-amber-300 border border-amber-700/30">
      War Room
    </span>
  );
}
