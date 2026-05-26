import React, { useState } from 'react';
import { Card, Table, Button, Tag, Space, Modal, Typography, InputNumber, Input, DatePicker, message, Row, Col, Statistic } from 'antd';
import { ArrowLeftOutlined, PlusOutlined, WalletOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';

const { Title, Text } = Typography;

const WorkerDetail = ({ worker, onBack, transactions, setTransactions, language }) => {
    const [isModalVisible, setIsModalVisible] = useState(false);
    const [txnType, setTxnType] = useState('salary_due'); // salary_due (Credit), salary_paid (Debit)
    const [amount, setAmount] = useState('');
    const [note, setNote] = useState('');

    // Filter Transactions for this worker
    // We use the same 'transactions' array but filter by 'workerId'
    // Note: We need to ensure 'transactions' in App.jsx supports workerId (it's schema-less so fine)
    const workerTxns = transactions.filter(t => t.workerId === worker.id).sort((a, b) => new Date(b.date) - new Date(a.date));

    // Calculate Balance
    // Salary Due -> We owe them -> Increases Payable
    // Paid -> We paid them -> Reduces Payable
    const totalSalaryDue = workerTxns.filter(t => t.type === 'salary_due').reduce((sum, t) => sum + t.amount, 0);
    const totalPaymentsGiven = workerTxns.filter(t => t.type === 'salary_paid').reduce((sum, t) => sum + t.amount, 0);
    const balance = totalSalaryDue - totalPaymentsGiven; // > 0: We need to pay. < 0: They took advance.

    const handleTransaction = () => {
        if (!amount) return message.error('Enter amount');

        const newTxn = {
            id: Date.now().toString(),
            workerId: worker.id,
            amount: parseFloat(amount),
            type: txnType,
            date: new Date().toISOString(),
            notes: note || (txnType === 'salary_due' ? 'Salary' : 'Payment/Advance')
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
            render: t => (
                <Tag color={t === 'salary_due' ? 'red' : 'green'}>
                    {t === 'salary_due' ? 'SALARY DUE' : 'PAID'}
                </Tag>
            )
        },
        {
            title: 'Notes', dataIndex: 'notes', key: 'notes'
        },
        {
            title: 'Amount', dataIndex: 'amount', key: 'amount',
            render: (v, r) => (
                <span style={{ color: r.type === 'salary_due' ? '#cf1322' : '#3f8600', fontWeight: 'bold' }}>
                    {r.type === 'salary_due' ? '+' : '-'} ₹{v}
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
                    <Title level={4} style={{ margin: 0 }}>{worker.name}</Title>
                    <Text type="secondary">{worker.designation || 'Staff'}</Text>
                </div>
            </div>

            {/* Stats Card */}
            <Card style={{ marginBottom: 20 }}>
                <Row gutter={16}>
                    <Col span={8}>
                        <Statistic
                            title="Total Salary Due"
                            value={totalSalaryDue}
                            prefix="₹"
                            valueStyle={{ color: '#cf1322' }}
                        />
                    </Col>
                    <Col span={8}>
                        <Statistic
                            title="Total Paid"
                            value={totalPaymentsGiven}
                            prefix="₹"
                            valueStyle={{ color: '#3f8600' }}
                        />
                    </Col>
                    <Col span={8}>
                        <Statistic
                            title={balance >= 0 ? "Pending Salary (To Pay)" : "Advance (To Recover)"}
                            value={Math.abs(balance)}
                            prefix="₹"
                            valueStyle={{ color: balance >= 0 ? '#faad14' : '#ff4d4f' }}
                        />
                    </Col>
                </Row>
            </Card>

            {/* Actions */}
            <div style={{ marginBottom: 16, display: 'flex', gap: 10 }}>
                <Button type="primary" danger icon={<PlusOutlined />} onClick={() => { setTxnType('salary_due'); setIsModalVisible(true); }}>
                    Add Salary / Due
                </Button>
                <Button type="primary" style={{ background: '#52c41a', borderColor: '#52c41a' }} icon={<WalletOutlined />} onClick={() => { setTxnType('salary_paid'); setIsModalVisible(true); }}>
                    Given Payment
                </Button>
            </div>

            <Table
                columns={columns}
                dataSource={workerTxns}
                rowKey="id"
            />

            <Modal
                title="Add Transaction"
                open={isModalVisible}
                onCancel={() => setIsModalVisible(false)}
                onOk={handleTransaction}
            >
                <div style={{ marginBottom: 16 }}>
                    <Text strong>Amount (₹):</Text>
                    <InputNumber
                        style={{ width: '100%', marginTop: 8 }}
                        value={amount}
                        onChange={setAmount}
                        autoFocus
                    />
                </div>
                <div style={{ marginBottom: 16 }}>
                    <Text>Notes:</Text>
                    <Input
                        style={{ width: '100%', marginTop: 8 }}
                        value={note}
                        onChange={e => setNote(e.target.value)}
                        placeholder={txnType === 'salary_due' ? "e.g. Jan Salary" : "e.g. Cash Advance"}
                    />
                </div>
            </Modal>
        </div>
    );
};

export default WorkerDetail;
