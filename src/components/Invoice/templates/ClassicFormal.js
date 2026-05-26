/**
 * Classic Formal Invoice Template
 * Category: classic
 * Style: Serif fonts, lined borders, formal business
 */
import { registerTemplate } from '../InvoiceTemplateEngine';

registerTemplate('classic-formal', {
    name: 'Classic Formal',
    category: 'classic',
    description: 'Formal business with serif fonts and line borders',
    render({ invoice, firm, helpers }) {
        const { formatCurrency, formatDate, numberToWords } = helpers;
        const items = invoice.items || [];

        const itemRows = items.map((item, i) => `
            <tr style="border-bottom:1px solid #d4d4d4">
                <td style="padding:10px 8px;text-align:center;color:#737373">${i + 1}</td>
                <td style="padding:10px 8px">${item.name || ''}${item.hsn ? ` <i style="color:#999;font-size:11px">(${item.hsn})</i>` : ''}</td>
                <td style="padding:10px 8px;text-align:center">${item.qty} ${item.unit || ''}</td>
                <td style="padding:10px 8px;text-align:right">${formatCurrency(item.rate)}</td>
                <td style="padding:10px 8px;text-align:right">${item.gstRate || 0}%</td>
                <td style="padding:10px 8px;text-align:right;font-weight:bold">${formatCurrency(item.lineTotal)}</td>
            </tr>
        `).join('');

        return `
        <div style="font-family:'Palatino Linotype','Book Antiqua',Palatino,serif;max-width:800px;margin:0 auto;background:#fff;padding:40px;border:1px solid #e5e5e5">
            <!-- Letterhead -->
            <div style="text-align:center;margin-bottom:24px">
                ${firm.logoUrl ? `<img src="${firm.logoUrl}" alt="Logo" style="height:48px;margin-bottom:8px"/>` : ''}
                <h1 style="margin:0;font-size:26px;font-weight:bold;color:#262626;letter-spacing:1px">${firm.firmName}</h1>
                <div style="width:80px;height:2px;background:#262626;margin:8px auto"></div>
                <div style="font-size:12px;color:#737373;margin-top:6px">${firm.firmAddress || ''}</div>
                <div style="font-size:12px;color:#737373">
                    ${firm.firmPhone ? `Tel: ${firm.firmPhone}` : ''} ${firm.firmEmail ? ` | ${firm.firmEmail}` : ''}
                </div>
                ${firm.firmGSTIN ? `<div style="font-size:11px;color:#525252;margin-top:4px">GSTIN: ${firm.firmGSTIN} ${firm.firmPAN ? `| PAN: ${firm.firmPAN}` : ''}</div>` : ''}
            </div>

            <div style="border-top:2px solid #262626;border-bottom:1px solid #d4d4d4;padding:8px 0;text-align:center;margin-bottom:20px">
                <span style="font-size:16px;font-weight:bold;letter-spacing:4px;text-transform:uppercase">${invoice.invoiceType === 'estimate' ? 'Estimate' : invoice.invoiceType === 'proforma' ? 'Proforma Invoice' : 'Invoice'}</span>
            </div>

            <!-- Details -->
            <div style="display:flex;justify-content:space-between;margin-bottom:24px;font-size:13px">
                <div>
                    <div style="font-weight:bold;color:#262626;margin-bottom:4px">To,</div>
                    <div style="font-weight:bold;font-size:15px">${invoice.customerName || 'Cash'}</div>
                    ${invoice.customerAddress ? `<div style="color:#737373">${invoice.customerAddress}</div>` : ''}
                    ${invoice.customerPhone ? `<div style="color:#737373">${invoice.customerPhone}</div>` : ''}
                    ${invoice.customerGSTIN ? `<div style="color:#525252;font-size:12px">GSTIN: ${invoice.customerGSTIN}</div>` : ''}
                </div>
                <div style="text-align:right">
                    <div><strong>Invoice No:</strong> ${invoice.invoiceNumber || invoice.id || ''}</div>
                    <div><strong>Date:</strong> ${formatDate(invoice.date)}</div>
                    ${invoice.dueDate ? `<div><strong>Due:</strong> ${formatDate(invoice.dueDate)}</div>` : ''}
                </div>
            </div>

            <!-- Items -->
            <table style="width:100%;border-collapse:collapse;margin-bottom:20px;font-size:13px">
                <thead>
                    <tr style="border-top:2px solid #262626;border-bottom:2px solid #262626">
                        <th style="padding:10px 8px;text-align:center;width:40px">No.</th>
                        <th style="padding:10px 8px;text-align:left">Particulars</th>
                        <th style="padding:10px 8px;text-align:center;width:80px">Quantity</th>
                        <th style="padding:10px 8px;text-align:right;width:100px">Rate</th>
                        <th style="padding:10px 8px;text-align:right;width:60px">Tax</th>
                        <th style="padding:10px 8px;text-align:right;width:110px">Amount</th>
                    </tr>
                </thead>
                <tbody>${itemRows}</tbody>
            </table>

            <!-- Totals -->
            <div style="display:flex;justify-content:flex-end;margin-bottom:20px">
                <table style="width:260px;font-size:13px">
                    <tr><td style="padding:4px 0">Sub Total:</td><td style="text-align:right">${formatCurrency(invoice.subtotal)}</td></tr>
                    ${invoice.totalDiscount > 0 ? `<tr style="color:#b91c1c"><td style="padding:4px 0">Less: Discount</td><td style="text-align:right">-${formatCurrency(invoice.totalDiscount)}</td></tr>` : ''}
                    ${invoice.totalTax > 0 ? `<tr><td style="padding:4px 0">Add: Tax</td><td style="text-align:right">${formatCurrency(invoice.totalTax)}</td></tr>` : ''}
                    ${invoice.roundOff ? `<tr style="font-size:11px;color:#999"><td style="padding:4px 0">Round Off</td><td style="text-align:right">${formatCurrency(invoice.roundOff)}</td></tr>` : ''}
                    <tr style="border-top:2px solid #262626;font-weight:bold;font-size:16px">
                        <td style="padding:8px 0">Grand Total:</td><td style="text-align:right">${formatCurrency(invoice.finalAmount)}</td>
                    </tr>
                </table>
            </div>

            <div style="font-size:11px;color:#737373;font-style:italic;text-align:right;margin-bottom:24px">
                (${numberToWords(invoice.finalAmount)})
            </div>

            ${invoice.status === 'paid' ? `<div style="text-align:center;margin:16px 0"><span style="border:2px solid #166534;color:#166534;padding:4px 16px;font-size:16px;font-weight:bold;letter-spacing:3px">PAID IN FULL</span></div>` : ''}

            <!-- Signatures -->
            <div style="display:flex;justify-content:space-between;margin-top:48px">
                <div style="width:200px;text-align:center">
                    <div style="border-top:1px solid #262626;padding-top:6px;font-size:11px;color:#737373">Customer's Signature</div>
                </div>
                <div style="width:200px;text-align:center">
                    ${firm.signatureUrl ? `<img src="${firm.signatureUrl}" style="height:36px;margin-bottom:4px"/>` : '<div style="height:40px"></div>'}
                    <div style="border-top:1px solid #262626;padding-top:6px;font-size:11px;color:#737373">For ${firm.firmName}</div>
                </div>
            </div>

            ${firm.termsAndConditions ? `<div style="margin-top:24px;border-top:1px solid #e5e5e5;padding-top:12px;font-size:10px;color:#a3a3a3"><em>Terms & Conditions: ${firm.termsAndConditions}</em></div>` : ''}
        </div>
        `;
    }
});

export default 'classic-formal';
