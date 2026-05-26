import React, { useState } from 'react';
import { Card, Table, Button, Tag, Space, Modal, Typography, Radio, InputNumber, Input, DatePicker, message, Row, Col, Statistic } from 'antd';
import { ArrowLeftOutlined, PlusOutlined, WalletOutlined, FileTextOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';

const { Title, Text } = Typography;

const SupplierDetail = ({ supplier, onBack, transactions, setTransactions, language }) => {
    const [isModalVisible, setIsModalVisible] = useState(false);
    const [txnType, setTxnType] = useState('purchase'); // purchase (credit), payment (debit)
    const [amount, setAmount] = useState('');
    const [note, setNote] = useState('');

    // Filter Transactions for this supplier
    const supplierTxns = transactions.filter(t => t.supplierId === supplier.id).sort((a, b) => new Date(b.date) - new Date(a.date));

    // Calculate Balance
    // Purchase (credit) OR Bill -> We owe more -> Balance Increases
    // Payment (debit) -> We paid -> Balance Decreases
    const totalPurchase = supplierTxns.filter(t => t.type === 'supplier_purchase' || t.type === 'purchase_bill').reduce((sum, t) => sum + t.amount, 0);
    const totalPaid = supplierTxns.filter(t => t.type === 'supplier_payment').reduce((sum, t) => sum + t.amount, 0);
    const currentBalance = totalPurchase - totalPaid;

    // Unpaid Bills Logic (Approximation: Count of Purchase Txns)
    // Since we don't track per-bill payment status, showing the count of bills contributes to context
    const unpaidBillCount = supplierTxns.filter(t => t.type === 'purchase_bill' || t.type === 'supplier_purchase').length;

    const handleTransaction = () => {
        if (!amount) return message.error('Enter amount');

        const newTxn = {
            id: Date.now().toString(),
            supplierId: supplier.id,
            amount: parseFloat(amount),
            type: txnType === 'purchase' ? 'supplier_purchase' : 'supplier_payment',
            date: new Date().toISOString(),
            notes: note
        };

        setTransactions([newTxn, ...transactions]);
        message.success('Transaction added');
        setIsModalVisible(false);
        setAmount('');
        setNote('');
    };

    const columns = [
        {
            title: 'Date', dataIndex: 'date', key: 'date',
            render: d => dayjs(d).format('DD MMM YYYY')
        },
        {
            title: 'Type', dataIndex: 'type', key: 'type',
            render: t => {
                let color = 'blue';
                let text = 'UNKNOWN';
                if (t === 'supplier_purchase') { color = 'orange'; text = 'MANUAL CREDIT'; }
                else if (t === 'purchase_bill') { color = 'red'; text = 'PURCHASE BILL'; }
                else if (t === 'supplier_payment') { color = 'green'; text = 'PAYMENT'; }

                return <Tag color={color}>{text}</Tag>;
            }
        },
        {
            title: 'Notes', dataIndex: 'notes', key: 'notes',
            render: (text, record) => (
                <div>
                    <div>{text}</div>
                    {record.itemsSummary && <div style={{ fontSize: 10, color: '#888' }}>{record.itemsSummary}</div>}
                </div>
            )
        },
        {
            title: 'Amount', dataIndex: 'amount', key: 'amount',
            render: (v, r) => (
                <span style={{ color: (r.type === 'supplier_purchase' || r.type === 'purchase_bill') ? '#cf1322' : '#3f8600', fontWeight: 'bold' }}>
                    {(r.type === 'supplier_purchase' || r.type === 'purchase_bill') ? '+' : '-'} ₹{Math.round(v)}
                </span>
            )
        }
    ];

    return (
        <div className="fade-in">
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', marginBottom: 20 }}>
                <Button icon={<ArrowLeftOutlined />} onClick={onBack} style={{ marginRight: 16 }} />
                <div>
                    <Title level={4} style={{ margin: 0 }}>{supplier.name}</Title>
                    <Text type="secondary">{supplier.contact}</Text>
                </div>
            </div>

            {/* Stats Card */}
            <Card style={{ marginBottom: 20 }}>
                <Row gutter={16}>
                    <Col span={8}><Statistic title="Total To Pay (Balance)" value={currentBalance} prefix="₹" valueStyle={{ color: '#cf1322' }} /></Col>
                    <Col span={8}><Statistic title="Total Paid" value={totalPaid} prefix="₹" valueStyle={{ color: '#3f8600' }} /></Col>
                    <Col span={8}><Statistic title="Unpaid Transactions" value={unpaidBillCount} suffix="bills" /></Col>
                </Row>
            </Card>

            {/* Actions */}
            <div style={{ marginBottom: 16, display: 'flex', gap: 10 }}>
                <Button type="primary" danger icon={<PlusOutlined />} onClick={() => { setTxnType('purchase'); setIsModalVisible(true); }}>
                    Record Purchase (Bill)
                </Button>
                <Button type="primary" style={{ background: '#52c41a', borderColor: '#52c41a' }} icon={<WalletOutlined />} onClick={() => { setTxnType('payment'); setIsModalVisible(true); }}>
                    Record Payment
                </Button>
            </div>

            <Table
                columns={columns}
                dataSource={supplierTxns}
                rowKey="id"
            />

            <Modal
                title="Add Transaction"
                open={isModalVisible}
                onCancel={() => setIsModalVisible(false)}
                onOk={handleTransaction}
            >
                <div style={{ marginBottom: 16 }}>
                    <Text strong>Amount:</Text>
                    <InputNumber
                        style={{ width: '100%', marginTop: 8 }}
                        value={amount}
                        onChange={setAmount}
                        autoFocus
                    />
                </div>
                <div style={{ marginBottom: 16 }}>
                    <Text>Date:</Text>
                    <DatePicker style={{ width: '100%', marginTop: 8 }} defaultValue={dayjs()} disabled />
                </div>
                <div style={{ marginBottom: 16 }}>
                    <Text>Notes / Bill No:</Text>
                    <Input
                        style={{ width: '100%', marginTop: 8 }}
                        value={note}
                        onChange={e => setNote(e.target.value)}
                        placeholder="Optional description"
                    />
                </div>
            </Modal>
        </div>
    );
};

export default SupplierDetail;
