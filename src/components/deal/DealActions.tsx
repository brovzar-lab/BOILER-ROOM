import { useEffect, useRef, useState } from 'react';
import type { DealStatus } from '@/types/deal';
import { useDealStore } from '@/store/dealStore';

interface DealActionsProps {
  dealId: string;
  dealName: string;
  dealStatus: DealStatus;
  onClose: () => void;
}

/**
 * Three-dot dropdown menu for deal actions.
 *
 * Provides Rename, Edit Description, Archive/Unarchive, and Delete with
 * confirmation. Uses absolute positioning and click-outside to close.
 */
export function DealActions({ dealId, dealName, dealStatus, onClose }: DealActionsProps) {
  const [mode, setMode] = useState<'menu' | 'rename' | 'description' | 'confirm-delete'>('menu');
  const [inputValue, setInputValue] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Click outside to close
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        onClose();
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [onClose]);

  // Auto-focus input when entering rename/description mode
  useEffect(() => {
    if (mode === 'rename' || mode === 'description') {
      inputRef.current?.focus();
    }
  }, [mode]);

  const handleRename = async () => {
    const trimmed = inputValue.trim();
    if (!trimmed) return;
    await useDealStore.getState().renameDeal(dealId, trimmed);
    onClose();
  };

  const handleDescription = async () => {
    await useDealStore.getState().updateDealDescription(dealId, inputValue.trim());
    onClose();
  };

  const handleArchiveToggle = async () => {
    if (dealStatus === 'archived') {
      // Unarchive: set back to active
      const deals = useDealStore.getState().deals;
      const deal = deals.find((d) => d.id === dealId);
      if (deal) {
        const updated = { ...deal, status: 'active' as DealStatus, updatedAt: Date.now() };
        const { getPersistence } = await import('@/services/persistence/adapter');
        const persistence = getPersistence();
        await persistence.set('deals', dealId, updated);
        useDealStore.setState((state) => ({
          deals: state.deals.map((d) => (d.id === dealId ? updated : d)),
        }));
      }
    } else {
      await useDealStore.getState().archiveDeal(dealId);
    }
    onClose();
  };

  const handleDelete = async () => {
    const store = useDealStore.getState();

    // If deleting the active deal, switch to another one first
    if (store.activeDealId === dealId) {
      const otherDeal = store.deals.find((d) => d.id !== dealId && d.status === 'active');
      if (otherDeal) {
        await store.switchDeal(otherDeal.id);
      } else {
        // Create a new General deal and switch to it
        await store.ensureDefaultDeal();
        const freshState = useDealStore.getState();
        const defaultDeal = freshState.deals.find((d) => d.id === 'default');
        if (defaultDeal) {
          await store.switchDeal(defaultDeal.id);
        }
      }
    }

    await useDealStore.getState().softDeleteDeal(dealId);
    onClose();
  };

  const buttonClass =
    'w-full text-left px-3 py-1.5 text-xs text-[--color-text] hover:bg-[--color-text]/10 transition-colors';

  return (
    <div
      ref={dropdownRef}
      className="absolute right-2 top-8 w-44 bg-[--color-surface-bg] border border-[--color-border] rounded shadow-lg z-30"
      onClick={(e) => e.stopPropagation()}
    >
      {mode === 'menu' && (
        <>
          <button
            className={buttonClass}
            onClick={() => {
              setInputValue(dealName);
              setMode('rename');
            }}
          >
            Rename
          </button>
          <button
            className={buttonClass}
            onClick={() => {
              setInputValue('');
              setMode('description');
            }}
          >
            Edit Description
          </button>
          <button className={buttonClass} onClick={handleArchiveToggle}>
            {dealStatus === 'archived' ? 'Unarchive' : 'Archive'}
          </button>
          <button
            className={`${buttonClass} text-red-400 hover:text-red-300`}
            onClick={() => setMode('confirm-delete')}
          >
            Delete
          </button>
        </>
      )}

      {mode === 'rename' && (
        <div className="p-2">
          <input
            ref={inputRef}
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') void handleRename();
              if (e.key === 'Escape') onClose();
            }}
            className="w-full px-2 py-1 text-xs bg-[--color-surface-bg] border border-[--color-border] rounded text-[--color-text] focus:outline-none focus:border-[--color-lemon-400]"
            placeholder="Deal name..."
          />
          <div className="flex gap-1 mt-1.5">
            <button
              className="flex-1 px-2 py-1 text-xs bg-[--color-lemon-400] text-[--color-surface-bg] rounded font-medium hover:bg-[--color-lemon-400]/90"
              onClick={() => void handleRename()}
              disabled={!inputValue.trim()}
            >
              Save
            </button>
            <button
              className="flex-1 px-2 py-1 text-xs text-[--color-text-muted] hover:text-[--color-text]"
              onClick={onClose}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {mode === 'description' && (
        <div className="p-2">
          <input
            ref={inputRef}
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') void handleDescription();
              if (e.key === 'Escape') onClose();
            }}
            className="w-full px-2 py-1 text-xs bg-[--color-surface-bg] border border-[--color-border] rounded text-[--color-text] focus:outline-none focus:border-[--color-lemon-400]"
            placeholder="Brief description..."
          />
          <div className="flex gap-1 mt-1.5">
            <button
              className="flex-1 px-2 py-1 text-xs bg-[--color-lemon-400] text-[--color-surface-bg] rounded font-medium hover:bg-[--color-lemon-400]/90"
              onClick={() => void handleDescription()}
            >
              Save
            </button>
            <button
              className="flex-1 px-2 py-1 text-xs text-[--color-text-muted] hover:text-[--color-text]"
              onClick={onClose}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {mode === 'confirm-delete' && (
        <div className="p-2">
          <p className="text-xs text-[--color-text-muted] mb-2">
            Delete &apos;{dealName}&apos;? This cannot be undone.
          </p>
          <div className="flex gap-1">
            <button
              className="flex-1 px-2 py-1 text-xs bg-red-500 text-white rounded font-medium hover:bg-red-400"
              onClick={() => void handleDelete()}
            >
              Confirm
            </button>
            <button
              className="flex-1 px-2 py-1 text-xs text-[--color-text-muted] hover:text-[--color-text]"
              onClick={onClose}
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
