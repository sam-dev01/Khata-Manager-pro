// src/components/PromiseTracker.jsx (Payment Promise Manager)
import React, { useState, useMemo } from 'react';
import {
  Card, Table, Button, Modal, Form, Input, Typography, Tag, DatePicker,
  Select, Space, message, Empty, Row, Col, Calendar, Badge, Tabs, Tooltip, Statistic
} from 'antd';
import {
  PlusOutlined, ClockCircleOutlined, CheckCircleOutlined, WarningOutlined,
  WhatsAppOutlined, PhoneOutlined, DeleteOutlined, CalendarOutlined,
  UnorderedListOutlined, RiseOutlined
} from '@ant-design/icons';
import dayjs from 'dayjs';

const { Title, Text } = Typography;

const PromiseTracker = ({ promises, setPromises, customers, language }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [viewMode, setViewMode] = useState('list'); // 'list' or 'calendar'
  const [form] = Form.useForm();

  // --- ACTIONS ---
  const handleAdd = (values) => {
    const newPromise = {
      id: Date.now().toString(),
      customerId: values.customerId,
      dueDate: values.dueDate.format('YYYY-MM-DD'),
      amount: parseInt(values.amount),
      notes: values.notes || '',
      status: 'pending',
      createdAt: Date.now(),
      reminderSent: false
    };

    setPromises([...promises, newPromise]);
    message.success(language === 'hi' ? 'वादा जोड़ा गया' : 'Promise added');
    setIsModalOpen(false);
    form.resetFields();
  };

  const updateStatus = (id, status) => {
    const updated = promises.map(p => p.id === id ? { ...p, status, completedAt: Date.now() } : p);
    setPromises(updated);
    message.success('Status Updated');
  };

  const deletePromise = (id) => {
    setPromises(promises.filter(p => p.id !== id));
    message.success('Deleted');
  };

  const snoozePromise = (id, days) => {
    const updated = promises.map(p => {
      if (p.id === id) {
        return { ...p, dueDate: dayjs(p.dueDate).add(days, 'day').format('YYYY-MM-DD') };
      }
      return p;
    });
    setPromises(updated);
    message.info(`Snoozed for ${days} days`);
  };

  // --- STATS ---
  const stats = useMemo(() => {
    const pending = promises.filter(p => p.status === 'pending');
    const overdue = pending.filter(p => dayjs(p.dueDate).isBefore(dayjs(), 'day'));
    const today = pending.filter(p => dayjs(p.dueDate).isSame(dayjs(), 'day'));

    const totalValue = pending.reduce((sum, p) => sum + p.amount, 0);
    const overdueValue = overdue.reduce((sum, p) => sum + p.amount, 0);

    return {
      count: pending.length,
      value: totalValue,
      overdueCount: overdue.length,
      overdueValue: overdueValue,
      todayCount: today.length
    };
  }, [promises]);

  // --- COLUMNS ---
  const columns = [
    {
      title: 'Customer',
      key: 'customer',
      render: (_, record) => {
        const c = customers.find(cust => cust.id === record.customerId);
        return (
          <div>
            <Text strong>{c?.name || 'Unknown'}</Text>
            <div style={{ fontSize: 12, color: '#888' }}>{c?.phone}</div>
          </div>
        );
      }
    },
    {
      title: 'Amount',
      dataIndex: 'amount',
      key: 'amount',
      render: (amount) => <Text strong style={{ color: '#1890ff' }}>₹{amount}</Text>,
      sorter: (a, b) => a.amount - b.amount
    },
    {
      title: 'Due Date',
      dataIndex: 'dueDate',
      key: 'dueDate',
      render: (date) => {
        const d = dayjs(date);
        const diff = d.diff(dayjs(), 'day');
        let color = 'blue';
        if (diff < 0) color = 'red';
        if (diff === 0) color = 'orange';

        return (
          <Tag color={color}>
            {d.format('DD MMM')} ({diff === 0 ? 'Today' : diff < 0 ? `${Math.abs(diff)}d Late` : `${diff}d Left`})
          </Tag>
        );
      },
      sorter: (a, b) => dayjs(a.dueDate).unix() - dayjs(b.dueDate).unix()
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_, record) => {
        const c = customers.find(cust => cust.id === record.customerId);
        const msg = `Hello ${c?.name}, gentle reminder for payment of ₹${record.amount} due on ${dayjs(record.dueDate).format('DD MMM')}.`;

        return (
          <Space>
            <Tooltip title="WhatsApp Reminder">
              <Button
                size="small"
                icon={<WhatsAppOutlined />}
                style={{ color: '#25D366', borderColor: '#25D366' }}
                onClick={() => window.open(`https://wa.me/91${c?.phone}?text=${encodeURIComponent(msg)}`, '_blank')}
              />
            </Tooltip>
            <Tooltip title="Call">
              <Button size="small" icon={<PhoneOutlined />} href={`tel:${c?.phone}`} />
            </Tooltip>
            <Tooltip title="Snooze 3 Days">
              <Button size="small" onClick={() => snoozePromise(record.id, 3)}>+3d</Button>
            </Tooltip>
            <Tooltip title="Mark Paid">
              <Button size="small" type="primary" icon={<CheckCircleOutlined />} onClick={() => updateStatus(record.id, 'completed')} />
            </Tooltip>
            <Button size="small" danger icon={<DeleteOutlined />} onClick={() => deletePromise(record.id)} />
          </Space>
        );
      }
    }
  ];

  // --- CALENDAR RENDER ---
  const dateCellRender = (value) => {
    const list = promises.filter(p => p.status === 'pending' && dayjs(p.dueDate).isSame(value, 'day'));
    return (
      <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
        {list.map(item => (
          <li key={item.id}>
            <Badge status={dayjs(item.dueDate).isBefore(dayjs()) ? 'error' : 'warning'} text={`₹${item.amount}`} />
          </li>
        ))}
      </ul>
    );
  };

  return (
    <div style={{ padding: '0 10px' }}>
      {/* HEADER */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div>
          <Title level={4} style={{ marginBottom: 0 }}>
            {language === 'hi' ? '📅 भुगतान वादा प्रबंधक' : '📅 Payment Promise Manager'}
          </Title>
          <Text type="secondary">Track & Recover Customer Promises</Text>
        </div>
        <Space>
          <Tabs
            activeKey={viewMode}
            onChange={setViewMode}
            type="card"
            size="small"
            items={[
              { label: <span><UnorderedListOutlined /> List</span>, key: 'list' },
              { label: <span><CalendarOutlined /> Calendar</span>, key: 'calendar' }
            ]}
          />
          <Button type="primary" icon={<PlusOutlined />} onClick={() => setIsModalOpen(true)}>
            New Promise
          </Button>
        </Space>
      </div>

      {/* STATS */}
      <Row gutter={[16, 16]} style={{ marginBottom: 20 }}>
        <Col xs={12} sm={6}>
          <Card size="small" style={{ borderTop: '3px solid #1890ff' }}>
            <Statistic
              title="Total Pending"
              value={stats.count}
              prefix={<ClockCircleOutlined />}
              valueStyle={{ color: '#1890ff' }}
            />
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card size="small" style={{ borderTop: '3px solid #52c41a' }}>
            <Statistic
              title="Total Value"
              value={stats.value}
              prefix="₹"
              valueStyle={{ color: '#52c41a' }}
            />
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card size="small" style={{ borderTop: '3px solid #faad14' }}>
            <Statistic
              title="Due Today"
              value={stats.todayCount}
              prefix={<CalendarOutlined />}
              valueStyle={{ color: '#faad14' }}
            />
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card size="small" style={{ borderTop: '3px solid #ff4d4f' }}>
            <Statistic
              title="Overdue (Broken)"
              value={stats.overdueCount}
              prefix={<WarningOutlined />}
              valueStyle={{ color: '#ff4d4f' }}
              suffix={`/ ₹${stats.overdueValue}`}
            />
          </Card>
        </Col>
      </Row>

      {/* CONTENT */}
      <Card size="small">
        {viewMode === 'list' ? (
          <Table
            dataSource={promises.filter(p => p.status === 'pending')}
            columns={columns}
            rowKey="id"
            pagination={{ pageSize: 5 }}
            locale={{ emptyText: <Empty description="No Pending Promises" /> }}
          />
        ) : (
          <Calendar dateCellRender={dateCellRender} />
        )}
      </Card>

      {/* ADD MODAL */}
      <Modal
        title={language === 'hi' ? 'नया वादा जोड़ें' : 'Add New Promise'}
        open={isModalOpen}
        onCancel={() => { setIsModalOpen(false); form.resetFields(); }}
        onOk={() => form.submit()}
        okText="Save"
      >
        <Form form={form} onFinish={handleAdd} layout="vertical" style={{ marginTop: 16 }}>
          <Form.Item name="customerId" label="Customer" rules={[{ required: true }]}>
            <Select showSearch placeholder="Search customer..." filterOption={(input, option) => option.children.toLowerCase().includes(input.toLowerCase())}>
              {customers.map(c => <Select.Option key={c.id} value={c.id}>{c.name}</Select.Option>)}
            </Select>
          </Form.Item>
          <Form.Item name="amount" label="Amount (₹)" rules={[{ required: true }]}>
            <Input type="number" prefix="₹" />
          </Form.Item>
          <Form.Item name="dueDate" label="Promise Date" rules={[{ required: true }]}>
            <DatePicker style={{ width: '100%' }} format="DD/MM/YYYY" disabledDate={(c) => c && c < dayjs().startOf('day')} />
          </Form.Item>
          <Form.Item name="notes" label="Notes">
            <Input.TextArea rows={2} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default PromiseTracker;
