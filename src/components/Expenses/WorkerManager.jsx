import React, { useState } from 'react';
import { Table, Button, Input, Card, Modal, Typography, Form, message, Tag } from 'antd';
import { PlusOutlined, SearchOutlined, UserOutlined } from '@ant-design/icons';
import WorkerDetail from './WorkerDetail';

const { Title, Text } = Typography;

const WorkerManager = ({ workers, setWorkers, transactions, setTransactions, language }) => {
    const [searchText, setSearchText] = useState('');
    const [isModalVisible, setIsModalVisible] = useState(false);
    const [selectedWorker, setSelectedWorker] = useState(null);
    const [form] = Form.useForm();

    const handleAddWorker = (values) => {
        const newWorker = { ...values, id: Date.now().toString() };
        setWorkers([...workers, newWorker]);
        message.success('Worker Added');
        setIsModalVisible(false);
        form.resetFields();
    };

    // Helper to get balance for list view
    const getBalance = (workerId) => {
        const txns = transactions.filter(t => t.workerId === workerId);
        const due = txns.filter(t => t.type === 'salary_due').reduce((s, t) => s + t.amount, 0);
        const paid = txns.filter(t => t.type === 'salary_paid').reduce((s, t) => s + t.amount, 0);
        return due - paid;
    };

    if (selectedWorker) {
        return (
            <WorkerDetail
                worker={selectedWorker}
                onBack={() => setSelectedWorker(null)}
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
            render: text => <span style={{ fontWeight: 'bold' }}>{text}</span>
        },
        {
            title: 'Role',
            dataIndex: 'designation',
            key: 'designation',
            responsive: ['md'],
            render: t => <Tag color="blue">{t}</Tag>
        },
        {
            title: 'Contact',
            dataIndex: 'contact',
            key: 'contact',
        },
        {
            title: 'Balance',
            key: 'balance',
            render: (_, record) => {
                const bal = getBalance(record.id);
                return (
                    <span style={{ color: bal > 0 ? '#cf1322' : 'green', fontWeight: 'bold' }}>
                        {bal > 0 ? `To Pay: ₹${bal}` : bal < 0 ? `Advance: ₹${Math.abs(bal)}` : 'Settled'}
                    </span>
                )
            }
        },
        {
            title: 'Action',
            key: 'action',
            render: (_, record) => <Button type="link" onClick={() => setSelectedWorker(record)}>Manage</Button>
        }
    ];

    return (
        <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <Title level={4} style={{ margin: 0 }}>Staff / Workers</Title>
                <Button type="primary" icon={<PlusOutlined />} onClick={() => setIsModalVisible(true)}>
                    Add Worker
                </Button>
            </div>

            <Card style={{ marginBottom: 16 }} styles={{ body: { padding: 12 } }}>
                <Input
                    prefix={<SearchOutlined />}
                    placeholder="Search workers..."
                    value={searchText}
                    onChange={e => setSearchText(e.target.value)}
                />
            </Card>

            <Table
                columns={columns}
                dataSource={workers.filter(w => w.name.toLowerCase().includes(searchText.toLowerCase()))}
                rowKey="id"
            />

            <Modal
                title="Add New Staff"
                open={isModalVisible}
                onCancel={() => setIsModalVisible(false)}
                onOk={() => form.submit()}
            >
                <Form form={form} layout="vertical" onFinish={handleAddWorker}>
                    <Form.Item name="name" label="Name" rules={[{ required: true }]}>
                        <Input />
                    </Form.Item>
                    <Form.Item name="designation" label="Designation (Role)" rules={[{ required: true }]}>
                        <Input placeholder="e.g. Helper, Driver" />
                    </Form.Item>
                    <Form.Item name="contact" label="Contact Number">
                        <Input />
                    </Form.Item>
                    <Form.Item name="salary" label="Monthly Salary (Optional)">
                        <Input type="number" />
                    </Form.Item>
                </Form>
            </Modal>
        </div>
    );
};

export default WorkerManager;
