import { useEffect, useState } from 'react';
import { useChatStore } from '@/store/chatStore';
import { Header } from '@/components/ui/Header';
import { ChatPanel } from '@/components/chat/ChatPanel';
import { OfficeCanvas } from '@/components/canvas/OfficeCanvas';
import { RoomLabel } from '@/components/canvas/RoomLabel';
import { ZoomControls } from '@/components/canvas/ZoomControls';

/**
 * Root application component.
 *
 * Full viewport height with dark background. Hydrates conversations
 * from IndexedDB on mount, then renders the Header, OfficeCanvas
 * (background layer), RoomLabel, ZoomControls, and ChatPanel (overlay).
 */
function App() {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const init = async () => {
      // Hydrate conversations from IndexedDB
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

  if (!ready) {
    return (
      <div className="h-screen bg-[--color-surface-bg] flex items-center justify-center">
        <p className="text-[--color-text-muted] text-lg animate-pulse">Loading...</p>
      </div>
    );
  }

  return (
    <div className="h-screen bg-[--color-surface-bg] flex flex-col">
      <Header />
      <main className="flex-1 relative overflow-hidden">
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
      </main>
    </div>
  );
}

export default App;
