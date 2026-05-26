/**
 * Invoice Status Utilities
 * Status is DERIVED from data — never manually stored.
 * Always recalculated on render to stay consistent.
 */

/**
 * Derive invoice status from payment data.
 * 
 * @param {number} total - Invoice grand total
 * @param {number} paidAmount - Total amount paid (sum of all payments)
 * @param {string} paymentMode - 'cash' | 'online' | 'credit'
 * @returns {'paid' | 'partial' | 'unpaid' | 'draft'}
 */
export const deriveInvoiceStatus = (total, paidAmount, paymentMode) => {
    if (!total || total <= 0) return 'draft';

    const paid = paidAmount || 0;

    // Fully paid (with small tolerance for rounding)
    if (paid >= total - 0.99) return 'paid';

    // Partial payment
    if (paid > 0 && paid < total) return 'partial';

    // Credit sale with no payment
    if (paymentMode === 'credit' && paid === 0) return 'unpaid';

    // Cash/Online with full payment
    if ((paymentMode === 'cash' || paymentMode === 'online') && paid >= total) return 'paid';

    // No payment recorded yet
    if (paid === 0) return 'unpaid';

    return 'draft';
};

/**
 * Get display color for status
 */
export const getStatusColor = (status) => {
    switch (status) {
        case 'paid': return 'green';
        case 'partial': return 'orange';
        case 'unpaid': return 'red';
        case 'draft': return 'default';
        default: return 'default';
    }
};

/**
 * Get display label for status
 */
export const getStatusLabel = (status) => {
    switch (status) {
        case 'paid': return 'PAID';
        case 'partial': return 'PARTIAL';
        case 'unpaid': return 'UNPAID';
        case 'draft': return 'DRAFT';
        default: return status?.toUpperCase() || 'UNKNOWN';
    }
};

/**
 * Calculate total paid amount for an invoice from payments array
 * @param {string} invoiceId
 * @param {Array} payments - array of payment records
 * @returns {number}
 */
export const getTotalPaidForInvoice = (invoiceId, payments = []) => {
    return payments
        .filter(p => p.invoiceId === invoiceId)
        .reduce((sum, p) => sum + (p.amount || 0), 0);
};
