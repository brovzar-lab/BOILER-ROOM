import { useEffect, useState } from 'react';
import { useChatStore } from '@/store/chatStore';
import { useDealStore } from '@/store/dealStore';
import { migrateConversationsToDeals } from '@/services/persistence/migration';
import { Header } from '@/components/ui/Header';
import { ChatPanel } from '@/components/chat/ChatPanel';
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

  const handleMigrate = async (action: 'general' | 'new-deal') => {
    if (action === 'new-deal') {
      // Create a new deal for legacy conversations
      // For simplicity, assign to default/General deal (migration already stamped them)
      // The user can rename it from the sidebar
    }
    // Migration already assigned orphans to default deal
    setNeedsMigration(false);

    // Switch to the default deal
    const dealState = useDealStore.getState();
    const defaultDeal = dealState.deals.find((d) => d.id === 'default');
    if (defaultDeal) {
      await dealState.switchDeal(defaultDeal.id);
    }
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
      <main className="flex-1 flex overflow-hidden">
        {/* Deal sidebar on the left */}
        <DealSidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

        {/* Main content area */}
        <div className="flex-1 relative overflow-hidden">
          {/* Canvas: full background layer */}
          <OfficeCanvas />

          {/* DOM overlays on top of canvas */}
          <RoomLabel />
          <ZoomControls />

          {/* Chat panel: overlays the canvas from the right */}
          <div className="absolute right-0 top-0 h-full w-[400px] z-20
            border-l border-[--color-surface-border]">
            <ChatPanel />
          </div>
        </div>
      </main>

      {/* Migration prompt modal */}
      {needsMigration && (
        <MigrationPrompt
          onMigrate={(action) => void handleMigrate(action)}
          onDismiss={handleDismissMigration}
        />
      )}
    </div>
  );
}

export default App;
