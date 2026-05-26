/**
 * GST Invoice Template
 * Category: gst
 * Style: Full GSTIN, HSN columns, CGST/SGST/IGST split, tax breakup table
 */
import { registerTemplate } from '../InvoiceTemplateEngine';

registerTemplate('gst-invoice', {
    name: 'GST Invoice',
    category: 'gst',
    description: 'Full GST compliant invoice with CGST/SGST/IGST breakup',
    render({ invoice, firm, helpers }) {
        const { formatCurrency, formatDate, numberToWords } = helpers;
        const items = invoice.items || [];
        const isInterState = invoice.isInterState || false;

        const itemRows = items.map((item, i) => `
            <tr style="font-size:12px">
                <td style="border:1px solid #999;padding:6px;text-align:center">${i + 1}</td>
                <td style="border:1px solid #999;padding:6px">${item.name || ''}</td>
                <td style="border:1px solid #999;padding:6px;text-align:center">${item.hsn || '—'}</td>
                <td style="border:1px solid #999;padding:6px;text-align:center">${item.qty}</td>
                <td style="border:1px solid #999;padding:6px;text-align:center">${item.unit || 'Nos'}</td>
                <td style="border:1px solid #999;padding:6px;text-align:right">${formatCurrency(item.rate)}</td>
                <td style="border:1px solid #999;padding:6px;text-align:right">${formatCurrency(item.amount)}</td>
                ${item.discountAmt > 0 ? `<td style="border:1px solid #999;padding:6px;text-align:right">${formatCurrency(item.discountAmt)}</td>` : `<td style="border:1px solid #999;padding:6px;text-align:right">—</td>`}
                <td style="border:1px solid #999;padding:6px;text-align:right">${formatCurrency(item.taxableValue)}</td>
                ${isInterState ? `
                    <td style="border:1px solid #999;padding:6px;text-align:center">${item.gstRate}%</td>
                    <td style="border:1px solid #999;padding:6px;text-align:right">${formatCurrency(item.igst)}</td>
                ` : `
                    <td style="border:1px solid #999;padding:6px;text-align:center">${item.gstRate / 2}%</td>
                    <td style="border:1px solid #999;padding:6px;text-align:right">${formatCurrency(item.cgst)}</td>
                    <td style="border:1px solid #999;padding:6px;text-align:center">${item.gstRate / 2}%</td>
                    <td style="border:1px solid #999;padding:6px;text-align:right">${formatCurrency(item.sgst)}</td>
                `}
                <td style="border:1px solid #999;padding:6px;text-align:right;font-weight:bold">${formatCurrency(item.lineTotal)}</td>
            </tr>
        `).join('');

        return `
        <div style="font-family:Arial,sans-serif;max-width:900px;margin:0 auto;background:#fff;padding:16px;font-size:13px">
            <!-- Tax Invoice Header -->
            <div style="text-align:center;font-size:16px;font-weight:bold;border:2px solid #333;padding:6px;margin-bottom:0;background:#f9f9f9">
                ${invoice.invoiceType === 'estimate' ? 'ESTIMATE' : invoice.invoiceType === 'proforma' ? 'PROFORMA INVOICE' : 'TAX INVOICE'}
            </div>

            <!-- Company + Invoice Info -->
            <table style="width:100%;border-collapse:collapse;border:1px solid #999">
                <tr>
                    <td style="border:1px solid #999;padding:10px;width:50%;vertical-align:top">
                        ${firm.logoUrl ? `<img src="${firm.logoUrl}" alt="Logo" style="height:40px;margin-bottom:4px"/>` : ''}
                        <div style="font-size:18px;font-weight:bold">${firm.firmName}</div>
                        <div style="font-size:12px;color:#555">${firm.firmAddress || ''}</div>
                        ${firm.firmPhone ? `<div style="font-size:12px">Ph: ${firm.firmPhone}</div>` : ''}
                        ${firm.firmEmail ? `<div style="font-size:12px">Email: ${firm.firmEmail}</div>` : ''}
                        ${firm.firmGSTIN ? `<div style="font-size:12px;margin-top:4px"><strong>GSTIN:</strong> ${firm.firmGSTIN}</div>` : ''}
                        ${firm.firmState ? `<div style="font-size:12px"><strong>State:</strong> ${firm.firmState} (${firm.firmStateCode || ''})</div>` : ''}
                    </td>
                    <td style="border:1px solid #999;padding:10px;width:50%;vertical-align:top">
                        <table style="width:100%;font-size:12px">
                            <tr><td style="padding:3px 0;font-weight:bold">Invoice No:</td><td>${invoice.invoiceNumber || invoice.id || ''}</td></tr>
                            <tr><td style="padding:3px 0;font-weight:bold">Date:</td><td>${formatDate(invoice.date)}</td></tr>
                            ${invoice.dueDate ? `<tr><td style="padding:3px 0;font-weight:bold">Due Date:</td><td>${formatDate(invoice.dueDate)}</td></tr>` : ''}
                            <tr><td style="padding:3px 0;font-weight:bold">Place of Supply:</td><td>${invoice.placeOfSupply || firm.firmState || '—'}</td></tr>
                            <tr><td style="padding:3px 0;font-weight:bold">Reverse Charge:</td><td>No</td></tr>
                        </table>
                    </td>
                </tr>
                <tr>
                    <td style="border:1px solid #999;padding:10px;vertical-align:top">
                        <div style="font-weight:bold;margin-bottom:4px;text-decoration:underline">Bill To:</div>
                        <div style="font-weight:bold">${invoice.customerName || 'Cash'}</div>
                        ${invoice.customerAddress ? `<div style="font-size:12px">${invoice.customerAddress}</div>` : ''}
                        ${invoice.customerPhone ? `<div style="font-size:12px">Ph: ${invoice.customerPhone}</div>` : ''}
                        ${invoice.customerGSTIN ? `<div style="font-size:12px"><strong>GSTIN:</strong> ${invoice.customerGSTIN}</div>` : ''}
                    </td>
                    <td style="border:1px solid #999;padding:10px;vertical-align:top">
                        <div style="font-weight:bold;margin-bottom:4px;text-decoration:underline">Ship To:</div>
                        <div style="font-size:12px">${invoice.shippingAddress || invoice.customerAddress || 'Same as billing'}</div>
                    </td>
                </tr>
            </table>

            <!-- Items Table -->
            <table style="width:100%;border-collapse:collapse;margin-top:-1px">
                <thead>
                    <tr style="background:#e8e8e8;font-size:11px;text-transform:uppercase">
                        <th style="border:1px solid #999;padding:6px;width:30px">#</th>
                        <th style="border:1px solid #999;padding:6px;text-align:left">Description</th>
                        <th style="border:1px solid #999;padding:6px;width:60px">HSN/SAC</th>
                        <th style="border:1px solid #999;padding:6px;width:40px">Qty</th>
                        <th style="border:1px solid #999;padding:6px;width:40px">Unit</th>
                        <th style="border:1px solid #999;padding:6px;width:70px;text-align:right">Rate</th>
                        <th style="border:1px solid #999;padding:6px;width:80px;text-align:right">Amount</th>
                        <th style="border:1px solid #999;padding:6px;width:60px;text-align:right">Disc</th>
                        <th style="border:1px solid #999;padding:6px;width:80px;text-align:right">Taxable</th>
                        ${isInterState ? `
                            <th style="border:1px solid #999;padding:6px;width:40px">IGST%</th>
                            <th style="border:1px solid #999;padding:6px;width:70px;text-align:right">IGST</th>
                        ` : `
                            <th style="border:1px solid #999;padding:6px;width:40px">CGST%</th>
                            <th style="border:1px solid #999;padding:6px;width:60px;text-align:right">CGST</th>
                            <th style="border:1px solid #999;padding:6px;width:40px">SGST%</th>
                            <th style="border:1px solid #999;padding:6px;width:60px;text-align:right">SGST</th>
                        `}
                        <th style="border:1px solid #999;padding:6px;width:80px;text-align:right">Total</th>
                    </tr>
                </thead>
                <tbody>${itemRows}</tbody>
                <tfoot>
                    <tr style="font-weight:bold;background:#f5f5f5">
                        <td colspan="${isInterState ? 8 : 8}" style="border:1px solid #999;padding:8px;text-align:right">Total:</td>
                        <td style="border:1px solid #999;padding:8px;text-align:right">${formatCurrency(invoice.subtotal - invoice.totalDiscount)}</td>
                        ${isInterState ? `
                            <td style="border:1px solid #999;padding:8px"></td>
                            <td style="border:1px solid #999;padding:8px;text-align:right">${formatCurrency(invoice.totalIGST)}</td>
                        ` : `
                            <td style="border:1px solid #999;padding:8px"></td>
                            <td style="border:1px solid #999;padding:8px;text-align:right">${formatCurrency(invoice.totalCGST)}</td>
                            <td style="border:1px solid #999;padding:8px"></td>
                            <td style="border:1px solid #999;padding:8px;text-align:right">${formatCurrency(invoice.totalSGST)}</td>
                        `}
                        <td style="border:1px solid #999;padding:8px;text-align:right">${formatCurrency(invoice.finalAmount)}</td>
                    </tr>
                </tfoot>
            </table>

            <!-- Amount in Words -->
            <div style="border:1px solid #999;border-top:none;padding:8px;font-size:12px">
                <strong>Amount in Words:</strong> ${numberToWords(invoice.finalAmount)}
            </div>

            ${invoice.status === 'paid' ? `
            <div style="text-align:center;margin:12px 0">
                <span style="border:3px solid #006600;color:#006600;padding:4px 16px;font-size:18px;font-weight:bold;letter-spacing:2px">PAID</span>
            </div>` : ''}

            <!-- Bank Details & Signature -->
            <table style="width:100%;border-collapse:collapse;margin-top:16px">
                <tr>
                    <td style="border:1px solid #999;padding:10px;vertical-align:top;width:60%">
                        ${firm.bankDetails?.bankName ? `
                        <div style="font-weight:bold;text-decoration:underline;margin-bottom:4px">Bank Details:</div>
                        <div style="font-size:12px">
                            <div>Bank: ${firm.bankDetails.bankName}</div>
                            <div>Account No: ${firm.bankDetails.accountNo}</div>
                            <div>IFSC: ${firm.bankDetails.ifsc}</div>
                            ${firm.bankDetails.upiId ? `<div>UPI: ${firm.bankDetails.upiId}</div>` : ''}
                        </div>
                        ` : ''}
                    </td>
                    <td style="border:1px solid #999;padding:10px;text-align:center;vertical-align:bottom">
                        ${firm.signatureUrl ? `<img src="${firm.signatureUrl}" style="height:40px;margin-bottom:4px"/>` : '<div style="height:50px"></div>'}
                        <div style="border-top:1px solid #333;padding-top:4px;font-size:11px">
                            For ${firm.firmName}<br/>Authorized Signatory
                        </div>
                    </td>
                </tr>
            </table>

            ${firm.termsAndConditions ? `
            <div style="margin-top:12px;font-size:10px;color:#888;padding:8px;border:1px dashed #ccc">
                <strong>Terms:</strong> ${firm.termsAndConditions}
            </div>` : ''}

            <div style="text-align:center;margin-top:8px;font-size:10px;color:#aaa">
                This is a computer generated invoice
            </div>
        </div>
        `;
    }
});

export default 'gst-invoice';
