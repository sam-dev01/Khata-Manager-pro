import React, { useState } from 'react';
import {
  Card,
  List,
  Button,
  Modal,
  Form,
  Input,
  Typography,
  Tag,
  Space,
  message,
  Popconfirm,
  Avatar,
  Select
} from 'antd';
import {
  PlusOutlined,
  WhatsAppOutlined,
  EditOutlined,
  DeleteOutlined,
  UserOutlined,
  PhoneOutlined,
  EnvironmentOutlined,
  FilterOutlined,
  FileTextOutlined
} from '@ant-design/icons';
import { calculateBalance } from '../utils/calculations';
import { smartTransliterate, transliterateToHindi as basicTransliterate } from '../utils/transliteration';
import CustomerDetail from './CustomerDetail';
import dayjs from 'dayjs';

const { Title, Text } = Typography;
const { Search } = Input;

const CustomerList = ({
  customers,
  setCustomers,
  transactions,
  setTransactions,

  language,
  onViewStatement,
  deleteCustomer
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState(null);
  const [searchText, setSearchText] = useState('');
  const [filterVillage, setFilterVillage] = useState('all');
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [detailVisible, setDetailVisible] = useState(false);
  const [form] = Form.useForm();

  // Auto-transliteration function (Wrapped utility)
  const transliterateToHindi = (englishText) => {
    // Split by space to handle multi-word names with dictionary lookups
    if (!englishText) return '';
    return englishText.split(' ')
      .map(word => smartTransliterate(word))
      .join(' ');
  };

  // Get unique villages for filter
  const villages = ['all', ...new Set(customers.map(c => c.village).filter(Boolean))];

  // Filter customers by search and village
  const filteredCustomers = customers.filter(c => {
    const matchesSearch = c.name.toLowerCase().includes(searchText.toLowerCase()) ||
      c.phone?.includes(searchText) ||
      c.village?.toLowerCase().includes(searchText.toLowerCase());

    const matchesVillage = filterVillage === 'all' || c.village === filterVillage;

    return matchesSearch && matchesVillage;
  });

  const handleAdd = (values) => {
    if (editingCustomer) {
      // Update existing customer
      const updatedCustomer = { ...editingCustomer, ...values, updatedAt: Date.now() };
      setCustomers(updatedCustomer);
      message.success(language === 'hi' ? 'ग्राहक अपडेट हो गया' : 'Customer updated');
    } else {
      // Add new customer
      const newCustomer = {
        id: Date.now().toString(),
        name: values.name,
        nameHi: values.nameHi || values.name,
        phone: values.phone || '',
        village: values.village || '',
        address: values.address || '',
        openingBalance: parseInt(values.openingBalance) || 0,
        createdAt: Date.now(),
        hasWhatsApp: values.phone ? true : false,
        photoUrl: '',
        billPhotos: [],
        updatedAt: Date.now()
      };

      // Add opening balance transaction if > 0
      if (newCustomer.openingBalance > 0) {
        const openingTxn = {
          id: Date.now().toString() + '_opening',
          customerId: newCustomer.id,
          type: 'credit',
          amount: newCustomer.openingBalance,
          date: dayjs().format('YYYY-MM-DD'),
          notes: 'Opening Balance',
          timestamp: Date.now()
        };
        setTransactions(openingTxn);
      }

      setCustomers(newCustomer);
      message.success(language === 'hi' ? 'नया ग्राहक जुड़ गया' : 'Customer added');
    }

    setIsModalOpen(false);
    setEditingCustomer(null);
    form.resetFields();
  };

  const handleEdit = (customer) => {
    setEditingCustomer(customer);
    form.setFieldsValue(customer);
    setIsModalOpen(true);
  };

  const handleDelete = (customerId) => {
    if (window.confirm(language === 'hi' ? 'क्या आप सुनिश्चित हैं?' : 'Are you sure?')) {
      if (typeof deleteCustomer === 'function') {
        deleteCustomer(customerId);
      }
      message.success(language === 'hi' ? 'ग्राहक हटा दिया' : 'Customer deleted');
    }
  };

  const openWhatsApp = (customer, e) => {
    e.stopPropagation();
    const balance = calculateBalance(customer.id, transactions);
    if (!customer.phone) {
      message.error(language === 'hi' ? 'फ़ोन नंबर नहीं है' : 'No phone number');
      return;
    }

    const messageText = language === 'hi'
      ? `नमस्ते ${customer.name}, आपकी उधारी: ₹${balance}. कृपया जल्दी भुगतान करें। धन्यवाद!`
      : `Hello ${customer.name}, your outstanding balance: ₹${balance}. Please make payment soon. Thank you!`;

    const url = `https://wa.me/91${customer.phone}?text=${encodeURIComponent(messageText)}`;
    window.open(url, '_blank');
  };

  return (
    <div>
      <Title level={2}>
        {language === 'hi' ? '👥 ग्राहक सूची' : '👥 Customer List'}
      </Title>

      {/* Filters and Search */}
      <Space
        style={{
          marginBottom: 16,
          width: '100%',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '12px'
        }}
        direction={window.innerWidth < 768 ? 'vertical' : 'horizontal'}
      >
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={() => {
            setEditingCustomer(null);
            form.resetFields();
            setIsModalOpen(true);
          }}
          size="large"
          style={{ width: window.innerWidth < 768 ? '100%' : 'auto' }}
        >
          {language === 'hi' ? 'नया ग्राहक जोड़ें' : 'Add New Customer'}
        </Button>

        <Space
          style={{ width: window.innerWidth < 768 ? '100%' : 'auto' }}
          direction={window.innerWidth < 768 ? 'vertical' : 'horizontal'}
        >
          <Select
            value={filterVillage}
            onChange={setFilterVillage}
            style={{ width: window.innerWidth < 768 ? '100%' : 200 }}
            size="large"
            suffixIcon={<FilterOutlined />}
          >
            <Select.Option value="all">
              {language === 'hi' ? '🌍 सभी गाँव' : '🌍 All Villages'}
            </Select.Option>
            {villages.filter(v => v !== 'all').map(village => (
              <Select.Option key={village} value={village}>
                📍 {village}
              </Select.Option>
            ))}
          </Select>

          <Search
            placeholder={language === 'hi' ? 'नाम या फ़ोन से खोजें' : 'Search by name or phone'}
            onChange={(e) => setSearchText(e.target.value)}
            style={{ width: window.innerWidth < 768 ? '100%' : 250 }}
            size="large"
            allowClear
          />
        </Space>
      </Space>

      <Text type="secondary" style={{ display: 'block', marginBottom: 16 }}>
        {language === 'hi'
          ? `कुल ${filteredCustomers.length} ग्राहक`
          : `Total ${filteredCustomers.length} customers`}
      </Text>

      {/* Customer Cards */}
      <List
        grid={{
          gutter: 16,
          xs: 1,
          sm: 2,
          md: 2,
          lg: 3,
          xl: 4
        }}
        dataSource={filteredCustomers}
        renderItem={customer => {
          const balance = calculateBalance(customer.id, transactions);
          return (
            <List.Item>
              <Card
                className="customer-card"
                onClick={() => {
                  setSelectedCustomer(customer);
                  setDetailVisible(true);
                }}
                actions={[
                  <EditOutlined
                    key="edit"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleEdit(customer);
                    }}
                  />,
                  <FileTextOutlined
                    key="statement"
                    style={{ color: '#FAAD14' }}
                    onClick={(e) => {
                      e.stopPropagation();
                      if (onViewStatement) onViewStatement(customer);
                    }}
                  />,
                  <WhatsAppOutlined
                    key="whatsapp"
                    onClick={(e) => openWhatsApp(customer, e)}
                    style={{ color: '#25D366' }}
                  />,
                  <Popconfirm
                    title={language === 'hi' ? 'क्या आप सुनिश्चित हैं?' : 'Are you sure?'}
                    onConfirm={(e) => {
                      e.stopPropagation();
                      handleDelete(customer.id);
                    }}
                    okText={language === 'hi' ? 'हाँ' : 'Yes'}
                    cancelText={language === 'hi' ? 'नहीं' : 'No'}
                  >
                    <DeleteOutlined
                      key="delete"
                      style={{ color: '#ff4d4f' }}
                      onClick={(e) => e.stopPropagation()}
                    />
                  </Popconfirm>
                ]}
              >
                <Card.Meta
                  avatar={
                    <Avatar
                      size={48}
                      icon={<UserOutlined />}
                      style={{ background: 'linear-gradient(135deg, #6366f1, #a855f7)' }}
                    />
                  }
                  title={
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span>{customer.name}</span>
                      <Tag
                        color={balance > 0 ? 'red' : balance < 0 ? 'green' : 'default'}
                        style={{ marginLeft: 8 }}
                      >
                        ₹{Math.abs(balance)}
                      </Tag>
                    </div>
                  }
                  description={
                    <div style={{ marginTop: 8 }}>
                      {customer.phone && (
                        <div>
                          <PhoneOutlined /> {customer.phone}
                        </div>
                      )}
                      {customer.village && (
                        <div style={{ marginTop: 4 }}>
                          <EnvironmentOutlined /> {customer.village}
                        </div>
                      )}
                      {balance > 0 && (
                        <div style={{ marginTop: 8, color: '#ff4d4f', fontWeight: 'bold' }}>
                          {language === 'hi' ? 'बाकी' : 'Outstanding'}: ₹{balance}
                        </div>
                      )}
                      {balance < 0 && (
                        <div style={{ marginTop: 8, color: '#52c41a', fontWeight: 'bold' }}>
                          {language === 'hi' ? 'एडवांस' : 'Advance'}: ₹{Math.abs(balance)}
                        </div>
                      )}
                      {balance === 0 && (
                        <div style={{ marginTop: 8, color: '#8c8c8c' }}>
                          {language === 'hi' ? 'कोई बाकी नहीं' : 'No balance'}
                        </div>
                      )}
                    </div>
                  }
                />
              </Card>
            </List.Item>
          );
        }}
      />

      {/* Add/Edit Customer Modal */}
      <Modal
        title={editingCustomer
          ? (language === 'hi' ? 'ग्राहक संपादित करें' : 'Edit Customer')
          : (language === 'hi' ? 'नया ग्राहक जोड़ें' : 'Add New Customer')
        }
        open={isModalOpen}
        onCancel={() => {
          setIsModalOpen(false);
          setEditingCustomer(null);
          form.resetFields();
        }}
        onOk={() => form.submit()}
        okText={language === 'hi' ? 'सहेजें' : 'Save'}
        cancelText={language === 'hi' ? 'रद्द करें' : 'Cancel'}
        width={600}
      >
        <Form
          form={form}
          onFinish={handleAdd}
          layout="vertical"
          style={{ marginTop: 16 }}
        >
          <Form.Item
            name="name"
            label={language === 'hi' ? 'नाम (English)' : 'Name (English)'}
            rules={[{ required: true, message: language === 'hi' ? 'नाम जरूरी है' : 'Name is required' }]}
          >
            <Input
              placeholder="Shivam Kumar"
              size="large"
              onChange={(e) => {
                const englishName = e.target.value;
                // Auto-transliterate to Hindi
                if (englishName) {
                  form.setFieldsValue({
                    nameHi: transliterateToHindi(englishName)
                  });
                }
              }}
            />
          </Form.Item>

          <Form.Item
            name="nameHi"
            label={language === 'hi' ? 'नाम (हिंदी) - स्वतः भरा गया' : 'Name (Hindi) - Auto-filled'}
          >
            <Input
              placeholder="शिवम कुमार"
              size="large"
            />
          </Form.Item>

          <Form.Item
            name="phone"
            label={language === 'hi' ? 'फ़ोन नंबर' : 'Phone Number'}
            rules={[
              { pattern: /^[0-9]{10}$/, message: language === 'hi' ? '10 अंकों का नंबर चाहिए' : '10 digits required' }
            ]}
          >
            <Input
              placeholder="9876543210"
              maxLength={10}
              size="large"
            />
          </Form.Item>

          <Form.Item
            name="village"
            label={language === 'hi' ? 'गाँव/इलाका' : 'Village/Area'}
          >
            <Input
              placeholder="Sleemnabad"
              size="large"
            />
          </Form.Item>

          <Form.Item
            name="address"
            label={language === 'hi' ? 'पूरा पता' : 'Full Address'}
          >
            <Input.TextArea
              rows={2}
              placeholder={language === 'hi' ? 'पूरा पता लिखें...' : 'Enter full address...'}
            />
          </Form.Item>

          {!editingCustomer && (
            <Form.Item
              name="openingBalance"
              label={language === 'hi' ? 'शुरुआती बैलेंस (₹)' : 'Opening Balance (₹)'}
              initialValue={0}
              tooltip={language === 'hi' ? 'पुरानी उधारी जोड़ें' : 'Add existing outstanding amount'}
            >
              <Input
                type="number"
                placeholder="0"
                size="large"
                prefix="₹"
                min={0}
              />
            </Form.Item>
          )}
        </Form>
      </Modal>

      {/* Customer Detail Modal */}
      <CustomerDetail
        customer={selectedCustomer}
        transactions={transactions}
        open={detailVisible}
        onClose={() => setDetailVisible(false)}
        language={language}
      />
    </div>
  );
};

export default CustomerList;
