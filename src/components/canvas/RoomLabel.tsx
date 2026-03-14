import { useEffect, useState } from 'react';
import { useOfficeStore } from '@/store/officeStore';
import { ROOMS } from '@/engine/officeLayout';

/**
 * DOM overlay showing the current room name when BILLY is in a room.
 *
 * Positioned at the bottom-center of the canvas area.
 * Reads activeRoomId from officeStore reactively.
 * Fades in/out on room change via CSS transition.
 */
export function RoomLabel() {
  const activeRoomId = useOfficeStore((s) => s.activeRoomId);
  const [visible, setVisible] = useState(false);
  const [displayName, setDisplayName] = useState('');

  useEffect(() => {
    if (!activeRoomId) {
      setVisible(false);
      return;
    }

    const room = ROOMS.find((r) => r.id === activeRoomId);
    if (!room) {
      setVisible(false);
      return;
    }

    setDisplayName(room.name);
    // Brief delay for enter animation
    requestAnimationFrame(() => setVisible(true));
  }, [activeRoomId]);

  if (!activeRoomId) return null;

  return (
    <div
      className="absolute bottom-6 left-1/2 -translate-x-1/2 z-10
        pointer-events-none transition-opacity duration-300"
      style={{ opacity: visible ? 1 : 0 }}
    >
      <div
        className="px-4 py-2 rounded-lg
          bg-[--color-surface-card] border border-[--color-surface-border]
          text-[--color-text-primary] text-sm font-medium
          shadow-lg backdrop-blur-sm flex items-center gap-2"
      >
        <RoomIcon roomId={activeRoomId} />
        <span>{displayName}</span>
      </div>
    </div>
  );
}

/**
 * Small icon/badge for the room type.
 * Uses simple emoji-free text badges matching the dark theme.
 */
function RoomIcon({ roomId }: { roomId: string }) {
  const label = getRoomBadge(roomId);
  return (
    <span
      className="inline-flex items-center justify-center w-5 h-5
        rounded text-[10px] font-bold bg-[--color-surface-elevated]
        text-[--color-text-secondary]"
    >
      {label}
    </span>
  );
}

function getRoomBadge(roomId: string): string {
  switch (roomId) {
    case 'billy':
      return 'B';
    case 'war-room':
      return 'W';
    case 'patrik':
      return 'D';
    case 'marcos':
      return 'M';
    case 'sandra':
      return 'S';
    case 'isaac':
      return 'R';
    case 'wendy':
      return 'V';
    default:
      return '?';
  }
}
