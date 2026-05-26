import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Card, Button, Typography, Space, List, message, Tag, Alert, Tooltip } from 'antd';
import { AudioOutlined, AudioMutedOutlined, SoundOutlined, RobotOutlined } from '@ant-design/icons';

const { Title, Text } = Typography;

// --- NATURAL LANGUAGE GENERATOR (NLG) ---
const NLG = {
  greetings: [
    "नमस्ते! मैं आपका खाता दोस्त हूँ। बताइये क्या सेवा करूँ?",
    "जी कहिये, आज किसका हिसाब देखना है?",
    "हैलो! मैं तैयार हूँ, बोलिए।"
  ],
  success_transaction: (name, amount, type) => {
    const opts = type === 'credit' ? [
      `जी, ${name} के ${amount} रुपये जमा कर लिए।`,
      `हो गया! ${name} ने ${amount} रुपये दिए, नोट कर लिया।`,
      `ठीक है, ${name} के खाते में ${amount} जमा हो गए।`
    ] : [
      `जी, ${name} को ${amount} की उधारी दे दी।`,
      `नोट कर लिया, ${name} ने ${amount} का सामान लिया।`,
      `${name} के नाम पर ${amount} रुपये लिख दिए हैं।`
    ];
    return opts[Math.floor(Math.random() * opts.length)];
  },
  balance_check: (name, amount) => {
    if (amount > 0) {
      const opts = [
        `अभी ${name} के कुल ${amount} रुपये बाकी हैं।`,
        `${name} का हिसाब देखें तो ${amount} रुपये लेना बनता है।`,
        `सिर्फ ${amount} रुपये पेंडिंग हैं ${name} के।`
      ];
      return opts[Math.floor(Math.random() * opts.length)];
    } else {
      return `जी, ${name} का कोई हिसाब बाकी नहीं है। सब बराबर है।`;
    }
  },
  unknown_entity: (name) => [
    `माफ़ कीजिये, ${name} नाम का कोई ग्राहक नहीं मिला।`,
    `${name} कौन? ये लिस्ट में नहीं हैं।`,
    `मुझे ${name} का खाता नहीं मिल रहा। क्या नया जोड़ूँ?`
  ][Math.floor(Math.random() * 3)],
  clarification: [
    "माफ़ कीजिये, मैं समझा नहीं।",
    "ज़रा फिर से बोलियेगा?",
    "आवाज़ साफ़ नहीं आयी, दोबारा कहिये।"
  ][Math.floor(Math.random() * 3)]
};

/**
 * Advanced Context-Aware Voice Assistant
 */
const AIVoiceAssistant = ({ customers = [], setCustomers, transactions = [], setTransactions, language = 'hi' }) => {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [response, setResponse] = useState(NLG.greetings[0]);
  const [status, setStatus] = useState('ready'); // ready | listening | processing | error
  const [recentCommands, setRecentCommands] = useState([]);

  // --- CONTEXT MEMORY ---
  const [context, setContext] = useState({
    lastSubject: null, // customer object
    lastAction: null,  // 'credit' | 'debit' | 'view'
    timestamp: null
  });

  // Refs for stable access in callbacks
  const customersRef = useRef(customers);
  const transactionsRef = useRef(transactions);
  useEffect(() => { customersRef.current = customers; }, [customers]);
  useEffect(() => { transactionsRef.current = transactions; }, [transactions]);

  const recognitionRef = useRef(null);
  const synthRef = useRef(typeof window !== 'undefined' ? window.speechSynthesis : null);

  // Initialize Speech Recognition
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) return;

    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.lang = 'hi-IN'; // Force Hindi for this "Hindi Assistant"
    recognition.interimResults = false;

    recognition.onresult = (event) => {
      const text = event?.results?.[0]?.[0]?.transcript ?? '';
      if (!text) return;
      setTranscript(text);
      handleVoiceCommand(text);
    };

    recognition.onerror = () => {
      setStatus('error');
      setIsListening(false);
      speak("माफ़ कीजिये, फिर से कोशिश करें।");
    };

    recognition.onend = () => {
      setIsListening(false);
      if (status !== 'processing') setStatus('ready');
    };

    recognitionRef.current = recognition;
  }, []); // Init once

  const startListening = () => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.start();
        setIsListening(true);
        setStatus('listening');
        setTranscript('');
      } catch (e) { console.error(e); }
    } else {
      message.error("Speech API not supported");
    }
  };

  const stopListening = () => {
    if (recognitionRef.current) recognitionRef.current.stop();
    setIsListening(false);
    setStatus('ready');
  };

  const speak = (text) => {
    if (!synthRef.current) return;
    setResponse(text);
    synthRef.current.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'hi-IN';
    utterance.rate = 1.0;
    synthRef.current.speak(utterance);
  };

  // --- BRAIN: PARSING LOGIC ---
  const findCustomer = (name) => {
    if (!name) return null;
    const clean = name.trim().toLowerCase();
    const list = customersRef.current || [];
    return list.find(c => c.name.toLowerCase().includes(clean)) || null;
  };

  const parseOrResolveSubject = (text) => {
    // 1. Explicit name check
    // broad match for Hindi names in text
    // "Amit ka", "Amit ne", "Amit ko"
    const words = text.split(" ");
    for (let w of words) {
      // simple heuristic: if word matches a customer name
      const found = findCustomer(w);
      if (found) return found;
    }

    // 2. Context resolution ("Uska", "Usne", "Iska", "Wahi")
    const pronouns = ['उसका', 'उसने', 'उसको', 'इसक', 'वही', 'uska', 'usne', 'usko'];
    if (pronouns.some(p => text.toLowerCase().includes(p))) {
      if (context.lastSubject) {
        // Check expiry (e.g. context consistent for 2 mins)
        if (Date.now() - context.timestamp < 120000) {
          return context.lastSubject;
        }
      }
    }
    return null;
  };

  const parseAmount = (text) => {
    const match = text.match(/\d+(\.\d+)?/);
    return match ? parseFloat(match[0]) : null;
  };

  const handleVoiceCommand = async (rawParams) => {
    setStatus('processing');
    const text = rawParams.toLowerCase();

    // Update history
    setRecentCommands(prev => [{ text: rawParams, time: new Date().toLocaleTimeString() }, ...prev].slice(0, 5));

    // INTENT RECOGNITION

    // 1. PAYMENT RECEIVED (Jama, Diye, Aaye)
    if (text.includes('जमा') || text.includes('दिए') || text.includes('आए') || text.includes('received')) {
      const subject = parseOrResolveSubject(text);
      const amount = parseAmount(text);

      if (subject && amount) {
        // Execute Transaction
        const txn = {
          id: Date.now().toString(),
          customerId: subject.id,
          type: 'credit',
          amount,
          description: 'Voice Entry',
          date: new Date().toISOString()
        };

        setTransactions(prev => [txn, ...prev]);
        setCustomers(prev => prev.map(c => c.id === subject.id ? { ...c, balance: (c.balance || 0) - amount } : c));

        // Update Context
        setContext({ lastSubject: subject, lastAction: 'credit', timestamp: Date.now() });

        const reply = NLG.success_transaction(subject.name, amount, 'credit');
        speak(reply);
        setStatus('ready');
        return;
      }
    }

    // 2. GIVE CREDIT (Udhaar, Diya, Saman, Likh Do)
    if (text.includes('उधारी') || text.includes('दिया') || text.includes('समान') || text.includes('दे दो') || text.includes('likh')) {
      const subject = parseOrResolveSubject(text);
      const amount = parseAmount(text);

      if (subject && amount) {
        // Execute Transaction
        const txn = {
          id: Date.now().toString(),
          customerId: subject.id,
          type: 'debit',
          amount,
          description: 'Voice Entry',
          date: new Date().toISOString()
        };

        setTransactions(prev => [txn, ...prev]);
        setCustomers(prev => prev.map(c => c.id === subject.id ? { ...c, balance: (c.balance || 0) + amount } : c));

        setContext({ lastSubject: subject, lastAction: 'debit', timestamp: Date.now() });

        const reply = NLG.success_transaction(subject.name, amount, 'debit');
        speak(reply);
        setStatus('ready');
        return;
      }
    }

    // 3. CHECK BALANCE (Kitna, Hisab, Baki, Balance)
    if (text.includes('कितना') || text.includes('हिसाब') || text.includes('बाकी') || text.includes('बैलेंस') || text.includes('balance')) {
      const subject = parseOrResolveSubject(text);

      if (subject) {
        // We need accurate real-time balance. The 'subject' object might be stale if we just modified it.
        // So we find it fresh from ref
        const freshSubject = customersRef.current.find(c => c.id === subject.id) || subject;
        const bal = freshSubject.balance || 0;

        setContext({ lastSubject: freshSubject, lastAction: 'view', timestamp: Date.now() });
        const reply = NLG.balance_check(freshSubject.name, bal);
        speak(reply);
        setStatus('ready');
        return;
      }

      // Maybe total balance check?
      if (text.includes('कुल') || text.includes('total') || text.includes('sabka')) {
        const total = customersRef.current.reduce((acc, c) => acc + (c.balance || 0), 0);
        speak(`दुकान की कुल मार्केट उधारी ${total} रुपये है।`);
        setStatus('ready');
        return;
      }
    }

    // 4. ADD NEW CUSTOMER
    if (text.includes('नया') || text.includes('जोड़ो') || text.includes('add')) {
      // "Naya customer Amit"
      const words = text.split(" ");
      // simple logic: take the last word as name if unknown
      const nameCandidate = words[words.length - 1];
      if (nameCandidate && nameCandidate.length > 2) {
        const exists = findCustomer(nameCandidate);
        if (exists) {
          speak(`${exists.name} तो पहले से ही लिस्ट में हैं।`);
        } else {
          const newC = { id: Date.now().toString(), name: nameCandidate, balance: 0, phone: '' };
          setCustomers(prev => [newC, ...prev]);
          setContext({ lastSubject: newC, lastAction: 'create', timestamp: Date.now() });
          speak(`जी, नया ग्राहक ${nameCandidate} जोड़ दिया है।`);
        }
        setStatus('ready');
        return;
      }
    }

    // Fallback
    speak(NLG.clarification);
    setStatus('ready');
  };


  return (
    <Card
      className="glass-card"
      style={{
        background: 'linear-gradient(135deg, #FFF6B7 0%, #F6416C 100%)',
        border: 'none',
        borderRadius: 20
      }}
    >
      <div style={{ textAlign: 'center', color: 'white' }}>
        <Space align="center" style={{ marginBottom: 20 }}>
          <RobotOutlined style={{ fontSize: 32, color: 'white' }} />
          <Title level={3} style={{ color: 'white', margin: 0 }}>खाता दोस्त</Title>
        </Space>

        <div style={{ margin: '30px 0' }}>
          <Tooltip title={isListening ? "Listening..." : "Tap to Speak"}>
            <Button
              type="primary"
              shape="circle"
              icon={isListening ? <AudioMutedOutlined /> : <AudioOutlined />}
              onClick={isListening ? stopListening : startListening}
              style={{
                width: 120,
                height: 120,
                fontSize: 48,
                background: isListening ? '#ff4d4f' : 'rgba(255,255,255,0.2)',
                border: '4px solid white',
                boxShadow: isListening ? '0 0 30px rgba(255,0,0,0.6)' : '0 4px 15px rgba(0,0,0,0.2)',
                backdropFilter: 'blur(10px)'
              }}
            />
          </Tooltip>
        </div>

        <div style={{
          background: 'rgba(0,0,0,0.3)',
          padding: '15px',
          borderRadius: 12,
          minHeight: 80
        }}>
          {transcript ? (
            <Text style={{ color: '#fff', fontSize: 18 }}>" {transcript} "</Text>
          ) : (
            <Text style={{ color: 'rgba(255,255,255,0.7)' }}>माइक दबाएं और बोलें...</Text>
          )}
        </div>

        <div style={{ marginTop: 20 }}>
          <div style={{
            background: 'white',
            borderRadius: '12px 12px 0 12px',
            padding: 15,
            display: 'inline-block',
            maxWidth: '90%',
            boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
          }}>
            <Text style={{ fontSize: 18, color: '#333' }}>🗣️ {response}</Text>
          </div>
        </div>

        {context.lastSubject && (
          <div style={{ marginTop: 10 }}>
            <Tag color="blue">Recent Context: {context.lastSubject.name}</Tag>
          </div>
        )}

      </div>
    </Card>
  );
};

export default AIVoiceAssistant;
