/**
 * Service Invoice Template
 * Category: service
 * Style: Hours/rate format, SAC codes, professional services
 */
import { registerTemplate } from '../InvoiceTemplateEngine';

registerTemplate('service-invoice', {
    name: 'Service Invoice',
    category: 'service',
    description: 'Hours/rate based format for professional services',
    render({ invoice, firm, helpers }) {
        const { formatCurrency, formatDate, numberToWords } = helpers;
        const items = invoice.items || [];
        const pc = firm.primaryColor || '#0f766e';

        const itemRows = items.map((item, i) => `
            <tr style="border-bottom:1px solid #e5e7eb">
                <td style="padding:14px 12px;color:#6b7280">${i + 1}</td>
                <td style="padding:14px 12px">
                    <div style="font-weight:600;color:#111827">${item.name || ''}</div>
                    ${item.description ? `<div style="font-size:12px;color:#9ca3af;margin-top:2px">${item.description}</div>` : ''}
                    ${item.hsn ? `<div style="font-size:10px;color:#9ca3af;margin-top:2px">SAC: ${item.hsn}</div>` : ''}
                </td>
                <td style="padding:14px 12px;text-align:center">${item.qty} ${item.unit || 'hrs'}</td>
                <td style="padding:14px 12px;text-align:right">${formatCurrency(item.rate)}</td>
                ${item.discountAmt > 0 ? `<td style="padding:14px 12px;text-align:right;color:#ef4444">-${formatCurrency(item.discountAmt)}</td>` : `<td style="padding:14px 12px;text-align:right;color:#d1d5db">—</td>`}
                <td style="padding:14px 12px;text-align:right">${item.gstRate || 0}%</td>
                <td style="padding:14px 12px;text-align:right;font-weight:700;color:#111827">${formatCurrency(item.lineTotal)}</td>
            </tr>
        `).join('');

        return `
        <div style="font-family:'Inter','Segoe UI',sans-serif;max-width:800px;margin:0 auto;background:#fff">
            <!-- Top Bar -->
            <div style="height:6px;background:linear-gradient(90deg,${pc},#0e7490)"></div>

            <!-- Header -->
            <div style="padding:32px 40px;display:flex;justify-content:space-between;align-items:flex-start">
                <div>
                    ${firm.logoUrl ? `<img src="${firm.logoUrl}" style="height:44px;margin-bottom:12px"/>` : ''}
                    <h1 style="margin:0;font-size:22px;font-weight:800;color:#111827">${firm.firmName}</h1>
                    <div style="font-size:12px;color:#6b7280;margin-top:4px">${firm.firmAddress || ''}</div>
                    ${firm.firmPhone ? `<div style="font-size:12px;color:#6b7280">${firm.firmPhone}</div>` : ''}
                    ${firm.firmGSTIN ? `<div style="font-size:12px;color:#374151;margin-top:4px"><strong>GSTIN:</strong> ${firm.firmGSTIN}</div>` : ''}
                </div>
                <div style="text-align:right">
                    <div style="font-size:11px;text-transform:uppercase;letter-spacing:3px;color:${pc};font-weight:700">Service Invoice</div>
                    <div style="font-size:24px;font-weight:800;color:#111827;margin-top:4px">${invoice.invoiceNumber || invoice.id || ''}</div>
                    <div style="font-size:13px;color:#6b7280;margin-top:8px">
                        <div>Issued: ${formatDate(invoice.date)}</div>
                        ${invoice.dueDate ? `<div>Due: ${formatDate(invoice.dueDate)}</div>` : ''}
                    </div>
                </div>
            </div>

            <!-- Divider -->
            <div style="margin:0 40px;height:1px;background:#e5e7eb"></div>

            <!-- Customer -->
            <div style="padding:24px 40px">
                <div style="display:flex;gap:40px">
                    <div style="flex:1">
                        <div style="font-size:10px;text-transform:uppercase;letter-spacing:2px;color:${pc};font-weight:700;margin-bottom:6px">Client Details</div>
                        <div style="font-weight:700;font-size:16px;color:#111827">${invoice.customerName || 'Client'}</div>
                        ${invoice.customerAddress ? `<div style="font-size:13px;color:#6b7280;margin-top:4px">${invoice.customerAddress}</div>` : ''}
                        ${invoice.customerPhone ? `<div style="font-size:13px;color:#6b7280">${invoice.customerPhone}</div>` : ''}
                        ${invoice.customerGSTIN ? `<div style="font-size:12px;color:#374151;margin-top:4px">GSTIN: ${invoice.customerGSTIN}</div>` : ''}
                    </div>
                    ${invoice.projectName ? `
                    <div style="flex:1">
                        <div style="font-size:10px;text-transform:uppercase;letter-spacing:2px;color:${pc};font-weight:700;margin-bottom:6px">Project</div>
                        <div style="font-weight:600;font-size:14px;color:#111827">${invoice.projectName}</div>
                    </div>` : ''}
                </div>
            </div>

            <!-- Service Items -->
            <div style="padding:0 40px">
                <table style="width:100%;border-collapse:collapse">
                    <thead>
                        <tr style="background:${pc}08;border-top:2px solid ${pc};border-bottom:1px solid #e5e7eb">
                            <th style="padding:12px;text-align:left;font-size:10px;text-transform:uppercase;letter-spacing:1px;color:${pc};font-weight:700;width:30px">#</th>
                            <th style="padding:12px;text-align:left;font-size:10px;text-transform:uppercase;letter-spacing:1px;color:${pc};font-weight:700">Service</th>
                            <th style="padding:12px;text-align:center;font-size:10px;text-transform:uppercase;letter-spacing:1px;color:${pc};font-weight:700">Hours/Qty</th>
                            <th style="padding:12px;text-align:right;font-size:10px;text-transform:uppercase;letter-spacing:1px;color:${pc};font-weight:700">Rate</th>
                            <th style="padding:12px;text-align:right;font-size:10px;text-transform:uppercase;letter-spacing:1px;color:${pc};font-weight:700">Disc</th>
                            <th style="padding:12px;text-align:right;font-size:10px;text-transform:uppercase;letter-spacing:1px;color:${pc};font-weight:700">Tax</th>
                            <th style="padding:12px;text-align:right;font-size:10px;text-transform:uppercase;letter-spacing:1px;color:${pc};font-weight:700">Amount</th>
                        </tr>
                    </thead>
                    <tbody>${itemRows}</tbody>
                </table>
            </div>

            <!-- Totals -->
            <div style="padding:24px 40px;display:flex;justify-content:flex-end">
                <div style="width:280px">
                    <div style="display:flex;justify-content:space-between;padding:6px 0;font-size:14px;color:#6b7280"><span>Subtotal</span><span>${formatCurrency(invoice.subtotal)}</span></div>
                    ${invoice.totalDiscount > 0 ? `<div style="display:flex;justify-content:space-between;padding:6px 0;font-size:14px;color:#ef4444"><span>Discount</span><span>-${formatCurrency(invoice.totalDiscount)}</span></div>` : ''}
                    ${invoice.totalTax > 0 ? `<div style="display:flex;justify-content:space-between;padding:6px 0;font-size:13px;color:#6b7280"><span>Tax</span><span>${formatCurrency(invoice.totalTax)}</span></div>` : ''}
                    <div style="display:flex;justify-content:space-between;padding:14px 0 8px;font-size:20px;font-weight:800;color:#111827;border-top:2px solid ${pc};margin-top:8px">
                        <span>Amount Due</span><span>${formatCurrency(invoice.finalAmount)}</span>
                    </div>
                    <div style="font-size:10px;color:#9ca3af;font-style:italic">${numberToWords(invoice.finalAmount)}</div>
                </div>
            </div>

            ${invoice.status === 'paid' ? `<div style="text-align:center;padding:12px"><span style="background:${pc};color:#fff;padding:6px 24px;border-radius:8px;font-weight:700;font-size:13px">✓ PAYMENT RECEIVED</span></div>` : ''}

            <!-- Footer -->
            <div style="padding:24px 40px;border-top:1px solid #e5e7eb;margin-top:16px">
                ${firm.bankDetails?.bankName ? `
                <div style="font-size:12px;color:#6b7280;margin-bottom:12px">
                    <strong style="color:#374151">Payment Details:</strong> ${firm.bankDetails.bankName} | A/C: ${firm.bankDetails.accountNo} | IFSC: ${firm.bankDetails.ifsc}${firm.bankDetails.upiId ? ` | UPI: ${firm.bankDetails.upiId}` : ''}
                </div>` : ''}
                ${firm.termsAndConditions ? `<div style="font-size:11px;color:#9ca3af;margin-bottom:8px">${firm.termsAndConditions}</div>` : ''}
                <div style="text-align:center;font-size:10px;color:#d1d5db;margin-top:12px">${firm.footerText || 'Thank you for your business!'}</div>
            </div>

            <!-- Bottom Bar -->
            <div style="height:4px;background:linear-gradient(90deg,${pc},#0e7490)"></div>
        </div>
        `;
    }
});

export default 'service-invoice';
