import { useState, useRef, useEffect, useCallback } from 'react';

interface ChatInputProps {
  onSend: (content: string) => void;
  onCancel: () => void;
  isStreaming: boolean;
  placeholder?: string;
  /** Optional: trigger file attach dialog */
  onAttachClick?: () => void;
  /** Optional: file count to show as badge on attach button */
  fileCount?: number;
  /** Optional: trigger memory panel */
  onMemoryClick?: () => void;
  /** Optional: fact count for memory badge */
  factCount?: number;
  /** Optional: show processing indicator */
  isProcessing?: boolean;
}

/**
 * Chat input area with auto-growing textarea, Enter-to-send,
 * Attach/Memory icon buttons, and a Send/Stop toggle button.
 */
export function ChatInput({
  onSend,
  onCancel,
  isStreaming,
  placeholder = 'Type a message...',
  onAttachClick,
  fileCount = 0,
  onMemoryClick,
  factCount = 0,
  isProcessing = false,
}: ChatInputProps) {
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
      {/* Processing indicator */}
      {isProcessing && (
        <div className="text-xs text-amber-400 animate-pulse mb-2 px-1">
          Processing file...
        </div>
      )}

      <div className="flex items-end gap-3 max-w-3xl mx-auto">
        {/* Left icon buttons: Attach + Memory */}
        {(onAttachClick || onMemoryClick) && (
          <div className="flex items-center gap-1 pb-1.5">
            {/* Attach button (paperclip) */}
            {onAttachClick && (
              <button
                type="button"
                onClick={onAttachClick}
                title="Attach PDF, DOCX or Excel file"
                className="relative p-2 text-neutral-400 hover:text-neutral-200 hover:bg-neutral-700 rounded-lg transition-colors"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                </svg>
                {/* File count pill badge */}
                {fileCount > 0 && (
                  <span className="absolute -top-1 -right-1 bg-blue-500 text-white text-[9px] rounded-full w-4 h-4 flex items-center justify-center font-bold">
                    {fileCount > 9 ? '9+' : fileCount}
                  </span>
                )}
              </button>
            )}

            {/* Memory button (brain) */}
            {onMemoryClick && (
              <button
                type="button"
                onClick={onMemoryClick}
                title="Memory facts"
                className="relative p-2 text-neutral-400 hover:text-neutral-200 hover:bg-neutral-700 rounded-lg transition-colors"
              >
                {/* Brain icon */}
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                </svg>
                {/* Fact count badge */}
                {factCount > 0 && (
                  <span className="absolute -top-1 -right-1 bg-neutral-600 text-neutral-200 text-[9px] rounded-full w-4 h-4 flex items-center justify-center font-bold">
                    {factCount > 9 ? '9+' : factCount}
                  </span>
                )}
              </button>
            )}
          </div>
        )}

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
