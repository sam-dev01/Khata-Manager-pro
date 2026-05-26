/**
 * Modern Bold Invoice Template
 * Category: modern
 * Style: Full-color blocks, large typography, bold accents
 */
import { registerTemplate } from '../InvoiceTemplateEngine';

registerTemplate('modern-bold', {
    name: 'Modern Bold',
    category: 'modern',
    description: 'Full-color blocks with bold typography',
    render({ invoice, firm, helpers }) {
        const { formatCurrency, formatDate, numberToWords } = helpers;
        const items = invoice.items || [];
        const pc = firm.primaryColor || '#6366f1';
        const ac = firm.accentColor || '#a855f7';

        const itemRows = items.map((item, i) => `
            <tr style="${i % 2 === 0 ? 'background:#fafafa' : ''}">
                <td style="padding:12px 16px;font-weight:600;color:${pc}">${String(i + 1).padStart(2, '0')}</td>
                <td style="padding:12px 16px">
                    <div style="font-weight:700;font-size:14px;color:#0f172a">${item.name || ''}</div>
                    ${item.hsn ? `<span style="font-size:10px;background:#e0e7ff;color:${pc};padding:2px 6px;border-radius:4px;font-weight:600">HSN ${item.hsn}</span>` : ''}
                </td>
                <td style="padding:12px;text-align:center;font-weight:600">${item.qty}</td>
                <td style="padding:12px;text-align:right">${formatCurrency(item.rate)}</td>
                <td style="padding:12px;text-align:right;font-weight:800;color:${pc};font-size:15px">${formatCurrency(item.lineTotal)}</td>
            </tr>
        `).join('');

        return `
        <div style="font-family:'Inter','Segoe UI',sans-serif;max-width:800px;margin:0 auto;background:#fff;overflow:hidden">
            <!-- Full Color Header -->
            <div style="background:${pc};padding:40px;position:relative;overflow:hidden">
                <div style="position:absolute;top:-40px;right:-40px;width:200px;height:200px;border-radius:50%;background:${ac};opacity:0.2"></div>
                <div style="position:absolute;bottom:-60px;left:-30px;width:160px;height:160px;border-radius:50%;background:#fff;opacity:0.05"></div>
                <div style="position:relative;display:flex;justify-content:space-between;align-items:flex-start">
                    <div style="color:#fff">
                        ${firm.logoUrl ? `<img src="${firm.logoUrl}" style="height:44px;margin-bottom:12px;filter:brightness(0) invert(1);border-radius:8px"/>` : ''}
                        <h1 style="margin:0;font-size:28px;font-weight:900">${firm.firmName}</h1>
                        <div style="opacity:0.75;font-size:12px;margin-top:6px">${firm.firmAddress || ''}</div>
                        ${firm.firmGSTIN ? `<div style="background:rgba(255,255,255,0.15);display:inline-block;padding:4px 12px;border-radius:20px;font-size:11px;margin-top:8px;font-weight:600">GSTIN: ${firm.firmGSTIN}</div>` : ''}
                    </div>
                    <div style="text-align:right;color:#fff">
                        <div style="font-size:14px;font-weight:800;letter-spacing:6px;text-transform:uppercase;opacity:0.6">${invoice.invoiceType === 'estimate' ? 'ESTIMATE' : 'INVOICE'}</div>
                        <div style="font-size:36px;font-weight:900;margin:4px 0">#${invoice.invoiceNumber || invoice.id || ''}</div>
                        <div style="opacity:0.8;font-size:13px">${formatDate(invoice.date)}</div>
                    </div>
                </div>
            </div>

            <!-- Customer Section -->
            <div style="padding:28px 40px;display:flex;gap:24px">
                <div style="flex:1;border-left:4px solid ${pc};padding-left:16px">
                    <div style="font-size:10px;font-weight:800;text-transform:uppercase;letter-spacing:2px;color:${pc};margin-bottom:6px">BILL TO</div>
                    <div style="font-size:17px;font-weight:800;color:#0f172a">${invoice.customerName || 'Walk-in Customer'}</div>
                    ${invoice.customerAddress ? `<div style="font-size:13px;color:#64748b;margin-top:4px">${invoice.customerAddress}</div>` : ''}
                    ${invoice.customerPhone ? `<div style="font-size:13px;color:#64748b">📞 ${invoice.customerPhone}</div>` : ''}
                </div>
                <div style="text-align:right">
                    ${invoice.dueDate ? `<div style="font-size:12px;color:#94a3b8">Due Date</div><div style="font-weight:700;color:#0f172a">${formatDate(invoice.dueDate)}</div>` : ''}
                    ${invoice.paymentMode ? `<div style="font-size:12px;color:#94a3b8;margin-top:8px">Payment</div><div style="font-weight:700;color:#0f172a">${invoice.paymentMode}</div>` : ''}
                </div>
            </div>

            <!-- Items -->
            <div style="padding:0 40px">
                <table style="width:100%;border-collapse:collapse">
                    <thead>
                        <tr style="border-bottom:3px solid ${pc}">
                            <th style="padding:12px 16px;text-align:left;font-size:10px;font-weight:800;text-transform:uppercase;letter-spacing:1px;color:${pc}">#</th>
                            <th style="padding:12px 16px;text-align:left;font-size:10px;font-weight:800;text-transform:uppercase;letter-spacing:1px;color:${pc}">Item</th>
                            <th style="padding:12px;text-align:center;font-size:10px;font-weight:800;text-transform:uppercase;letter-spacing:1px;color:${pc}">Qty</th>
                            <th style="padding:12px;text-align:right;font-size:10px;font-weight:800;text-transform:uppercase;letter-spacing:1px;color:${pc}">Rate</th>
                            <th style="padding:12px;text-align:right;font-size:10px;font-weight:800;text-transform:uppercase;letter-spacing:1px;color:${pc}">Amount</th>
                        </tr>
                    </thead>
                    <tbody>${itemRows}</tbody>
                </table>
            </div>

            <!-- Totals Block -->
            <div style="padding:24px 40px;display:flex;justify-content:flex-end">
                <div style="width:280px;background:linear-gradient(135deg,${pc}08,${ac}08);border-radius:16px;padding:20px">
                    <div style="display:flex;justify-content:space-between;padding:4px 0;font-size:13px;color:#64748b"><span>Subtotal</span><span>${formatCurrency(invoice.subtotal)}</span></div>
                    ${invoice.totalDiscount > 0 ? `<div style="display:flex;justify-content:space-between;padding:4px 0;font-size:13px;color:#ef4444"><span>Discount</span><span>-${formatCurrency(invoice.totalDiscount)}</span></div>` : ''}
                    ${invoice.totalTax > 0 ? `<div style="display:flex;justify-content:space-between;padding:4px 0;font-size:13px;color:#64748b"><span>Tax</span><span>${formatCurrency(invoice.totalTax)}</span></div>` : ''}
                    <div style="display:flex;justify-content:space-between;padding:12px 0 0;font-size:24px;font-weight:900;color:${pc};border-top:2px solid ${pc};margin-top:8px">
                        <span>Total</span><span>${formatCurrency(invoice.finalAmount)}</span>
                    </div>
                </div>
            </div>

            ${invoice.status === 'paid' ? `<div style="text-align:center;padding:8px"><span style="background:linear-gradient(135deg,#22c55e,#16a34a);color:#fff;padding:8px 32px;border-radius:24px;font-weight:800;font-size:14px;letter-spacing:2px">✓ PAID</span></div>` : ''}

            <!-- Footer -->
            <div style="padding:20px 40px;background:${pc}08;margin-top:20px">
                <div style="font-size:11px;color:#94a3b8">${numberToWords(invoice.finalAmount)}</div>
                ${firm.termsAndConditions ? `<div style="font-size:11px;color:#94a3b8;margin-top:8px">${firm.termsAndConditions}</div>` : ''}
                <div style="text-align:center;margin-top:12px;font-size:11px;color:#cbd5e1">${firm.footerText || 'Thank you for your business!'}</div>
            </div>
        </div>
        `;
    }
});

export default 'modern-bold';
