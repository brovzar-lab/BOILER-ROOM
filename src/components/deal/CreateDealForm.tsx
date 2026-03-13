import { useEffect, useRef, useState } from 'react';
import { useDealStore } from '@/store/dealStore';

interface CreateDealFormProps {
  onCreated: (dealId: string) => void;
  onCancel: () => void;
}

/**
 * Inline form for creating a new deal.
 *
 * Compact form with name input (required), description input (optional),
 * Create button, and Cancel link. Auto-focuses name input on mount.
 */
export function CreateDealForm({ onCreated, onCancel }: CreateDealFormProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [creating, setCreating] = useState(false);
  const nameRef = useRef<HTMLInputElement>(null);

  // Auto-focus name input on mount
  useEffect(() => {
    nameRef.current?.focus();
  }, []);

  const handleSubmit = async () => {
    const trimmedName = name.trim();
    if (!trimmedName || creating) return;

    setCreating(true);
    try {
      const dealId = await useDealStore.getState().createDeal(
        trimmedName,
        description.trim() || undefined,
      );
      onCreated(dealId);
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="px-3 py-2 border-b border-[--color-border]">
      <input
        ref={nameRef}
        type="text"
        value={name}
        onChange={(e) => setName(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') void handleSubmit();
          if (e.key === 'Escape') onCancel();
        }}
        className="w-full px-2 py-1 text-xs bg-[--color-surface-bg] border border-[--color-border] rounded text-[--color-text] focus:outline-none focus:border-[--color-lemon-400] mb-1"
        placeholder="Deal name..."
      />
      <input
        type="text"
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') void handleSubmit();
          if (e.key === 'Escape') onCancel();
        }}
        className="w-full px-2 py-1 text-xs bg-[--color-surface-bg] border border-[--color-border] rounded text-[--color-text] focus:outline-none focus:border-[--color-lemon-400] mb-1.5"
        placeholder="Brief description..."
      />
      <div className="flex items-center gap-2">
        <button
          className="px-3 py-1 text-xs bg-[--color-lemon-400] text-[--color-surface-bg] rounded font-medium hover:bg-[--color-lemon-400]/90 disabled:opacity-50 disabled:cursor-not-allowed"
          onClick={() => void handleSubmit()}
          disabled={!name.trim() || creating}
        >
          {creating ? 'Creating...' : 'Create'}
        </button>
        <button
          className="text-xs text-[--color-text-muted] hover:text-[--color-text]"
          onClick={onCancel}
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
