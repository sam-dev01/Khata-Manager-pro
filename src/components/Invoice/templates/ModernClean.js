/**
 * Modern Clean Invoice Template
 * Category: modern
 * Style: Gradient header, card layout, clean typography
 */
import { registerTemplate } from '../InvoiceTemplateEngine';

registerTemplate('modern-clean', {
    name: 'Modern Clean',
    category: 'modern',
    description: 'Sleek gradient header with clean card layout',
    render({ invoice, firm, helpers }) {
        const { formatCurrency, formatDate, numberToWords } = helpers;
        const items = invoice.items || [];
        const pc = firm.primaryColor || '#6366f1';

        const itemRows = items.map((item, i) => `
            <tr>
                <td style="padding:10px 12px;border-bottom:1px solid #f1f5f9;color:#64748b;font-size:13px">${i + 1}</td>
                <td style="padding:10px 12px;border-bottom:1px solid #f1f5f9">
                    <div style="font-weight:600;color:#1e293b">${item.name || ''}</div>
                    ${item.hsn ? `<div style="font-size:11px;color:#94a3b8">HSN: ${item.hsn}</div>` : ''}
                </td>
                <td style="padding:10px 12px;border-bottom:1px solid #f1f5f9;text-align:center">${item.qty}</td>
                <td style="padding:10px 12px;border-bottom:1px solid #f1f5f9;text-align:right">${formatCurrency(item.rate)}</td>
                ${item.discountAmt ? `<td style="padding:10px 12px;border-bottom:1px solid #f1f5f9;text-align:right;color:#ef4444">-${formatCurrency(item.discountAmt)}</td>` : `<td style="padding:10px 12px;border-bottom:1px solid #f1f5f9;text-align:right">—</td>`}
                <td style="padding:10px 12px;border-bottom:1px solid #f1f5f9;text-align:right">${item.gstRate || 0}%</td>
                <td style="padding:10px 12px;border-bottom:1px solid #f1f5f9;text-align:right;font-weight:600">${formatCurrency(item.lineTotal)}</td>
            </tr>
        `).join('');

        return `
        <div style="font-family:'Inter','Segoe UI',sans-serif;max-width:800px;margin:0 auto;background:#fff">
            <!-- Header Band -->
            <div style="background:linear-gradient(135deg,${pc},${firm.accentColor || '#a855f7'});padding:32px 40px;color:#fff;border-radius:0 0 24px 24px">
                <div style="display:flex;justify-content:space-between;align-items:flex-start">
                    <div>
                        ${firm.logoUrl ? `<img src="${firm.logoUrl}" alt="Logo" style="height:48px;margin-bottom:12px;border-radius:8px"/>` : ''}
                        <h1 style="margin:0;font-size:26px;font-weight:800;letter-spacing:-0.5px">${firm.firmName}</h1>
                        <div style="opacity:0.85;font-size:13px;margin-top:4px">${firm.firmAddress || ''}</div>
                        ${firm.firmPhone ? `<div style="opacity:0.85;font-size:13px">📞 ${firm.firmPhone}</div>` : ''}
                        ${firm.firmGSTIN ? `<div style="opacity:0.9;font-size:12px;margin-top:6px;background:rgba(255,255,255,0.15);display:inline-block;padding:3px 10px;border-radius:6px">GSTIN: ${firm.firmGSTIN}</div>` : ''}
                    </div>
                    <div style="text-align:right">
                        <div style="font-size:32px;font-weight:900;letter-spacing:-1px;text-transform:uppercase;opacity:0.9">${invoice.invoiceType === 'estimate' ? 'ESTIMATE' : invoice.invoiceType === 'proforma' ? 'PROFORMA' : 'INVOICE'}</div>
                        <div style="font-size:15px;margin-top:8px;opacity:0.9">#${invoice.invoiceNumber || invoice.id || '—'}</div>
                        <div style="font-size:13px;margin-top:4px;opacity:0.8">Date: ${formatDate(invoice.date)}</div>
                        ${invoice.dueDate ? `<div style="font-size:13px;opacity:0.8">Due: ${formatDate(invoice.dueDate)}</div>` : ''}
                    </div>
                </div>
            </div>

            <!-- Bill To -->
            <div style="padding:24px 40px;display:flex;gap:40px">
                <div style="flex:1;background:#f8fafc;border-radius:12px;padding:16px 20px">
                    <div style="font-size:11px;text-transform:uppercase;letter-spacing:1px;color:${pc};font-weight:700;margin-bottom:8px">Bill To</div>
                    <div style="font-weight:700;font-size:16px;color:#1e293b">${invoice.customerName || 'Walk-in Customer'}</div>
                    ${invoice.customerAddress ? `<div style="font-size:13px;color:#64748b;margin-top:4px">${invoice.customerAddress}</div>` : ''}
                    ${invoice.customerPhone ? `<div style="font-size:13px;color:#64748b">📞 ${invoice.customerPhone}</div>` : ''}
                    ${invoice.customerGSTIN ? `<div style="font-size:12px;color:#64748b;margin-top:4px">GSTIN: ${invoice.customerGSTIN}</div>` : ''}
                </div>
                ${invoice.shippingAddress ? `
                <div style="flex:1;background:#f8fafc;border-radius:12px;padding:16px 20px">
                    <div style="font-size:11px;text-transform:uppercase;letter-spacing:1px;color:${pc};font-weight:700;margin-bottom:8px">Ship To</div>
                    <div style="font-size:13px;color:#64748b">${invoice.shippingAddress}</div>
                </div>
                ` : ''}
            </div>

            <!-- Items Table -->
            <div style="padding:0 40px">
                <table style="width:100%;border-collapse:collapse">
                    <thead>
                        <tr style="background:#f1f5f9">
                            <th style="padding:12px;text-align:left;font-size:11px;text-transform:uppercase;letter-spacing:0.5px;color:#64748b;font-weight:600;border-radius:8px 0 0 0">#</th>
                            <th style="padding:12px;text-align:left;font-size:11px;text-transform:uppercase;letter-spacing:0.5px;color:#64748b;font-weight:600">Item</th>
                            <th style="padding:12px;text-align:center;font-size:11px;text-transform:uppercase;letter-spacing:0.5px;color:#64748b;font-weight:600">Qty</th>
                            <th style="padding:12px;text-align:right;font-size:11px;text-transform:uppercase;letter-spacing:0.5px;color:#64748b;font-weight:600">Rate</th>
                            <th style="padding:12px;text-align:right;font-size:11px;text-transform:uppercase;letter-spacing:0.5px;color:#64748b;font-weight:600">Disc</th>
                            <th style="padding:12px;text-align:right;font-size:11px;text-transform:uppercase;letter-spacing:0.5px;color:#64748b;font-weight:600">GST</th>
                            <th style="padding:12px;text-align:right;font-size:11px;text-transform:uppercase;letter-spacing:0.5px;color:#64748b;font-weight:600;border-radius:0 8px 0 0">Total</th>
                        </tr>
                    </thead>
                    <tbody>${itemRows}</tbody>
                </table>
            </div>

            <!-- Totals -->
            <div style="padding:24px 40px;display:flex;justify-content:flex-end">
                <div style="width:300px">
                    <div style="display:flex;justify-content:space-between;padding:6px 0;font-size:14px;color:#64748b">
                        <span>Subtotal</span><span>${formatCurrency(invoice.subtotal)}</span>
                    </div>
                    ${invoice.totalDiscount > 0 ? `
                    <div style="display:flex;justify-content:space-between;padding:6px 0;font-size:14px;color:#ef4444">
                        <span>Discount</span><span>-${formatCurrency(invoice.totalDiscount)}</span>
                    </div>` : ''}
                    ${invoice.totalCGST > 0 ? `
                    <div style="display:flex;justify-content:space-between;padding:6px 0;font-size:13px;color:#64748b">
                        <span>CGST</span><span>${formatCurrency(invoice.totalCGST)}</span>
                    </div>
                    <div style="display:flex;justify-content:space-between;padding:6px 0;font-size:13px;color:#64748b">
                        <span>SGST</span><span>${formatCurrency(invoice.totalSGST)}</span>
                    </div>` : ''}
                    ${invoice.totalIGST > 0 ? `
                    <div style="display:flex;justify-content:space-between;padding:6px 0;font-size:13px;color:#64748b">
                        <span>IGST</span><span>${formatCurrency(invoice.totalIGST)}</span>
                    </div>` : ''}
                    ${invoice.roundOff ? `
                    <div style="display:flex;justify-content:space-between;padding:6px 0;font-size:12px;color:#94a3b8">
                        <span>Round Off</span><span>${formatCurrency(invoice.roundOff)}</span>
                    </div>` : ''}
                    <div style="display:flex;justify-content:space-between;padding:12px 0;font-size:20px;font-weight:800;color:#1e293b;border-top:2px solid ${pc};margin-top:8px">
                        <span>Total</span><span>${formatCurrency(invoice.finalAmount)}</span>
                    </div>
                    <div style="font-size:11px;color:#94a3b8;font-style:italic;margin-top:4px">
                        ${numberToWords(invoice.finalAmount)}
                    </div>
                </div>
            </div>

            ${invoice.status === 'paid' ? `
            <div style="text-align:center;padding:12px 40px">
                <span style="display:inline-block;padding:8px 32px;border:3px solid #22c55e;color:#22c55e;font-size:24px;font-weight:900;border-radius:12px;transform:rotate(-5deg);opacity:0.6">PAID</span>
            </div>` : ''}
            ${invoice.status === 'overdue' ? `
            <div style="text-align:center;padding:12px 40px">
                <span style="display:inline-block;padding:8px 32px;border:3px solid #ef4444;color:#ef4444;font-size:24px;font-weight:900;border-radius:12px;transform:rotate(-5deg);opacity:0.6">OVERDUE</span>
            </div>` : ''}

            <!-- Footer -->
            <div style="padding:24px 40px;border-top:1px solid #e2e8f0;margin-top:16px">
                ${firm.bankDetails?.bankName ? `
                <div style="background:#f8fafc;border-radius:12px;padding:16px 20px;margin-bottom:16px">
                    <div style="font-size:11px;text-transform:uppercase;letter-spacing:1px;color:${pc};font-weight:700;margin-bottom:8px">Bank Details</div>
                    <div style="font-size:13px;color:#475569">
                        <strong>Bank:</strong> ${firm.bankDetails.bankName} | 
                        <strong>A/C:</strong> ${firm.bankDetails.accountNo} | 
                        <strong>IFSC:</strong> ${firm.bankDetails.ifsc}
                        ${firm.bankDetails.upiId ? ` | <strong>UPI:</strong> ${firm.bankDetails.upiId}` : ''}
                    </div>
                </div>` : ''}
                ${firm.termsAndConditions ? `
                <div style="font-size:12px;color:#94a3b8;margin-top:8px">
                    <strong>Terms:</strong> ${firm.termsAndConditions}
                </div>` : ''}
                <div style="text-align:center;margin-top:20px;font-size:11px;color:#cbd5e1">
                    ${firm.footerText || 'Thank you for your business!'}
                </div>
            </div>
        </div>
        `;
    }
});

export default 'modern-clean';
