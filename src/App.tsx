import { useEffect, useState, useCallback, useRef } from 'react';
import { useChatStore } from '@/store/chatStore';
import { useDealStore } from '@/store/dealStore';
import { useFileStore } from '@/store/fileStore';
import { useOfficeStore } from '@/store/officeStore';
import { migrateConversationsToDeals } from '@/services/persistence/migration';
import { setOnFileClick } from '@/engine/input';
import { LeftPanel } from '@/components/LeftPanel';
import { FileViewer } from '@/components/FileViewer';
import { OfficeCanvas } from '@/components/canvas/OfficeCanvas';
import { RoomLabel } from '@/components/canvas/RoomLabel';
import { ZoomControls } from '@/components/canvas/ZoomControls';
import { MigrationPrompt } from '@/components/deal/MigrationPrompt';
import type { AgentId } from '@/types/agent';
import { getAudioManager } from '@/engine/audioManager';

const VALID_EXTENSIONS = new Set(['.pdf', '.docx', '.xlsx', '.xls']);
const AGENT_IDS: AgentId[] = ['patrik', 'marcos', 'sandra', 'isaac', 'wendy', 'charlie'];

function isAgentRoom(id: string | null): id is AgentId {
  return id !== null && AGENT_IDS.includes(id as AgentId);
}

/**
 * Root application component.
 *
 * Two-column layout: LeftPanel (chat + projects, 320px left) and
 * OfficeCanvas (flex-1 right). Top bar with LEMON STUDIOS branding.
 */
function App() {
  const [ready, setReady] = useState(false);
  const [needsMigration, setNeedsMigration] = useState(false);
  const [selectedFileId, setSelectedFileId] = useState<string | null>(null);
  const [isDeskDragOver, setIsDeskDragOver] = useState(false);
  const deskFileInputRef = useRef<HTMLInputElement>(null);
  const mainRef = useRef<HTMLElement>(null);

  // Resolve which agent to upload to: active room if it's an agent, else first agent
  const resolveUploadAgent = useCallback((): AgentId => {
    const roomId = useOfficeStore.getState().activeRoomId;
    return isAgentRoom(roomId) ? roomId : 'patrik';
  }, []);

  const uploadFiles = useCallback((files: FileList | File[]) => {
    const agentId = resolveUploadAgent();
    const fileStore = useFileStore.getState();
    const arr = Array.from(files);
    for (const file of arr) {
      const ext = '.' + file.name.split('.').pop()?.toLowerCase();
      if (VALID_EXTENSIONS.has(ext)) {
        void fileStore.addFile(file, agentId);
        void getAudioManager().playSfx('paper');
      }
    }
  }, [resolveUploadAgent]);

  const handleDeskDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
    setIsDeskDragOver(true);
  }, []);

  const handleDeskDragLeave = useCallback((e: React.DragEvent) => {
    if (e.currentTarget.contains(e.relatedTarget as Node)) return;
    setIsDeskDragOver(false);
  }, []);

  const handleDeskDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDeskDragOver(false);
    if (e.dataTransfer?.files) uploadFiles(e.dataTransfer.files);
  }, [uploadFiles]);

  const handleDeskFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) uploadFiles(e.target.files);
    e.target.value = '';
  }, [uploadFiles]);

  // Wire canvas file icon clicks to open the FileViewer
  const handleFileClick = useCallback((fileId: string) => {
    setSelectedFileId(fileId);
  }, []);

  useEffect(() => {
    setOnFileClick(handleFileClick);
    return () => setOnFileClick(null);
  }, [handleFileClick]);

  // Initialize AudioContext on first user interaction (browser autoplay policy)
  useEffect(() => {
    const handler = () => {
      getAudioManager().ensureContext();
      document.removeEventListener('click', handler);
      document.removeEventListener('keydown', handler);
    };
    document.addEventListener('click', handler, { once: true });
    document.addEventListener('keydown', handler, { once: true });
    return () => {
      document.removeEventListener('click', handler);
      document.removeEventListener('keydown', handler);
    };
  }, []);

  useEffect(() => {
    const init = async () => {
      // 1. Load deals from IndexedDB
      await useDealStore.getState().loadDeals();

      // 2. Check for legacy conversations needing migration
      const { getPersistence } = await import('@/services/persistence/adapter');
      const persistence = getPersistence();
      const allConversations = await persistence.getAll<{ id: string; dealId?: string }>('conversations');
      const hasOrphans = allConversations.some((conv) => !conv.dealId);

      if (hasOrphans) {
        // Run migration (stamps orphans with default dealId)
        await migrateConversationsToDeals();
        setNeedsMigration(true);
      }

      // 3. Ensure a default deal exists (creates "General" if no deals)
      await useDealStore.getState().ensureDefaultDeal();

      // 4. Auto-select the first active deal if none selected
      const dealState = useDealStore.getState();
      if (!dealState.activeDealId && dealState.deals.length > 0) {
        const firstActive = dealState.deals.find((d) => d.status === 'active');
        if (firstActive) {
          await dealState.switchDeal(firstActive.id);
        }
      }

      // 5. Load deal-scoped conversations
      await useChatStore.getState().loadConversations();

      setReady(true);

      // Request persistent storage (fire-and-forget)
      if (navigator.storage?.persist) {
        navigator.storage.persist().then((granted) => {
          console.log(`Persistent storage ${granted ? 'granted' : 'denied'}`);
        });
      }
    };
    void init();
  }, []);

  const handleMigrate = async (action: 'general' | 'new-deal', dealName?: string) => {
    const dealState = useDealStore.getState();

    if (action === 'new-deal' && dealName) {
      // Create a new deal and reassign orphan conversations from 'default' to it
      const newDealId = await dealState.createDeal(dealName);
      const { getPersistence } = await import('@/services/persistence/adapter');
      const persistence = getPersistence();
      const allConversations = await persistence.getAll<{ id: string; dealId?: string }>('conversations');
      const defaultConvs = allConversations.filter((c) => c.dealId === 'default');
      if (defaultConvs.length > 0) {
        await persistence.bulkSet(
          'conversations',
          defaultConvs.map((c) => ({ key: c.id, value: { ...c, dealId: newDealId } })),
        );
      }
      await dealState.switchDeal(newDealId);
    } else {
      // Assign to General (migration already stamped orphans with 'default')
      const defaultDeal = dealState.deals.find((d) => d.id === 'default');
      if (defaultDeal) {
        await dealState.switchDeal(defaultDeal.id);
      }
    }

    setNeedsMigration(false);
  };

  const handleDismissMigration = () => {
    // Dismiss defaults to assigning to General (already done by migration)
    setNeedsMigration(false);
  };

  if (!ready) {
    return (
      <div className="h-screen bg-[--color-surface-bg] flex items-center justify-center">
        <p className="text-[--color-text-muted] text-lg animate-pulse">Loading...</p>
      </div>
    );
  }

  return (
    <div className="h-screen bg-[--color-surface-bg] flex flex-col">
      {/* Top bar */}
      <div style={{
        height: 60,
        backgroundColor: '#000',
        borderBottom: '4px solid #c68f6b',
        display: 'flex',
        alignItems: 'center',
        padding: '0 24px',
        flexShrink: 0,
      }}>
        <span style={{
          fontWeight: 800,
          fontSize: 20,
          color: '#e5c04b',
          textShadow: '2px 2px 0 #d94a38',
          letterSpacing: 2,
          fontFamily: 'monospace',
        }}>
          LEMON STUDIOS
        </span>
      </div>

      <main ref={mainRef} className="flex-1 flex overflow-hidden min-h-0">
        <LeftPanel />

        {/* Canvas area */}
        <div
          className="flex-1 relative overflow-hidden min-w-0"
          onDragOver={handleDeskDragOver}
          onDragLeave={handleDeskDragLeave}
          onDrop={handleDeskDrop}
        >
          <OfficeCanvas />
          <RoomLabel />
          <ZoomControls />

          {/* Desk drop zone overlay */}
          {isDeskDragOver && (
            <div className="absolute inset-0 z-20 flex flex-col items-center justify-center
              bg-amber-400/10 border-2 border-dashed border-amber-400 pointer-events-none">
              <span className="text-4xl mb-2">📂</span>
              <span className="text-amber-300 font-semibold text-sm">Drop to upload to desk</span>
              <span className="text-amber-400/70 text-xs mt-1">PDF · DOCX · Excel</span>
            </div>
          )}

          {/* Hidden file input for desk upload button */}
          <input
            ref={deskFileInputRef}
            type="file"
            accept=".pdf,.docx,.xlsx,.xls"
            multiple
            className="hidden"
            onChange={handleDeskFileInput}
          />

          {/* Desk upload hint button */}
          <button
            onClick={() => deskFileInputRef.current?.click()}
            className="absolute bottom-14 right-3 z-10 flex items-center gap-1.5
              px-3 py-1.5 rounded-lg text-xs font-medium
              bg-neutral-800/80 hover:bg-neutral-700/90 backdrop-blur-sm
              text-neutral-400 hover:text-neutral-200 border border-neutral-700
              transition-colors"
            title="Upload file to desk"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
            </svg>
            Upload to desk
          </button>

          {/* FileViewer overlays canvas area */}
          <FileViewer
            fileId={selectedFileId}
            onClose={() => setSelectedFileId(null)}
          />
        </div>
      </main>

      {/* Migration prompt modal */}
      {needsMigration && (
        <MigrationPrompt
          onMigrate={(action, dealName) => void handleMigrate(action, dealName)}
          onDismiss={handleDismissMigration}
        />
      )}
    </div>
  );
}

export default App;
