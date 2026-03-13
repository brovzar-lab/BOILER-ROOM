import { useState, useRef, useEffect } from 'react';

interface MigrationPromptProps {
  onMigrate: (action: 'general' | 'new-deal', dealName?: string) => void;
  onDismiss: () => void;
}

/**
 * One-time legacy data migration prompt.
 *
 * Modal overlay shown when orphan conversations (without dealId) are detected
 * on first load. Offers to assign them to the "General" deal or create a new
 * named deal for them. Dismiss defaults to assigning to General.
 */
export function MigrationPrompt({ onMigrate, onDismiss }: MigrationPromptProps) {
  const [showNameInput, setShowNameInput] = useState(false);
  const nameRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (showNameInput) {
      nameRef.current?.focus();
    }
  }, [showNameInput]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
      <div className="w-[400px] bg-[--color-surface-bg] border border-[--color-border] rounded-lg shadow-xl p-6">
        <h2 className="text-sm font-bold text-[--color-text] mb-2">
          Legacy Conversations Found
        </h2>
        <p className="text-xs text-[--color-text-muted] mb-4 leading-relaxed">
          You have existing conversations from before Deal Rooms were added. Where would you like to assign them?
        </p>

        {!showNameInput ? (
          <div className="flex flex-col gap-2">
            <button
              className="w-full px-3 py-2 text-xs bg-[--color-lemon-400] text-[--color-surface-bg] rounded font-medium hover:bg-[--color-lemon-400]/90"
              onClick={() => onMigrate('general')}
            >
              Assign to General
            </button>
            <button
              className="w-full px-3 py-2 text-xs border border-[--color-border] text-[--color-text] rounded hover:bg-[--color-text]/5"
              onClick={() => setShowNameInput(true)}
            >
              Create a new deal for them
            </button>
            <button
              className="text-xs text-[--color-text-muted] hover:text-[--color-text] mt-1"
              onClick={onDismiss}
            >
              Dismiss
            </button>
          </div>
        ) : (
          <div>
            <input
              ref={nameRef}
              type="text"
              className="w-full px-2 py-1.5 text-xs bg-[--color-surface-bg] border border-[--color-border] rounded text-[--color-text] focus:outline-none focus:border-[--color-lemon-400] mb-2"
              placeholder="Deal name for legacy conversations..."
              onKeyDown={(e) => {
                if (e.key === 'Enter' && nameRef.current?.value.trim()) {
                  onMigrate('new-deal', nameRef.current.value.trim());
                }
                if (e.key === 'Escape') {
                  setShowNameInput(false);
                }
              }}
            />
            <div className="flex gap-2">
              <button
                className="flex-1 px-3 py-1.5 text-xs bg-[--color-lemon-400] text-[--color-surface-bg] rounded font-medium hover:bg-[--color-lemon-400]/90 disabled:opacity-50"
                disabled={!showNameInput}
                onClick={() => {
                  const name = nameRef.current?.value.trim();
                  if (name) onMigrate('new-deal', name);
                }}
              >
                Create
              </button>
              <button
                className="flex-1 px-3 py-1.5 text-xs text-[--color-text-muted] hover:text-[--color-text]"
                onClick={() => setShowNameInput(false)}
              >
                Back
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
