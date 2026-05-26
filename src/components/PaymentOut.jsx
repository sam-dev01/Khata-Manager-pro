import React, { useState } from 'react';
import { Card, Button, Select, Input, message, Typography, Row, Col } from 'antd';
import { PlusOutlined, DeleteOutlined, SaveOutlined, DollarOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { DatePicker } from 'antd';

const { Title, Text } = Typography;
const { Option } = Select;

const PaymentOut = ({ customers, transactions, setTransactions, language }) => {
    // Each row represents a payment entry
    // Default one empty row
    const [rows, setRows] = useState([
        { id: Date.now(), customerId: null, amount: '', notes: '', date: dayjs() }
    ]);

    const addRow = () => {
        setRows([...rows, { id: Date.now() + Math.random(), customerId: null, amount: '', notes: '', date: dayjs() }]);
    };

    const removeRow = (id) => {
        if (rows.length === 1) {
            message.warning("At least one row required");
            return;
        }
        setRows(rows.filter(r => r.id !== id));
    };

    const updateRow = (id, field, value) => {
        setRows(rows.map(r => r.id === id ? { ...r, [field]: value } : r));
    };

    const handleSave = () => {
        // Validate
        const validRows = rows.filter(r => r.customerId && r.amount && r.amount > 0);

        if (validRows.length === 0) {
            message.error(language === 'hi' ? 'कम से कम एक एंट्री भरें' : 'Fill at least one valid entry');
            return;
        }

        const newTransactions = validRows.map(row => ({
            id: Date.now() + Math.random().toString(), // Ensure unique ID
            customerId: row.customerId,
            type: 'credit', // 'Payment Out' = Udhari given = Credit
            amount: parseFloat(row.amount),
            date: row.date.toISOString(),
            notes: row.notes || (language === 'hi' ? 'Bulk Payment' : 'Bulk Payment'),
            createdAt: Date.now()
        }));

        setTransactions(newTransactions);

        message.success(language === 'hi' ? `${validRows.length} एंट्री सेव की गईं` : `Saved ${validRows.length} entries`);

        // Reset to one empty row
        setRows([{ id: Date.now(), customerId: null, amount: '', notes: '', date: dayjs() }]);
    };

    // Mobile-friendly Card-based Row
    const PaymentRow = ({ row, index }) => (
        <Card
            size="small"
            style={{ marginBottom: 12, background: '#fff', borderColor: '#e8e8e8', boxShadow: '0 2px 4px rgba(0,0,0,0.03)' }}
            styles={{ body: { padding: 12 } }}
        >
            <Row gutter={[12, 12]} align="middle">
                {/* 1. Customer Select */}
                <Col xs={24} md={8}>
                    <Select
                        showSearch
                        style={{ width: '100%' }}
                        placeholder={language === 'hi' ? 'ग्राहक चुनें (Search Name)' : 'Select Customer'}
                        optionFilterProp="children"
                        value={row.customerId}
                        size="large" // Big touch target
                        onChange={(val) => updateRow(row.id, 'customerId', val)}
                        filterOption={(input, option) => (option?.children ?? '').toLowerCase().includes(input.toLowerCase())}
                    >
                        {customers.map(c => <Option key={c.id} value={c.id}>{c.name}</Option>)}
                    </Select>
                </Col>

                {/* 2. Amount Input */}
                <Col xs={12} md={6}>
                    <Input
                        type="number"
                        value={row.amount}
                        size="large"
                        prefix="₹"
                        onChange={(e) => updateRow(row.id, 'amount', e.target.value)}
                        placeholder="Amount"
                        style={{ fontSize: 16 }}
                    />
                </Col>

                {/* 2.5. Date Picker */}
                <Col xs={12} md={4}>
                    <DatePicker
                        value={row.date}
                        onChange={(d) => updateRow(row.id, 'date', d || dayjs())}
                        format="DD/MM/YYYY"
                        style={{ width: '100%' }}
                        size="large"
                    />
                </Col>

                {/* 3. Note Input */}
                <Col xs={12} md={4}>
                    <Input
                        value={row.notes}
                        size="large"
                        onChange={(e) => updateRow(row.id, 'notes', e.target.value)}
                        placeholder={language === 'hi' ? 'नोट (वैकल्पिक)' : 'Note (Optional)'}
                    />
                </Col>

                {/* 4. Actions */}
                <Col xs={24} md={2} style={{ textAlign: 'center' }}>
                    <Button
                        type="text"
                        danger
                        size="large"
                        icon={<DeleteOutlined />}
                        onClick={() => removeRow(row.id)}
                        block={window.innerWidth < 768} // Block on mobile for easier tap
                    />
                </Col>
            </Row>
        </Card>
    );

    return (
        <div className="fade-in">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                <Title level={3} style={{ margin: 0 }}>
                    <DollarOutlined rotate={180} style={{ color: '#ff4d4f' }} /> {language === 'hi' ? 'उधारी एंट्री (Bulk)' : 'Debit Entry (Udhari)'}
                </Title>
                <div style={{ textAlign: 'right' }}>
                    <Button type="primary" size="large" onClick={handleSave} icon={<SaveOutlined />}
                        style={{ background: '#ff4d4f', borderColor: '#ff4d4f' }}>
                        {language === 'hi' ? 'सेव करें' : 'Save'}
                    </Button>
                </div>
            </div>

            <div style={{ maxHeight: 'calc(100vh - 200px)', overflowY: 'auto', paddingBottom: 100 }}>
                {rows.map((row, index) => (
                    <PaymentRow key={row.id} row={row} index={index} />
                ))}

                <Button
                    type="dashed"
                    onClick={addRow}
                    block
                    size="large"
                    icon={<PlusOutlined />}
                    style={{ height: 50, fontSize: 16, marginTop: 10 }}
                >
                    {language === 'hi' ? 'नई लाइन जोड़ें' : 'Add New Row'}
                </Button>
            </div>

            {/* Sticky Footer Total for Mobile & Desktop */}
            <div style={{
                position: 'fixed', bottom: 0, left: 0, right: 0,
                background: '#fff', padding: '15px 20px',
                borderTop: '1px solid #ddd',
                textAlign: 'center',
                boxShadow: '0 -4px 12px rgba(0,0,0,0.1)',
                zIndex: 1000,
                // Adjust for sidebar
                marginLeft: window.innerWidth > 768 ? 200 : 0
            }}>
                <Text strong style={{ fontSize: 18 }}>
                    Total: <span style={{ color: '#ff4d4f' }}>₹{rows.reduce((sum, r) => sum + (parseFloat(r.amount) || 0), 0)}</span>
                </Text>
            </div>
        </div>
    );
};

export default PaymentOut;
