import { ref, update, get, onChildAdded, onChildChanged, onChildRemoved, remove } from 'firebase/database';
import { message } from 'antd';
import { database } from '../firebase';
import { db, markSynced } from '../db/db';

const COLLECTIONS = [
    'customers', 'transactions', 'promises', 'calls',
    'products', 'suppliers', 'invoices', 'payments', 'expenses', 'workers'
];

const firebaseKey = (id) => String(id).replace(/[.#$/[\]]/g, '_');
const itemTime = (item = {}) => {
    const raw = item.updatedAt || item.createdAt || item.timestamp || item.lockedAt || item.date || 0;
    const parsed = typeof raw === 'number' ? raw : Date.parse(raw);
    return Number.isFinite(parsed) ? parsed : 0;
};

export const syncService = {
    shopId: null,
    isSyncing: false,
    listeners: [], // Store unsubscribe functions
    onlineHandler: null, // Store reference to online handler

    init(shopId) {
        // cleanup old if exists (re-init scenario)
        if (this.shopId) this.stop();

        this.shopId = shopId;
        console.debug(`🔄 Sync Service Initialized for Shop: ${shopId}`);

        // Define handler
        this.onlineHandler = () => {
            console.debug('🌐 Online: Triggering Sync...');
            this.sync();
            this.listen();
        };

        window.addEventListener('online', this.onlineHandler);

        if (navigator.onLine) {
            this.listen();
            setTimeout(() => this.sync(), 2000);
        }

        // Periodic check (keep reference if we want to clear interval too, but interval is less harmful)
        // Ideally we should store intervalId to clear it in stop()
        if (this.intervalId) clearInterval(this.intervalId);
        this.intervalId = setInterval(() => {
            if (navigator.onLine) this.sync();
        }, 30000);
    },

    // ---------------------------------------------------------
    // 🎧 REAL-TIME LISTENERS (Incoming Data)
    // ---------------------------------------------------------
    listen() {
        if (!this.shopId || this.listeners.length > 0) return;
        console.debug('🎧 Starting Granular Real-time Listeners...');

        COLLECTIONS.forEach(collection => {
            // UPDATED: Using 'firms' collection as per Multi-Tenant Design
            const colRef = ref(database, `firms/${this.shopId}/data/${collection}`);

            // 1. ADDED & CHANGED
            const handleUpsert = async (snapshot) => {
                if (!snapshot.exists()) return;
                const item = snapshot.val();

                // CONFLICT CHECK:
                // Check if we have a local version that hasn't synced yet (synced: 0)
                const localItem = await db.table(collection).get(item.id);
                if (localItem && localItem.synced === 0) {
                    console.warn(`⚠️ Conflict Ignored: Local edit for ${collection}/${item.id} is pending sync. keeping local.`);
                    if (itemTime(item) <= itemTime(localItem)) {
                        return; // Client-Wins unless the cloud copy is newer.
                    }
                    console.warn(`Cloud item is newer for ${collection}/${item.id}; accepting cloud version.`);
                }

                // Save to local DB, marking as synced so we don't push it back
                await db.table(collection).put({ ...item, shopId: this.shopId, synced: 1 });
            };

            // 2. REMOVED
            const handleRemove = async (snapshot) => {
                const id = snapshot.key; // The key is the ID
                // Remove from local DB
                await db.table(collection).delete(id);
            };

            const unsubAdded = onChildAdded(colRef, handleUpsert);
            const unsubChanged = onChildChanged(colRef, handleUpsert);
            const unsubRemoved = onChildRemoved(colRef, handleRemove);

            this.listeners.push(unsubAdded, unsubChanged, unsubRemoved);
        });
    },

    // ---------------------------------------------------------
    // 📤 OUTGOING SYNC (Push Data)
    // ---------------------------------------------------------
    async sync() {
        if (!this.shopId || this.isSyncing || !navigator.onLine) return;
        this.isSyncing = true;

        try {
            // A. Process DELETIONS from SyncQueue
            const queueItems = await db.syncQueue.toArray();
            const currentShopQueue = queueItems.filter(task => !task.shopId || task.shopId === this.shopId);
            if (currentShopQueue.length > 0) {
                console.debug(`🗑 Processing ${currentShopQueue.length} deletions...`);
                for (const task of currentShopQueue) {
                    if (task.type === 'DELETE') {
                        // Delete from Firebase
                        // Path: firms/{shopId}/data/{table}/{itemId}
                        await remove(ref(database, `firms/${this.shopId}/data/${task.table}/${firebaseKey(task.itemId)}`));
                    }
                    // Remove from queue after success
                    await db.syncQueue.delete(task.id);
                }
            }

            // B. Process UPDATES / CREATIONS from Tables
            const updates = {};
            let hasUpdates = false;

            for (const collection of COLLECTIONS) {
                const unsyncedItems = await db.table(collection)
                    .where('synced')
                    .equals(0)
                    .and(item => item.shopId === this.shopId)
                    .toArray();

                if (unsyncedItems.length > 0) {
                    console.debug(`📤 Preparing ${unsyncedItems.length} items from ${collection}`);
                    unsyncedItems.forEach(item => {
                        const payload = { ...item };
                        delete payload.synced;
                        updates[`firms/${this.shopId}/data/${collection}/${firebaseKey(item.id)}`] = payload;
                    });
                    hasUpdates = true;
                }
            }

            if (hasUpdates) {
                await update(ref(database), updates);

                // Mark as synced locally
                for (const collection of COLLECTIONS) {
                    const unsyncedItems = await db.table(collection)
                        .where('synced')
                        .equals(0)
                        .and(item => item.shopId === this.shopId)
                        .toArray();
                    await Promise.all(unsyncedItems.map(item => markSynced(collection, item.id)));
                }
            }

        } catch (error) {
            console.error('❌ Sync Failed:', error);
        } finally {
            this.isSyncing = false;
        }
    },

    stop() {
        console.debug('🛑 Stopping Sync Service...');
        // 1. Unsubscribe Firebase Listeners
        this.listeners.forEach(unsub => unsub());
        this.listeners = [];

        // 2. Remove DOM Listeners
        if (this.onlineHandler) {
            window.removeEventListener('online', this.onlineHandler);
            this.onlineHandler = null;
        }

        // 3. Clear Interval
        if (this.intervalId) {
            clearInterval(this.intervalId);
            this.intervalId = null;
        }

        // 4. Reset ID
        this.shopId = null;
    },

    async downloadCloudData() {
        if (!this.shopId) return;

        if (!navigator.onLine) {
            message.error('No Internet Connection');
            return;
        }

        try {
            message.loading({ content: 'Downloading data from cloud...', key: 'cloud_dl', duration: 0 });

            const snapshot = await get(ref(database, `firms/${this.shopId}/data`));
            if (snapshot.exists()) {
                const data = snapshot.val();
                let count = 0;

                for (const collection of COLLECTIONS) {
                    if (data[collection]) {
                        const items = Object.values(data[collection]).map(item => ({ ...item, shopId: this.shopId, synced: 1 }));
                        await db.table(collection).bulkPut(items);
                        count += items.length;
                    }
                }
                message.success({ content: `Restored ${count} items successfully!`, key: 'cloud_dl' });
                // Force sync check after download to be safe
                this.sync();
            } else {
                message.warning({ content: 'No data found in cloud for this shop.', key: 'cloud_dl' });
            }
        } catch (error) {
            console.error(error);
            message.error({ content: 'Failed to download data.', key: 'cloud_dl' });
        }
    }
};
