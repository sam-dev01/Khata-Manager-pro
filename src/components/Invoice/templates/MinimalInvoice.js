/**
 * Minimal Invoice Template
 * Category: minimal
 * Style: Lots of whitespace, ultra-clean, modern sans-serif
 */
import { registerTemplate } from '../InvoiceTemplateEngine';

registerTemplate('minimal', {
    name: 'Minimal',
    category: 'minimal',
    description: 'Ultra-clean with generous whitespace',
    render({ invoice, firm, helpers }) {
        const { formatCurrency, formatDate, numberToWords } = helpers;
        const items = invoice.items || [];
        const pc = firm.primaryColor || '#111';

        const itemRows = items.map((item, i) => `
            <tr>
                <td style="padding:14px 0;border-bottom:1px solid #f0f0f0;color:#999;font-size:12px">${i + 1}</td>
                <td style="padding:14px 12px;border-bottom:1px solid #f0f0f0">
                    <div style="font-weight:500;color:#111">${item.name || ''}</div>
                    ${item.hsn ? `<div style="font-size:11px;color:#bbb">HSN: ${item.hsn}</div>` : ''}
                </td>
                <td style="padding:14px 12px;border-bottom:1px solid #f0f0f0;text-align:center;color:#666">${item.qty}</td>
                <td style="padding:14px 12px;border-bottom:1px solid #f0f0f0;text-align:right;color:#666">${formatCurrency(item.rate)}</td>
                <td style="padding:14px 0;border-bottom:1px solid #f0f0f0;text-align:right;font-weight:600;color:#111">${formatCurrency(item.lineTotal)}</td>
            </tr>
        `).join('');

        return `
        <div style="font-family:'Inter','Helvetica Neue',sans-serif;max-width:740px;margin:0 auto;background:#fff;padding:48px">
            <!-- Header -->
            <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:48px">
                <div>
                    ${firm.logoUrl ? `<img src="${firm.logoUrl}" alt="" style="height:36px;margin-bottom:16px"/>` : ''}
                    <div style="font-size:13px;color:#999;line-height:1.6">
                        ${firm.firmName}<br/>
                        ${firm.firmAddress || ''}<br/>
                        ${firm.firmPhone ? `${firm.firmPhone}<br/>` : ''}
                        ${firm.firmGSTIN ? `GSTIN: ${firm.firmGSTIN}` : ''}
                    </div>
                </div>
                <div style="text-align:right">
                    <div style="font-size:28px;font-weight:200;color:${pc};text-transform:uppercase;letter-spacing:6px;margin-bottom:16px">
                        ${invoice.invoiceType === 'estimate' ? 'Estimate' : invoice.invoiceType === 'proforma' ? 'Proforma' : 'Invoice'}
                    </div>
                    <div style="font-size:13px;color:#999;line-height:1.8">
                        <span style="color:#111;font-weight:500">${invoice.invoiceNumber || invoice.id || ''}</span><br/>
                        ${formatDate(invoice.date)}
                        ${invoice.dueDate ? `<br/>Due: ${formatDate(invoice.dueDate)}` : ''}
                    </div>
                </div>
            </div>

            <!-- Bill To -->
            <div style="margin-bottom:40px">
                <div style="font-size:10px;text-transform:uppercase;letter-spacing:3px;color:#bbb;margin-bottom:8px">Billed To</div>
                <div style="font-weight:600;font-size:15px;color:#111">${invoice.customerName || 'Walk-in Customer'}</div>
                ${invoice.customerAddress ? `<div style="font-size:13px;color:#999;margin-top:4px">${invoice.customerAddress}</div>` : ''}
                ${invoice.customerPhone ? `<div style="font-size:13px;color:#999">${invoice.customerPhone}</div>` : ''}
                ${invoice.customerGSTIN ? `<div style="font-size:12px;color:#999;margin-top:2px">GSTIN: ${invoice.customerGSTIN}</div>` : ''}
            </div>

            <!-- Items -->
            <table style="width:100%;border-collapse:collapse;margin-bottom:32px">
                <thead>
                    <tr style="border-bottom:2px solid #111">
                        <th style="padding:12px 0;text-align:left;font-size:10px;text-transform:uppercase;letter-spacing:2px;color:#999;font-weight:500;width:30px">#</th>
                        <th style="padding:12px;text-align:left;font-size:10px;text-transform:uppercase;letter-spacing:2px;color:#999;font-weight:500">Description</th>
                        <th style="padding:12px;text-align:center;font-size:10px;text-transform:uppercase;letter-spacing:2px;color:#999;font-weight:500">Qty</th>
                        <th style="padding:12px;text-align:right;font-size:10px;text-transform:uppercase;letter-spacing:2px;color:#999;font-weight:500">Price</th>
                        <th style="padding:12px 0;text-align:right;font-size:10px;text-transform:uppercase;letter-spacing:2px;color:#999;font-weight:500">Amount</th>
                    </tr>
                </thead>
                <tbody>${itemRows}</tbody>
            </table>

            <!-- Totals -->
            <div style="display:flex;justify-content:flex-end">
                <div style="width:260px">
                    <div style="display:flex;justify-content:space-between;padding:6px 0;font-size:13px;color:#999">
                        <span>Subtotal</span><span style="color:#111">${formatCurrency(invoice.subtotal)}</span>
                    </div>
                    ${invoice.totalDiscount > 0 ? `
                    <div style="display:flex;justify-content:space-between;padding:6px 0;font-size:13px;color:#ef4444">
                        <span>Discount</span><span>-${formatCurrency(invoice.totalDiscount)}</span>
                    </div>` : ''}
                    ${invoice.totalTax > 0 ? `
                    <div style="display:flex;justify-content:space-between;padding:6px 0;font-size:13px;color:#999">
                        <span>Tax</span><span style="color:#111">${formatCurrency(invoice.totalTax)}</span>
                    </div>` : ''}
                    <div style="display:flex;justify-content:space-between;padding:16px 0 8px;font-size:22px;font-weight:300;color:#111;border-top:2px solid #111;margin-top:8px">
                        <span>Total</span><span style="font-weight:600">${formatCurrency(invoice.finalAmount)}</span>
                    </div>
                    <div style="font-size:10px;color:#ccc;text-align:right">${numberToWords(invoice.finalAmount)}</div>
                </div>
            </div>

            ${invoice.status === 'paid' ? `
            <div style="text-align:center;margin:32px 0">
                <span style="color:#22c55e;font-size:14px;font-weight:600;letter-spacing:4px;text-transform:uppercase;border:1.5px solid #22c55e;padding:6px 20px;border-radius:4px">Paid</span>
            </div>` : ''}

            <!-- Footer -->
            ${firm.termsAndConditions ? `
            <div style="margin-top:48px;padding-top:24px;border-top:1px solid #f0f0f0;font-size:11px;color:#ccc;line-height:1.6">
                ${firm.termsAndConditions}
            </div>` : ''}

            <div style="text-align:center;margin-top:40px;font-size:10px;color:#ddd">
                ${firm.footerText || 'Thank you'}
            </div>
        </div>
        `;
    }
});

export default 'minimal';
