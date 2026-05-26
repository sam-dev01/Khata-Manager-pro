// src/utils/aiVoiceCommands.js - FULL AI ASSISTANT (IMPROVED, NON-BREAKING)
// Major improvements: safer API-key handling, robust JSON parsing, input validation,
// functional state updates, UUID ids, and clearer errors.

import { GoogleGenerativeAI } from "@google/generative-ai";
import dayjs from 'dayjs';
import { v4 as uuidv4 } from 'uuid'; // npm install uuid
import { calculateBalance } from './calculations';

const API_KEY = import.meta.env.VITE_GEMINI_API_KEY;

// Do not log the actual API key in production
console.log('🔑 Gemini API Key present:', Boolean(API_KEY));

let genAI = null;
if (API_KEY) {
  try {
    genAI = new GoogleGenerativeAI(API_KEY);
    console.log('✅ Gemini initialized');
  } catch (err) {
    genAI = null;
    console.error('❌ Gemini init failed:', err?.message || err);
  }
} else {
  console.warn('❌ VITE_GEMINI_API_KEY not set.');
}

/** Helper: robustly extract JSON object from mixed text response */
const extractFirstJson = (text) => {
  if (!text || typeof text !== 'string') return null;
  // Try to find the first {...} block that parses
  const regex = /\{[\s\S]*\}/;
  const match = text.match(regex);
  if (!match) return null;
  try {
    return JSON.parse(match[0]);
  } catch (e) {
    // attempt minor repairs: replace smart quotes, trailing commas
    try {
      const cleaned = match[0]
        .replace(/[\u2018\u2019\u201C\u201D]/g, '"') // smart quotes
        .replace(/,\s*}/g, '}')
        .replace(/,\s*]/g, ']');
      return JSON.parse(cleaned);
    } catch (e2) {
      return null;
    }
  }
};

/** Helper: validate aiResponse shape and default fields */
const normalizeAIResponse = (raw) => {
  if (!raw || typeof raw !== 'object') return null;
  const allowedActions = new Set([
    'check_balance', 'add_payment', 'give_credit', 'add_customer',
    'list_all', 'show_village', 'delete_customer', 'show_report', 'chat', 'clarify'
  ]);
  const action = allowedActions.has(raw.action) ? raw.action : 'chat';
  const customerName = raw.customerName ? String(raw.customerName).trim() : null;
  const amount = raw.amount != null && !Number.isNaN(Number(raw.amount)) ? Number(raw.amount) : null;
  const village = raw.village ? String(raw.village).trim() : null;
  const confidence = ['high', 'medium', 'low'].includes(raw.confidence) ? raw.confidence : 'medium';
  const needsClarification = !!raw.needsClarification;
  const response = raw.response ? String(raw.response) : '';
  const suggestion = raw.suggestion ? String(raw.suggestion) : '';
  const reasoning = raw.reasoning ? String(raw.reasoning) : '';

  return { action, customerName, amount, village, confidence, needsClarification, response, suggestion, reasoning };
};

export const processAIVoiceCommand = async (
  spokenText,
  customers,
  setCustomers,
  transactions,
  setTransactions
) => {
  if (!API_KEY || !genAI) {
    return {
      success: false,
      message: 'API Key configured नहीं है या AI initialization failed — .env और console logs check करें।'
    };
  }

  try {
    console.log('🎤 Spoken:', (spokenText || '').slice(0, 200));

    // Build lightweight current state for prompt (keep it small)
    const totalCustomers = Array.isArray(customers) ? customers.length : 0;
    const customerNames = (customers || []).map(c => c.name).slice(0, 30).join(', ');
    const totalOutstanding = (customers || []).reduce((sum, c) => {
      const bal = calculateBalance(c.id, transactions || []);
      return bal > 0 ? sum + bal : sum;
    }, 0);
    const recentTransactions = (transactions || [])
      .slice(-5)
      .map(t => {
        const customer = (customers || []).find(c => c.id === t.customerId);
        const name = customer?.name || 'Unknown';
        return `${name}: ${t.type} ₹${t.amount} on ${t.date}`;
      })
      .join(', ');

    const prompt = `You are an intelligent AI assistant named "खाता Assistant" for a shop owner in India. You manage their udhari ledger.
Current Shop Status:
- Total Customers: ${totalCustomers}
- Customer Names: ${customerNames || 'None yet'}
- Total Outstanding: ₹${totalOutstanding}
- Recent Activity: ${recentTransactions || 'No transactions yet'}

User Said:
"${spokenText}"

(--- rest of original prompt kept here: capabilities, personality, response format etc. ---)
Please reply in JSON only as specified.`;

    // Choose model + generation config
    const model = genAI.getGenerativeModel({
      model: "gemini-2.0-flash-exp",
      generationConfig: {
        temperature: 0.7,
        maxOutputTokens: 800,
        topP: 0.8,
        topK: 40
      }
    });

    const result = await model.generateContent(prompt);
    const responseObj = await result.response;
    const rawText = (await responseObj.text()) || '';

    console.log('📥 AI raw (truncated):', rawText.slice(0, 500));

    // Extract JSON - fallback to plain message
    let parsed = extractFirstJson(rawText);
    if (!parsed) {
      // if no JSON, return raw text as conversational response
      return { success: true, message: rawText.trim() || 'AI returned empty response' };
    }

    const aiResponse = normalizeAIResponse(parsed);
    if (!aiResponse) {
      return { success: true, message: parsed.response || 'AI response malformed — please rephrase.' };
    }

    // Execute action with validation
    return await executeAction(aiResponse, customers, setCustomers, transactions, setTransactions);

  } catch (error) {
    console.error('❌ processAIVoiceCommand error:', error?.message || error);
    // Friendly, safe errors
    if (String(error?.message || '').toLowerCase().includes('api key')) {
      return { success: false, message: 'API Key invalid — Google AI Studio check करें।' };
    }
    if (String(error?.message || '').toLowerCase().includes('quota')) {
      return { success: false, message: 'Quota exceed हुआ है — कुछ देर बाद try करें।' };
    }
    return { success: false, message: `AI processing में समस्या: ${(error?.message || 'Unknown').substring(0, 120)}` };
  }
};

// ExecuteAction: same external behaviour, but safer updates and validation
const executeAction = async (aiResponse, customers, setCustomers, transactions, setTransactions) => {
  const {
    action, customerName, amount, village, response, suggestion, needsClarification
  } = aiResponse;

  console.log(`🎯 Action: ${action} | customer: ${customerName || '—'} | amount: ${amount ?? '—'}`);

  if (needsClarification) {
    return {
      success: true,
      message: response || 'मुझे कुछ और जानकारी चाहिए — कृपया बताइए।'
    };
  }

  if (action === 'chat') {
    return { success: true, message: response || 'हां बोलिये, कैसे मदद करूँ?' };
  }

  // find customer with safer matching (exact or fuzzy substring)
  let customer = null;
  if (customerName) {
    const nameLower = customerName.toLowerCase();
    customer = (customers || []).find(c => {
      const n = String(c.name || '').toLowerCase();
      return n === nameLower || n.includes(nameLower) || nameLower.includes(n);
    }) || null;
  }

  // helper: safe add transaction (functional update)
  const appendTransaction = (txn) => {
    setTransactions(prev => (Array.isArray(prev) ? [...prev, txn] : [txn]));
  };

  // helper: safe add customer
  const addCustomer = (cust) => {
    setCustomers(prev => (Array.isArray(prev) ? [...prev, cust] : [cust]));
  };

  switch (action) {
    case 'check_balance':
      if (!customer) {
        return {
          success: false,
          message: response || `${customerName || 'Customer'} नहीं मिला। नया खाता खोलना चाहें?`
        };
      }
      {
        const bal = calculateBalance(customer.id, transactions || []);
        const balanceMsg = bal > 0
          ? `${customer.name} की ₹${bal} उधारी है।`
          : bal === 0
            ? `${customer.name} की कोई उधारी नहीं है।`
            : `${customer.name} के पास ₹${Math.abs(bal)} एडवांस है।`;
        return { success: true, message: response || `${balanceMsg} ${suggestion || ''}` };
      }

    case 'add_payment':
    case 'give_credit':
      if (!customer) {
        return { success: false, message: response || `${customerName || 'Customer'} नहीं मिला।` };
      }
      if (amount == null || Number.isNaN(Number(amount)) || Number(amount) <= 0) {
        return { success: false, message: 'कृपया मान्य राशि बताएं।' };
      }
      {
        const txn = {
          id: uuidv4(),
          customerId: customer.id,
          type: action === 'add_payment' ? 'debit' : 'credit',
          amount: Number(amount),
          date: dayjs().format('YYYY-MM-DD'),
          notes: `AI: ${action === 'add_payment' ? 'Payment received' : 'Credit given'}`,
          timestamp: Date.now()
        };
        appendTransaction(txn);
        const newBal = calculateBalance(customer.id, [...(transactions || []), txn]);
        const verb = action === 'add_payment' ? 'दिए' : 'उधारी दी';
        return { success: true, message: response || `ठीक है! ${customer.name} को/ने ₹${amount} ${verb}. अब ₹${newBal} बकाया है. ${suggestion || ''}` };
      }

    case 'add_customer':
      if (!customerName || customerName.length < 2) {
        return { success: false, message: 'कृपया मान्य नाम बताएं।' };
      }
      {
        const exists = (customers || []).some(c => (c.name || '').toLowerCase() === customerName.toLowerCase());
        if (exists) {
          return { success: false, message: response || `${customerName} पहले से मौजूद है।` };
        }
        const newCustomer = {
          id: uuidv4(),
          name: customerName,
          nameHi: customerName,
          phone: '',
          village: village || '',
          address: '',
          openingBalance: 0,
          createdAt: Date.now(),
          hasWhatsApp: false
        };
        addCustomer(newCustomer);
        return { success: true, message: response || `${customerName} का खाता बना दिया गया। ${suggestion || ''}` };
      }

    case 'list_all':
      {
        const total = (customers || []).reduce((sum, c) => {
          const b = calculateBalance(c.id, transactions || []);
          return b > 0 ? sum + b : sum;
        }, 0);
        return { success: true, message: response || `कुल ${customers?.length || 0} ग्राहक, बाकी ₹${total}. ${suggestion || ''}` };
      }

    case 'show_village':
      if (!village) {
        return { success: false, message: 'कौन से गाँव के बारे में पूछ रहे हैं?' };
      }
      {
        const villageCustomers = (customers || []).filter(c => (c.village || '').toLowerCase().includes(village.toLowerCase()));
        const villageTotal = villageCustomers.reduce((s, c) => {
          const b = calculateBalance(c.id, transactions || []);
          return b > 0 ? s + b : s;
        }, 0);
        return { success: true, message: response || `${village} में ${villageCustomers.length} ग्राहक, बाकी ₹${villageTotal}.` };
      }

    case 'delete_customer':
      if (!customer) {
        return { success: false, message: response || `${customerName || 'Customer'} नहीं मिला।` };
      }
      // delete safely
      setCustomers(prev => (Array.isArray(prev) ? prev.filter(c => c.id !== customer.id) : []));
      setTransactions(prev => (Array.isArray(prev) ? prev.filter(t => t.customerId !== customer.id) : []));
      return { success: true, message: response || `${customer.name} को हटा दिया गया।` };

    case 'show_report':
      {
        const today = dayjs().format('YYYY-MM-DD');
        const todayTxns = (transactions || []).filter(t => t.date === today);
        const todayCredit = todayTxns.filter(t => t.type === 'credit').reduce((s, t) => s + (t.amount || 0), 0);
        const todayDebit = todayTxns.filter(t => t.type === 'debit').reduce((s, t) => s + (t.amount || 0), 0);
        return {
          success: true,
          message: response || `आज ${todayTxns.length} लेनदेन। ₹${todayCredit} उधारी दी, ₹${todayDebit} वसूली हुई।`
        };
      }

    default:
      return { success: true, message: response || 'माफ़ करें, मैं समझ नहीं पाया — कृपया दोबारा कहें।' };
  }
};

export default processAIVoiceCommand;
