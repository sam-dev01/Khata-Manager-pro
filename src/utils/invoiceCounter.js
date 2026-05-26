/**
 * Firm-scoped Invoice Counter
 * Generates auto-incrementing invoice numbers per prefix per shop.
 * Uses Dexie transactions for atomicity to prevent duplicates.
 * 
 * Counter key format: 'PREFIX_shopId'
 * Invoice number format: 'PREFIX-0001'
 */

import { db } from '../db/db';

/**
 * Get the next invoice number for a given shop and prefix.
 * Atomic — uses Dexie transaction to prevent duplicates under concurrent calls.
 * 
 * @param {string} shopId - The firm/shop ID
 * @param {string} prefix - 'POS', 'INV', 'EST', 'PRO'
 * @returns {Promise<string>} e.g. 'INV-0001'
 */
export const getNextInvoiceNumber = async (shopId, prefix = 'INV') => {
    const counterId = `${prefix}_${shopId}`;

    const nextNumber = await db.transaction('rw', db.invoiceCounters, async () => {
        const existing = await db.invoiceCounters.get(counterId);
        const lastNumber = existing ? existing.lastNumber : 0;
        const newNumber = lastNumber + 1;

        await db.invoiceCounters.put({
            id: counterId,
            lastNumber: newNumber,
            updatedAt: Date.now()
        });

        return newNumber;
    });

    return `${prefix}-${String(nextNumber).padStart(4, '0')}`;
};

/**
 * Peek at the next invoice number without incrementing.
 * Useful for preview purposes.
 * 
 * @param {string} shopId
 * @param {string} prefix
 * @returns {Promise<string>}
 */
export const peekNextInvoiceNumber = async (shopId, prefix = 'INV') => {
    const counterId = `${prefix}_${shopId}`;
    const existing = await db.invoiceCounters.get(counterId);
    const nextNumber = (existing ? existing.lastNumber : 0) + 1;
    return `${prefix}-${String(nextNumber).padStart(4, '0')}`;
};

/**
 * Reset counter for a prefix (admin use only).
 * @param {string} shopId
 * @param {string} prefix
 * @param {number} startFrom - number to start from (default 0)
 */
export const resetCounter = async (shopId, prefix, startFrom = 0) => {
    const counterId = `${prefix}_${shopId}`;
    await db.invoiceCounters.put({
        id: counterId,
        lastNumber: startFrom,
        updatedAt: Date.now()
    });
};
