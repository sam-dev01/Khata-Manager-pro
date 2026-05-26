import React, { useState, useEffect, useMemo } from 'react';
import { Card, Select, Input, Button, message, Space, Tag, Statistic, Row, Col, List, Checkbox, Typography } from 'antd';
import { DollarOutlined, CheckCircleOutlined, UserOutlined } from '@ant-design/icons';
import { getTodayTransactions, calculateBalance } from '../utils/calculations';
import dayjs from 'dayjs';

const { Option } = Select;
const { Text } = Typography;

const PaymentReceived = ({ customers, transactions, setTransactions, promises = [], setPromises }) => {
  const [selectedCustomerId, setSelectedCustomerId] = useState(null);
  const [amount, setAmount] = useState('');
  const [paymentType, setPaymentType] = useState('cash');
  const [selectedPromiseIds, setSelectedPromiseIds] = useState([]);

  // Calculate balances
  const customersWithBalance = customers
    .map(c => ({ ...c, balance: calculateBalance(c.id, transactions) }))
    .filter(c => c.balance > 0);

  const selectedCustomer = customersWithBalance.find(c => c.id === selectedCustomerId);

  // Clear selections when customer shifts
  useEffect(() => {
    setSelectedPromiseIds([]);
  }, [selectedCustomerId]);

  // Retrieve pending promises for this customer
  const pendingPromises = useMemo(() => {
    if (!selectedCustomerId) return [];
    return promises.filter(p => p.customerId === selectedCustomerId && p.status === 'pending');
  }, [selectedCustomerId, promises]);

  // Intelligent auto-match based on input amount
  useEffect(() => {
    const enteredAmt = parseFloat(amount) || 0;
    if (enteredAmt > 0 && pendingPromises.length > 0) {
      const exactMatch = pendingPromises.find(p => p.amount === enteredAmt);
      if (exactMatch) {
        setSelectedPromiseIds([exactMatch.id]);
      }
    }
  }, [amount, pendingPromises]);

  const handleSubmit = () => {
    if (!selectedCustomer) {
      message.error('Select customer');
      return;
    }

    const amountNum = parseFloat(amount);

    if (!amount || isNaN(amountNum) || amountNum <= 0) {
      message.error('Enter valid amount');
      return;
    }

    if (amountNum > selectedCustomer.balance) {
      message.error(`Max ₹${selectedCustomer.balance}`);
      return;
    }

    const transaction = {
      id: Date.now(),
      customerId: selectedCustomer.id,
      type: 'debit',
      amount: amountNum,
      paymentType: paymentType,
      notes: `Payment received - ${paymentType}`,
      date: new Date().toISOString(),
      createdAt: Date.now()
    };

    setTransactions([transaction]);
    message.success(`✅ Received ₹${amountNum}`);

    // Dynamic Promise Reconciliation
    if (selectedPromiseIds.length > 0 && setPromises) {
      const updated = promises.map(p =>
        selectedPromiseIds.includes(p.id)
          ? { ...p, status: 'completed', completedAt: Date.now() }
          : p
      );
      setPromises(updated);
      message.success(`Reconciled ${selectedPromiseIds.length} payment promise(s)`);
    }

    setSelectedCustomerId(null);
    setAmount('');
  };

  // Stats
  const todayTxns = getTodayTransactions(transactions);
  const todayPayments = todayTxns.filter(t => t.type === 'debit');
  const todayTotal = todayPayments.reduce((sum, t) => sum + t.amount, 0);

  return (
    <div>
      {/* Statistics */}
      <Row gutter={16} style={{ marginBottom: 24 }}>
        <Col xs={24} sm={8}>
          <Card>
            <Statistic title="Today's Collection" value={todayTotal} prefix="₹" valueStyle={{ color: '#52c41a', fontSize: 28 }} />
          </Card>
        </Col>
        <Col xs={24} sm={8}>
          <Card>
            <Statistic title="Payments" value={todayPayments.length} prefix={<CheckCircleOutlined />} valueStyle={{ color: '#1890ff', fontSize: 28 }} />
          </Card>
        </Col>
        <Col xs={24} sm={8}>
          <Card>
            <Statistic title="Debtors" value={customersWithBalance.length} suffix={`/ ${customers.length}`} prefix={<UserOutlined />} valueStyle={{ color: '#faad14', fontSize: 28 }} />
          </Card>
        </Col>
      </Row>

      {/* Form */}
      <Card
        title={<Space><DollarOutlined style={{ color: '#52c41a' }} />Receive Payment</Space>}
        extra={<Tag color="red">₹{customers.reduce((s, c) => s + calculateBalance(c.id, transactions), 0)} outstanding</Tag>}
      >
        <div style={{ marginBottom: 16 }}>
          <label style={{ display: 'block', marginBottom: 8, fontWeight: 'bold' }}>Select Customer</label>
          <Select
            value={selectedCustomerId}
            onChange={(value) => {
              setSelectedCustomerId(value);
              setAmount('');
            }}
            size="large"
            style={{ width: '100%' }}
            placeholder="Choose customer"
            showSearch
            optionFilterProp="children"
            filterOption={(input, option) =>
              (option?.children ?? '').toLowerCase().includes(input.toLowerCase())
            }
          >
            {customersWithBalance.map(c => (
              <Option key={c.id} value={c.id}>
                {c.name} - ₹{c.balance}
              </Option>
            ))}
          </Select>
        </div>

        {selectedCustomer && (
          <div style={{ padding: 16, background: '#fff7e6', borderRadius: 8, marginBottom: 16 }}>
            <div><strong>Customer:</strong> {selectedCustomer.name}</div>
            <div><strong>Outstanding:</strong> <Tag color="error" style={{ fontSize: 18 }}>₹{selectedCustomer.balance}</Tag></div>

            {/* Reconciliation Widget */}
            {pendingPromises.length > 0 && (
              <div style={{ marginTop: 12, padding: 12, background: '#f0f5ff', border: '1px solid #adc6ff', borderRadius: 8 }}>
                <div style={{ fontWeight: 'bold', color: '#1d39c4', marginBottom: 8 }}>📅 Pending Promises Found:</div>
                <List
                  size="small"
                  dataSource={pendingPromises}
                  renderItem={promise => (
                    <List.Item
                      actions={[
                        <Checkbox
                          checked={selectedPromiseIds.includes(promise.id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedPromiseIds([...selectedPromiseIds, promise.id]);
                            } else {
                              setSelectedPromiseIds(selectedPromiseIds.filter(id => id !== promise.id));
                            }
                          }}
                        >
                          Reconcile
                        </Checkbox>
                      ]}
                    >
                      <List.Item.Meta
                        title={<Text strong>₹{promise.amount}</Text>}
                        description={`Due: ${dayjs(promise.dueDate).format('DD MMM YYYY')} ${promise.notes ? `(${promise.notes})` : ''}`}
                      />
                    </List.Item>
                  )}
                />
              </div>
            )}
          </div>
        )}

        <div style={{ marginBottom: 16 }}>
          <label style={{ display: 'block', marginBottom: 8, fontWeight: 'bold' }}>
            Amount (₹) {selectedCustomer && <Tag color="blue">Max: ₹{selectedCustomer.balance}</Tag>}
          </label>
          <Input
            size="large"
            placeholder="Enter amount"
            prefix="₹"
            value={amount}
            onChange={(e) => {
              setAmount(e.target.value);
            }}
            style={{ fontSize: 18 }}
          />
        </div>

        {selectedCustomer && amount === '' && (
          <div style={{ marginBottom: 16 }}>
            <Space wrap>
              <Button onClick={() => setAmount('100')}>₹100</Button>
              <Button onClick={() => setAmount('500')}>₹500</Button>
              <Button onClick={() => setAmount('1000')}>₹1000</Button>
              <Button onClick={() => setAmount(Math.floor(selectedCustomer.balance / 2).toString())}>Half</Button>
              <Button onClick={() => setAmount(selectedCustomer.balance.toString())}>Full</Button>
            </Space>
          </div>
        )}

        <div style={{ marginBottom: 16 }}>
          <label style={{ display: 'block', marginBottom: 8, fontWeight: 'bold' }}>Method</label>
          <Select value={paymentType} onChange={setPaymentType} size="large" style={{ width: '100%' }}>
            <Option value="cash">💵 Cash</Option>
            <Option value="upi">📱 UPI</Option>
            <Option value="online">💳 Online</Option>
          </Select>
        </div>

        <Button
          type="primary"
          size="large"
          block
          icon={<CheckCircleOutlined />}
          onClick={handleSubmit}
          disabled={!selectedCustomer || !amount}
          style={{ background: '#52c41a', borderColor: '#52c41a', height: 56, fontSize: 18, fontWeight: 'bold' }}
        >
          ✅ Receive Payment
        </Button>
      </Card>
    </div>
  );
};

export default PaymentReceived;
