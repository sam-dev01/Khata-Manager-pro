import dayjs from 'dayjs';
import { transliterateToHindi } from './transliteration';

export const generatePosHtml = (invoice, settings = {}, isPreview = false) => {
    // defaults
    const shopId = localStorage.getItem('current_shop_id');
    const sName = settings.shopName || invoice.shopName || localStorage.getItem('current_shop_name') || 'Shop Name';
    const sAddress = settings.shopAddress || localStorage.getItem(`shop_${shopId}_address`) || '';
    const sPhone = settings.shopPhone || localStorage.getItem(`shop_${shopId}_phone`) || '';
    const sGst = settings.shopGst || localStorage.getItem(`shop_${shopId}_gst`) || '';

    // Customization
    const fontSize = settings.posFontSize || '12px'; // Default 12px
    const lang = settings.posBillLanguage || 'both'; // 'en', 'hi', 'both'
    const doTransliterate = settings.posTransliterateItems !== false; // Default true if present

    // Derived values
    const dateStr = dayjs(invoice.date).format('DD/MM/YYYY, hh:mm A');
    const billNo = invoice.id ? invoice.id.slice(-6).toUpperCase() : '001';

    const hasTax = invoice.tax > 0;
    const taxVal = Number(invoice.tax || 0);
    const cgst = (taxVal / 2).toFixed(2);
    const sgst = (taxVal / 2).toFixed(2);

    // Translations Dictionary
    const DICT = {
        retailInvoice: { en: 'Retail Invoice', hi: 'खुदरा बीजक' },
        date: { en: 'Date', hi: 'दिनांक' },
        billNo: { en: 'Bill No', hi: 'बिल नं' },
        paymentMode: { en: 'Pay Mode', hi: 'भुगतान' },
        item: { en: 'Item', hi: 'वस्तु' },
        qty: { en: 'Qty', hi: 'मात्रा' },
        amt: { en: 'Amt', hi: 'राशि' },
        subTotal: { en: 'Sub Total', hi: 'उप कुल' },
        discount: { en: 'Discount', hi: 'छूट' },
        total: { en: 'TOTAL', hi: 'कुल योग' },
        cash: { en: 'Cash', hi: 'नकद' },
        tendered: { en: 'Tendered', hi: 'प्राप्त' },
        change: { en: 'Change', hi: 'शेष' },
        footer: { en: 'E & O.E', hi: 'भूल-चूक लेनी-देनी' }
    };

    const t = (key) => {
        const en = DICT[key].en;
        const hi = DICT[key].hi;
        if (lang === 'en') return en;
        if (lang === 'hi') return hi;
        return `${en} / ${hi}`;
    };

    // Item Name Processing
    const processItemName = (name) => {
        if (lang === 'en') return name;
        const hiName = doTransliterate ? transliterateToHindi(name) : '';

        if (lang === 'hi') return hiName || name; // Fallback to name if trans fails or empty? trans usually returns something
        // Both
        return `<div>${name}</div><div style="font-size: 0.85em; color: #555;">${hiName}</div>`;
    };

    return `
    <html>
        <head>
            <title>Bill #${billNo}</title>
            <style>
                body {
                    margin: 0;
                    padding: 0;
                    font-family: 'Courier New', monospace;
                    font-size: ${fontSize};
                    background: #fff;
                    color: #000;
                    width: 58mm; /* Configurable? usually fixed for POS */
                    height: auto;
                    overflow: hidden; /* Prevent infinite print loop */
                }
                @media print {
                    body, html {
                        width: 100%;
                        height: auto;
                        overflow: visible !important;
                    }
                    /* Ensure no extra pages */
                    .container { page-break-after: avoid; }
                }

                .container {
                    width: 100%;
                    padding: 5px;
                    box-sizing: border-box;
                    padding-bottom: 20px; /* Space for cut */
                }
                .text-center { text-align: center; }
                .text-right { text-align: right; }
                .text-left { text-align: left; }
                .bold { font-weight: bold; }
                
                .header-title { font-size: calc(${fontSize} + 2px); font-weight: bold; margin-bottom: 2px; text-transform: uppercase; }
                .header-address { font-size: calc(${fontSize} - 2px); line-height: 1.2; text-transform: uppercase; }
                .gst { font-size: calc(${fontSize} - 2px); margin-top: 2px; }
                
                .invoice-type { margin: 10px 0; font-weight: bold; border-bottom: 0px; text-decoration: underline; font-size: calc(${fontSize} - 1px); }
                
                .meta-row { display: flex; justify-content: space-between; font-size: calc(${fontSize} - 2px); margin-bottom: 2px; }
                .customer-name { font-weight: bold; margin: 5px 0 2px 0; font-size: calc(${fontSize} - 1px); text-transform: uppercase; }
                
                table { width: 100%; border-collapse: collapse; margin-top: 5px; font-size: calc(${fontSize} - 2px); }
                th { border-top: 1px solid #000; border-bottom: 1px solid #000; padding: 3px 0; text-align: left; }
                td { padding: 2px 0; vertical-align: top; }
                
                .totals-section { margin-top: 5px; border-top: 1px solid #000; padding-top: 5px; font-size: calc(${fontSize} - 2px); }
                .total-row { display: flex; justify-content: space-between; margin-bottom: 2px; }
                .grand-total { font-size: calc(${fontSize} + 2px); font-weight: bold; border-top: 1px solid #000; border-bottom: 1px solid #000; padding: 5px 0; margin-top: 5px; }
                
                .footer { margin-top: 10px; font-size: calc(${fontSize} - 3px); text-align: right; }
            </style>
        </head>
        <body>
            <div class="container">
                <div class="text-center">
                    <div class="header-title">${sName}</div>
                    <div class="header-address">${sAddress}</div>
                    ${sPhone ? `<div class="header-address">PHONE : ${sPhone}</div>` : ''}
                    ${sGst ? `<div class="gst">GSTIN : ${sGst}</div>` : ''}
                    
                    <div class="invoice-type">${t('retailInvoice')}</div>
                </div>
                
                <div style="font-size: calc(${fontSize} - 2px);">${t('date')} : ${dateStr}</div>
                
                <div class="customer-name">${invoice.customerName || 'CASH CUSTOMER'}</div>
                
                <div class="meta-row">
                    <span>${t('billNo')}: ${billNo}</span>
                </div>
                <div class="meta-row">
                    <span>${t('paymentMode')}: ${invoice.paymentMode || 'Cash'}</span>
                </div>
                
                <table>
                    <thead>
                        <tr>
                            <th style="width: 50%;">${t('item')}</th>
                            <th class="text-right" style="width: 20%;">${t('qty')}</th>
                            <th class="text-right" style="width: 30%;">${t('amt')}</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${invoice.items.map(item => `
                            <tr>
                                <td>${processItemName(item.name)}</td>
                                <td class="text-right">${item.qty}</td>
                                <td class="text-right">${(item.price * item.qty).toFixed(2)}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
                
                <div class="totals-section">
                    <div class="total-row">
                        <span>${t('subTotal')}</span>
                        <span>${invoice.subTotal.toFixed(2)}</span>
                    </div>
                    ${invoice.discount > 0 ? `
                        <div class="total-row">
                            <span>(-) ${t('discount')}</span>
                            <span>${Number(invoice.discount).toFixed(2)}</span>
                        </div>
                    ` : ''}
                    
                    ${hasTax ? `
                        <div class="total-row">
                            <span>CGST @ 9%</span>
                            <span>${cgst}</span>
                        </div>
                         <div class="total-row">
                            <span>SGST @ 9%</span>
                            <span>${sgst}</span>
                        </div>
                    ` : ''}
                    
                    <div class="grand-total total-row">
                        <span>${t('total')}</span>
                        <span>Rs ${invoice.total.toFixed(2)}</span>
                    </div>
                    
                    <div class="total-row" style="margin-top: 5px;">
                        <span>${t('cash')} :</span>
                        <span>Rs ${invoice.total.toFixed(2)}</span>
                    </div>
                     <div class="total-row">
                        <span>${t('tendered')}:</span>
                        <span>Rs ${invoice.total.toFixed(2)}</span>
                    </div>
                    
                    <div class="footer">
                        ${t('footer')}
                    </div>
                </div>
            </div>
            ${isPreview ? '' : `
            <script>
                 window.onload = function() { window.print(); }
            </script>
            `}
        </body>
    </html>
    `;
};

export const generateA4Html = (invoice, settings = {}, isPreview = false) => {
    const shopId = localStorage.getItem('current_shop_id');
    const sName = settings.shopName || invoice.shopName || localStorage.getItem('current_shop_name') || 'Shop Name';
    const sAddress = settings.shopAddress || localStorage.getItem(`shop_${shopId}_address`) || '';
    const sPhone = settings.shopPhone || localStorage.getItem(`shop_${shopId}_phone`) || '';
    const sGst = settings.shopGst || localStorage.getItem(`shop_${shopId}_gst`) || '';
    const sEmail = settings.shopEmail || localStorage.getItem(`shop_${shopId}_email`) || '';

    // Images
    const logo = settings.logo || localStorage.getItem(`shop_${shopId}_logo`) || '';
    const signature = settings.signature || localStorage.getItem(`shop_${shopId}_signature`) || '';

    // Bank Info
    const showBank = settings.showBankDetails === true;
    const bankName = settings.bankName || localStorage.getItem(`shop_${shopId}_bank_name`) || '';
    const bankAcc = settings.bankAccount || localStorage.getItem(`shop_${shopId}_bank_acc`) || '';
    const bankIfsc = settings.bankIfsc || localStorage.getItem(`shop_${shopId}_bank_ifsc`) || '';
    const sUpi = settings.upiId || localStorage.getItem(`shop_${shopId}_upi`) || '';

    // Styling Colors
    const BORDER = '#333';
    const HEADER_BG = '#f0f0f0'; // Light Grey for clean look
    const ACCENT = '#000'; // Black accent

    const dateStr = dayjs(invoice.date).format('DD MMM YYYY');
    const dueDateStr = invoice.dueDate ? dayjs(invoice.dueDate).format('DD MMM YYYY') : dateStr;

    // Helper to format currency
    const fmt = (amt) => (amt || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

    return `
    <!DOCTYPE html>
    <html>
      <head>
        <title>Invoice #${invoice.invoiceNumber || invoice.id}</title>
        <style>
            @import url('https://fonts.googleapis.com/css2?family=Arimo:wght@400;500;700&display=swap');
            
            @page { size: A4; margin: 0; }
            body { margin: 0; padding: 0; font-family: 'Arimo', sans-serif; color: #000; -webkit-print-color-adjust: exact; background: #fff; line-height: 1.3; }
            
            .page {
                width: 210mm;
                min-height: 297mm;
                padding: 10mm;
                margin: 0 auto;
                box-sizing: border-box;
                position: relative;
                display: flex;
                flex-direction: column;
            }
            
            /* Print Specifics */
            @media print {
                html, body { width: 210mm; height: 100%; }
                .page { margin: 0; border: none; width: 100%; height: 100%; padding: 10mm; }
                .no-print { display: none; }
            }

            /* Border Container */
            .box {
                border: 1px solid ${BORDER};
                flex: 1;
                display: flex;
                flex-direction: column;
            }

            /* Header */
            .header-row {
                display: flex;
                border-bottom: 1px solid ${BORDER};
            }
            .logo-box {
                width: 120px;
                padding: 10px;
                display: flex;
                align-items: center;
                justify-content: center;
                border-right: 1px solid ${BORDER};
            }
            .shop-box {
                flex: 1;
                padding: 10px 15px;
            }
            .shop-name { font-size: 20px; font-weight: 700; text-transform: uppercase; margin-bottom: 5px; }
            .shop-details { font-size: 13px; color: #333; }

            .invoice-title-box {
                width: 180px;
                background: ${HEADER_BG};
                display: flex;
                align-items: center;
                justify-content: center;
                border-left: 1px solid ${BORDER};
                font-size: 20px;
                font-weight: 700;
                letter-spacing: 1px;
            }

            /* Info Grid */
            .info-grid {
                display: flex;
                border-bottom: 1px solid ${BORDER};
            }
            .info-left {
                flex: 1;
                border-right: 1px solid ${BORDER};
            }
            .info-right {
                flex: 1;
            }
            .info-row {
                display: flex;
                border-bottom: 1px solid #ddd;
            }
            .info-row:last-child { border-bottom: none; }
            .lbl { width: 100px; padding: 5px 10px; font-size: 12px; font-weight: 600; color: #555; background: #fafafa; border-right: 1px solid #eee; }
            .val { flex: 1; padding: 5px 10px; font-size: 12px; font-weight: 700; }

            /* Customer Row */
            .customer-row {
                display: flex;
                border-bottom: 1px solid ${BORDER};
            }
            .cust-col {
                flex: 1;
                padding: 10px;
            }
            .cust-col:first-child { border-right: 1px solid ${BORDER}; }
            .field-label { font-size: 11px; color: #666; font-weight: 600; margin-bottom: 3px; text-transform: uppercase; }
            .field-val { font-size: 14px; font-weight: 600; }
            .field-sub { font-size: 13px; color: #333; margin-top: 2px; }

            /* Table */
            .table-container {
                flex: 1;
            }
            table { width: 100%; border-collapse: collapse; font-size: 12px; }
            th { 
                background: ${HEADER_BG}; 
                padding: 8px 5px; 
                text-align: left; 
                border-bottom: 1px solid ${BORDER}; 
                border-right: 1px solid ${BORDER};
                font-weight: 700;
            }
            th:last-child { border-right: none; }
            td { 
                padding: 6px 5px; 
                border-bottom: 1px solid #eee; 
                border-right: 1px solid ${BORDER};
                vertical-align: top;
            }
            td:last-child { border-right: none; }
            
            /* Footer */
            .footer-grid {
                display: flex;
                border-top: 1px solid ${BORDER};
                font-size: 12px;
            }
            .footer-left {
                flex: 1.5;
                border-right: 1px solid ${BORDER};
                padding: 10px;
                display: flex;
                flex-direction: column;
                justify-content: space-between;
            }
            .footer-right {
                flex: 1;
            }

            .total-row {
                display: flex;
                justify-content: space-between;
                padding: 5px 10px;
                border-bottom: 1px solid #eee;
            }
            .total-row.grand {
                background: ${HEADER_BG};
                border-bottom: none;
                font-weight: 700;
                font-size: 14px;
                border-top: 1px solid ${BORDER};
                padding: 10px;
            }
            
            .bank-box {
                margin-top: 10px;
                border: 1px dashed #999;
                padding: 8px;
                background: #fdfdfd;
                border-radius: 4px;
            }
            
            .auth-sign {
                text-align: right;
                margin-top: 15px;
                padding-right: 10px;
                padding-bottom: 5px;
            }
            
            /* Helper classes */
            .text-right { text-align: right; }
            .text-center { text-align: center; }
            .text-bold { font-weight: 700; }
        </style>
      </head>
      <body>
        <div class="page">
            <div class="box">
                <!-- Header -->
                <div class="header-row">
                    ${logo ? `<div class="logo-box"><img src="${logo}" style="max-width: 100%; max-height: 80px;" /></div>` : ''}
                    <div class="shop-box">
                        <div class="shop-name">${sName}</div>
                        <div class="shop-details">${sAddress}</div>
                        <div class="shop-details">
                            ${sPhone ? `Phone: ${sPhone}` : ''} 
                            ${sEmail ? `| Email: ${sEmail}` : ''}
                        </div>
                        ${sGst ? `<div class="shop-details" style="margin-top:4px;">GSTIN: <span class="text-bold">${sGst}</span></div>` : ''}
                    </div>
                    <div class="invoice-title-box">
                        ${invoice.docType === 'estimate' ? 'ESTIMATE' : invoice.isGstBill ? 'TAX INVOICE' : 'INVOICE'}
                    </div>
                </div>

                <!-- Meta Info -->
                <div class="info-grid">
                    <div class="info-left">
                        <div class="info-row"><div class="lbl">Invoice No</div><div class="val">${invoice.invoiceNumber || invoice.id.slice(-6)}</div></div>
                        <div class="info-row"><div class="lbl">Date</div><div class="val">${dateStr}</div></div>
                    </div>
                    <div class="info-right">
                        <div class="info-row"><div class="lbl">Place of Supply</div><div class="val">${invoice.isInterState ? 'Inter-State' : 'Intra-State'}</div></div>
                        <div class="info-row"><div class="lbl">Due Date</div><div class="val">${dueDateStr}</div></div>
                    </div>
                </div>

                <!-- Address -->
                <div class="customer-row">
                    <div class="cust-col">
                        <div class="field-label">Bill To</div>
                        <div class="field-val">${invoice.customerName}</div>
                        ${invoice.newCustomerDetails ? '' : `<div class="field-sub">${invoice.customerAddress || ''}</div>`}
                        ${invoice.customerGst ? `<div class="field-sub">GSTIN: ${invoice.customerGst}</div>` : ''}
                    </div>
                    <div class="cust-col">
                        <div class="field-label">Ship To</div>
                        <div class="field-val">${invoice.customerName}</div>
                        <div class="field-sub">${invoice.customerAddress || ''}</div>
                    </div>
                </div>

                <!-- Table -->
                <div class="table-container">
                    <table>
                        <thead>
                            <tr>
                                <th style="width: 40px; text-align: center;">#</th>
                                <th>Item Description</th>
                                <th style="width: 60px;">HSN</th>
                                <th style="width: 50px; text-align: right;">Qty</th>
                                <th style="width: 70px; text-align: right;">Rate</th>
                                ${invoice.isGstBill ? `<th style="width: 40px; text-align: right;">GST</th>` : ''}
                                <th style="width: 40px; text-align: right;">Disc</th>
                                <th style="width: 90px; text-align: right;">Amount</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${invoice.items.map((item, i) => `
                                <tr>
                                    <td class="text-center">${i + 1}</td>
                                    <td>
                                        <div class="text-bold">${item.name}</div>
                                    </td>
                                    <td>${item.hsn || '-'}</td>
                                    <td class="text-right">${item.qty} ${item.unit || ''}</td>
                                    <td class="text-right">${fmt(item.price)}</td>
                                    ${invoice.isGstBill ? `<td class="text-right">${item.gstRate}%</td>` : ''}
                                    <td class="text-right">${item.discount > 0 ? fmt(item.discount) : '-'}</td>
                                    <td class="text-right text-bold">${fmt(item.price * item.qty - (item.discount || 0))}</td>
                                </tr>
                            `).join('')}
                            
                            <!-- Filler rows to push footer down -->
                            ${[...Array(Math.max(0, 10 - invoice.items.length))].map(() => `
                                <tr style="height: 25px;"><td colspan="${invoice.isGstBill ? 8 : 7}" style="border-bottom:none;"></td></tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>

                <!-- Footer -->
                <div class="footer-grid">
                    <div class="footer-left">
                        <div>
                            <div class="field-label" style="text-decoration: underline;">Bank Details</div>
                            ${showBank ? `
                            <div class="bank-box">
                                <div><b>Bank:</b> ${bankName}</div>
                                <div><b>A/c No:</b> ${bankAcc}</div>
                                <div><b>IFSC:</b> ${bankIfsc}</div>
                                ${sUpi ? `<div><b>UPI:</b> ${sUpi}</div>` : ''}
                            </div>
                            ` : '<div style="font-style: italic; color: #777;">Not Provided</div>'}
                            
                            <div style="margin-top: 15px;">
                                <div class="field-label" style="text-decoration: underline;">Terms & Conditions</div>
                                <div style="font-size: 11px; color: #555; margin-top: 5px; white-space: pre-wrap;">${settings.terms || '1. Goods once sold will not be taken back.\n2. Interest @ 18% p.a. will be charged if bill is not paid on due date.'}</div>
                            </div>
                        </div>
                    </div>
                    <div class="footer-right">
                        <div class="total-row">
                            <span>Sub Total</span>
                            <span class="text-bold">${fmt(invoice.subTotal)}</span>
                        </div>
                        ${invoice.totalItemDiscount > 0 ? `
                        <div class="total-row">
                            <span>Item Discount</span>
                            <span style="color: red;">(-) ${fmt(invoice.totalItemDiscount)}</span>
                        </div>` : ''}
                        ${invoice.billDiscount > 0 ? `
                        <div class="total-row">
                            <span>Bill Discount</span>
                            <span style="color: red;">(-) ${fmt(invoice.billDiscount)}</span>
                        </div>` : ''}
                        
                        ${invoice.isGstBill && invoice.taxBreakup ? `
                            ${invoice.isInterState ? `
                                <div class="total-row">
                                    <span>IGST Output</span>
                                    <span>${fmt(invoice.taxBreakup.igst)}</span>
                                </div>
                            ` : `
                                <div class="total-row">
                                    <span>CGST Output</span>
                                    <span>${fmt(invoice.taxBreakup.cgst)}</span>
                                </div>
                                <div class="total-row">
                                    <span>SGST Output</span>
                                    <span>${fmt(invoice.taxBreakup.sgst)}</span>
                                </div>
                            `}
                        ` : ''}

                        <div class="total-row" style="margin-top: 5px; border-top: 1px dashed #ddd;">
                            <span>Rounding</span>
                            <span>${(invoice.total - (invoice.subTotal + (invoice.taxBreakup?.totalTax || 0) - (invoice.billDiscount || 0) - (invoice.totalItemDiscount || 0))).toFixed(2)}</span>
                        </div>
                        
                        <div class="total-row grand">
                            <span style="font-size: 16px;">GRAND TOTAL</span>
                            <span style="font-size: 16px;">₹ ${fmt(invoice.total)}</span>
                        </div>

                        <div class="auth-sign">
                            ${signature ? `<img src="${signature}" style="max-height: 40px;" />` : '<div style="height: 40px;"></div>'}
                            <div style="font-size: 11px; font-weight: 700;">Authorized Signatory</div>
                        </div>
                    </div>
                </div>
            </div>
            <div class="text-center" style="font-size: 10px; margin-top: 5px; color: #777;">This is a computer generated invoice.</div>
        </div>
        ${isPreview ? '' : `<script>window.onload = function() { window.print(); }</script>`}
      </body>
    </html>
    `;
};

export const printBill = (invoice, format = 'pos', settings = {}) => {
    const isPos = format === 'pos';
    const width = settings.printerWidth === '58mm' ? '58mm' : '80mm';

    const content = isPos ? generatePosHtml(invoice, settings) : generateA4Html(invoice, settings);

    const win = window.open('', '', `width=${isPos ? 400 : 900},height=600`);
    win.document.write(content);
    // POS usually needs auto print script injection for web if browser settings allow
    win.document.write('<script>window.onload = function() { window.print(); }</script>');
    win.document.close();
};
