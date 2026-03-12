import { useChatStore } from '@/store/chatStore';

/**
 * App header with Lemon Command Center branding and Diana's status.
 * Clean, minimal design with thin amber bottom border.
 */
export function Header() {
  const isStreaming = useChatStore((s) => s.streaming.isStreaming);

  return (
    <header className="flex items-center justify-between px-6 py-3 border-b border-[--color-lemon-600]/30 bg-[--color-surface-bg]">
      {/* Left: app name */}
      <div className="flex items-center gap-2">
        <span className="text-lg font-bold text-[--color-lemon-400] tracking-tight">
          Lemon Command Center
        </span>
      </div>

      {/* Right: agent indicator */}
      <div className="flex items-center gap-2">
        <span
          className={`inline-block w-2 h-2 rounded-full ${
            isStreaming
              ? 'bg-[--color-lemon-400] animate-pulse'
              : 'bg-green-500'
          }`}
        />
        <span className="text-sm text-[--color-text-secondary]">
          Diana <span className="text-[--color-text-muted]">- CFO</span>
        </span>
      </div>
    </header>
  );
}
