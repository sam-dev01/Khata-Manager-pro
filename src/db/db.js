import Dexie from 'dexie';

export const db = new Dexie('KhataManagerDB');

db.version(1).stores({
    customers: 'id, synced',
    transactions: 'id, customerId, type, date, synced',
    placeholders: 'id, synced',
    promises: 'id, synced',
    calls: 'id, synced',
    products: 'id, barcode, name, synced',
    suppliers: 'id, phone, synced',
    invoices: 'id, date, customerId, synced',
    expenses: 'id, date, synced',
    workers: 'id, synced',
    syncQueue: '++id, table, itemId, type, timestamp'
});

// UPGRADE: Add shopId to schemas for filtering
db.version(2).stores({
    customers: 'id, shopId, synced',
    transactions: 'id, customerId, shopId, type, date, synced',
    promises: 'id, shopId, synced',
    calls: 'id, shopId, synced',
    products: 'id, shopId, barcode, name, synced',
    suppliers: 'id, shopId, phone, synced',
    invoices: 'id, shopId, date, customerId, synced',
    expenses: 'id, shopId, date, synced',
    workers: 'id, shopId, synced'
});

// UPGRADE v3: Advanced billing tables
db.version(3).stores({
    firmSettings: 'firmId',
    estimates: 'id, shopId, date, customerId, status, synced',
    payments: 'id, shopId, invoiceId, date, synced',
    auditLog: '++id, shopId, action, entityType, entityId, timestamp'
});

// UPGRADE v4: Invoice counters for auto-numbering
db.version(4).stores({
    invoiceCounters: 'id'   // id = 'PREFIX_shopId', e.g. 'INV_shop123'
});

// Helper to save and mark unsynced
export const saveToDb = async (table, data) => {
    // If array, bulkPut
    if (Array.isArray(data)) {
        const items = data.map(item => ({ ...item, synced: 0 })); // 0 = false
        await db.table(table).bulkPut(items);
    } else {
        await db.table(table).put({ ...data, synced: 0 });
    }
};

export const markSynced = async (table, id) => {
    await db.table(table).update(id, { synced: 1 });
};

export const deleteFromDb = async (table, id) => {
    await db.transaction('rw', db.table(table), db.syncQueue, async () => {
        const existing = await db.table(table).get(id);
        await db.table(table).delete(id);
        await db.syncQueue.add({
            table,
            itemId: id,
            shopId: existing?.shopId || localStorage.getItem('current_shop_id') || null,
            type: 'DELETE',
            timestamp: Date.now()
        });
    });
};

export const hasUnsyncedItems = async () => {
    // 1. Check Deletion Queue
    const deleteCount = await db.syncQueue.count();
    if (deleteCount > 0) return true;

    // 2. Check Dirty Items in main tables
    // We can check a few critical tables.
    const tables = ['customers', 'transactions', 'invoices', 'payments', 'products'];
    for (const tbl of tables) {
        const count = await db.table(tbl).where('synced').equals(0).count();
        if (count > 0) return true;
    }

    return false;
};
