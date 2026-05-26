import dayjs from 'dayjs';
import { calculateBalance } from './calculations';

// Helper: Find customer by name with fuzzy matching
const findCustomerByName = (name, customers) => {
  const cleanName = name.toLowerCase().trim();
  
  // Exact match first
  let customer = customers.find(c => 
    c.name.toLowerCase() === cleanName || 
    c.nameHi?.toLowerCase() === cleanName
  );
  
  // Partial/fuzzy match
  if (!customer) {
    customer = customers.find(c => 
      c.name.toLowerCase().includes(cleanName) || 
      cleanName.includes(c.name.toLowerCase()) ||
      c.nameHi?.toLowerCase().includes(cleanName) ||
      cleanName.includes(c.nameHi?.toLowerCase())
    );
  }
  
  return customer;
};

// Extract name from Hindi command using grammar patterns
const extractName = (command) => {
  // Patterns for Hindi grammar: "शिवम की", "अमित ने", "राज को"
  const patterns = [
    /([\\u0900-\\u097Fa-zA-Z]+)\\s*(की|ने|को|का|के|से|ki|ne|ko|ka|ke|se)/i,
    /([a-zA-Z\\u0900-\\u097F]+)(?=\\s+(उधारी|पैसे|रुपये|udhari|paise|rupay))/i,
    /(खाता|account|khata)\\s+([a-zA-Z\\u0900-\\u097F]+)/i
  ];
  
  for (let pattern of patterns) {
    const match = command.match(pattern);
    if (match) {
      const extracted = match[1] || match[2];
      if (extracted && extracted.length > 1 && 
          !['की', 'ने', 'को', 'का', 'के', 'से', 'खाता', 'account', 'khata'].includes(extracted.toLowerCase())) {
        return extracted.trim();
      }
    }
  }
  
  // Last resort: get last meaningful word
  const words = command.split(/\\s+/).filter(w => 
    w.length > 2 && 
    !['कितनी', 'कितना', 'उधारी', 'रुपये', 'दिए', 'दिया'].includes(w)
  );
  if (words.length > 0) {
    return words[words.length - 1];
  }
  
  return null;
};

// Extract amount from command
const extractAmount = (command) => {
  const patterns = [
    /(\\d+)\\s*(रुपये|रुपया|रूपये|rupay|rupee|rs)/i,
    /(\\d+)/
  ];
  
  for (let pattern of patterns) {
    const match = command.match(pattern);
    if (match) {
      const amount = parseInt(match[1]);
      if (!isNaN(amount) && amount > 0 && amount < 1000000) {
        return amount;
      }
    }
  }
  
  return null;
};

// MAIN VOICE COMMAND PROCESSOR
export const processVoiceCommand = (
  command, 
  customers, 
  setCustomers, 
  transactions, 
  setTransactions
) => {
  const lower = command.toLowerCase().trim();
  
  // ========== COMMAND 1: CHECK BALANCE ==========
  if (lower.includes('उधारी कितनी') || 
      lower.includes('उधार कितनी') ||
      lower.includes('बाकी कितनी') || 
      lower.includes('balance') ||
      lower.includes('kitni hai') ||
      lower.includes('kitna hai') ||
      lower.includes('बाकी है')) {
    
    const name = extractName(command);
    if (!name) {
      return { 
        success: false, 
        message: 'नाम समझ नहीं आया। कृपया फिर से बोलें।' 
      };
    }
    
    const customer = findCustomerByName(name, customers);
    if (!customer) {
      return { 
        success: false, 
        message: `${name} नाम का ग्राहक नहीं मिला। पहले खाता खोलें।` 
      };
    }
    
    const balance = calculateBalance(customer.id, transactions);
    if (balance > 0) {
      return { 
        success: true, 
        message: `${customer.name} की ${balance} रुपये उधारी है।`,
        data: { customer, balance }
      };
    } else if (balance === 0) {
      return { 
        success: true, 
        message: `${customer.name} की कोई उधारी नहीं है।`,
        data: { customer, balance: 0 }
      };
    } else {
      return { 
        success: true, 
        message: `${customer.name} के ${Math.abs(balance)} रुपये एडवांस हैं।`,
        data: { customer, balance }
      };
    }
  }
  
  // ========== COMMAND 2: PAYMENT RECEIVED ==========
  if (lower.includes('दिए') || 
      lower.includes('दिया') || 
      lower.includes('paid') ||
      lower.includes('जमा') ||
      lower.includes('diye') ||
      lower.includes('jama') ||
      lower.includes('payment')) {
    
    const name = extractName(command);
    const amount = extractAmount(command);
    
    if (!name) {
      return { 
        success: false, 
        message: 'नाम समझ नहीं आया। कृपया साफ बोलें।' 
      };
    }
    if (!amount) {
      return { 
        success: false, 
        message: 'रकम समझ नहीं आई। कृपया संख्या बोलें।' 
      };
    }
    
    const customer = findCustomerByName(name, customers);
    if (!customer) {
      return { 
        success: false, 
        message: `${name} का खाता नहीं मिला। पहले खाता खोलें।` 
      };
    }
    
    // Add payment transaction
    const newTxn = {
      id: Date.now().toString(),
      customerId: customer.id,
      type: 'debit',
      amount: amount,
      date: dayjs().format('YYYY-MM-DD'),
      notes: 'Voice: Payment received',
      timestamp: Date.now()
    };
    
    const updatedTxns = [...transactions, newTxn];
    setTransactions(updatedTxns);
    
    const newBalance = calculateBalance(customer.id, updatedTxns);
    return { 
      success: true, 
      message: `${amount} रुपये जमा हो गए। अब ${newBalance} रुपये बाकी हैं।`,
      data: { customer, amount, newBalance }
    };
  }
  
  // ========== COMMAND 3: CREDIT GIVEN ==========
  if (lower.includes('उधारी दो') || 
      lower.includes('उधार दो') || 
      lower.includes('credit') ||
      lower.includes('दे दो') ||
      lower.includes('udhari do') ||
      lower.includes('de do') ||
      lower.includes('दें')) {
    
    const name = extractName(command);
    const amount = extractAmount(command);
    
    if (!name) {
      return { 
        success: false, 
        message: 'नाम समझ नहीं आया।' 
      };
    }
    if (!amount) {
      return { 
        success: false, 
        message: 'रकम समझ नहीं आई। कृपया संख्या बोलें।' 
      };
    }
    
    const customer = findCustomerByName(name, customers);
    if (!customer) {
      return { 
        success: false, 
        message: `${name} का खाता नहीं मिला। पहले खाता खोलें।` 
      };
    }
    
    // Add credit transaction
    const newTxn = {
      id: Date.now().toString(),
      customerId: customer.id,
      type: 'credit',
      amount: amount,
      date: dayjs().format('YYYY-MM-DD'),
      notes: 'Voice: Credit given',
      timestamp: Date.now()
    };
    
    const updatedTxns = [...transactions, newTxn];
    setTransactions(updatedTxns);
    
    const newBalance = calculateBalance(customer.id, updatedTxns);
    return { 
      success: true, 
      message: `${amount} रुपये उधारी दी। कुल ${newBalance} रुपये हो गए।`,
      data: { customer, amount, newBalance }
    };
  }
  
  // ========== COMMAND 4: ADD NEW CUSTOMER ==========
  if (lower.includes('नया खाता') || 
      lower.includes('खाता खोलो') || 
      lower.includes('new account') ||
      lower.includes('add customer') ||
      lower.includes('naya khata') ||
      lower.includes('khata kholo')) {
    
    const name = extractName(command);
    
    if (!name || name.length < 2) {
      return { 
        success: false, 
        message: 'नाम साफ़ नहीं सुनाई दिया। कृपया दोबारा बोलें।' 
      };
    }
    
    // Check if exists
    const existing = findCustomerByName(name, customers);
    if (existing) {
      return { 
        success: false, 
        message: `${name} का खाता पहले से मौजूद है।` 
      };
    }
    
    // Create new customer
    const newCustomer = {
      id: Date.now().toString(),
      name: name,
      nameHi: name,
      phone: '',
      village: '',
      address: '',
      openingBalance: 0,
      createdAt: Date.now(),
      hasWhatsApp: false,
      photoUrl: '',
      billPhotos: []
    };
    
    setCustomers([...customers, newCustomer]);
    
    return { 
      success: true, 
      message: `${name} का नया खाता खुल गया।`,
      data: { customer: newCustomer }
    };
  }
  
  // ========== COMMAND 5: LIST CUSTOMERS ==========
  if (lower.includes('सभी ग्राहक') || 
      lower.includes('all customer') ||
      lower.includes('sabhi grahak') ||
      lower.includes('customer list') ||
      lower.includes('कितने ग्राहक')) {
    
    const count = customers.length;
    let totalOutstanding = 0;
    customers.forEach(c => {
      const bal = calculateBalance(c.id, transactions);
      if (bal > 0) totalOutstanding += bal;
    });
    
    return { 
      success: true, 
      message: `कुल ${count} ग्राहक हैं। ${totalOutstanding} रुपये बाकी है।`,
      data: { count, totalOutstanding }
    };
  }
  
  // ========== UNKNOWN COMMAND ==========
  return { 
    success: false, 
    message: 'समझ नहीं आया। कृपया फिर से कोशिश करें।' 
  };
};

export default processVoiceCommand;
