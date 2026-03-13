import { useEffect, useState, useCallback } from 'react';
import { useChatStore } from '@/store/chatStore';
import { useDealStore } from '@/store/dealStore';
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

/**
 * Root application component.
 *
 * Full viewport height with dark background. Initializes deals and conversations
 * from IndexedDB on mount, then renders Header, DealSidebar (left), OfficeCanvas
 * (background layer), RoomLabel, ZoomControls, and ChatPanel (right overlay).
 *
 * Sidebar opens on app load for intentional deal selection before chatting.
 */
function App() {
  const [ready, setReady] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [needsMigration, setNeedsMigration] = useState(false);
  const [selectedFileId, setSelectedFileId] = useState<string | null>(null);

  // Wire canvas file icon clicks to open the FileViewer
  const handleFileClick = useCallback((fileId: string) => {
    setSelectedFileId(fileId);
  }, []);

  useEffect(() => {
    setOnFileClick(handleFileClick);
    return () => setOnFileClick(null);
  }, [handleFileClick]);

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
      <Header
        sidebarOpen={sidebarOpen}
        onToggleSidebar={() => setSidebarOpen((v) => !v)}
      />
      <main className="flex-1 flex overflow-hidden min-h-0">
        {/* Left sidebar: deals */}
        <DealSidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

        {/* Center: office canvas — takes all remaining space */}
        <div className="flex-1 relative overflow-hidden min-w-0">
          <OfficeCanvas />
          <RoomLabel />
          <ZoomControls />
        </div>

        {/* Right: chat panel — fixed width, independent column */}
        <div className="w-[400px] shrink-0 flex flex-col min-h-0
          border-l border-[--color-surface-border] relative">
          <ChatPanel />
          {/* FileViewer: overlays chat panel with higher z-index */}
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
