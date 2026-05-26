/**
 * GST Calculation Engine
 * Handles Indian GST rules: CGST/SGST for intra-state, IGST for inter-state.
 * All rounding follows Indian standards.
 */

export const GST_SLABS = [0, 5, 12, 18, 28];

/**
 * Round to nearest rupee using Indian convention:
 * ≤ 0.50 paise → floor, > 0.50 paise → ceil
 */
export const roundToIndian = (amount) => {
    const decimal = amount - Math.floor(amount);
    return decimal > 0.50 ? Math.ceil(amount) : Math.floor(amount);
};

/**
 * Round to 2 decimal places (for tax amounts)
 */
export const roundTo2 = (amount) => Math.round(amount * 100) / 100;

/**
 * Determine if a sale is inter-state
 * @param {string} sellerStateCode - e.g. '27' for Maharashtra
 * @param {string} buyerStateCode  - e.g. '29' for Karnataka
 * @returns {boolean}
 */
export const isInterStateSale = (sellerStateCode, buyerStateCode) => {
    if (!sellerStateCode || !buyerStateCode) return false;
    return sellerStateCode !== buyerStateCode;
};

/**
 * Calculate taxable value after discount for a single line item
 */
export const calcTaxableValue = (item) => {
    const lineTotal = (item.price || 0) * (item.qty || 0);
    let discountAmt = 0;
    if (item.discountType === 'percent') {
        discountAmt = (lineTotal * (item.discount || 0)) / 100;
    } else {
        discountAmt = (item.discount || 0) * (item.qty || 1);
    }
    return roundTo2(Math.max(0, lineTotal - discountAmt));
};

/**
 * Calculate tax for a single line item
 */
export const calcLineItemTax = (item, isInterState = false) => {
    const taxableValue = calcTaxableValue(item);
    const rate = item.gstRate || 0;

    if (rate === 0) {
        return { taxableValue, cgst: 0, sgst: 0, igst: 0, totalTax: 0, rate };
    }

    if (isInterState) {
        const igst = roundTo2((taxableValue * rate) / 100);
        return { taxableValue, cgst: 0, sgst: 0, igst, totalTax: igst, rate };
    }

    const halfRate = rate / 2;
    const cgst = roundTo2((taxableValue * halfRate) / 100);
    const sgst = roundTo2((taxableValue * halfRate) / 100);
    return { taxableValue, cgst, sgst, igst: 0, totalTax: cgst + sgst, rate };
};

/**
 * Calculate full invoice tax breakup from items
 * @param {Array} items - cart items with gstRate, price, qty, discount, discountType
 * @param {number} billDiscount - flat bill-level discount
 * @param {boolean} isInterState
 * @returns {{ lineItems, subTotal, totalItemDiscount, billDiscount, taxBreakup, grandTotal }}
 */
export const calcInvoiceTotals = (items, billDiscount = 0, isInterState = false) => {
    if (!items || items.length === 0) {
        return {
            lineItems: [],
            subTotal: 0,
            totalItemDiscount: 0,
            billDiscount: 0,
            taxBreakup: { cgst: 0, sgst: 0, igst: 0, totalTax: 0, slabWise: {} },
            grandTotal: 0
        };
    }

    const slabWise = {};
    let totalCgst = 0, totalSgst = 0, totalIgst = 0;
    let subTotal = 0;
    let totalItemDiscount = 0;

    const lineItems = items.map(item => {
        const lineTotal = (item.price || 0) * (item.qty || 0);
        subTotal += lineTotal;

        let itemDiscountAmt = 0;
        if (item.discountType === 'percent') {
            itemDiscountAmt = roundTo2((lineTotal * (item.discount || 0)) / 100);
        } else {
            itemDiscountAmt = roundTo2((item.discount || 0) * (item.qty || 1));
        }
        totalItemDiscount += itemDiscountAmt;

        const tax = calcLineItemTax(item, isInterState);

        // Accumulate slab-wise
        const slabKey = `${item.gstRate || 0}%`;
        if (!slabWise[slabKey]) {
            slabWise[slabKey] = { taxableValue: 0, cgst: 0, sgst: 0, igst: 0, totalTax: 0 };
        }
        slabWise[slabKey].taxableValue += tax.taxableValue;
        slabWise[slabKey].cgst += tax.cgst;
        slabWise[slabKey].sgst += tax.sgst;
        slabWise[slabKey].igst += tax.igst;
        slabWise[slabKey].totalTax += tax.totalTax;

        totalCgst += tax.cgst;
        totalSgst += tax.sgst;
        totalIgst += tax.igst;

        return {
            ...item,
            lineTotal,
            itemDiscount: itemDiscountAmt,
            taxableValue: tax.taxableValue,
            cgst: tax.cgst,
            sgst: tax.sgst,
            igst: tax.igst,
            itemTax: tax.totalTax,
            itemTotal: roundTo2(tax.taxableValue + tax.totalTax)
        };
    });

    // Round slab-wise totals
    Object.keys(slabWise).forEach(key => {
        slabWise[key].taxableValue = roundTo2(slabWise[key].taxableValue);
        slabWise[key].cgst = roundTo2(slabWise[key].cgst);
        slabWise[key].sgst = roundTo2(slabWise[key].sgst);
        slabWise[key].igst = roundTo2(slabWise[key].igst);
        slabWise[key].totalTax = roundTo2(slabWise[key].totalTax);
    });

    const totalTax = roundTo2(totalCgst + totalSgst + totalIgst);
    const taxableTotal = roundTo2(subTotal - totalItemDiscount);
    const rawGrandTotal = taxableTotal + totalTax - (billDiscount || 0);
    const grandTotal = roundToIndian(rawGrandTotal);

    return {
        lineItems,
        subTotal: roundTo2(subTotal),
        totalItemDiscount: roundTo2(totalItemDiscount),
        billDiscount: billDiscount || 0,
        taxBreakup: {
            cgst: roundTo2(totalCgst),
            sgst: roundTo2(totalSgst),
            igst: roundTo2(totalIgst),
            totalTax,
            slabWise
        },
        grandTotal
    };
};

/**
 * Indian state codes for GST (first 2 digits of GSTIN)
 */
export const STATE_CODES = {
    '01': 'Jammu & Kashmir', '02': 'Himachal Pradesh', '03': 'Punjab',
    '04': 'Chandigarh', '05': 'Uttarakhand', '06': 'Haryana',
    '07': 'Delhi', '08': 'Rajasthan', '09': 'Uttar Pradesh',
    '10': 'Bihar', '11': 'Sikkim', '12': 'Arunachal Pradesh',
    '13': 'Nagaland', '14': 'Manipur', '15': 'Mizoram', '16': 'Tripura',
    '17': 'Meghalaya', '18': 'Assam', '19': 'West Bengal',
    '20': 'Jharkhand', '21': 'Odisha', '22': 'Chhattisgarh',
    '23': 'Madhya Pradesh', '24': 'Gujarat', '26': 'Dadra & Nagar Haveli',
    '27': 'Maharashtra', '29': 'Karnataka', '30': 'Goa',
    '32': 'Kerala', '33': 'Tamil Nadu', '34': 'Puducherry',
    '35': 'Andaman & Nicobar', '36': 'Telangana', '37': 'Andhra Pradesh',
    '38': 'Ladakh'
};
