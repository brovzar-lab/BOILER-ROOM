import { useState, useRef, useEffect, useCallback } from 'react';

interface ChatInputProps {
  onSend: (content: string) => void;
  onCancel: () => void;
  isStreaming: boolean;
  placeholder?: string;
}

/**
 * Chat input area with auto-growing textarea, Enter-to-send, and
 * a Send/Stop toggle button.
 */
export function ChatInput({ onSend, onCancel, isStreaming, placeholder = 'Type a message...' }: ChatInputProps) {
  const [value, setValue] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Focus textarea on mount
  useEffect(() => {
    textareaRef.current?.focus();
  }, []);

  // Auto-resize textarea to fit content, up to 6 lines (~144px)
  const adjustHeight = useCallback(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    const maxHeight = 144; // ~6 lines at 24px line height
    el.style.height = `${Math.min(el.scrollHeight, maxHeight)}px`;
  }, []);

  useEffect(() => {
    adjustHeight();
  }, [value, adjustHeight]);

  const handleSend = useCallback(() => {
    const trimmed = value.trim();
    if (!trimmed) return;
    onSend(trimmed);
    setValue('');
    // Reset height after clearing
    requestAnimationFrame(() => {
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
      }
    });
  }, [value, onSend]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        if (!isStreaming) {
          handleSend();
        }
      }
    },
    [handleSend, isStreaming],
  );

  return (
    <div className="border-t border-[--color-surface-border] bg-[--color-surface-card] p-4">
      <div className="flex items-end gap-3 max-w-3xl mx-auto">
        <textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          rows={1}
          disabled={isStreaming}
          className="flex-1 resize-none rounded-lg border border-[--color-surface-border] bg-[--color-surface-bg] px-4 py-3 text-[--color-text-primary] placeholder-[--color-text-muted] focus:outline-none focus:border-[--color-lemon-500] disabled:opacity-50 disabled:cursor-not-allowed"
        />

        {isStreaming ? (
          <button
            type="button"
            onClick={onCancel}
            className="flex-shrink-0 rounded-lg bg-red-600 hover:bg-red-500 text-white px-5 py-3 font-medium transition-colors"
          >
            Stop
          </button>
        ) : (
          <button
            type="button"
            onClick={handleSend}
            disabled={!value.trim()}
            className="flex-shrink-0 rounded-lg bg-[--color-lemon-600] hover:bg-[--color-lemon-500] text-black px-5 py-3 font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Send
          </button>
        )}
      </div>
    </div>
  );
}
