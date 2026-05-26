/**
 * Retail Receipt Template
 * Category: retail
 * Style: Compact receipt, barcode area, retail-friendly
 */
import { registerTemplate } from '../InvoiceTemplateEngine';

registerTemplate('retail-receipt', {
    name: 'Retail Receipt',
    category: 'retail',
    description: 'Compact retail receipt with barcode area',
    render({ invoice, firm, helpers }) {
        const { formatCurrency, formatDate } = helpers;
        const items = invoice.items || [];

        const itemRows = items.map(item => `
            <tr style="font-size:13px">
                <td style="padding:6px 0;vertical-align:top">
                    <div>${item.name || ''}</div>
                    ${item.hsn ? `<div style="font-size:10px;color:#888">HSN: ${item.hsn}</div>` : ''}
                    ${item.barcode ? `<div style="font-size:10px;color:#888">${item.barcode}</div>` : ''}
                </td>
                <td style="padding:6px 8px;text-align:center">${item.qty}</td>
                <td style="padding:6px 8px;text-align:right">${formatCurrency(item.rate)}</td>
                ${item.discountAmt > 0 ? `<td style="padding:6px 0;text-align:right;color:#c00">-${formatCurrency(item.discountAmt)}</td>` : `<td style="padding:6px 0;text-align:right">—</td>`}
                <td style="padding:6px 0;text-align:right;font-weight:bold">${formatCurrency(item.lineTotal)}</td>
            </tr>
        `).join('');

        const totalQty = items.reduce((s, i) => s + (i.qty || 0), 0);
        const savings = invoice.totalDiscount || 0;

        return `
        <div style="font-family:Arial,sans-serif;max-width:350px;margin:0 auto;background:#fff;padding:16px;border:1px dashed #ccc">
            <!-- Store Header -->
            <div style="text-align:center;margin-bottom:12px">
                ${firm.logoUrl ? `<img src="${firm.logoUrl}" style="height:36px;margin-bottom:6px"/>` : ''}
                <div style="font-size:18px;font-weight:bold;text-transform:uppercase">${firm.firmName}</div>
                <div style="font-size:11px;color:#666">${firm.firmAddress || ''}</div>
                ${firm.firmPhone ? `<div style="font-size:11px;color:#666">Tel: ${firm.firmPhone}</div>` : ''}
                ${firm.firmGSTIN ? `<div style="font-size:10px;margin-top:2px">GSTIN: ${firm.firmGSTIN}</div>` : ''}
            </div>

            <div style="border-top:1px solid #333;border-bottom:1px solid #333;padding:4px 0;text-align:center;font-size:12px;font-weight:bold;margin-bottom:8px">
                ${invoice.invoiceType === 'estimate' ? 'ESTIMATE' : 'RETAIL INVOICE'}
            </div>

            <!-- Invoice Details -->
            <div style="font-size:11px;margin-bottom:8px;display:flex;justify-content:space-between">
                <span>Bill#: ${invoice.invoiceNumber || invoice.id || ''}</span>
                <span>${formatDate(invoice.date)}</span>
            </div>
            ${invoice.customerName && invoice.customerName !== 'Walk-in' ? `
            <div style="font-size:12px;margin-bottom:8px;padding:4px 0;border-bottom:1px dashed #ddd">
                <strong>Customer:</strong> ${invoice.customerName}
                ${invoice.customerPhone ? ` | ${invoice.customerPhone}` : ''}
            </div>` : ''}

            <!-- Items -->
            <table style="width:100%;border-collapse:collapse;margin-bottom:4px">
                <thead>
                    <tr style="font-size:10px;text-transform:uppercase;color:#666;border-bottom:1px solid #ccc">
                        <th style="padding:6px 0;text-align:left">Item</th>
                        <th style="padding:6px;text-align:center">Qty</th>
                        <th style="padding:6px;text-align:right">MRP</th>
                        <th style="padding:6px 0;text-align:right">Disc</th>
                        <th style="padding:6px 0;text-align:right">Amt</th>
                    </tr>
                </thead>
                <tbody>${itemRows}</tbody>
            </table>

            <!-- Separator -->
            <div style="border-top:1px solid #333;margin:8px 0"></div>

            <!-- Totals -->
            <div style="font-size:13px">
                <div style="display:flex;justify-content:space-between;padding:3px 0"><span>Subtotal (${totalQty} items)</span><span>${formatCurrency(invoice.subtotal)}</span></div>
                ${savings > 0 ? `<div style="display:flex;justify-content:space-between;padding:3px 0;color:#006600"><span>You Save</span><span>-${formatCurrency(savings)}</span></div>` : ''}
                ${invoice.totalTax > 0 ? `<div style="display:flex;justify-content:space-between;padding:3px 0;font-size:11px;color:#666"><span>Tax (incl.)</span><span>${formatCurrency(invoice.totalTax)}</span></div>` : ''}
            </div>

            <!-- Grand Total -->
            <div style="border-top:2px solid #333;border-bottom:2px solid #333;margin:6px 0;padding:8px 0;display:flex;justify-content:space-between;font-size:20px;font-weight:bold">
                <span>NET TOTAL</span><span>${formatCurrency(invoice.finalAmount)}</span>
            </div>

            <!-- Payment -->
            <div style="font-size:12px;margin-top:4px">
                ${invoice.paymentMode ? `<div style="display:flex;justify-content:space-between"><span>Mode:</span><span>${invoice.paymentMode}</span></div>` : ''}
                ${invoice.receivedAmount ? `
                <div style="display:flex;justify-content:space-between"><span>Tendered:</span><span>${formatCurrency(invoice.receivedAmount)}</span></div>
                <div style="display:flex;justify-content:space-between;font-weight:bold"><span>Change:</span><span>${formatCurrency(Math.max(0, invoice.receivedAmount - invoice.finalAmount))}</span></div>
                ` : ''}
            </div>

            ${invoice.status === 'paid' ? `<div style="text-align:center;margin:8px 0;font-weight:bold;font-size:14px">✓ PAID</div>` : ''}

            <!-- Footer -->
            <div style="border-top:1px dashed #ccc;margin-top:12px;padding-top:8px;text-align:center;font-size:10px;color:#888">
                ${firm.termsAndConditions || 'Thank you for shopping with us!'}
                <div style="margin-top:6px;font-size:9px">
                    Items: ${items.length} | Qty: ${totalQty} | ${new Date().toLocaleTimeString()}
                </div>
                ${firm.bankDetails?.upiId ? `<div style="margin-top:6px;font-size:10px;font-weight:bold">UPI: ${firm.bankDetails.upiId}</div>` : ''}
            </div>
        </div>
        `;
    }
});

export default 'retail-receipt';
