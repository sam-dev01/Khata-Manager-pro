/**
 * Thermal POS Receipt Template
 * Category: thermal
 * Style: 80mm/58mm optimized, compact receipt format
 */
import { registerTemplate } from '../InvoiceTemplateEngine';

registerTemplate('thermal-pos', {
    name: 'Thermal POS',
    category: 'thermal',
    description: '80mm thermal receipt, compact POS format',
    render({ invoice, firm, helpers }) {
        const { formatCurrency, formatDate } = helpers;
        const items = invoice.items || [];

        const itemRows = items.map(item => `
            <tr style="font-size:12px">
                <td style="padding:3px 0;vertical-align:top">${item.name || ''}${item.hsn ? ` [${item.hsn}]` : ''}</td>
                <td style="padding:3px 4px;text-align:center;white-space:nowrap">${item.qty} x ${formatCurrency(item.rate)}</td>
                <td style="padding:3px 0;text-align:right;font-weight:bold">${formatCurrency(item.lineTotal)}</td>
            </tr>
        `).join('');

        return `
        <div style="font-family:'Courier New',monospace;width:280px;margin:0 auto;background:#fff;padding:8px;font-size:12px">
            <!-- Header -->
            <div style="text-align:center;border-bottom:1px dashed #333;padding-bottom:8px;margin-bottom:8px">
                ${firm.logoUrl ? `<img src="${firm.logoUrl}" alt="" style="height:32px;margin-bottom:4px;display:block;margin:0 auto"/>` : ''}
                <div style="font-size:16px;font-weight:bold;text-transform:uppercase">${firm.firmName}</div>
                <div style="font-size:10px;color:#555">${firm.firmAddress || ''}</div>
                ${firm.firmPhone ? `<div style="font-size:10px">Ph: ${firm.firmPhone}</div>` : ''}
                ${firm.firmGSTIN ? `<div style="font-size:10px">GSTIN: ${firm.firmGSTIN}</div>` : ''}
            </div>

            <!-- Invoice Info -->
            <div style="font-size:11px;margin-bottom:8px">
                <div style="display:flex;justify-content:space-between">
                    <span>Bill: ${invoice.invoiceNumber || invoice.id || ''}</span>
                    <span>${formatDate(invoice.date)}</span>
                </div>
                ${invoice.customerName && invoice.customerName !== 'Walk-in' ? `<div>Customer: ${invoice.customerName}</div>` : ''}
            </div>

            <!-- Separator -->
            <div style="border-top:1px dashed #333;margin:4px 0"></div>

            <!-- Items -->
            <table style="width:100%;border-collapse:collapse">
                <thead>
                    <tr style="font-size:10px;text-transform:uppercase;font-weight:bold">
                        <th style="padding:4px 0;text-align:left">Item</th>
                        <th style="padding:4px;text-align:center">Qty x Rate</th>
                        <th style="padding:4px 0;text-align:right">Amt</th>
                    </tr>
                </thead>
                <tbody>${itemRows}</tbody>
            </table>

            <!-- Separator -->
            <div style="border-top:1px dashed #333;margin:4px 0"></div>

            <!-- Totals -->
            <div style="font-size:12px">
                <div style="display:flex;justify-content:space-between;padding:2px 0">
                    <span>Subtotal</span><span>${formatCurrency(invoice.subtotal)}</span>
                </div>
                ${invoice.totalDiscount > 0 ? `
                <div style="display:flex;justify-content:space-between;padding:2px 0">
                    <span>Discount</span><span>-${formatCurrency(invoice.totalDiscount)}</span>
                </div>` : ''}
                ${invoice.totalTax > 0 ? `
                <div style="display:flex;justify-content:space-between;padding:2px 0;font-size:11px">
                    <span>Tax</span><span>${formatCurrency(invoice.totalTax)}</span>
                </div>` : ''}
            </div>

            <!-- Grand Total -->
            <div style="border-top:2px solid #333;border-bottom:2px solid #333;margin:4px 0;padding:6px 0;display:flex;justify-content:space-between;font-size:18px;font-weight:bold">
                <span>TOTAL</span><span>${formatCurrency(invoice.finalAmount)}</span>
            </div>

            <!-- Payment Info -->
            <div style="font-size:11px;margin-top:4px">
                ${invoice.paymentMode ? `<div>Payment: ${invoice.paymentMode}</div>` : ''}
                ${invoice.receivedAmount ? `
                <div style="display:flex;justify-content:space-between;padding:2px 0">
                    <span>Received</span><span>${formatCurrency(invoice.receivedAmount)}</span>
                </div>
                <div style="display:flex;justify-content:space-between;padding:2px 0">
                    <span>Change</span><span>${formatCurrency(invoice.receivedAmount - invoice.finalAmount)}</span>
                </div>
                ` : ''}
            </div>

            ${invoice.status === 'paid' ? `<div style="text-align:center;font-size:14px;font-weight:bold;margin:8px 0">*** PAID ***</div>` : ''}

            <!-- Footer -->
            <div style="border-top:1px dashed #333;margin-top:8px;padding-top:8px;text-align:center;font-size:10px;color:#666">
                ${firm.termsAndConditions || 'Thank you for your business!'}
                <div style="margin-top:4px;font-size:9px">Items: ${items.length} | Qty: ${items.reduce((s, i) => s + (i.qty || 0), 0)}</div>
            </div>
        </div>
        `;
    }
});

export default 'thermal-pos';
