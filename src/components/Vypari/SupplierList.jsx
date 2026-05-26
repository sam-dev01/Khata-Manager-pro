import React, { useState, useEffect } from 'react';
import { Table, Button, Modal, Form, Input, message, Card, Typography, Row, Col, Statistic, List, Avatar, Tag, Space, Empty } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, PhoneOutlined, UserOutlined, ShopOutlined, WhatsAppOutlined, FileAddOutlined, SearchOutlined } from '@ant-design/icons';

import PurchaseEntry from './PurchaseEntry';
import SupplierDetail from './SupplierDetail';

const { Title, Text } = Typography;

export default function SupplierList({ products, setProducts, transactions, setTransactions, language, suppliers, setSuppliers, deleteSupplier }) {
  // const [suppliers, setSuppliers] = useState([]); // REMOVED (using prop)
  // const [loading, setLoading] = useState(false); // REMOVED
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState(null);
  const [viewMode, setViewMode] = useState('list'); // 'list' | 'entry' | 'detail'
  const [viewSupplier, setViewSupplier] = useState(null); // Supplier for detail view
  // eslint-disable-next-line no-unused-vars
  const [selectedSupplierForEntry, setSelectedSupplierForEntry] = useState(null);
  const [searchText, setSearchText] = useState('');
  const [form] = Form.useForm();

  // Mobile Check
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth <= 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const shopId = localStorage.getItem('current_shop_id');
  // REMOVED: Internal Firebase loading hook

  const handleAddEdit = (values) => {
    if (!shopId) return;

    const newSupplier = {
      id: editingSupplier ? editingSupplier.id : Date.now().toString(),
      ...values,
      updatedAt: Date.now(),
      // shopId handled by App.jsx wrapper
    };

    if (editingSupplier) {
      // Update
      const updatedList = suppliers.map(s => s.id === editingSupplier.id ? newSupplier : s);
      setSuppliers(updatedList); // Triggers App.jsx saveToDb -> Sync
      message.success('Supplier updated');
    } else {
      // Add
      const updatedList = [...suppliers, newSupplier];
      setSuppliers(updatedList);
      message.success('Supplier added');
    }

    setIsModalVisible(false);
    form.resetFields();
    setEditingSupplier(null);
  };

  const handleDelete = (id) => {
    if (window.confirm("Are you sure you want to delete this supplier?")) {
      deleteSupplier(id);
      message.success('Supplier deleted');
    }
  };

  const openModal = (supplier = null) => {
    setEditingSupplier(supplier);
    if (supplier) {
      form.setFieldsValue(supplier);
    } else {
      form.resetFields();
    }
    setIsModalVisible(true);
  };

  // Filter Logic
  const filteredSuppliers = suppliers.filter(s =>
    (s.name && s.name.toLowerCase().includes(searchText.toLowerCase())) ||
    (s.firmName && s.firmName.toLowerCase().includes(searchText.toLowerCase())) ||
    (s.phone && s.phone.includes(searchText))
  );

  // Render Purchase Entry Mode
  if (viewMode === 'entry') {
    return (
      <PurchaseEntry
        onBack={() => setViewMode('list')}
        suppliers={suppliers}
        products={products}
        setProducts={setProducts}
        transactions={transactions}
        setTransactions={setTransactions}
      />
    );
  }

  // Render Detail Mode
  if (viewMode === 'detail' && viewSupplier) {
    return (
      <SupplierDetail
        supplier={viewSupplier}
        onBack={() => setViewMode('list')}
        transactions={transactions}
        setTransactions={setTransactions}
        language={language}
      />
    );
  }

  const columns = [
    {
      title: 'Name',
      dataIndex: 'name',
      key: 'name',
      sorter: (a, b) => a.name.localeCompare(b.name),
      render: t => <b style={{ color: '#1890ff' }}>{t}</b>
    },
    {
      title: 'Firm',
      dataIndex: 'firmName',
      key: 'firmName',
      sorter: (a, b) => (a.firmName || '').localeCompare(b.firmName || ''),
    },
    { title: 'Phone', dataIndex: 'phone', key: 'phone' },
    { title: 'GST', dataIndex: 'gst', key: 'gst', responsive: ['md'] },
    {
      title: 'Actions',
      key: 'actions',
      render: (_, record) => (
        <Space>
          <Button type="link" size="small" onClick={() => { setViewSupplier(record); setViewMode('detail'); }}>View</Button>
          <Button icon={<EditOutlined />} size="small" onClick={() => openModal(record)} />
          <Button icon={<DeleteOutlined />} size="small" danger onClick={() => handleDelete(record.id)} />
        </Space>
      ),
    },
  ];

  return (
    <div style={{ padding: isMobile ? 12 : 24, maxWidth: 1200, margin: '0 auto' }}>
      {/* Header Section */}
      <Row gutter={[16, 16]} align="middle" justify="space-between" style={{ marginBottom: 24 }}>
        <Col xs={24} md={12}>
          <Title level={isMobile ? 3 : 2} style={{ margin: 0, color: '#333' }}>📦 Suppliers</Title>
          <Text type="secondary" style={{ fontSize: isMobile ? 14 : 16 }}>
            Manage vendors & create purchase bills
          </Text>
        </Col>
        <Col xs={24} md={12} style={{ textAlign: isMobile ? 'left' : 'right' }}>
          <Tag color="blue" style={{ padding: '6px 12px', fontSize: 14 }}>
            Total: {suppliers.length}
          </Tag>
          <Space wrap>
            <Button
              type="primary"
              icon={<FileAddOutlined />}
              onClick={() => setViewMode('entry')}
              style={{ background: '#722ed1', borderColor: '#722ed1', borderRadius: 8 }}
              size={isMobile ? 'middle' : 'large'}
            >
              Purchase Bill
            </Button>
            <Button
              type="default"
              icon={<PlusOutlined />}
              onClick={() => openModal()}
              style={{ borderRadius: 8 }}
              size={isMobile ? 'middle' : 'large'}
            >
              Add Supplier
            </Button>
          </Space>
        </Col>
      </Row>

      {/* Search Bar */}
      <Input
        placeholder="Search by name, firm, or phone..."
        prefix={<SearchOutlined style={{ color: '#ccc' }} />}
        size="large"
        value={searchText}
        onChange={e => setSearchText(e.target.value)}
        style={{ marginBottom: 20, borderRadius: 8, maxWidth: isMobile ? '100%' : 400 }}
        allowClear
      />

      {/* Content */}
      {isMobile ? (
        // Mobile View: Cards
        <List
          grid={{ gutter: 16, column: 1 }}
          dataSource={filteredSuppliers}
          loading={false}
          locale={{ emptyText: <Empty description="No Suppliers Found" /> }}
          renderItem={item => (
            <List.Item>
              <Card
                hoverable
                style={{
                  borderRadius: 16,
                  overflow: 'hidden',
                  boxShadow: '0 4px 15px rgba(0,0,0,0.06)',
                  border: 'none'
                }}
                bodyStyle={{ padding: 16 }}
                onClick={() => { setViewSupplier(item); setViewMode('detail'); }}
              >
                <div style={{ display: 'flex', alignItems: 'center', marginBottom: 12 }}>
                  <Avatar
                    size={48}
                    style={{ backgroundColor: '#e6f7ff', color: '#1890ff', verticalAlign: 'middle', marginRight: 12 }}
                  >
                    {item.name?.[0]?.toUpperCase()}
                  </Avatar>
                  <div style={{ flex: 1 }}>
                    <Text strong style={{ fontSize: 16, display: 'block' }}>{item.name}</Text>
                    <Text type="secondary" style={{ fontSize: 13 }}>
                      {item.firmName || 'No Firm Name'}
                    </Text>
                  </div>
                  {item.gst && <Tag color="geekblue">GST</Tag>}
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 6, color: '#666', fontSize: 14 }}>
                  <div style={{ display: 'flex', alignItems: 'center' }}>
                    <PhoneOutlined style={{ marginRight: 8, color: '#1890ff' }} />
                    {item.phone}
                  </div>
                  {item.city && (
                    <div style={{ display: 'flex', alignItems: 'center' }}>
                      <ShopOutlined style={{ marginRight: 8, color: '#52c41a' }} />
                      {item.city}
                    </div>
                  )}
                </div>

                <div style={{ marginTop: 16, paddingTop: 12, borderTop: '1px solid #f0f0f0', display: 'flex', justifyContent: 'space-around' }}>
                  <a
                    href={`tel:${item.phone}`}
                    onClick={(e) => e.stopPropagation()}
                    style={{ flex: 1, textAlign: 'center', color: '#333' }}
                  >
                    <PhoneOutlined style={{ fontSize: 18, color: '#1890ff' }} />
                  </a>
                  <div style={{ width: 1, background: '#f0f0f0' }}></div>
                  <a
                    href={`https://wa.me/91${item.phone}`}
                    target="_blank"
                    rel="noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    style={{ flex: 1, textAlign: 'center', color: '#333' }}
                  >
                    <WhatsAppOutlined style={{ fontSize: 18, color: '#25D366' }} />
                  </a>
                  <div style={{ width: 1, background: '#f0f0f0' }}></div>
                  <div
                    onClick={(e) => { e.stopPropagation(); openModal(item); }}
                    style={{ flex: 1, textAlign: 'center', cursor: 'pointer', color: '#666' }}
                  >
                    <EditOutlined style={{ fontSize: 18 }} />
                  </div>
                </div>
              </Card>
            </List.Item>
          )}
        />
      ) : (
        // Desktop View: Table
        <Card style={{ borderRadius: 12, boxShadow: '0 4px 12px rgba(0,0,0,0.05)', border: 'none' }}>
          <Table
            dataSource={filteredSuppliers}
            columns={columns}
            rowKey="id"
            loading={false}
            pagination={{ pageSize: 8 }}
          />
        </Card>
      )}

      <Modal
        title={editingSupplier ? "Edit Supplier" : "Add New Supplier"}
        open={isModalVisible}
        onCancel={() => setIsModalVisible(false)}
        footer={null}
        destroyOnHidden={true}
        centered
      >
        <Form form={form} layout="vertical" onFinish={handleAddEdit} size="large">
          <Form.Item name="name" label="Supplier Name" rules={[{ required: true, message: 'Please enter name' }]}>
            <Input prefix={<UserOutlined />} placeholder="e.g. Ramesh Traders" />
          </Form.Item>
          <Form.Item name="firmName" label="Firm Name">
            <Input prefix={<ShopOutlined />} placeholder="e.g. Ramesh & Sons Pvt Ltd" />
          </Form.Item>
          <Form.Item name="phone" label="Phone Number" rules={[{ required: true, message: 'Please enter phone' }]}>
            <Input prefix={<PhoneOutlined />} type="number" placeholder="9876543210" />
          </Form.Item>
          <Form.Item name="gst" label="GST Number">
            <Input placeholder="GSTIN..." />
          </Form.Item>
          <Form.Item name="city" label="City / Location">
            <Input placeholder="e.g. Delhi" />
          </Form.Item>

          <Button type="primary" htmlType="submit" block style={{ marginTop: 10 }}>
            {editingSupplier ? "Update Supplier" : "Save Supplier"}
          </Button>
        </Form>
      </Modal>
    </div >
  );
}
