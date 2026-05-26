import React, { useState, useMemo } from 'react';
import {
    Table, Button, Select, Input, Typography, Space, Modal, message,
    Tag, Switch, InputNumber, DatePicker, Form, Divider, Empty, Tooltip, Card, Row, Col
} from 'antd';
import {
    PlusOutlined, DeleteOutlined, EditOutlined, PlayCircleOutlined,
    PauseCircleOutlined, ClockCircleOutlined, CalendarOutlined,
    ReloadOutlined, ThunderboltOutlined
} from '@ant-design/icons';
import dayjs from 'dayjs';
import { getNextInvoiceNumber } from '../../utils/invoiceCounter';
import { roundToIndian } from '../../utils/gstUtils';

const { Title, Text } = Typography;
const { Option } = Select;

const FREQUENCY_OPTIONS = [
    { value: 'daily', label: 'Daily' },
    { value: 'weekly', label: 'Weekly' },
    { value: 'biweekly', label: 'Bi-Weekly' },
    { value: 'monthly', label: 'Monthly' },
    { value: 'quarterly', label: 'Quarterly' },
];

export default function RecurringInvoice({
    customers, products,
    invoices, setInvoices,
    language
}) {
    const [schedules, setSchedules] = useState(() => {
        // Load from localStorage
        try {
            return JSON.parse(localStorage.getItem('recurring_schedules') || '[]');
        } catch { return []; }
    });

    const [createModalVisible, setCreateModalVisible] = useState(false);
    const [form] = Form.useForm();
    const [isMobile] = useState(window.innerWidth <= 768);

    // Persist schedules to localStorage
    const saveSchedules = (newSchedules) => {
        setSchedules(newSchedules);
        localStorage.setItem('recurring_schedules', JSON.stringify(newSchedules));
    };

    const activeSchedules = useMemo(() => schedules.filter(s => s.active), [schedules]);
    const pausedSchedules = useMemo(() => schedules.filter(s => !s.active), [schedules]);

    const getNextDueDate = (schedule) => {
        const lastGen = schedule.lastGenerated ? dayjs(schedule.lastGenerated) : dayjs(schedule.startDate);
        switch (schedule.frequency) {
            case 'daily': return lastGen.add(1, 'day');
            case 'weekly': return lastGen.add(1, 'week');
            case 'biweekly': return lastGen.add(2, 'week');
            case 'monthly': return lastGen.add(1, 'month');
            case 'quarterly': return lastGen.add(3, 'month');
            default: return lastGen.add(1, 'month');
        }
    };

    const isDue = (schedule) => {
        const nextDue = getNextDueDate(schedule);
        return dayjs().isAfter(nextDue) || dayjs().isSame(nextDue, 'day');
    };

    const handleCreate = (values) => {
        const customer = customers.find(c => c.id === values.customerId);
        const newSchedule = {
            id: Date.now().toString(),
            name: values.name,
            customerId: values.customerId,
            customerName: customer?.name || 'Walk-in',
            frequency: values.frequency,
            amount: values.amount,
            description: values.description || '',
            items: [{
                name: values.name || 'Recurring Service',
                qty: 1,
                price: values.amount,
                unit: 'Pcs',
                gstRate: values.gstRate || 0,
                hsn: '',
                discount: 0,
                discountType: 'flat'
            }],
            startDate: values.startDate?.toISOString() || new Date().toISOString(),
            lastGenerated: null,
            generatedCount: 0,
            active: true,
            createdAt: new Date().toISOString()
        };

        saveSchedules([...schedules, newSchedule]);
        setCreateModalVisible(false);
        form.resetFields();
        message.success('Recurring schedule created!');
    };

    const toggleSchedule = (id) => {
        const updated = schedules.map(s =>
            s.id === id ? { ...s, active: !s.active } : s
        );
        saveSchedules(updated);
    };

    const deleteSchedule = (id) => {
        Modal.confirm({
            title: 'Delete this recurring schedule?',
            okText: 'Delete',
            okType: 'danger',
            onOk: () => {
                saveSchedules(schedules.filter(s => s.id !== id));
                message.success('Schedule deleted');
            }
        });
    };

    const generateInvoice = async (schedule) => {
        try {
            const shopId = localStorage.getItem('current_shop_id');
            const invoiceNumber = await getNextInvoiceNumber(shopId, 'INV');

            const newInvoice = {
                id: Date.now().toString(),
                invoiceNumber,
                docType: 'invoice',
                date: new Date().toISOString(),
                items: schedule.items.map(item => ({
                    ...item,
                    id: 'recurring_' + Date.now() + Math.random(),
                    amount: item.qty * item.price,
                    stock: 999
                })),
                subTotal: schedule.amount,
                billDiscount: 0,
                totalItemDiscount: 0,
                taxBreakup: { cgst: 0, sgst: 0, igst: 0, totalTax: 0, slabWise: {} },
                total: roundToIndian(schedule.amount),
                receivedAmount: 0,
                paidAmount: 0,
                paymentMode: 'credit',
                customerId: schedule.customerId,
                customerName: schedule.customerName,
                shopName: localStorage.getItem('current_shop_name') || 'My Shop',
                type: 'a4',
                isGstBill: false,
                status: 'unpaid',
                recurringScheduleId: schedule.id,
                isRecurring: true
            };

            setInvoices([newInvoice]);

            // Update schedule
            const updated = schedules.map(s =>
                s.id === schedule.id ? {
                    ...s,
                    lastGenerated: new Date().toISOString(),
                    generatedCount: (s.generatedCount || 0) + 1
                } : s
            );
            saveSchedules(updated);

            message.success(`Invoice ${invoiceNumber} generated from recurring schedule`);
        } catch (e) {
            console.error('Generate recurring invoice error:', e);
            message.error('Failed to generate invoice');
        }
    };

    const generateAllDue = async () => {
        const dueSchedules = activeSchedules.filter(isDue);
        if (dueSchedules.length === 0) {
            message.info('No invoices are due');
            return;
        }

        for (const schedule of dueSchedules) {
            await generateInvoice(schedule);
        }
        message.success(`${dueSchedules.length} invoice(s) generated`);
    };

    const columns = [
        {
            title: 'Name', dataIndex: 'name', ellipsis: true,
            render: (name, s) => (
                <div>
                    <Text strong>{name}</Text>
                    <div style={{ fontSize: 11, color: '#999' }}>{s.customerName}</div>
                </div>
            )
        },
        {
            title: 'Amount', dataIndex: 'amount', width: 90, align: 'right',
            render: v => <Text strong>₹{v}</Text>
        },
        {
            title: 'Frequency', dataIndex: 'frequency', width: 100,
            render: v => <Tag color="blue">{v?.toUpperCase()}</Tag>
        },
        {
            title: 'Next Due', key: 'nextDue', width: 120,
            render: (_, s) => {
                if (!s.active) return <Text type="secondary">Paused</Text>;
                const nextDue = getNextDueDate(s);
                const overdue = isDue(s);
                return (
                    <div>
                        <Text style={{ color: overdue ? '#ff4d4f' : '#333' }}>
                            {nextDue.format('DD/MM/YY')}
                        </Text>
                        {overdue && <Tag color="red" style={{ fontSize: 10, marginLeft: 4 }}>DUE</Tag>}
                    </div>
                );
            }
        },
        {
            title: 'Generated', key: 'count', width: 80, align: 'center',
            render: (_, s) => <Tag>{s.generatedCount || 0}</Tag>
        },
        {
            title: 'Status', key: 'active', width: 80,
            render: (_, s) => (
                <Switch checked={s.active} onChange={() => toggleSchedule(s.id)} size="small" />
            )
        },
        {
            title: 'Actions', key: 'actions', width: 130,
            render: (_, s) => (
                <Space size="small">
                    {s.active && isDue(s) && (
                        <Tooltip title="Generate Now">
                            <Button icon={<ThunderboltOutlined />} size="small" type="primary" onClick={() => generateInvoice(s)} />
                        </Tooltip>
                    )}
                    <Tooltip title="Delete">
                        <Button icon={<DeleteOutlined />} size="small" danger onClick={() => deleteSchedule(s.id)} />
                    </Tooltip>
                </Space>
            )
        }
    ];

    const dueCount = activeSchedules.filter(isDue).length;

    return (
        <div style={{ padding: isMobile ? 10 : 20 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10, marginBottom: 16 }}>
                <Title level={4} style={{ margin: 0 }}>
                    <ClockCircleOutlined style={{ marginRight: 8 }} />
                    Recurring Invoices
                </Title>
                <Space>
                    {dueCount > 0 && (
                        <Button type="primary" icon={<ThunderboltOutlined />} onClick={generateAllDue}>
                            Generate All Due ({dueCount})
                        </Button>
                    )}
                    <Button type="primary" icon={<PlusOutlined />} onClick={() => setCreateModalVisible(true)}>
                        New Schedule
                    </Button>
                </Space>
            </div>

            {/* Summary Cards */}
            <Row gutter={12} style={{ marginBottom: 16 }}>
                <Col xs={8}>
                    <Card size="small" style={{ textAlign: 'center', background: '#f6ffed' }}>
                        <div style={{ fontSize: 20, fontWeight: 'bold', color: '#52c41a' }}>{activeSchedules.length}</div>
                        <Text type="secondary" style={{ fontSize: 11 }}>Active</Text>
                    </Card>
                </Col>
                <Col xs={8}>
                    <Card size="small" style={{ textAlign: 'center', background: dueCount > 0 ? '#fff2e8' : '#fafafa' }}>
                        <div style={{ fontSize: 20, fontWeight: 'bold', color: dueCount > 0 ? '#fa8c16' : '#999' }}>{dueCount}</div>
                        <Text type="secondary" style={{ fontSize: 11 }}>Due Now</Text>
                    </Card>
                </Col>
                <Col xs={8}>
                    <Card size="small" style={{ textAlign: 'center' }}>
                        <div style={{ fontSize: 20, fontWeight: 'bold' }}>{pausedSchedules.length}</div>
                        <Text type="secondary" style={{ fontSize: 11 }}>Paused</Text>
                    </Card>
                </Col>
            </Row>

            {schedules.length === 0 ? (
                <Empty description="No recurring schedules" style={{ marginTop: 50 }}>
                    <Button type="primary" icon={<PlusOutlined />} onClick={() => setCreateModalVisible(true)}>
                        Create First Schedule
                    </Button>
                </Empty>
            ) : (
                <Table
                    dataSource={schedules}
                    columns={columns}
                    rowKey="id"
                    pagination={{ pageSize: 10 }}
                    size="small"
                />
            )}

            {/* Create Schedule Modal */}
            <Modal
                title="Create Recurring Invoice Schedule"
                open={createModalVisible}
                onCancel={() => setCreateModalVisible(false)}
                footer={null}
                width={500}
                centered
                destroyOnClose
            >
                <Form form={form} layout="vertical" onFinish={handleCreate}>
                    <Form.Item name="name" label="Service / Item Name" rules={[{ required: true, message: 'Required' }]}>
                        <Input placeholder="e.g. Monthly Maintenance, Internet Bill" />
                    </Form.Item>

                    <Form.Item name="customerId" label="Customer" rules={[{ required: true, message: 'Select customer' }]}>
                        <Select showSearch optionFilterProp="children" placeholder="Select Customer">
                            {customers.map(c => <Option key={c.id} value={c.id}>{c.name}</Option>)}
                        </Select>
                    </Form.Item>

                    <Row gutter={12}>
                        <Col span={12}>
                            <Form.Item name="amount" label="Amount (₹)" rules={[{ required: true, message: 'Required' }]}>
                                <InputNumber style={{ width: '100%' }} min={1} placeholder="1000" />
                            </Form.Item>
                        </Col>
                        <Col span={12}>
                            <Form.Item name="frequency" label="Frequency" rules={[{ required: true, message: 'Required' }]}>
                                <Select placeholder="Select">
                                    {FREQUENCY_OPTIONS.map(f => <Option key={f.value} value={f.value}>{f.label}</Option>)}
                                </Select>
                            </Form.Item>
                        </Col>
                    </Row>

                    <Row gutter={12}>
                        <Col span={12}>
                            <Form.Item name="startDate" label="Start Date" initialValue={dayjs()}>
                                <DatePicker style={{ width: '100%' }} format="DD/MM/YYYY" />
                            </Form.Item>
                        </Col>
                        <Col span={12}>
                            <Form.Item name="gstRate" label="GST Rate (%)" initialValue={0}>
                                <Select>
                                    <Option value={0}>0%</Option>
                                    <Option value={5}>5%</Option>
                                    <Option value={12}>12%</Option>
                                    <Option value={18}>18%</Option>
                                    <Option value={28}>28%</Option>
                                </Select>
                            </Form.Item>
                        </Col>
                    </Row>

                    <Form.Item name="description" label="Description (optional)">
                        <Input.TextArea rows={2} placeholder="Any notes about this recurring charge" />
                    </Form.Item>

                    <Button type="primary" htmlType="submit" block size="large" icon={<CalendarOutlined />}>
                        Create Schedule
                    </Button>
                </Form>
            </Modal>
        </div>
    );
}
