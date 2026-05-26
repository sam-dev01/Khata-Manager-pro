// src/components/CallTracker.jsx (Smart Call Manager)
import React, { useState, useMemo } from 'react';
import {
  Card, Table, Button, Modal, Form, Input, Typography, Tag, Select, Space,
  message, Empty, Row, Col, Statistic, Radio, DatePicker, Checkbox
} from 'antd';
import {
  PlusOutlined, PhoneOutlined, CheckCircleOutlined, CloseCircleOutlined,
  WhatsAppOutlined, CalendarOutlined, EditOutlined, FundOutlined, RiseOutlined
} from '@ant-design/icons';
import dayjs from 'dayjs';
import { calculateBalance } from '../utils/calculations';

const { Title, Text } = Typography;

const CallTracker = ({ calls, setCalls, customers, transactions, promises, setPromises, language }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [form] = Form.useForm();

  // State for dynamic modal fields
  const [selectedCustId, setSelectedCustId] = useState(null);
  const [callStatus, setCallStatus] = useState('picked');

  // --- STATS ---
  const stats = useMemo(() => {
    const today = dayjs().startOf('day');
    const todayCalls = calls.filter(c => dayjs(c.callDate).isAfter(today));

    // Calculate recovery generated from calls (promises linked to calls)
    const linkedPromises = promises.filter(p => calls.some(c => c.promiseId === p.id));
    const recoveryValue = linkedPromises.reduce((sum, p) => sum + p.amount, 0);

    const picked = calls.filter(c => c.callStatus === 'picked').length;
    const total = calls.length;
    const successRate = total > 0 ? Math.round((picked / total) * 100) : 0;

    return {
      todayCount: todayCalls.length,
      totalCalls: total,
      successRate,
      recoveryValue
    };
  }, [calls, promises]);

  // --- ACTIONS ---
  const handleAdd = (values) => {
    // 1. Create Call Record
    const newCall = {
      id: Date.now().toString(),
      customerId: values.customerId,
      callStatus: values.callStatus,
      notes: values.notes || '',
      callDate: values.callDate ? values.callDate.format('YYYY-MM-DD HH:mm:ss') : dayjs().format('YYYY-MM-DD HH:mm:ss'),
      createdAt: Date.now(),
      promiseId: null
    };

    // 2. Handle Promise Creation (if selected)
    if (values.createPromise) {
      const newPromise = {
        id: 'PR_' + Date.now(),
        customerId: values.customerId,
        dueDate: values.promiseDate.format('YYYY-MM-DD'),
        amount: parseInt(values.promiseAmount),
        notes: 'Created via Call Log',
        status: 'pending',
        createdAt: Date.now(),
        reminderSent: false,
        linkedCallId: newCall.id
      };
      setPromises(prev => [...prev, newPromise]);
      newCall.promiseId = newPromise.id;
      message.success('Call Logged & Promise Created');
    } else {
      message.success('Call Logged');
    }

    setCalls([newCall, ...calls]); // Prepend to list
    setIsModalOpen(false);
    form.resetFields();
    setSelectedCustId(null);
  };

  const handleQuickWhatsApp = (customer) => {
    const msg = `Hello ${customer.name}, I tried calling but could not reach you. Please call back regarding your balance.`;
    window.open(`https://wa.me/91${customer.phone}?text=${encodeURIComponent(msg)}`, '_blank');
  };

  // --- TABLE COLUMNS ---
  const columns = [
    {
      title: 'Date',
      dataIndex: 'callDate',
      key: 'callDate',
      render: (date) => <Text type="secondary" style={{ fontSize: 13 }}>{dayjs(date).format('DD MMM, hh:mm A')}</Text>,
      sorter: (a, b) => dayjs(b.callDate).unix() - dayjs(a.callDate).unix(),
      defaultSortOrder: 'ascend'
    },
    {
      title: 'Customer',
      key: 'customer',
      render: (_, record) => {
        const c = customers.find(cust => cust.id === record.customerId);
        return (
          <Space direction="vertical" size={0}>
            <Text strong>{c?.name || 'Unknown'}</Text>
            <a href={`tel:${c?.phone}`} style={{ fontSize: 12 }}><PhoneOutlined /> {c?.phone}</a>
          </Space>
        );
      }
    },
    {
      title: 'Status',
      dataIndex: 'callStatus',
      key: 'callStatus',
      render: (status) => (
        <Tag color={status === 'picked' ? 'success' : 'error'} icon={status === 'picked' ? <CheckCircleOutlined /> : <CloseCircleOutlined />}>
          {status === 'picked' ? 'Picked' : 'Missed'}
        </Tag>
      )
    },
    {
      title: 'Outcome',
      key: 'outcome',
      render: (_, record) => {
        const promise = promises.find(p => p.id === record.promiseId);
        if (promise) {
          return (
            <Tag color="blue" icon={<CalendarOutlined />}>
              Promise: ₹{promise.amount} ({dayjs(promise.dueDate).format('DD MMM')})
            </Tag>
          );
        }
        return record.notes ? <Text type="secondary" style={{ fontSize: 13 }}>{record.notes}</Text> : <Text type="secondary">-</Text>;
      }
    },
    {
      title: 'Action',
      key: 'action',
      render: (_, record) => {
        const c = customers.find(cust => cust.id === record.customerId);
        return (
          <Button size="small" icon={<WhatsAppOutlined />} onClick={() => handleQuickWhatsApp(c)} />
        );
      }
    }
  ];

  // Helper: Get Customer Balance
  const getCustBalance = (id) => {
    if (!id) return 0;
    return calculateBalance(id, transactions); // Assuming calculateBalance is available implicitly or imported
  };

  return (
    <div style={{ padding: '0 10px' }}>
      {/* TITLE */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div>
          <Title level={4} style={{ marginBottom: 0 }}>
            {language === 'hi' ? '📞 कॉल और वसूली' : '📞 Call & Recovery Manager'}
          </Title>
          <Text type="secondary">Log calls, track promises, and improve recovery</Text>
        </div>
        <Button type="primary" size="large" icon={<PlusOutlined />} onClick={() => setIsModalOpen(true)}>
          Log Call
        </Button>
      </div>

      {/* STATS */}
      <Row gutter={[16, 16]} style={{ marginBottom: 20 }}>
        <Col xs={12} sm={6}>
          <Card size="small">
            <Statistic
              title="Calls Today"
              value={stats.todayCount}
              prefix={<PhoneOutlined />}
              valueStyle={{ color: '#1890ff' }}
            />
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card size="small">
            <Statistic
              title="Success Rate"
              value={stats.successRate}
              suffix="%"
              prefix={<CheckCircleOutlined />}
              valueStyle={{ color: stats.successRate > 50 ? '#52c41a' : '#faad14' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12}>
          <Card size="small">
            <Statistic
              title="Recovery Generated (Promises)"
              value={stats.recoveryValue}
              prefix="₹"
              valueStyle={{ color: '#52c41a', fontWeight: 'bold' }}
            />
          </Card>
        </Col>
      </Row>

      {/* HISTORY TABLE */}
      <Card size="small" title="Recent Call History" bodyStyle={{ padding: 0 }}>
        <Table
          dataSource={calls}
          columns={columns}
          rowKey="id"
          pagination={{ pageSize: 5 }}
          scroll={{ x: 500 }}
        />
      </Card>

      {/* LOG MODAL */}
      <Modal
        title="Log New Call"
        open={isModalOpen}
        onCancel={() => { setIsModalOpen(false); form.resetFields(); setSelectedCustId(null); }}
        onOk={() => form.submit()}
        okText="Save Log"
      >
        <Form form={form} onFinish={handleAdd} layout="vertical" initialValues={{ callStatus: 'picked', callDate: dayjs() }}>

          <Form.Item name="customerId" label="Customer" rules={[{ required: true }]}>
            <Select
              showSearch
              placeholder="Search..."
              onChange={setSelectedCustId}
              filterOption={(input, option) => option.children.toLowerCase().includes(input.toLowerCase())}
            >
              {customers.map(c => <Select.Option key={c.id} value={c.id}>{c.name}</Select.Option>)}
            </Select>
          </Form.Item>

          {/* DYNAMIC BALANCE DISPLAY */}
          {selectedCustId && (
            <div style={{ background: '#f0f5ff', padding: '10px', borderRadius: 6, marginBottom: 15, textAlign: 'center' }}>
              <Text type="secondary">Current Balance</Text>
              <div style={{ fontSize: 20, fontWeight: 'bold', color: '#1890ff' }}>
                ₹{getCustBalance(selectedCustId)}
              </div>
            </div>
          )}

          <Form.Item name="callStatus" label="Call Status">
            <Radio.Group onChange={(e) => setCallStatus(e.target.value)} buttonStyle="solid">
              <Radio.Button value="picked">Picked</Radio.Button>
              <Radio.Button value="not_picked">Not Picked / Busy</Radio.Button>
            </Radio.Group>
          </Form.Item>

          {callStatus === 'picked' ? (
            <div style={{ border: '1px dashed #d9d9d9', padding: 10, borderRadius: 6, marginBottom: 15 }}>
              <Form.Item name="createPromise" valuePropName="checked" noStyle>
                <Checkbox>Client Promised to Pay?</Checkbox>
              </Form.Item>

              <Form.Item noStyle shouldUpdate={(prev, curr) => prev.createPromise !== curr.createPromise}>
                {({ getFieldValue }) =>
                  getFieldValue('createPromise') ? (
                    <Row gutter={16} style={{ marginTop: 10 }}>
                      <Col span={12}>
                        <Form.Item name="promiseAmount" label="Amount" rules={[{ required: true }]}>
                          <Input prefix="₹" type="number" />
                        </Form.Item>
                      </Col>
                      <Col span={12}>
                        <Form.Item name="promiseDate" label="Date" rules={[{ required: true }]}>
                          <DatePicker style={{ width: '100%' }} />
                        </Form.Item>
                      </Col>
                    </Row>
                  ) : null
                }
              </Form.Item>
            </div>
          ) : (
            <div style={{ marginBottom: 15 }}>
              <Button icon={<WhatsAppOutlined />} block onClick={() => {
                const c = customers.find(x => x.id === selectedCustId);
                if (c) handleQuickWhatsApp(c);
                else message.error('Select customer first');
              }}>
                Send "Call Me Back" WhatsApp
              </Button>
            </div>
          )}

          <Form.Item name="notes" label="Notes (Optional)">
            <Input.TextArea placeholder="Any other details..." rows={2} />
          </Form.Item>

          <Form.Item name="callDate" label="Call Time" hidden>
            <DatePicker showTime />
          </Form.Item>

        </Form>
      </Modal>
    </div>
  );
};

export default CallTracker;
