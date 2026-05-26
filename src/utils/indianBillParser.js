import dayjs from 'dayjs';

/**
 * Parses raw OCR text into structured bill data designed for Indian invoice formats.
 * @param {string} text - Raw OCR text
 * @returns {Object} - { items: [], meta: { billNo, date, total, gstNo } }
 */
export const parseIndianBill = (text) => {
    const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 2);
    const items = [];
    const meta = { billNo: '', date: null, total: 0, gstNo: '' };

    // Common Header Regex patterns
    const patterns = {
        date: /(\d{1,2}[./-]\d{1,2}[./-]\d{2,4})/g,
        billNo: /(?:Inv|Bill|Invoice|Bk)\s*(?:No|#)?\.?[:\s-]*([A-Z0-9\-/]+)/i,
        gst: /(?:GSTIN|GST)\s*[:\s-]*([0-9A-Z]{15})/i,
        total: /(?:Total|Grand Total|Net Amount)\s*[:\s-]*([\d,]+\.?\d*)/i,
        // Item Line Heuristics
        // A line typically has: Text Name ... Qty ... Rate ... Amount
        // Matches numbers with optional decimals
        number: /([\d,]+\.?\d*)/g
    };

    // 1. Parsing Meta Data (Header/Footer)
    // We scan the first few and last few lines for Meta, but also check all lines.
    lines.forEach(line => {
        // Date
        if (!meta.date) {
            const dMatch = line.match(patterns.date);
            if (dMatch) {
                // Try to parse the first valid date found
                const d = dayjs(dMatch[0].replace(/[-.]/g, '/'), ['DD/MM/YYYY', 'D/M/YYYY', 'D/M/YY']);
                if (d.isValid()) meta.date = d;
            }
        }

        // Bill No
        if (!meta.billNo) {
            const bMatch = line.match(patterns.billNo);
            if (bMatch && bMatch[1].length > 2) meta.billNo = bMatch[1];
        }

        // GST
        if (!meta.gstNo) {
            const gMatch = line.match(patterns.gst);
            if (gMatch) meta.gstNo = gMatch[1];
        }

        // Total Lookahead (usually at bottom)
        const tMatch = line.match(patterns.total);
        if (tMatch) {
            const val = parseFloat(tMatch[1].replace(/,/g, ''));
            if (!isNaN(val) && val > meta.total) meta.total = val;
        }
    });


    // 2. Parsing Items (The Hard Part)
    lines.forEach(line => {
        // Ignore lines that look like headers or totals
        if (/(Total|SubTotal|Tax|GSTIN|Date|Inv|Phone|Address|Thank|Page|Authorized|Sign)/i.test(line)) return;

        // Strategy:
        // 1. Find all numbers in the line.

        const tokenizedNumbers = [];
        let match;
        while ((match = patterns.number.exec(line)) !== null) {
            const s = match[0].replace(/,/g, '');
            // Strict filter: must be a valid float and not start with 0 unless it's 0.something
            const val = parseFloat(s);
            // Filter out likely serial numbers (1. or 2.) at the start of line if they are small integers
            // But be careful, Qty=1 is valid.
            // We store index to help with name extraction.
            if (!isNaN(val)) {
                tokenizedNumbers.push({ val, index: match.index, raw: match[0] });
            }
        }

        if (tokenizedNumbers.length >= 2) {
            const lastNum = tokenizedNumbers[tokenizedNumbers.length - 1]; // Candidate for Amount
            const secondLastNum = tokenizedNumbers[tokenizedNumbers.length - 2]; // Candidate for Rate or Qty

            const amount = lastNum.val;
            let rate = secondLastNum.val;
            let qty = 1;

            // Logic Branching
            let isValidItem = false;

            // SCENARIO 1: 3+ Numbers (Qty, Rate, Amount present)
            if (tokenizedNumbers.length >= 3) {
                const thirdLast = tokenizedNumbers[tokenizedNumbers.length - 3];
                const candidateQty = thirdLast.val;

                // Check Qty * Rate == Amount
                if (Math.abs((candidateQty * rate) - amount) < 1.0) {
                    qty = candidateQty;
                    isValidItem = true;
                }
                // Maybe order is Rate * Qty? Same math.
            }

            // SCENARIO 2: 2 Numbers (Rate, Amount) -> Implies Qty=1
            if (!isValidItem && tokenizedNumbers.length >= 2) {
                // Check if Rate ~= Amount (Qty 1)
                if (Math.abs(rate - amount) < 1.0) {
                    qty = 1;
                    isValidItem = true;
                }
                // SCENARIO 3: Implicit Qty (Amount / Rate = Integer)
                else if (rate > 0 && amount > rate) {
                    const ratio = amount / rate;
                    // Check if ratio is close to an integer (e.g. 2.0, 5.0)
                    if (Math.abs(ratio - Math.round(ratio)) < 0.1) {
                        qty = Math.round(ratio);
                        isValidItem = true;
                    }
                }
            }

            // If valid, extract Name
            if (isValidItem && amount > 0) {
                // Name is everything before the first number consumed by our logic.
                // If we used 3 numbers, it's before thirdLast. If 2, before secondLast.

                // Find which tokens were used
                let firstUsedTokenIndex = secondLastNum.index;
                if (qty !== 1 && tokenizedNumbers.length >= 3) {
                    // Check if we actually used the 3rd last token
                    const thirdLast = tokenizedNumbers[tokenizedNumbers.length - 3];
                    if (Math.abs((thirdLast.val * rate) - amount) < 1.0) {
                        firstUsedTokenIndex = thirdLast.index;
                    }
                }

                const rawName = line.substring(0, firstUsedTokenIndex).trim();
                // Cleanup Name
                // Remove leading Serial Number (e.g. "1. Sugar" or "1 Sugar")
                // Remove HSN codes if they appear as numbers at start like "8471"
                let cleanName = rawName.replace(/^\d+[\.\)\s]+/, '').trim();

                // Remove trailing non-alpha garbage
                cleanName = cleanName.replace(/[^\w\s\-\*\(\)%]+$/, '');

                if (cleanName.length > 2) {
                    items.push({
                        name: cleanName,
                        qty: qty,
                        rate: rate,
                        amount: amount,
                        unit: 'PCS' // Default
                    });
                }
            }
        }
    });
    return { meta, items };
};
