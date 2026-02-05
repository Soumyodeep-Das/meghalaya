import { openDB, DBSchema } from 'idb';

interface PendingExpense {
    id?: number; // Auto-increment key for IDB
    tempId: string;
    data: any; // The expense payload
    action: 'create' | 'delete';
    timestamp: number;
}

interface MeghalayaDB extends DBSchema {
    pendingQueue: {
        key: number;
        value: PendingExpense;
        indexes: { 'by-timestamp': number };
    };
}

const DB_NAME = 'meghalaya-offline-db';
const STORE_NAME = 'pendingQueue';

export const initDB = async () => {
    return openDB<MeghalayaDB>(DB_NAME, 1, {
        upgrade(db) {
            if (!db.objectStoreNames.contains(STORE_NAME)) {
                const store = db.createObjectStore(STORE_NAME, { keyPath: 'id', autoIncrement: true });
                store.createIndex('by-timestamp', 'timestamp');
            }
        },
    });
};

export const addToQueue = async (item: Omit<PendingExpense, 'id'>) => {
    const db = await initDB();
    return db.add(STORE_NAME, item);
};

export const getQueue = async () => {
    const db = await initDB();
    return db.getAllFromIndex(STORE_NAME, 'by-timestamp');
};

export const clearQueueItem = async (id: number) => {
    const db = await initDB();
    return db.delete(STORE_NAME, id);
};

export const clearQueue = async () => {
    const db = await initDB();
    return db.clear(STORE_NAME);
};
