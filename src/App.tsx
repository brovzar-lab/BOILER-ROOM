import { useEffect, useState, useCallback, useRef } from 'react';
import { useChatStore } from '@/store/chatStore';
import { useDealStore } from '@/store/dealStore';
import { useFileStore } from '@/store/fileStore';
import { useOfficeStore } from '@/store/officeStore';
import { migrateConversationsToDeals } from '@/services/persistence/migration';
import { setOnFileClick } from '@/engine/input';
import { Header } from '@/components/ui/Header';
import { ChatPanel } from '@/components/chat/ChatPanel';
import { FileViewer } from '@/components/FileViewer';
import { OfficeCanvas } from '@/components/canvas/OfficeCanvas';
import { RoomLabel } from '@/components/canvas/RoomLabel';
import { ZoomControls } from '@/components/canvas/ZoomControls';
import { DealSidebar } from '@/components/deal/DealSidebar';
import { MigrationPrompt } from '@/components/deal/MigrationPrompt';
import type { AgentId } from '@/types/agent';
import { getAudioManager } from '@/engine/audioManager';

const VALID_EXTENSIONS = new Set(['.pdf', '.docx', '.xlsx', '.xls']);
const AGENT_IDS: AgentId[] = ['diana', 'marcos', 'sasha', 'roberto', 'valentina'];

function isAgentRoom(id: string | null): id is AgentId {
  return id !== null && AGENT_IDS.includes(id as AgentId);
}

/**
 * Root application component.
 *
 * Full viewport height with dark background. Initializes deals and conversations
 * from IndexedDB on mount, then renders Header, DealSidebar (left), OfficeCanvas
 * (background layer), RoomLabel, ZoomControls, and ChatPanel (right overlay).
 *
 * Sidebar opens on app load for intentional deal selection before chatting.
 */
/** Width threshold below which chat auto-collapses */
const CHAT_COLLAPSE_WIDTH = 1400;

function App() {
  const [ready, setReady] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [chatOpen, setChatOpen] = useState(true);
  const [needsMigration, setNeedsMigration] = useState(false);
  const [selectedFileId, setSelectedFileId] = useState<string | null>(null);
  const [isDeskDragOver, setIsDeskDragOver] = useState(false);
  const deskFileInputRef = useRef<HTMLInputElement>(null);
  const mainRef = useRef<HTMLElement>(null);
  /** Tracks whether user manually toggled chat (overrides auto-collapse until resize crosses threshold again) */
  const userToggledChatRef = useRef(false);

  // Resolve which agent to upload to: active room if it's an agent, else first agent
  const resolveUploadAgent = useCallback((): AgentId => {
    const roomId = useOfficeStore.getState().activeRoomId;
    return isAgentRoom(roomId) ? roomId : 'diana';
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

  // Responsive chat collapse: observe main container width
  useEffect(() => {
    const el = mainRef.current;
    if (!el) return;

    let lastCrossedBelow = el.getBoundingClientRect().width < CHAT_COLLAPSE_WIDTH;

    const observer = new ResizeObserver((entries) => {
      const width = entries[0]?.contentRect.width ?? 0;
      const nowBelow = width < CHAT_COLLAPSE_WIDTH;

      // Only act when crossing the threshold (not on every resize)
      if (nowBelow !== lastCrossedBelow) {
        lastCrossedBelow = nowBelow;
        userToggledChatRef.current = false; // reset manual override on threshold cross
        setChatOpen(!nowBelow);
      }
    });

    observer.observe(el);

    // Initial check
    const initWidth = el.getBoundingClientRect().width;
    if (initWidth < CHAT_COLLAPSE_WIDTH) {
      setChatOpen(false);
    }

    return () => observer.disconnect();
  }, []);

  const toggleChat = useCallback(() => {
    userToggledChatRef.current = true;
    setChatOpen((v) => !v);
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
      <Header
        sidebarOpen={sidebarOpen}
        onToggleSidebar={() => setSidebarOpen((v) => !v)}
      />
      <main ref={mainRef} className="flex-1 flex overflow-hidden min-h-0">
        {/* Left sidebar: deals */}
        <DealSidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

        {/* Center: office canvas + desk drop zone */}
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

          {/* Chat expand button (visible when chat collapsed) */}
          {!chatOpen && (
            <button
              onClick={toggleChat}
              className="absolute top-3 right-3 z-20 flex items-center gap-2
                px-3 py-2 rounded-lg
                bg-[--color-surface-card]/90 border border-[--color-surface-border]
                text-[--color-text-primary] text-sm font-medium
                hover:bg-[--color-surface-elevated] backdrop-blur-sm
                transition-all duration-200 cursor-pointer shadow-lg"
              aria-label="Open chat panel"
            >
              {/* Chat bubble icon */}
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round"
                  d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
              Chat
            </button>
          )}
        </div>

        {/* Right: chat panel -- responsive collapsible column */}
        {chatOpen && (
          <div className="w-[400px] max-w-[500px] shrink-0 flex flex-col min-h-0
            border-l border-[--color-surface-border] relative
            transition-all duration-200">
            {/* Chat collapse button */}
            <button
              onClick={toggleChat}
              className="absolute top-2 right-2 z-30 w-6 h-6
                flex items-center justify-center rounded
                bg-[--color-surface-card]/80 border border-[--color-surface-border]
                text-[--color-text-muted] text-xs
                hover:bg-[--color-surface-elevated] hover:text-[--color-text-primary]
                transition-colors cursor-pointer"
              aria-label="Collapse chat panel"
              title="Collapse chat"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 5l7 7-7 7M5 5l7 7-7 7" />
              </svg>
            </button>
            <ChatPanel />
            {/* FileViewer: overlays chat panel with higher z-index */}
            <FileViewer
              fileId={selectedFileId}
              onClose={() => setSelectedFileId(null)}
            />
          </div>
        )}
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
