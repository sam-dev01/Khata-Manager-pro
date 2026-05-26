// src/components/WhatsAppManager.jsx (Smart Dashboard Campaign Edition)
import React, { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import {
  Card, Typography, Space, Select, Button, Input, List, Tag, message, Empty,
  Checkbox, Modal, Alert, Tooltip, Row, Col, Slider, Progress, Divider, Avatar, Segmented
} from 'antd';
import {
  WhatsAppOutlined, SendOutlined, FilterOutlined, MessageOutlined, FileTextOutlined,
  CopyOutlined, ShareAltOutlined, SaveOutlined, DeleteOutlined, PlusOutlined,
  UserOutlined, ReloadOutlined, CalendarOutlined, ClockCircleOutlined, CheckSquareOutlined,
  CloseSquareOutlined, CheckCircleOutlined, ExclamationCircleOutlined, InfoCircleOutlined,
  EnvironmentOutlined, MobileOutlined, RightOutlined
} from '@ant-design/icons';
import { calculateBalance } from '../utils/calculations';

const { Title, Text, Paragraph } = Typography;
const { TextArea } = Input;
const { Option } = Select;

// --- CONFIG ---
const SEND_BATCH_SIZE = 5;
const SEND_BATCH_DELAY = 2000; // 2s delay between batches for browser stability

// Helper: Normalize Phone to 10 digits
const normalizePhone = (raw = '') => {
  if (!raw) return null;
  const digits = String(raw).replace(/\D/g, '');
  if (digits.length === 10) return digits;
  if (digits.length === 11 && digits.startsWith('0')) return digits.slice(1);
  if (digits.length === 12 && digits.startsWith('91')) return digits.slice(2);
  if (digits.length === 13 && digits.startsWith('+91')) return digits.slice(3);
  return null;
};

// Helper: Template Render supporting advanced variables
const renderTemplate = (template, vars = {}) => {
  if (!template) return '';
  return template.replace(/\{(\w+)\}/g, (_, key) => {
    const val = vars[key];
    return (val === null || typeof val === 'undefined') ? '' : String(val);
  });
};

const WhatsAppManager = ({ customers = [], transactions = [], setCustomers, language = 'en' }) => {
  // --- STATE: Filters & Segmentations ---
  const [filterVillage, setFilterVillage] = useState('all');
  const [minBalance, setMinBalance] = useState(0);
  const [agingFilter, setAgingFilter] = useState('all'); // 'all' | '15' | '30' | '60'
  const [sortBy, setSortBy] = useState('balance_desc');
  const [searchText, setSearchText] = useState('');

  // --- STATE: Selection ---
  const [selectedCustomers, setSelectedCustomers] = useState([]);

  // --- STATE: Templates ---
  const [templates, setTemplates] = useState([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState('reminder');
  const [customMessage, setCustomMessage] = useState('');

  // --- STATE: Sending Engine ---
  const [isSending, setIsSending] = useState(false);
  const [sendProgress, setSendProgress] = useState(0);
  const [showSendModal, setShowSendModal] = useState(false);
  const [currentSendingName, setCurrentSendingName] = useState('');
  const sendingRef = useRef(false); // Ref to safely cancel sending thread
  const textareaRef = useRef(null);

  // --- INIT TEMPLATES ---
  useEffect(() => {
    const saved = localStorage.getItem('whatsapp_templates');
    const defaults = [
      {
        id: 'reminder',
        name: language === 'hi' ? 'सामान्य बकाया संदेश (Standard)' : 'Standard Due Reminder',
        text: language === 'hi'
          ? 'नमस्ते {name}! {shop_name} से आपका कुल बकाया हिसाब ₹{balance} है। कृपया जल्द ही भुगतान करें। धन्यवाद!'
          : 'Dear {name}! Your total pending balance at {shop_name} is ₹{balance}. Please clear it at your earliest convenience. Thank you!'
      },
      {
        id: 'strict',
        name: language === 'hi' ? 'सख्त भुगतान नोटिस (Strict)' : 'Strict Overdue Alert',
        text: language === 'hi'
          ? 'चेतावनी: {name}, आपका ₹{balance} का बकाया {last_payment_date} से लंबित है। कृपया आज ही भुगतान करें ताकि लेनदेन में बाधा न हो।'
          : 'Urgent Alert: {name}, your balance of ₹{balance} is overdue since {last_payment_date}. Please clear it today to avoid transaction suspension.'
      },
      {
        id: 'promo',
        name: language === 'hi' ? 'प्रचार एवं ऑफर (Promotion)' : 'Promo & Statement Update',
        text: language === 'hi'
          ? 'नमस्ते {name}, आपके लिए {shop_name} पर विशेष अपडेट! अपने बकाया ₹{balance} का भुगतान करें और खाता विवरण देखें: {payment_link}'
          : 'Hello {name}, clear your pending due of ₹{balance} at {shop_name} today and check your complete public ledger statement here: {payment_link}'
      }
    ];

    if (saved) {
      try {
        setTemplates(JSON.parse(saved));
      } catch (e) {
        setTemplates(defaults);
      }
    } else {
      setTemplates(defaults);
    }

    // Set initial message
    setCustomMessage(defaults[0].text);
  }, [language]);

  // Save Templates Persistence
  useEffect(() => {
    if (templates.length > 0) {
      localStorage.setItem('whatsapp_templates', JSON.stringify(templates));
    }
  }, [templates]);


  // --- PROCESSING AUDIENCE DATA & ACCOUNT RECEIVABLE AGING ---
  const processedCustomers = useMemo(() => {
    const now = Date.now();
    return customers.map(c => {
      const balance = calculateBalance(c.id, transactions);

      // Find all transactions for this customer to evaluate aging
      const custTxns = transactions.filter(t => t.customerId === c.id);
      const latestTxn = custTxns.length > 0
        ? custTxns.reduce((latest, current) => new Date(current.date) > new Date(latest.date) ? current : latest)
        : null;

      const lastTxnDate = latestTxn ? new Date(latestTxn.date) : null;
      const lastTxnDateStr = lastTxnDate
        ? lastTxnDate.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
        : '—';

      // Aging Days: Days elapsed since their last transaction activity
      const agingDays = lastTxnDate ? Math.floor((now - lastTxnDate.getTime()) / (1000 * 60 * 60 * 24)) : 0;

      return {
        ...c,
        normalizedPhone: normalizePhone(c.phone),
        balance,
        lastTxnDateStr,
        agingDays
      };
    }).filter(c => !!c.normalizedPhone); // Filter out empty or un-normalizable phones
  }, [customers, transactions]);

  // Apply filters
  const filteredCustomers = useMemo(() => {
    let list = processedCustomers;

    // Filter: Search Name or Phone
    if (searchText) {
      const q = searchText.toLowerCase();
      list = list.filter(c =>
        c.name.toLowerCase().includes(q) ||
        (c.phone && c.phone.includes(q))
      );
    }

    // Filter: Village
    if (filterVillage !== 'all') {
      list = list.filter(c => c.village === filterVillage);
    }

    // Filter: Min Balance
    if (minBalance > 0) {
      list = list.filter(c => c.balance >= minBalance);
    }

    // Filter: Accounts Receivable Aging Segmentations
    if (agingFilter === '15') {
      list = list.filter(c => c.agingDays >= 15 && c.balance > 0);
    } else if (agingFilter === '30') {
      list = list.filter(c => c.agingDays >= 30 && c.balance > 0);
    } else if (agingFilter === '60') {
      list = list.filter(c => c.agingDays >= 60 && c.balance > 0);
    }

    // Sorting Logic
    return list.sort((a, b) => {
      switch (sortBy) {
        case 'balance_desc': return b.balance - a.balance;
        case 'balance_asc': return a.balance - b.balance;
        case 'name': return a.name.localeCompare(b.name);
        case 'last_sent': return (a.lastWhatsappSent || 0) - (b.lastWhatsappSent || 0);
        case 'aging_desc': return b.agingDays - a.agingDays;
        default: return 0;
      }
    });
  }, [processedCustomers, searchText, filterVillage, minBalance, agingFilter, sortBy]);

  const villages = useMemo(() => ['all', ...new Set(processedCustomers.map(c => c.village).filter(Boolean))], [processedCustomers]);

  // Campaign summary totals
  const selectedStats = useMemo(() => {
    const selectedList = processedCustomers.filter(c => selectedCustomers.includes(c.id));
    const totalDue = selectedList.reduce((sum, c) => sum + (c.balance > 0 ? c.balance : 0), 0);
    return { count: selectedList.length, totalDue };
  }, [selectedCustomers, processedCustomers]);


  // --- BATCH SELECTION HELPERS ---
  const handleSelectAll = (e) => {
    if (e.target.checked) {
      setSelectedCustomers(filteredCustomers.map(c => c.id));
    } else {
      setSelectedCustomers([]);
    }
  };

  const toggleSelect = (id) => {
    setSelectedCustomers(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const selectOverdueDues = (days) => {
    const targets = filteredCustomers.filter(c => c.balance > 0 && c.agingDays >= days).map(c => c.id);
    setSelectedCustomers(targets);
    message.success(`Selected ${targets.length} customers overdue by ${days}+ Days`);
  };

  const selectAllWithBalance = () => {
    const targets = filteredCustomers.filter(c => c.balance > 0).map(c => c.id);
    setSelectedCustomers(targets);
    message.success(`Selected all ${targets.length} customers with outstanding dues`);
  };


  // --- TEMPLATE EDIT & INSERTION LOGIC ---
  const handleTemplateSelect = (id) => {
    setSelectedTemplateId(id);
    const tmpl = templates.find(t => t.id === id);
    if (tmpl) setCustomMessage(tmpl.text);
  };

  const handleSaveTemplate = () => {
    const name = prompt(language === 'hi' ? "टैम्पलेट का नाम दर्ज करें:" : "Enter Template Name:", "My Custom Preset");
    if (!name) return;
    const newTmpl = { id: Date.now().toString(), name, text: customMessage };
    setTemplates([...templates, newTmpl]);
    setSelectedTemplateId(newTmpl.id);
    message.success(language === 'hi' ? "टैम्पलेट सहेज लिया गया!" : "Template Saved successfully!");
  };

  const handleDeleteTemplate = () => {
    if (templates.length <= 1) return message.warning("Cannot delete last template");
    if (window.confirm(language === 'hi' ? "क्या आप इस टैम्पलेट को हटाना चाहते हैं?" : "Delete this template?")) {
      const newTemplates = templates.filter(t => t.id !== selectedTemplateId);
      setTemplates(newTemplates);
      setSelectedTemplateId(newTemplates[0].id);
      setCustomMessage(newTemplates[0].text);
    }
  };

  // Cursor-aware insertion of variables into TextArea
  const insertVariable = (varName) => {
    const textarea = textareaRef.current?.resizableTextArea?.textArea;
    if (!textarea) {
      setCustomMessage(prev => prev + ` {${varName}} `);
      return;
    }

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const text = textarea.value;
    const before = text.substring(0, start);
    const after = text.substring(end, text.length);
    const insertion = `{${varName}}`;

    const newVal = before + insertion + after;
    setCustomMessage(newVal);

    // Maintain focus and place cursor right after variables tag
    setTimeout(() => {
      textarea.focus();
      textarea.selectionStart = textarea.selectionEnd = start + insertion.length;
    }, 50);
  };


  // --- CAMPAIGN SENDING ENGINE ---
  const renderMessageForCustomer = useCallback((customer) => {
    return renderTemplate(customMessage, {
      name: customer.name,
      balance: customer.balance,
      last_payment_date: customer.lastTxnDateStr,
      shop_name: localStorage.getItem('current_shop_name') || 'My Shop',
      payment_link: `https://shopapp.studydost.in/invoice/view/${customer.id}`
    });
  }, [customMessage]);

  const startSending = async () => {
    if (selectedCustomers.length === 0) return message.error("No customers selected");

    setIsSending(true);
    setSendProgress(0);
    setShowSendModal(true);
    sendingRef.current = true;

    const queue = processedCustomers.filter(c => selectedCustomers.includes(c.id));
    const total = queue.length;
    let sentCount = 0;

    for (let i = 0; i < total; i += SEND_BATCH_SIZE) {
      if (!sendingRef.current) break; // Terminate if user cancels campaign

      const batch = queue.slice(i, i + SEND_BATCH_SIZE);

      // Trigger Batch Messages
      for (const c of batch) {
        setCurrentSendingName(c.name);
        const msg = renderMessageForCustomer(c);
        const url = `https://wa.me/91${c.normalizedPhone}?text=${encodeURIComponent(msg)}`;
        window.open(url, '_blank', 'noopener,noreferrer');
      }

      sentCount += batch.length;
      setSendProgress(Math.floor((sentCount / total) * 100));

      // Delay to avoid browser pop-up blocking issues
      if (i + SEND_BATCH_SIZE < total) {
        await new Promise(r => setTimeout(r, SEND_BATCH_DELAY));
      }
    }

    // Save Campaign Timestamp to local state
    if (setCustomers && sendingRef.current) {
      const now = Date.now();
      const updated = customers.map(c => selectedCustomers.includes(c.id) ? { ...c, lastWhatsappSent: now } : c);
      setCustomers(updated);
      message.success(language === 'hi' ? "व्हाट्सएप कैम्पेन पूरा हुआ!" : "WhatsApp Campaign batch triggered successfully!");
    }

    setIsSending(false);
    sendingRef.current = false;
  };

  const cancelSending = () => {
    sendingRef.current = false;
    setIsSending(false);
    setShowSendModal(false);
    message.info("Campaign Sending Aborted");
  };

  const triggerSingleSend = (e, customer) => {
    e.stopPropagation(); // Avoid selecting card
    const msg = renderMessageForCustomer(customer);
    const url = `https://wa.me/91${customer.normalizedPhone}?text=${encodeURIComponent(msg)}`;
    window.open(url, '_blank', 'noopener,noreferrer');

    // Update single timestamp
    if (setCustomers) {
      const now = Date.now();
      const updated = customers.map(c => c.id === customer.id ? { ...c, lastWhatsappSent: now } : c);
      setCustomers(updated);
    }
    message.success(`Message sent to ${customer.name}`);
  };

  const triggerSingleCopy = (e, customer) => {
    e.stopPropagation();
    const msg = renderMessageForCustomer(customer);
    navigator.clipboard.writeText(msg);
    message.success(`Copied statement template for ${customer.name}`);
  };


  return (
    <div style={{ padding: '0 4px' }} className="fade-in">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div>
          <Title level={2} style={{ margin: 0, fontWeight: 800, letterSpacing: '-0.5px' }}>
            <WhatsAppOutlined style={{ color: '#25D366', marginRight: 10 }} />
            {language === 'hi' ? 'स्मार्ट व्हाट्सएप मैनेजर' : 'Smart WhatsApp Manager'}
          </Title>
          <Text type="secondary">Manage dynamic campaigns, smart templates, and outstanding collections</Text>
        </div>
        <Tag color="green" style={{ fontSize: 13, padding: '5px 12px', borderRadius: 6, display: 'flex', alignItems: 'center', gap: 6 }}>
          <WhatsAppOutlined /> POS Marketing Suite
        </Tag>
      </div>

      <Row gutter={[16, 16]}>
        {/* --- LEFT PANEL: DYNAMIC CONFIGURATION --- */}
        <Col xs={24} xl={10}>
          <Card
            title={<span style={{ fontWeight: 700 }}><MessageOutlined style={{ color: '#25D366' }} /> Campaign Composer</span>}
            className="premium-card"
            style={{ borderTop: '4px solid #25D366' }}
          >
            <Space direction="vertical" style={{ width: '100%' }} size="middle">

              {/* Selected stats dashboard widget */}
              <div style={{
                background: 'linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%)',
                border: '1px solid #b7eb8f',
                padding: '16px 20px',
                borderRadius: 12,
                boxShadow: '0 2px 8px rgba(0,0,0,0.02)'
              }}>
                <Row align="middle" gutter={8}>
                  <Col span={12}>
                    <Text type="secondary" style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', color: '#166534' }}>Selected Aud.</Text>
                    <div style={{ fontSize: 26, fontWeight: '800', color: '#15803d', letterSpacing: '-1px' }}>
                      {selectedStats.count} <span style={{ fontSize: 13, fontWeight: 500, color: '#166534' }}>people</span>
                    </div>
                  </Col>
                  <Col span={12} style={{ borderLeft: '1px solid rgba(37, 211, 102, 0.15)', paddingLeft: 16 }}>
                    <Text type="secondary" style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', color: '#166534' }}>Receivables Value</Text>
                    <div style={{ fontSize: 26, fontWeight: '800', color: '#15803d', letterSpacing: '-1px' }}>
                      ₹{selectedStats.totalDue.toLocaleString('en-IN')}
                    </div>
                  </Col>
                </Row>
              </div>

              {/* Dynamic Preset select & custom actions */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, alignItems: 'center' }}>
                  <Text strong style={{ color: '#374151' }}>Template Preset</Text>
                  <Space>
                    <Tooltip title="Save as New Preset">
                      <Button size="small" icon={<SaveOutlined />} onClick={handleSaveTemplate} style={{ borderRadius: 6 }} />
                    </Tooltip>
                    <Tooltip title="Delete Selected Preset">
                      <Button size="small" danger icon={<DeleteOutlined />} onClick={handleDeleteTemplate} style={{ borderRadius: 6 }} />
                    </Tooltip>
                  </Space>
                </div>
                <Select
                  value={selectedTemplateId}
                  onChange={handleTemplateSelect}
                  style={{ width: '100%' }}
                  size="large"
                  dropdownStyle={{ borderRadius: 8 }}
                >
                  {templates.map(t => <Option key={t.id} value={t.id}>{t.name}</Option>)}
                </Select>
              </div>

              {/* Clickable Helper Placeholder Tags */}
              <div>
                <div style={{ marginBottom: 6 }}><Text type="secondary" style={{ fontSize: 12 }}>Click to insert dynamic placeholder:</Text></div>
                <Space wrap size={6}>
                  <Tag color="blue" style={{ cursor: 'pointer', padding: '4px 8px', borderRadius: 4, fontWeight: 500 }} onClick={() => insertVariable('name')}>
                    👤 Customer Name
                  </Tag>
                  <Tag color="red" style={{ cursor: 'pointer', padding: '4px 8px', borderRadius: 4, fontWeight: 500 }} onClick={() => insertVariable('balance')}>
                    ₹ Balance
                  </Tag>
                  <Tag color="orange" style={{ cursor: 'pointer', padding: '4px 8px', borderRadius: 4, fontWeight: 500 }} onClick={() => insertVariable('last_payment_date')}>
                    📅 Last Payment Date
                  </Tag>
                  <Tag color="purple" style={{ cursor: 'pointer', padding: '4px 8px', borderRadius: 4, fontWeight: 500 }} onClick={() => insertVariable('shop_name')}>
                    🏪 Shop Name
                  </Tag>
                  <Tag color="green" style={{ cursor: 'pointer', padding: '4px 8px', borderRadius: 4, fontWeight: 500 }} onClick={() => insertVariable('payment_link')}>
                    🔗 Public Statement
                  </Tag>
                </Space>
              </div>

              {/* Message Input Editor */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                  <Text strong style={{ color: '#374151' }}>Message Body</Text>
                  <Text type="secondary" style={{ fontSize: 11 }}>Supports Unicode / WhatsApp formats (*bold*, _italic_)</Text>
                </div>
                <TextArea
                  ref={textareaRef}
                  rows={7}
                  value={customMessage}
                  onChange={e => setCustomMessage(e.target.value)}
                  style={{ fontSize: 15, borderRadius: 8, padding: 12, background: '#fcfcfc', border: '1px solid #d1d5db' }}
                  placeholder="Enter message body here..."
                />
              </div>

              {/* Main Submit Campaign Trigger */}
              <Button
                type="primary"
                block
                icon={<WhatsAppOutlined style={{ fontSize: 20 }} />}
                size="large"
                style={{
                  background: '#25D366',
                  borderColor: '#25D366',
                  height: 52,
                  fontSize: 17,
                  fontWeight: 'bold',
                  boxShadow: '0 4px 12px rgba(37, 211, 102, 0.3)',
                  borderRadius: 8,
                  marginTop: 8
                }}
                onClick={startSending}
                disabled={selectedCustomers.length === 0}
              >
                Send WhatsApp Campaign ({selectedCustomers.length})
              </Button>
            </Space>
          </Card>
        </Col>

        {/* --- RIGHT PANEL: SEGMENTED AUDIENCE TARGETING --- */}
        <Col xs={24} xl={14}>
          <Card
            className="premium-card"
            title={
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
                <span style={{ fontWeight: 700 }}>👥 Targeting Audience ({filteredCustomers.length})</span>
                <Checkbox
                  checked={filteredCustomers.length > 0 && selectedCustomers.length === filteredCustomers.length}
                  indeterminate={selectedCustomers.length > 0 && selectedCustomers.length < filteredCustomers.length}
                  onChange={handleSelectAll}
                  style={{ fontWeight: 600 }}
                >
                  Select All Filtered
                </Checkbox>
              </div>
            }
          >
            <Space direction="vertical" style={{ width: '100%' }} size="middle">
              
              {/* Quick Select campaign buttons */}
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                <Text strong style={{ fontSize: 13, marginRight: 4 }}>⚡ Quick Select:</Text>
                <Button size="small" type="dashed" style={{ color: '#dc2626', borderColor: '#fca5a5' }} onClick={() => selectOverdueDues(30)}>
                  30+ Days Overdue
                </Button>
                <Button size="small" type="dashed" style={{ color: '#ea580c', borderColor: '#fdba74' }} onClick={() => selectOverdueDues(15)}>
                  15+ Days Overdue
                </Button>
                <Button size="small" type="dashed" style={{ color: '#16a34a', borderColor: '#86efac' }} onClick={selectAllWithBalance}>
                  Outstanding Dues
                </Button>
                <Button size="small" onClick={() => setSelectedCustomers([])}>
                  Reset Selection
                </Button>
              </div>

              {/* Advanced Filter Widgets */}
              <div style={{ background: '#f8fafc', padding: '16px 20px', borderRadius: 12, border: '1px solid #e2e8f0' }}>
                <Row gutter={[16, 12]} align="middle">
                  <Col xs={24} md={12}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 2 }}>
                      <Text type="secondary" style={{ fontSize: 11, fontWeight: 600 }}>MINIMUM DUES</Text>
                      <Text strong style={{ color: '#dc2626' }}>₹{minBalance}</Text>
                    </div>
                    <Slider
                      min={0}
                      max={15000}
                      step={500}
                      value={minBalance}
                      onChange={setMinBalance}
                      trackStyle={{ background: '#25D366' }}
                      handleStyle={{ borderColor: '#25D366' }}
                    />
                  </Col>
                  
                  <Col xs={24} md={12}>
                    <Text type="secondary" style={{ fontSize: 11, fontWeight: 600, display: 'block', marginBottom: 6 }}>RECEIVABLES AGING</Text>
                    <Segmented
                      value={agingFilter}
                      onChange={setAgingFilter}
                      block
                      options={[
                        { label: 'All Active', value: 'all' },
                        { label: '15+ Days', value: '15' },
                        { label: '30+ Days', value: '30' },
                        { label: '60+ Days', value: '60' }
                      ]}
                      style={{ background: '#cbd5e1' }}
                    />
                  </Col>

                  <Col xs={24} sm={12} md={8}>
                    <Input
                      placeholder="Search Name / Phone..."
                      value={searchText}
                      onChange={e => setSearchText(e.target.value)}
                      allowClear
                      style={{ borderRadius: 6 }}
                    />
                  </Col>

                  <Col xs={12} sm={6} md={8}>
                    <Select value={filterVillage} onChange={setFilterVillage} style={{ width: '100%' }} dropdownStyle={{ borderRadius: 8 }}>
                      {villages.map(v => <Option key={v} value={v}>{v === 'all' ? 'All Villages' : v}</Option>)}
                    </Select>
                  </Col>

                  <Col xs={12} sm={6} md={8}>
                    <Select value={sortBy} onChange={setSortBy} style={{ width: '100%' }} dropdownStyle={{ borderRadius: 8 }}>
                      <Option value="balance_desc">Highest Debt</Option>
                      <Option value="aging_desc">Longest Overdue</Option>
                      <Option value="last_sent">Oldest Contacted</Option>
                      <Option value="name">Name A-Z</Option>
                    </Select>
                  </Col>
                </Row>
              </div>

              {/* Custom detailed list display */}
              <div style={{ maxHeight: '55vh', overflowY: 'auto', paddingRight: 4 }}>
                <List
                  grid={{ gutter: 10, xs: 1, md: 2 }}
                  dataSource={filteredCustomers}
                  renderItem={c => {
                    const isSelected = selectedCustomers.includes(c.id);
                    const isOverdue = c.balance > 0 && c.agingDays >= 30;
                    const isSemiOverdue = c.balance > 0 && c.agingDays >= 15 && c.agingDays < 30;

                    return (
                      <List.Item key={c.id} style={{ marginBottom: 10 }}>
                        <Card
                          size="small"
                          hoverable
                          onClick={() => toggleSelect(c.id)}
                          style={{
                            borderColor: isSelected ? '#25D366' : '#e2e8f0',
                            background: isSelected ? '#f0fdf4' : '#fff',
                            borderRadius: 12,
                            boxShadow: isSelected ? '0 4px 12px rgba(37, 211, 102, 0.08)' : 'none',
                            transition: 'all 0.2s ease',
                          }}
                          bodyStyle={{ padding: 12 }}
                        >
                          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                            <Checkbox checked={isSelected} onClick={e => e.stopPropagation()} onChange={() => toggleSelect(c.id)} />
                            
                            <Avatar size={40} style={{ background: isOverdue ? '#fef2f2' : isSelected ? '#dcfce7' : '#f1f5f9', color: isOverdue ? '#ef4444' : isSelected ? '#16a34a' : '#475569' }} icon={<UserOutlined />} />

                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 6, justifyContent: 'space-between' }}>
                                <Text strong style={{ fontSize: 14, color: '#1f2937' }} ellipsis>{c.name}</Text>
                                <Text strong style={{ color: c.balance > 0 ? '#ef4444' : '#10b981', fontSize: 14 }}>
                                  ₹{c.balance.toLocaleString('en-IN')}
                                </Text>
                              </div>

                              <div style={{ fontSize: 11, color: '#6b7280', display: 'flex', gap: 8, alignItems: 'center', marginTop: 2 }}>
                                <span style={{ display: 'flex', alignItems: 'center', gap: 2 }}><EnvironmentOutlined /> {c.village || 'No Village'}</span>
                                <span style={{ display: 'flex', alignItems: 'center', gap: 2 }}><MobileOutlined /> {c.phone}</span>
                              </div>

                              {/* Overdue/Aging tags */}
                              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 6, alignItems: 'center' }}>
                                {c.balance > 0 ? (
                                  isOverdue ? (
                                    <Tag color="red" style={{ fontSize: 10, borderRadius: 4 }}>🚨 {c.agingDays} days overdue</Tag>
                                  ) : isSemiOverdue ? (
                                    <Tag color="orange" style={{ fontSize: 10, borderRadius: 4 }}>⏳ {c.agingDays} days overdue</Tag>
                                  ) : (
                                    <Tag color="blue" style={{ fontSize: 10, borderRadius: 4 }}>🕒 Active ({c.agingDays}d)</Tag>
                                  )
                                ) : (
                                  <Tag color="green" style={{ fontSize: 10, borderRadius: 4 }}>✅ Settled</Tag>
                                )}

                                {c.lastWhatsappSent && (
                                  <Tag style={{ fontSize: 9, borderRadius: 4 }}>
                                    Sent: {new Date(c.lastWhatsappSent).toLocaleDateString()}
                                  </Tag>
                                )}
                              </div>
                            </div>
                          </div>

                          <Divider style={{ margin: '8px 0' }} />

                          {/* Individual Message Actions */}
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <Text type="secondary" style={{ fontSize: 11 }}>Last Txn: <Text strong>{c.lastTxnDateStr}</Text></Text>
                            <Space size={4}>
                              <Tooltip title="Copy prepared statement text">
                                <Button size="small" type="text" icon={<CopyOutlined />} onClick={(e) => triggerSingleCopy(e, c)} />
                              </Tooltip>
                              <Button
                                size="small"
                                type="text"
                                icon={<WhatsAppOutlined style={{ color: '#25D366' }} />}
                                style={{ fontWeight: 600, color: '#25D366' }}
                                onClick={(e) => triggerSingleSend(e, c)}
                              >
                                Send Direct
                              </Button>
                            </Space>
                          </div>
                        </Card>
                      </List.Item>
                    )
                  }}
                />
                {filteredCustomers.length === 0 && (
                  <Empty
                    image={Empty.PRESENTED_IMAGE_SIMPLE}
                    description="No customers match your target segmentations"
                    style={{ padding: 40 }}
                  />
                )}
              </div>
            </Space>
          </Card>
        </Col>
      </Row>

      {/* CAMPAIGN SENDING MODAL PROGRESS DRAWER */}
      <Modal
        open={showSendModal}
        title={<span style={{ fontWeight: 700 }}><WhatsAppOutlined style={{ color: '#25D366' }} /> Automated Campaign Dispatcher</span>}
        footer={null}
        closable={!isSending}
        onCancel={() => setShowSendModal(false)}
        maskClosable={false}
        centered
        width={450}
      >
        <div style={{ textAlign: 'center', padding: '10px 0' }}>
          {isSending ? (
            <div style={{ marginBottom: 20 }}>
              <Spin size="large" />
              <div style={{ marginTop: 15, fontSize: 15, fontWeight: 600, color: '#25D366' }}>
                Redirecting WhatsApp Web...
              </div>
              <div style={{ fontSize: 13, color: '#6b7280', marginTop: 4 }}>
                Current Target: <Text strong>{currentSendingName}</Text>
              </div>
            </div>
          ) : (
            <div style={{ marginBottom: 20 }}>
              <CheckCircleOutlined style={{ fontSize: 44, color: '#52c41a', marginBottom: 10 }} />
              <div style={{ fontSize: 16, fontWeight: 700, color: '#3f8600' }}>
                Batch Completed Successfully!
              </div>
            </div>
          )}

          <Progress
            percent={sendProgress}
            status={isSending ? 'active' : 'success'}
            strokeColor="#25D366"
            strokeWidth={10}
            style={{ marginBottom: 15 }}
          />

          <Alert
            message={language === 'hi' ? 'सूचना' : 'Information'}
            description={
              language === 'hi'
                ? 'यह टूल्स ब्राउज़र में व्हाट्सएप वेब टैब खोलता है। कृपया पॉप-अप ब्लॉकर की अनुमति दें।'
                : 'This engine dispatches messages by triggering customized browser tabs. Please ensure your browser has allowed pop-ups from this site.'
            }
            type="info"
            showIcon
            style={{ textAlign: 'left', fontSize: 12, marginBottom: 20 }}
          />

          {isSending ? (
            <Button danger size="large" block onClick={cancelSending} style={{ borderRadius: 6 }}>
              Abort Campaign Dispatch
            </Button>
          ) : (
            <Button type="primary" size="large" block onClick={() => setShowSendModal(false)} style={{ background: '#25D366', borderColor: '#25D366', borderRadius: 6 }}>
              Close Campaign Progress
            </Button>
          )}
        </div>
      </Modal>
    </div>
  );
};

export default WhatsAppManager;
