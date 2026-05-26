import { database } from '../firebase';
import { ref, set, get } from 'firebase/database';

/**
 * Generates a random public ID (nano-id style)
 */
export const generatePublicId = () => {
    return Math.random().toString(36).substring(2, 10) + Date.now().toString(36).substring(4);
};

/**
 * Saves a public copy of the invoice to Firebase
 * @param {Object} invoice - The invoice object to share
 * @param {string} userId - The current user's ID (for ownership)
 * @param {Object} firmSettings - Shop settings (logo, address, etc)
 * @returns {Promise<string>} - The generated public ID
 */
export const createPublicInvoiceLink = async (invoice, userId, firmSettings = {}) => {
    if (!invoice) throw new Error('Invalid invoice data');
    if (!userId) throw new Error('User not authenticated');

    // Generate a unique public ID
    const publicId = generatePublicId();

    // Sanitize data (optional - remove sensitive internal fields if any)
    const publicData = {
        ...invoice,
        _publicId: publicId,
        _createdAt: new Date().toISOString(),
        createdBy: userId,
        firmSettings: firmSettings || {}, // Store snapshot of settings at time of sharing
        // Ensure we don't expose internal DB keys if we don't want to
        // But usually invoice data is fine to share as is for the view
    };

    // Save to public_invoices node
    await set(ref(database, `public_invoices/${publicId}`), publicData);

    return publicId;
};

/**
 * Fetches a public invoice by its ID
 * @param {string} publicId 
 * @returns {Promise<Object|null>}
 */
export const getPublicInvoice = async (publicId) => {
    if (!publicId) return null;
    try {
        const snapshot = await get(ref(database, `public_invoices/${publicId}`));
        if (snapshot.exists()) {
            return snapshot.val();
        }
        return null;
    } catch (error) {
        console.error("Error fetching public invoice:", error);
        return null;
    }
};

/**
 * Generates the full URL for the public invoice
 * @param {string} publicId 
 */
export const getPublicInvoiceUrl = (publicId) => {
    return `${window.location.origin}/invoice/view/${publicId}`;
};

/**
 * Sharing helper for WhatsApp
 */
export const shareOnWhatsApp = (url, customerName, shopName) => {
    const text = `Hello ${customerName || 'Customer'}, here is your invoice from ${shopName}. Click to view & download: ${url}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
};

/**
 * Sharing helper for SMS (if supported by device)
 */
export const shareOnSMS = (url, customerName) => {
    const text = `Invoice for ${customerName || 'Customer'}: ${url}`;
    window.open(`sms:?body=${encodeURIComponent(text)}`, '_self');
};
