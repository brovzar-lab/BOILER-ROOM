import { useEffect, useState } from 'react';
import { useChatStore } from '@/store/chatStore';
import { Header } from '@/components/ui/Header';
import { ChatPanel } from '@/components/chat/ChatPanel';

/**
 * Root application component.
 *
 * Full viewport height with dark background. Hydrates conversations
 * from IndexedDB on mount, then renders the Header and ChatPanel.
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
      <ChatPanel />
    </div>
  );
}

export default App;
