import React from 'react';
import { Modal, List, Tag, Typography, Button, Space } from 'antd';
import { CloseOutlined, PlusOutlined, MinusOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';

const { Text, Title } = Typography;

const CustomerDetail = ({ customer, transactions, visible, onClose, language }) => {
  if (!customer) return null;

  const customerTxns = transactions
    .filter(t => t.customerId === customer.id)
    .sort((a, b) => b.timestamp - a.timestamp);

  const balance = customerTxns.reduce((acc, txn) => {
    return txn.type === 'credit' ? acc + txn.amount : acc - txn.amount;
  }, 0);

  return (
    <Modal
      title={
        <Space>
          <span>{customer.name}</span>
          <Tag color={balance > 0 ? 'red' : 'green'}>₹{balance}</Tag>
        </Space>
      }
      open={visible}
      onCancel={onClose}
      footer={null}
      width={600}
    >
      <Space direction="vertical" style={{ width: '100%' }} size="large">
        {/* Customer Info */}
        <div>
          <Text type="secondary">📞 {customer.phone || 'N/A'}</Text>
          <br />
          <Text type="secondary">📍 {customer.village || 'N/A'}</Text>
        </div>

        {/* Transaction List */}
        <div>
          <Title level={5}>{language === 'hi' ? 'लेनदेन इतिहास' : 'Transaction History'}</Title>
          <List
            dataSource={customerTxns}
            renderItem={(txn) => (
              <List.Item
                extra={
                  <Text 
                    strong 
                    style={{ 
                      fontSize: 16,
                      color: txn.type === 'credit' ? '#ff4d4f' : '#52c41a'
                    }}
                  >
                    {txn.type === 'credit' ? '+' : '-'}₹{txn.amount}
                  </Text>
                }
              >
                <List.Item.Meta
                  avatar={
                    txn.type === 'credit' 
                      ? <PlusOutlined style={{ color: '#ff4d4f' }} />
                      : <MinusOutlined style={{ color: '#52c41a' }} />
                  }
                  title={
                    <Tag color={txn.type === 'credit' ? 'orange' : 'green'}>
                      {txn.type === 'credit' 
                        ? (language === 'hi' ? 'उधारी दी' : 'Credit')
                        : (language === 'hi' ? 'पैसे जमा' : 'Payment')
                      }
                    </Tag>
                  }
                  description={
                    <Space direction="vertical" size={0}>
                      <Text type="secondary">{dayjs(txn.date).format('DD MMM YYYY')}</Text>
                      {txn.notes && <Text type="secondary" italic>{txn.notes}</Text>}
                    </Space>
                  }
                />
              </List.Item>
            )}
          />
        </div>
      </Space>
    </Modal>
  );
};

export default CustomerDetail;
