import React, { useState } from 'react';
import { Table, Button, Input, Card, Modal, Typography, Select, DatePicker, Form, Tag, Statistic, Row, Col, message, Tabs } from 'antd';
import { PlusOutlined, DollarOutlined, SearchOutlined, ThunderboltOutlined, TeamOutlined, ProfileOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import WorkerManager from './WorkerManager';

const { Title, Text } = Typography;
const { Option } = Select;
// const { TabPane } = Tabs; // Removed deprecated usage

const ExpenseList = ({ expenses, setExpenses, workers, setWorkers, transactions, setTransactions, language }) => {
    const [isModalVisible, setIsModalVisible] = useState(false);
    const [filterMonth, setFilterMonth] = useState(dayjs());
    const [searchText, setSearchText] = useState('');
    const [form] = Form.useForm();
    const [activeTab, setActiveTab] = useState('1');

    // Filter Logic (General & Electricity)
    const getFilteredExpenses = (categoryFilter) => {
        return expenses
            .filter(exp => {
                const expDate = dayjs(exp.date);
                const isSameMonth = expDate.isSame(filterMonth, 'month') && expDate.isSame(filterMonth, 'year');
                const matchesSearch = (exp.note?.toLowerCase().includes(searchText.toLowerCase()) ||
                    exp.category?.toLowerCase().includes(searchText.toLowerCase()));

                const matchesCategory = categoryFilter ? exp.category === categoryFilter : true;

                return isSameMonth && matchesSearch && matchesCategory;
            })
            .sort((a, b) => new Date(b.date) - new Date(a.date));
    };

    const generalExpenses = getFilteredExpenses();
    const electricityExpenses = getFilteredExpenses('Electricity');

    // Stats
    const totalGeneral = generalExpenses.reduce((sum, exp) => sum + Number(exp.amount), 0);
    const totalElectricity = electricityExpenses.reduce((sum, exp) => sum + Number(exp.amount), 0);

    // Add Expense Handler
    const handleAddExpense = (values) => {
        const newExpense = {
            id: Date.now().toString(),
            date: values.date ? values.date.toISOString() : new Date().toISOString(),
            category: activeTab === '2' ? 'Electricity' : values.category, // Auto-set category if on Electricity tab
            amount: parseFloat(values.amount),
            note: values.note || '',
        };

        setExpenses([newExpense, ...expenses]);
        message.success('Expense Added');
        setIsModalVisible(false);
        form.resetFields();
    };

    const columns = (showCategory = true) => [
        {
            title: 'Date',
            dataIndex: 'date',
            key: 'date',
            render: d => dayjs(d).format('DD MMM YYYY')
        },
        ...(showCategory ? [{
            title: 'Category',
            dataIndex: 'category',
            key: 'category',
            render: c => <Tag color="orange">{c}</Tag>
        }] : []),
        {
            title: 'Note',
            dataIndex: 'note',
            key: 'note',
        },
        {
            title: 'Amount',
            dataIndex: 'amount',
            key: 'amount',
            render: v => <Text type="danger" strong>- ₹{v}</Text>
        }
    ];

    return (
        <div className="fade-in" style={{ paddingBottom: 80 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <Title level={3} style={{ margin: 0 }}>
                    <DollarOutlined /> {language === 'hi' ? 'खर्चा और स्टाफ' : 'Expenses & Staff'}
                </Title>
                {activeTab !== '3' && (
                    <Button type="primary" icon={<PlusOutlined />} onClick={() => setIsModalVisible(true)} danger>
                        {language === 'hi' ? 'नया खर्चा' : 'Add Expense'}
                    </Button>
                )}
            </div>

            <Tabs
                defaultActiveKey="1"
                onChange={setActiveTab}
                type="card"
                items={[
                    {
                        key: '1',
                        label: <span><ProfileOutlined /> General</span>,
                        children: (
                            <>
                                <Row gutter={16} style={{ marginBottom: 16 }}>
                                    <Col xs={24} md={12}>
                                        <Card size="small">
                                            <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
                                                <DatePicker
                                                    picker="month"
                                                    value={filterMonth}
                                                    onChange={val => setFilterMonth(val || dayjs())}
                                                    allowClear={false}
                                                />
                                                <Input
                                                    prefix={<SearchOutlined />}
                                                    placeholder="Search..."
                                                    value={searchText}
                                                    onChange={e => setSearchText(e.target.value)}
                                                />
                                            </div>
                                        </Card>
                                    </Col>
                                    <Col xs={24} md={12}>
                                        <Card size="small">
                                            <Statistic
                                                title="Total Expenses (Selected Month)"
                                                value={totalGeneral}
                                                prefix="₹"
                                                valueStyle={{ color: '#cf1322' }}
                                            />
                                        </Card>
                                    </Col>
                                </Row>
                                <Table columns={columns(true)} dataSource={generalExpenses} rowKey="id" />
                            </>
                        )
                    },
                    {
                        key: '2',
                        label: <span><ThunderboltOutlined /> Electricity</span>,
                        children: (
                            <>
                                <Row gutter={16} style={{ marginBottom: 16 }}>
                                    <Col xs={24} md={12}>
                                        <Card size="small">
                                            <Statistic title="Total Electricity Bill (Month)" value={totalElectricity} prefix="₹" />
                                        </Card>
                                    </Col>
                                </Row>
                                <Table columns={columns(false)} dataSource={electricityExpenses} rowKey="id" />
                            </>
                        )
                    },
                    {
                        key: '3',
                        label: <span><TeamOutlined /> Staff / Workers</span>,
                        children: (
                            <WorkerManager
                                workers={workers}
                                setWorkers={setWorkers}
                                transactions={transactions}
                                setTransactions={setTransactions}
                                language={language}
                            />
                        )
                    }
                ]}
            />

            <Modal
                title={activeTab === '2' ? "Add Electricity Bill" : "Add Expense"}
                open={isModalVisible}
                onCancel={() => setIsModalVisible(false)}
                onOk={() => form.submit()}
                okText="Save"
                okButtonProps={{ danger: true }}
            >
                <Form form={form} layout="vertical" onFinish={handleAddExpense} initialValues={{ date: dayjs(), category: activeTab === '2' ? 'Electricity' : 'Other' }}>
                    <Form.Item name="amount" label="Amount (₹)" rules={[{ required: true, message: 'Enter amount' }]}>
                        <Input type="number" />
                    </Form.Item>

                    {activeTab !== '2' && (
                        <Form.Item name="category" label="Category" rules={[{ required: true }]}>
                            <Select>
                                <Option value="Rent">Rent</Option>
                                <Option value="Electricity">Electricity</Option>
                                <Option value="Salary">Worker Payment (Salary)</Option>
                                <Option value="Tea/Snacks">Tea / Snacks</Option>
                                <Option value="Transport">Transport</Option>
                                <Option value="Maintenance">Maintenance</Option>
                                <Option value="Other">Other</Option>
                            </Select>
                        </Form.Item>
                    )}

                    <Form.Item name="date" label="Date" rules={[{ required: true }]}>
                        <DatePicker style={{ width: '100%' }} />
                    </Form.Item>

                    <Form.Item name="note" label="Note (Optional)">
                        <Input placeholder="Description" />
                    </Form.Item>
                </Form>
            </Modal>
        </div>
    );
};

export default ExpenseList;
