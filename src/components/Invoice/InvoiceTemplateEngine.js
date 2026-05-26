/**
 * Invoice Template Engine
 * 
 * Core rendering engine that takes invoice data + template config
 * and produces printable/exportable HTML.
 */

// ─── Template Registry ───
const TEMPLATES = {};

export function registerTemplate(id, config) {
    TEMPLATES[id] = config;
}

export function getTemplate(id) {
    return TEMPLATES[id] || TEMPLATES['modern-clean'];
}

export function getAllTemplates() {
    return Object.entries(TEMPLATES).map(([id, t]) => ({
        id,
        name: t.name,
        category: t.category,
        description: t.description,
        thumbnail: t.thumbnail || null,
    }));
}

export function getTemplatesByCategory(category) {
    return getAllTemplates().filter(t => t.category === category);
}

// ─── Default Firm Settings ───
export const DEFAULT_FIRM_SETTINGS = {
    firmName: 'My Business',
    firmAddress: '',
    firmPhone: '',
    firmEmail: '',
    firmGSTIN: '',
    firmPAN: '',
    firmState: '',
    firmStateCode: '',
    logoUrl: '',
    primaryColor: '#6366f1',
    accentColor: '#a855f7',
    defaultTemplate: 'modern-clean',
    invoicePrefix: 'INV',
    invoiceNextNumber: 1,
    termsAndConditions: 'Thank you for your business!',
    footerText: '',
    signatureUrl: '',
    bankDetails: {
        bankName: '',
        accountNo: '',
        ifsc: '',
        upiId: ''
    }
};

// ─── Helper: Format Currency ───
export function formatCurrency(amount) {
    return new Intl.NumberFormat('en-IN', {
        style: 'currency',
        currency: 'INR',
        minimumFractionDigits: 2
    }).format(amount || 0);
}

// ─── Helper: Format Date ───
export function formatDate(dateStr) {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

// ─── Helper: Generate Invoice Number ───
export function generateInvoiceNumber(prefix, nextNumber) {
    const padded = String(nextNumber).padStart(4, '0');
    return `${prefix}-${padded}`;
}

// ─── Helper: Compute Tax Breakup ───
export function computeTaxBreakup(items, isInterState = false) {
    let subtotal = 0;
    let totalDiscount = 0;
    let totalCGST = 0;
    let totalSGST = 0;
    let totalIGST = 0;
    let totalCess = 0;

    const processedItems = (items || []).map(item => {
        const qty = Number(item.qty) || 0;
        const rate = Number(item.rate || item.price || item.salePrice) || 0;
        const amount = qty * rate;

        // Discount
        let discountAmt = 0;
        if (item.discountType === 'percent') {
            discountAmt = amount * (Number(item.discount) || 0) / 100;
        } else {
            discountAmt = Number(item.discount) || 0;
        }

        const taxableValue = amount - discountAmt;
        const gstRate = Number(item.gstRate || item.taxRate) || 0;
        const cessRate = Number(item.cessRate) || 0;

        let cgst = 0, sgst = 0, igst = 0, cess = 0;
        if (isInterState) {
            igst = taxableValue * gstRate / 100;
        } else {
            cgst = taxableValue * (gstRate / 2) / 100;
            sgst = taxableValue * (gstRate / 2) / 100;
        }
        cess = taxableValue * cessRate / 100;

        const lineTotal = taxableValue + cgst + sgst + igst + cess;

        subtotal += amount;
        totalDiscount += discountAmt;
        totalCGST += cgst;
        totalSGST += sgst;
        totalIGST += igst;
        totalCess += cess;

        return {
            ...item,
            qty,
            rate,
            amount,
            discountAmt,
            taxableValue,
            gstRate,
            cgst,
            sgst,
            igst,
            cess,
            lineTotal
        };
    });

    const totalTax = totalCGST + totalSGST + totalIGST + totalCess;
    const grandTotal = subtotal - totalDiscount + totalTax;

    return {
        items: processedItems,
        subtotal,
        totalDiscount,
        totalCGST,
        totalSGST,
        totalIGST,
        totalCess,
        totalTax,
        grandTotal,
        roundOff: Math.round(grandTotal) - grandTotal,
        finalAmount: Math.round(grandTotal)
    };
}

// ─── Helper: Number to Words (Indian) ───
export function numberToWords(num) {
    if (num === 0) return 'Zero';
    const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine',
        'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
    const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

    const convert = (n) => {
        if (n < 20) return ones[n];
        if (n < 100) return tens[Math.floor(n / 10)] + (n % 10 ? ' ' + ones[n % 10] : '');
        if (n < 1000) return ones[Math.floor(n / 100)] + ' Hundred' + (n % 100 ? ' and ' + convert(n % 100) : '');
        if (n < 100000) return convert(Math.floor(n / 1000)) + ' Thousand' + (n % 1000 ? ' ' + convert(n % 1000) : '');
        if (n < 10000000) return convert(Math.floor(n / 100000)) + ' Lakh' + (n % 100000 ? ' ' + convert(n % 100000) : '');
        return convert(Math.floor(n / 10000000)) + ' Crore' + (n % 10000000 ? ' ' + convert(n % 10000000) : '');
    };

    const intPart = Math.floor(Math.abs(num));
    const decPart = Math.round((Math.abs(num) - intPart) * 100);

    let result = convert(intPart) + ' Rupees';
    if (decPart > 0) result += ' and ' + convert(decPart) + ' Paise';
    return result + ' Only';
}

// ─── Master Render Function ───
export function renderInvoiceHTML(invoice, templateId, firmSettings) {
    const template = getTemplate(templateId);
    if (!template || !template.render) {
        console.error(`Template "${templateId}" not found or has no render function`);
        return '<div>Template not found</div>';
    }

    const settings = { ...DEFAULT_FIRM_SETTINGS, ...firmSettings };
    const breakup = computeTaxBreakup(invoice.items, invoice.isInterState);

    return template.render({
        invoice: { ...invoice, ...breakup },
        firm: settings,
        helpers: { formatCurrency, formatDate, numberToWords, generateInvoiceNumber }
    });
}
