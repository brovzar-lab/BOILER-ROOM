import { openDB, type IDBPDatabase } from 'idb';
import type { PersistenceAdapter, StoreName } from '@/types/persistence';

const DB_NAME = 'lemon-command-center';
const DB_VERSION = 1;

export class IndexedDBAdapter implements PersistenceAdapter {
  private dbPromise: Promise<IDBPDatabase>;

  constructor() {
    this.dbPromise = this.initDB();
    this.requestPersistence();
  }

  private async initDB(): Promise<IDBPDatabase> {
    return openDB(DB_NAME, DB_VERSION, {
      upgrade(db) {
        // Conversations store
        if (!db.objectStoreNames.contains('conversations')) {
          const convStore = db.createObjectStore('conversations', { keyPath: 'id' });
          convStore.createIndex('agentId', 'agentId', { unique: false });
          convStore.createIndex('dealId', 'dealId', { unique: false });
        }

        // Messages store
        if (!db.objectStoreNames.contains('messages')) {
          const msgStore = db.createObjectStore('messages', { keyPath: 'id' });
          msgStore.createIndex('conversationId', 'conversationId', { unique: false });
        }

        // Deals store
        if (!db.objectStoreNames.contains('deals')) {
          db.createObjectStore('deals', { keyPath: 'id' });
        }

        // Files store
        if (!db.objectStoreNames.contains('files')) {
          const fileStore = db.createObjectStore('files', { keyPath: 'id' });
          fileStore.createIndex('agentId', 'agentId', { unique: false });
          fileStore.createIndex('dealId', 'dealId', { unique: false });
        }

        // Memory store
        if (!db.objectStoreNames.contains('memory')) {
          const memStore = db.createObjectStore('memory', { keyPath: 'id' });
          memStore.createIndex('agentId', 'agentId', { unique: false });
          memStore.createIndex('dealId', 'dealId', { unique: false });
        }
      },
    });
  }

  private requestPersistence(): void {
    if (navigator.storage?.persist) {
      navigator.storage.persist().catch(() => {
        // Persistence request denied or unavailable — non-critical
      });
    }
  }

  async get<T>(store: StoreName, key: string): Promise<T | undefined> {
    const db = await this.dbPromise;
    return db.get(store, key) as Promise<T | undefined>;
  }

  async set<T>(store: StoreName, key: string, value: T): Promise<void> {
    const db = await this.dbPromise;
    await db.put(store, value);
  }

  async delete(store: StoreName, key: string): Promise<void> {
    const db = await this.dbPromise;
    await db.delete(store, key);
  }

  async getAll<T>(store: StoreName): Promise<T[]> {
    const db = await this.dbPromise;
    return db.getAll(store) as Promise<T[]>;
  }

  async query<T>(store: StoreName, indexName: string, value: string): Promise<T[]> {
    const db = await this.dbPromise;
    return db.getAllFromIndex(store, indexName, value) as Promise<T[]>;
  }

  async bulkSet<T>(store: StoreName, entries: Array<{ key: string; value: T }>): Promise<void> {
    const db = await this.dbPromise;
    const tx = db.transaction(store, 'readwrite');
    const objectStore = tx.objectStore(store);
    for (const entry of entries) {
      await objectStore.put(entry.value);
    }
    await tx.done;
  }

  async clear(store: StoreName): Promise<void> {
    const db = await this.dbPromise;
    await db.clear(store);
  }
}
