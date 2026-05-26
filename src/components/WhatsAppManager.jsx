// src/components/WhatsAppManager.jsx (Smart Dashboard Edition)
import React, { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import {
  Card, Typography, Space, Select, Button, Input, List, Tag, message, Empty,
  Checkbox, Modal, Alert, Tooltip, Row, Col, Slider, Progress, Divider
} from 'antd';
import {
  WhatsAppOutlined, SendOutlined, FilterOutlined, MessageOutlined, FileTextOutlined,
  CopyOutlined, ShareAltOutlined, SaveOutlined, DeleteOutlined, PlusOutlined,
  UserOutlined, ReloadOutlined
} from '@ant-design/icons';
import { calculateBalance } from '../utils/calculations';

const { Title, Text, Paragraph } = Typography;
const { TextArea } = Input;
const { Option } = Select;

// --- CONFIG ---
const SEND_BATCH_SIZE = 5;
const SEND_BATCH_DELAY = 1500; // 1.5s delay

// Helper: Normalize Phone
const normalizePhone = (raw = '') => {
  if (!raw) return null;
  const digits = String(raw).replace(/\D/g, '');
  if (digits.length === 10) return digits;
  if (digits.length === 11 && digits.startsWith('0')) return digits.slice(1);
  if (digits.length === 12 && digits.startsWith('91')) return digits.slice(2);
  if (digits.length === 13 && digits.startsWith('+91')) return digits.slice(3);
  return null;
};

// Helper: Template Render
const renderTemplate = (template, vars = {}) => {
  if (!template) return '';
  return template.replace(/\{(\w+)\}/g, (_, key) => {
    const val = vars[key];
    return (val === null || typeof val === 'undefined') ? '' : String(val);
  });
};

const WhatsAppManager = ({ customers = [], transactions = [], setCustomers, language = 'en' }) => {
  // --- STATE: Filters ---
  const [filterVillage, setFilterVillage] = useState('all');
  const [minBalance, setMinBalance] = useState(0);
  const [sortBy, setSortBy] = useState('balance_desc');

  // --- STATE: Selection ---
  const [selectedCustomers, setSelectedCustomers] = useState([]);

  // --- STATE: Templates ---
  const [templates, setTemplates] = useState([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState('reminder');
  const [customMessage, setCustomMessage] = useState('');

  // --- STATE: Sending ---
  const [isSending, setIsSending] = useState(false);
  const [sendProgress, setSendProgress] = useState(0);
  const [showSendModal, setShowSendModal] = useState(false);
  const sendingRef = useRef(false); // Ref to prevent double clicks

  // --- INIT ---
  useEffect(() => {
    // Load saved templates
    const saved = localStorage.getItem('whatsapp_templates');
    const defaults = [
      { id: 'reminder', name: 'Payment Reminder', text: language === 'hi' ? 'नमस्ते {name}, आपकी उधारी ₹{balance} है। कृपया भुगतान करें।' : 'Hello {name}, your pending balance is ₹{balance}. Please pay soon.' },
      { id: 'payment', name: 'Strict Request', text: language === 'hi' ? 'कृपया {balance} का भुगतान तुरंत करें। - Gupta Store' : 'Urgent: Please clear your due of ₹{balance}. - Gupta Store' },
      { id: 'greeting', name: 'Greeting', text: language === 'hi' ? 'नमस्ते {name}, हमारे साथ जुड़ने के लिए धन्यवाद!' : 'Hello {name}, thanks for shopping with us!' }
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


  // --- COMPUTED DATA ---
  const processedCustomers = useMemo(() => {
    return customers.map(c => ({
      ...c,
      normalizedPhone: normalizePhone(c.phone),
      balance: calculateBalance(c.id, transactions)
    })).filter(c => !!c.normalizedPhone); // Only valid phones
  }, [customers, transactions]);

  const filteredCustomers = useMemo(() => {
    let list = processedCustomers;

    // Filter: Village
    if (filterVillage !== 'all') {
      list = list.filter(c => c.village === filterVillage);
    }

    // Filter: Min Balance
    if (minBalance > 0) {
      list = list.filter(c => c.balance >= minBalance);
    }

    // Sort
    return list.sort((a, b) => {
      switch (sortBy) {
        case 'balance_desc': return b.balance - a.balance;
        case 'balance_asc': return a.balance - b.balance;
        case 'name': return a.name.localeCompare(b.name);
        case 'last_sent': return (a.lastWhatsappSent || 0) - (b.lastWhatsappSent || 0);
        default: return 0;
      }
    });
  }, [processedCustomers, filterVillage, minBalance, sortBy]);

  const villages = useMemo(() => ['all', ...new Set(processedCustomers.map(c => c.village).filter(Boolean))], [processedCustomers]);

  // Summary Stats
  const selectedStats = useMemo(() => {
    const selectedList = processedCustomers.filter(c => selectedCustomers.includes(c.id));
    const totalDue = selectedList.reduce((sum, c) => sum + (c.balance > 0 ? c.balance : 0), 0);
    return { count: selectedList.length, totalDue };
  }, [selectedCustomers, processedCustomers]);


  // --- HANDLERS: Selection ---
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

  // --- HANDLERS: Template ---
  const handleTemplateSelect = (id) => {
    setSelectedTemplateId(id);
    const tmpl = templates.find(t => t.id === id);
    if (tmpl) setCustomMessage(tmpl.text);
  };

  const handleSaveTemplate = () => {
    const name = prompt("Enter Template Name:", "New Template");
    if (!name) return;
    const newTmpl = { id: Date.now().toString(), name, text: customMessage };
    setTemplates([...templates, newTmpl]);
    setSelectedTemplateId(newTmpl.id);
    message.success("Template Saved");
  };

  const handleDeleteTemplate = () => {
    if (templates.length <= 1) return message.warning("Cannot delete last template");
    if (window.confirm("Delete this template?")) {
      const newTemplates = templates.filter(t => t.id !== selectedTemplateId);
      setTemplates(newTemplates);
      setSelectedTemplateId(newTemplates[0].id);
      setCustomMessage(newTemplates[0].text);
    }
  };

  const insertVariable = (varName) => {
    setCustomMessage(prev => prev + ` {${varName}} `);
  };

  // --- HANDLERS: Sending ---
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
      if (!sendingRef.current) break; // Allow cancellation

      const batch = queue.slice(i, i + SEND_BATCH_SIZE);

      // Process Batch
      for (const c of batch) {
        const msg = renderTemplate(customMessage, { name: c.name, balance: c.balance });
        const url = `https://wa.me/91${c.normalizedPhone}?text=${encodeURIComponent(msg)}`;
        window.open(url, '_blank', 'noopener,noreferrer');
      }

      sentCount += batch.length;
      setSendProgress(Math.floor((sentCount / total) * 100));

      // Update timestamps
      if (setCustomers) {
        const now = Date.now();
        const ids = batch.map(c => c.id);
        // Optimization: Update all at once at the end ideally, but for feedback we update local assumption
      }

      // Delay
      if (i + SEND_BATCH_SIZE < total) {
        await new Promise(r => setTimeout(r, SEND_BATCH_DELAY));
      }
    }

    // Final Update to DB
    if (setCustomers && sendingRef.current) {
      const now = Date.now();
      const updated = customers.map(c => selectedCustomers.includes(c.id) ? { ...c, lastWhatsappSent: now } : c);
      setCustomers(updated);
      message.success("Batch Sending Completed");
    }

    setIsSending(false);
    sendingRef.current = false;
    // Don't close modal immediately so they see 100%
  };

  const cancelSending = () => {
    sendingRef.current = false;
    setIsSending(false);
    setShowSendModal(false);
    message.info("Sending Cancelled");
  };

  return (
    <div style={{ padding: '0 10px' }}>
      <div style={{ marginBottom: 20 }}>
        <Title level={2} style={{ marginBottom: 0 }}>
          <WhatsAppOutlined style={{ color: '#25D366', marginRight: 10 }} />
          {language === 'hi' ? 'स्मार्ट व्हाट्सएप मैनेजर' : 'Smart WhatsApp Manager'}
        </Title>
        <Text type="secondary">Manage campaigns, templates, and bulk messaging</Text>
      </div>

      <Row gutter={[24, 24]}>
        {/* --- LEFT PANEL: CONFIGURATION --- */}
        <Col xs={24} lg={9}>
          <Card title="✉️ Message Configuration" className="sticky-card" style={{ height: '100%' }}>
            <Space direction="vertical" style={{ width: '100%' }}>

              {/* Stats Card */}
              <div style={{ background: '#f6ffed', border: '1px solid #b7eb8f', padding: 15, borderRadius: 8, marginBottom: 10 }}>
                <Row>
                  <Col span={12}>
                    <Text type="secondary">Select Count</Text>
                    <div style={{ fontSize: 24, fontWeight: 'bold', color: '#389e0d' }}>{selectedStats.count}</div>
                  </Col>
                  <Col span={12}>
                    <Text type="secondary">Total Value</Text>
                    <div style={{ fontSize: 24, fontWeight: 'bold', color: '#389e0d' }}>₹{selectedStats.totalDue.toLocaleString()}</div>
                  </Col>
                </Row>
              </div>

              <Divider style={{ margin: '12px 0' }} />

              {/* Template Selector */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
                  <Text strong>Template</Text>
                  <Space>
                    <Tooltip title="Save Current as New"><Button size="small" icon={<SaveOutlined />} onClick={handleSaveTemplate} /></Tooltip>
                    <Tooltip title="Delete Current"><Button size="small" danger icon={<DeleteOutlined />} onClick={handleDeleteTemplate} /></Tooltip>
                  </Space>
                </div>
                <Select
                  value={selectedTemplateId}
                  onChange={handleTemplateSelect}
                  style={{ width: '100%' }}
                  options={templates.map(t => ({ label: t.name, value: t.id }))}
                />
              </div>

              {/* Editor */}
              <div>
                <div style={{ marginBottom: 5 }}>
                  <Space size="small">
                    <Button size="small" onClick={() => insertVariable('name')}>+ Name</Button>
                    <Button size="small" onClick={() => insertVariable('balance')}>+ Balance</Button>
                  </Space>
                </div>
                <TextArea
                  rows={6}
                  value={customMessage}
                  onChange={e => setCustomMessage(e.target.value)}
                  style={{ fontSize: 16 }}
                />
              </div>

              {/* Send Button */}
              <Button
                type="primary"
                block
                icon={<SendOutlined />}
                size="large"
                style={{ background: '#25D366', borderColor: '#25D366', height: 48, fontSize: 18, marginTop: 10 }}
                onClick={startSending}
                disabled={selectedCustomers.length === 0}
              >
                Send to {selectedCustomers.length} Customers
              </Button>
            </Space>
          </Card>
        </Col>

        {/* --- RIGHT PANEL: AUDIENCE --- */}
        <Col xs={24} lg={15}>
          <Card
            title={
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span>👥 Audience ({filteredCustomers.length})</span>
                <Space>
                  <Checkbox
                    checked={filteredCustomers.length > 0 && selectedCustomers.length === filteredCustomers.length}
                    indeterminate={selectedCustomers.length > 0 && selectedCustomers.length < filteredCustomers.length}
                    onChange={handleSelectAll}
                  >
                    Select All
                  </Checkbox>
                </Space>
              </div>
            }
          >
            {/* Filters */}
            <div style={{ background: '#fafafa', padding: 15, borderRadius: 8, marginBottom: 15 }}>
              <Row gutter={[16, 16]} align="middle">
                <Col span={24} md={12}>
                  <Text type="secondary" style={{ fontSize: 12 }}>MINIMUM BALANCE: ₹{minBalance}</Text>
                  <Slider
                    min={0}
                    max={10000}
                    step={100}
                    value={minBalance}
                    onChange={setMinBalance}
                    trackStyle={{ background: '#25D366' }}
                    handleStyle={{ borderColor: '#25D366' }}
                  />
                </Col>
                <Col span={12} md={6}>
                  <Select value={filterVillage} onChange={setFilterVillage} style={{ width: '100%' }} placeholder="Village">
                    {villages.map(v => <Option key={v} value={v}>{v === 'all' ? 'All Villages' : v}</Option>)}
                  </Select>
                </Col>
                <Col span={12} md={6}>
                  <Select value={sortBy} onChange={setSortBy} style={{ width: '100%' }}>
                    <Option value="balance_desc">Highest Debt</Option>
                    <Option value="last_sent">Oldest Sent</Option>
                    <Option value="name">Name A-Z</Option>
                  </Select>
                </Col>
              </Row>
            </div>

            {/* List */}
            <div style={{ maxHeight: '60vh', overflowY: 'auto' }}>
              <List
                grid={{ gutter: 12, xs: 1, sm: 2 }}
                dataSource={filteredCustomers}
                renderItem={c => {
                  const isSelected = selectedCustomers.includes(c.id);
                  return (
                    <List.Item key={c.id}>
                      <Card
                        size="small"
                        hoverable
                        onClick={() => toggleSelect(c.id)}
                        style={{
                          borderColor: isSelected ? '#25D366' : '#e8e8e8',
                          background: isSelected ? '#f6ffed' : '#fff',
                          cursor: 'pointer'
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <div>
                            <Text strong>{c.name}</Text>
                            <div style={{ fontSize: 12, color: '#888' }}>
                              {c.village || 'No Village'} • {c.phone}
                            </div>
                            {c.lastWhatsappSent && (
                              <Tag style={{ marginTop: 4, fontSize: 10 }}>
                                Last: {new Date(c.lastWhatsappSent).toLocaleDateString()}
                              </Tag>
                            )}
                          </div>
                          <div style={{ textAlign: 'right' }}>
                            <div style={{ color: c.balance > 0 ? '#ff4d4f' : '#52c41a', fontWeight: 'bold' }}>
                              ₹{c.balance}
                            </div>
                            <Checkbox checked={isSelected} style={{ marginTop: 5 }} />
                          </div>
                        </div>
                      </Card>
                    </List.Item>
                  )
                }}
              />
              {filteredCustomers.length === 0 && <Empty description="No customers match criteria" />}
            </div>
          </Card>
        </Col>
      </Row>

      {/* Sending Modal */}
      <Modal
        open={showSendModal}
        title="Sending Campaign"
        footer={null}
        closable={!isSending}
        onCancel={() => setShowSendModal(false)}
        maskClosable={false}
        centered
      >
        <div style={{ textAlign: 'center', padding: 20 }}>
          {isSending ? <ReloadOutlined spin style={{ fontSize: 32, color: '#25D366', marginBottom: 15 }} /> : <WhatsAppOutlined style={{ fontSize: 32, color: '#25D366', marginBottom: 15 }} />}
          <Title level={4}>{isSending ? 'Sending Messages...' : 'Batch Completed!'}</Title>
          <Progress percent={sendProgress} status={isSending ? 'active' : 'success'} strokeColor="#25D366" />
          <div style={{ marginTop: 20 }}>
            <Text type="secondary">Please do not close this window while sending is in progress.</Text>
          </div>
          {!isSending && (
            <Button type="primary" onClick={() => setShowSendModal(false)} style={{ marginTop: 20 }}>
              Close
            </Button>
          )}
          {isSending && (
            <Button danger onClick={cancelSending} style={{ marginTop: 20 }}>
              Stop Sending
            </Button>
          )}
        </div>
      </Modal>
    </div>
  );
};

export default WhatsAppManager;
