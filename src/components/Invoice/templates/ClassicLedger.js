/**
 * Classic Ledger Invoice Template
 * Category: classic
 * Style: Traditional bordered table, serif fonts, professional
 */
import { registerTemplate } from '../InvoiceTemplateEngine';

registerTemplate('classic-ledger', {
    name: 'Classic Ledger',
    category: 'classic',
    description: 'Traditional bordered table with professional look',
    render({ invoice, firm, helpers }) {
        const { formatCurrency, formatDate, numberToWords } = helpers;
        const items = invoice.items || [];

        const itemRows = items.map((item, i) => `
            <tr>
                <td style="border:1px solid #333;padding:8px;text-align:center">${i + 1}</td>
                <td style="border:1px solid #333;padding:8px">
                    ${item.name || ''}
                    ${item.hsn ? ` <span style="font-size:10px;color:#666">(HSN: ${item.hsn})</span>` : ''}
                </td>
                <td style="border:1px solid #333;padding:8px;text-align:center">${item.qty}</td>
                <td style="border:1px solid #333;padding:8px;text-align:right">${formatCurrency(item.rate)}</td>
                <td style="border:1px solid #333;padding:8px;text-align:right">${item.gstRate || 0}%</td>
                <td style="border:1px solid #333;padding:8px;text-align:right;font-weight:bold">${formatCurrency(item.lineTotal)}</td>
            </tr>
        `).join('');

        return `
        <div style="font-family:'Times New Roman',Georgia,serif;max-width:800px;margin:0 auto;background:#fff;padding:20px">
            <!-- Company Header -->
            <div style="text-align:center;border-bottom:3px double #333;padding-bottom:16px;margin-bottom:16px">
                ${firm.logoUrl ? `<img src="${firm.logoUrl}" alt="Logo" style="height:50px;margin-bottom:8px"/>` : ''}
                <h1 style="margin:0;font-size:24px;font-weight:bold;text-transform:uppercase;letter-spacing:2px">${firm.firmName}</h1>
                <div style="font-size:13px;color:#555;margin-top:4px">${firm.firmAddress || ''}</div>
                <div style="font-size:12px;color:#555">
                    ${firm.firmPhone ? `Phone: ${firm.firmPhone}` : ''} 
                    ${firm.firmEmail ? ` | Email: ${firm.firmEmail}` : ''}
                </div>
                ${firm.firmGSTIN ? `<div style="font-size:12px;margin-top:4px"><strong>GSTIN:</strong> ${firm.firmGSTIN}</div>` : ''}
            </div>

            <!-- Invoice Title -->
            <div style="text-align:center;margin-bottom:16px">
                <h2 style="margin:0;font-size:20px;text-transform:uppercase;letter-spacing:3px;border:2px solid #333;display:inline-block;padding:6px 24px">
                    ${invoice.invoiceType === 'estimate' ? 'ESTIMATE' : invoice.invoiceType === 'proforma' ? 'PROFORMA INVOICE' : 'TAX INVOICE'}
                </h2>
            </div>

            <!-- Invoice Details & Customer -->
            <div style="display:flex;justify-content:space-between;margin-bottom:20px;gap:20px">
                <div style="flex:1;border:1px solid #333;padding:12px">
                    <div style="font-weight:bold;text-decoration:underline;margin-bottom:8px">Bill To:</div>
                    <div style="font-weight:bold;font-size:15px">${invoice.customerName || 'Cash Customer'}</div>
                    ${invoice.customerAddress ? `<div style="font-size:13px;margin-top:4px">${invoice.customerAddress}</div>` : ''}
                    ${invoice.customerPhone ? `<div style="font-size:13px">Phone: ${invoice.customerPhone}</div>` : ''}
                    ${invoice.customerGSTIN ? `<div style="font-size:12px;margin-top:4px">GSTIN: ${invoice.customerGSTIN}</div>` : ''}
                </div>
                <div style="flex:1;border:1px solid #333;padding:12px">
                    <table style="width:100%;font-size:13px">
                        <tr><td style="font-weight:bold;padding:3px 0">Invoice No:</td><td style="text-align:right">${invoice.invoiceNumber || invoice.id || '—'}</td></tr>
                        <tr><td style="font-weight:bold;padding:3px 0">Date:</td><td style="text-align:right">${formatDate(invoice.date)}</td></tr>
                        ${invoice.dueDate ? `<tr><td style="font-weight:bold;padding:3px 0">Due Date:</td><td style="text-align:right">${formatDate(invoice.dueDate)}</td></tr>` : ''}
                        <tr><td style="font-weight:bold;padding:3px 0">Payment Mode:</td><td style="text-align:right">${invoice.paymentMode || 'Cash'}</td></tr>
                    </table>
                </div>
            </div>

            <!-- Items Table -->
            <table style="width:100%;border-collapse:collapse;margin-bottom:16px">
                <thead>
                    <tr style="background:#333;color:#fff">
                        <th style="border:1px solid #333;padding:10px;width:40px">S.No</th>
                        <th style="border:1px solid #333;padding:10px;text-align:left">Description</th>
                        <th style="border:1px solid #333;padding:10px;width:60px">Qty</th>
                        <th style="border:1px solid #333;padding:10px;width:100px;text-align:right">Rate</th>
                        <th style="border:1px solid #333;padding:10px;width:60px;text-align:right">Tax</th>
                        <th style="border:1px solid #333;padding:10px;width:110px;text-align:right">Amount</th>
                    </tr>
                </thead>
                <tbody>${itemRows}</tbody>
            </table>

            <!-- Totals -->
            <div style="display:flex;justify-content:flex-end">
                <table style="width:280px;font-size:14px">
                    <tr><td style="padding:4px 8px">Subtotal:</td><td style="text-align:right;padding:4px 8px">${formatCurrency(invoice.subtotal)}</td></tr>
                    ${invoice.totalDiscount > 0 ? `<tr><td style="padding:4px 8px;color:#c00">Discount:</td><td style="text-align:right;padding:4px 8px;color:#c00">-${formatCurrency(invoice.totalDiscount)}</td></tr>` : ''}
                    ${invoice.totalCGST > 0 ? `
                        <tr><td style="padding:4px 8px;font-size:12px;color:#666">CGST:</td><td style="text-align:right;padding:4px 8px;font-size:12px">${formatCurrency(invoice.totalCGST)}</td></tr>
                        <tr><td style="padding:4px 8px;font-size:12px;color:#666">SGST:</td><td style="text-align:right;padding:4px 8px;font-size:12px">${formatCurrency(invoice.totalSGST)}</td></tr>
                    ` : ''}
                    ${invoice.totalIGST > 0 ? `<tr><td style="padding:4px 8px;font-size:12px;color:#666">IGST:</td><td style="text-align:right;padding:4px 8px;font-size:12px">${formatCurrency(invoice.totalIGST)}</td></tr>` : ''}
                    <tr style="border-top:2px solid #333;font-weight:bold;font-size:16px">
                        <td style="padding:8px">Grand Total:</td><td style="text-align:right;padding:8px">${formatCurrency(invoice.finalAmount)}</td>
                    </tr>
                </table>
            </div>

            <div style="font-size:11px;font-style:italic;color:#666;text-align:right;margin-top:4px;padding-right:8px">
                ${numberToWords(invoice.finalAmount)}
            </div>

            ${invoice.status === 'paid' ? `
            <div style="text-align:center;margin:16px 0">
                <span style="border:3px solid #006600;color:#006600;padding:6px 20px;font-size:20px;font-weight:bold;letter-spacing:3px;transform:rotate(-5deg);display:inline-block">PAID</span>
            </div>` : ''}

            <!-- Signature & Footer -->
            <div style="display:flex;justify-content:space-between;margin-top:40px;padding-top:16px;border-top:1px solid #ccc">
                <div style="text-align:center;width:200px">
                    <div style="border-top:1px solid #333;padding-top:4px;font-size:12px">Receiver's Signature</div>
                </div>
                <div style="text-align:center;width:200px">
                    ${firm.signatureUrl ? `<img src="${firm.signatureUrl}" style="height:40px;margin-bottom:4px"/>` : '<div style="height:44px"></div>'}
                    <div style="border-top:1px solid #333;padding-top:4px;font-size:12px">Authorized Signatory</div>
                </div>
            </div>

            ${firm.termsAndConditions ? `
            <div style="margin-top:20px;padding-top:12px;border-top:1px dashed #ccc;font-size:11px;color:#888">
                <strong>Terms & Conditions:</strong> ${firm.termsAndConditions}
            </div>` : ''}
        </div>
        `;
    }
});

export default 'classic-ledger';
