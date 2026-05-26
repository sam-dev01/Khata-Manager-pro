import React, { useState, useEffect } from 'react';
import { Card, Select, Input, Button, message, Space, Tag, Statistic, Row, Col } from 'antd';
import { DollarOutlined, CheckCircleOutlined, UserOutlined } from '@ant-design/icons';
import { getTodayTransactions, calculateBalance } from '../utils/calculations';

const { Option } = Select;

const PaymentReceived = ({ customers, transactions, setTransactions }) => {
  const [selectedCustomerId, setSelectedCustomerId] = useState(null);
  const [amount, setAmount] = useState('');
  const [paymentType, setPaymentType] = useState('cash');

  // Calculate balances
  const customersWithBalance = customers
    .map(c => ({ ...c, balance: calculateBalance(c.id, transactions) }))
    .filter(c => c.balance > 0);

  const selectedCustomer = customersWithBalance.find(c => c.id === selectedCustomerId);

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
