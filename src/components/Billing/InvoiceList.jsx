import React, { useState, useMemo, useEffect } from 'react';
import {
    Table, Button, Select, DatePicker, Input, Typography, Space, Modal, message,
    Tag, Drawer, InputNumber, Divider, Badge, List, Tabs, Radio, Empty, Tooltip, Popover
} from 'antd';
import {
    PrinterOutlined, DeleteOutlined, SearchOutlined, EyeOutlined,
    DollarOutlined, HistoryOutlined, LockOutlined, FilterOutlined,
    MoneyCollectOutlined, PlusOutlined, ShareAltOutlined, InfoCircleOutlined
} from '@ant-design/icons';
import ShareInvoiceModal from '../Invoice/ShareInvoiceModal';
import dayjs from 'dayjs';
import { printBill, generatePosHtml, generateA4Html } from '../../utils/printBill';
import { deriveInvoiceStatus, getStatusColor, getStatusLabel, getTotalPaidForInvoice } from '../../utils/statusUtils';

const { Title, Text } = Typography;
const { RangePicker } = DatePicker;
const { Option } = Select;

export default function InvoiceList({
    customers, products, setCustomers, setProducts,
    transactions, setTransactions,
    language, invoices, setInvoices, deleteInvoice,
    payments = [], setPayments, deletePayment
}) {
    const [searchText, setSearchText] = useState('');
    const [dateRange, setDateRange] = useState(null);
    const [statusFilter, setStatusFilter] = useState('all');
    const [activeTab, setActiveTab] = useState('pos'); // 'pos' or 'a4'
    const [previewVisible, setPreviewVisible] = useState(false);
    const [previewHtml, setPreviewHtml] = useState('');

    // Payment recording
    const [paymentModalVisible, setPaymentModalVisible] = useState(false);
    const [paymentInvoice, setPaymentInvoice] = useState(null);
    const [paymentAmount, setPaymentAmount] = useState('');
    const [paymentMode, setPaymentMode] = useState('cash');
    const [paymentNotes, setPaymentNotes] = useState('');

    // Payment history
    const [historyDrawerVisible, setHistoryDrawerVisible] = useState(false);
    const [historyInvoice, setHistoryInvoice] = useState(null);

    // Share Modal
    const [shareModalVisible, setShareModalVisible] = useState(false);
    const [shareInvoice, setShareInvoice] = useState(null);

    const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);

    useEffect(() => {
        const handleResize = () => setIsMobile(window.innerWidth <= 768);
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    // Enrich invoices with derived status and paid amount
    const enrichedInvoices = useMemo(() => {
        return invoices.map(inv => {
            const totalPaid = getTotalPaidForInvoice(inv.id, payments);
            // Use existing receivedAmount if no payments table records exist
            const effectivePaid = totalPaid > 0 ? totalPaid : (inv.receivedAmount || inv.paidAmount || 0);
            const status = deriveInvoiceStatus(inv.total, effectivePaid, inv.paymentMode);
            return {
                ...inv,
                computedPaidAmount: effectivePaid,
                computedStatus: status
            };
        });
    }, [invoices, payments]);

    // Filtered & sorted invoices
    const filteredInvoices = useMemo(() => {
        let result = [...enrichedInvoices];

        // Filter by Tab (POS vs A4)
        // Default to 'pos' if type is missing or null, unless it's explicitly 'a4'
        result = result.filter(inv => {
            const type = inv.type || 'pos';
            return type === activeTab;
        });

        // Text Search
        if (searchText) {
            const s = searchText.toLowerCase();
            result = result.filter(inv =>
                (inv.invoiceNumber || '').toLowerCase().includes(s) ||
                (inv.customerName || '').toLowerCase().includes(s) ||
                (inv.id || '').toLowerCase().includes(s) ||
                (customers.find(c => c.id === inv.customerId)?.name || '').toLowerCase().includes(s)
            );
        }

        // Date Filter
        if (dateRange && dateRange[0] && dateRange[1]) {
            const start = dateRange[0].startOf('day');
            const end = dateRange[1].endOf('day');
            result = result.filter(inv => {
                const invDate = dayjs(inv.date);
                return invDate.isAfter(start) && invDate.isBefore(end);
            });
        }

        // Status Filter
        if (statusFilter !== 'all') {
            result = result.filter(inv => inv.computedStatus === statusFilter);
        }

        // Sort by date desc
        result.sort((a, b) => new Date(b.date) - new Date(a.date));
        return result;
    }, [enrichedInvoices, searchText, dateRange, statusFilter, customers, activeTab]);

    // Status counts for tabs
    const statusCounts = useMemo(() => {
        const counts = { all: 0, paid: 0, partial: 0, unpaid: 0, draft: 0 };
        // We only count stats for the CURRENT active tab (pos or a4)
        // to avoid confusion
        const currentTabInvoices = enrichedInvoices.filter(inv => (inv.type || 'pos') === activeTab);

        counts.all = currentTabInvoices.length;
        currentTabInvoices.forEach(inv => {
            if (counts[inv.computedStatus] !== undefined) counts[inv.computedStatus]++;
        });
        return counts;
    }, [enrichedInvoices, activeTab]);

    const handleDelete = (invoice) => {
        // Block deletion of locked invoices
        if (invoice.lockedAt) {
            message.error('Cannot delete a finalized (locked) invoice');
            return;
        }
        Modal.confirm({
            title: `Delete Invoice ${invoice.invoiceNumber || '#' + invoice.id}?`,
            content: 'This action cannot be undone.',
            okText: 'Delete',
            okType: 'danger',
            onOk() {
                deleteInvoice(invoice.id);
                message.success('Invoice deleted');
            },
        });
    };

    const handlePrint = (invoice, type = 'pos') => {
        const shopId = localStorage.getItem('current_shop_id');
        const settings = JSON.parse(localStorage.getItem(`shop_${shopId}_bill_settings`) || '{}');
        printBill(invoice, type, settings);
        message.success('Printing...');
    };

    const handlePreview = (invoice) => {
        const shopId = localStorage.getItem('current_shop_id');
        const settings = JSON.parse(localStorage.getItem(`shop_${shopId}_bill_settings`) || '{}');
        const type = invoice.type || 'pos';
        const html = type === 'a4'
            ? generateA4Html(invoice, settings, true)
            : generatePosHtml(invoice, settings, true);
        setPreviewHtml(html);
        setPreviewVisible(true);
    };

    // --- PAYMENT RECORDING ---
    const openPaymentModal = (invoice) => {
        setPaymentInvoice(invoice);
        setPaymentAmount('');
        setPaymentMode('cash');
        setPaymentNotes('');
        setPaymentModalVisible(true);
    };

    const recordPayment = () => {
        if (!paymentAmount || parseFloat(paymentAmount) <= 0) {
            message.error('Enter a valid payment amount');
            return;
        }
        const amt = parseFloat(paymentAmount);
        const remaining = paymentInvoice.total - paymentInvoice.computedPaidAmount;
        if (amt > remaining + 0.99) {
            message.warning('Payment exceeds remaining balance');
        }

        const newPayment = {
            id: Date.now().toString(),
            invoiceId: paymentInvoice.id,
            invoiceNumber: paymentInvoice.invoiceNumber || '',
            amount: amt,
            mode: paymentMode,
            notes: paymentNotes,
            date: new Date().toISOString(),
            shopId: localStorage.getItem('current_shop_id')
        };

        setPayments([newPayment]);
        message.success(`₹${amt} payment recorded`);
        setPaymentModalVisible(false);
    };

    // --- PAYMENT HISTORY ---
    const openPaymentHistory = (invoice) => {
        setHistoryInvoice(invoice);
        setHistoryDrawerVisible(true);
    };

    const handleShare = (invoice) => {
        setShareInvoice(invoice);
        setShareModalVisible(true);
    };

    const invoicePayments = useMemo(() => {
        if (!historyInvoice) return [];
        return payments.filter(p => p.invoiceId === historyInvoice.id)
            .sort((a, b) => new Date(b.date) - new Date(a.date));
    }, [historyInvoice, payments]);

    const getCustomerName = (inv) => {
        if (inv.customerName) return inv.customerName;
        const c = customers.find(x => x.id === inv.customerId);
        return c ? c.name : 'Walk-in';
    };

    // --- TABLE COLUMNS ---
    const columns = [
        {
            title: 'Invoice', key: 'inv', width: 145,
            render: (_, inv) => {
                const itemDiscount = Number(inv.totalItemDiscount || 0);
                const billDiscount = Number(inv.billDiscount || 0);
                const subtotal = (inv.items || []).reduce((s, it) => s + (it.itemTotal || it.price * (it.qty || 1) || 0), 0);
                const balance = Math.max(0, inv.total - inv.computedPaidAmount);
                const breakdownContent = (
                    <div style={{ minWidth: 210, fontSize: 13 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0' }}>
                            <span style={{ color: '#555' }}>Subtotal (items):</span>
                            <strong>₹{Math.round(subtotal).toLocaleString('en-IN')}</strong>
                        </div>
                        {itemDiscount > 0 && (
                            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0' }}>
                                <span style={{ color: '#555' }}>Item Discounts:</span>
                                <span style={{ color: '#c2410c' }}>-₹{Math.round(itemDiscount).toLocaleString('en-IN')}</span>
                            </div>
                        )}
                        {billDiscount > 0 && (
                            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0' }}>
                                <span style={{ color: '#555' }}>Bill Discount:</span>
                                <span style={{ color: '#c2410c' }}>-₹{Math.round(billDiscount).toLocaleString('en-IN')}</span>
                            </div>
                        )}
                        {inv.taxBreakup?.totalTax > 0 && (
                            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0' }}>
                                <span style={{ color: '#555' }}>GST:</span>
                                <span style={{ color: '#6366f1' }}>+₹{Math.round(inv.taxBreakup.totalTax).toLocaleString('en-IN')}</span>
                            </div>
                        )}
                        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderTop: '1px solid #e5e7eb', marginTop: 4, fontWeight: 700 }}>
                            <span>Final Total:</span>
                            <span>₹{inv.total?.toLocaleString('en-IN')}</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0' }}>
                            <span style={{ color: '#555' }}>Amount Paid:</span>
                            <span style={{ color: '#15803d' }}>₹{Math.round(inv.computedPaidAmount).toLocaleString('en-IN')}</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', fontWeight: 700 }}>
                            <span>Balance Due:</span>
                            <span style={{ color: balance > 0 ? '#dc2626' : '#15803d' }}>₹{Math.round(balance).toLocaleString('en-IN')}</span>
                        </div>
                        {inv.paymentMode && (
                            <div style={{ marginTop: 6 }}>
                                <Tag>{(inv.paymentMode).toUpperCase()}</Tag>
                            </div>
                        )}
                    </div>
                );
                return (
                    <Popover content={breakdownContent} title={`Bill Breakdown — ${inv.invoiceNumber || '#' + inv.id.slice(-6)}`} trigger="click" placement="right">
                        <div style={{ cursor: 'pointer' }}>
                            <Space size={4}>
                                <Text strong style={{ fontSize: 13 }}>{inv.invoiceNumber || `#${inv.id.slice(-6)}`}</Text>
                                <InfoCircleOutlined style={{ color: '#1890ff', fontSize: 11 }} />
                            </Space>
                            <div style={{ fontSize: 11, color: '#999' }}>{dayjs(inv.date).format('DD/MM/YY HH:mm')}</div>
                            {inv.docType && inv.docType !== 'invoice' && (
                                <Tag color={inv.docType === 'estimate' ? 'blue' : 'purple'} style={{ fontSize: 10, marginTop: 2 }}>
                                    {inv.docType.toUpperCase()}
                                </Tag>
                            )}
                        </div>
                    </Popover>
                );
            },
            sorter: (a, b) => new Date(b.date) - new Date(a.date)
        },
        {
            title: 'Customer', key: 'cust', ellipsis: true,
            render: (_, inv) => <Text>{getCustomerName(inv)}</Text>,
            responsive: ['md']
        },
        {
            title: 'Total', dataIndex: 'total', width: 90, align: 'right',
            render: v => <Text strong>₹{v}</Text>,
            sorter: (a, b) => a.total - b.total
        },
        {
            title: 'Paid', key: 'paid', width: 90, align: 'right',
            render: (_, inv) => (
                <Text style={{ color: inv.computedPaidAmount >= inv.total ? '#52c41a' : '#fa8c16' }}>
                    ₹{Math.round(inv.computedPaidAmount)}
                </Text>
            )
        },
        {
            title: 'Status', key: 'status', width: 90, align: 'center',
            render: (_, inv) => (
                <Tag color={getStatusColor(inv.computedStatus)}>
                    {getStatusLabel(inv.computedStatus)}
                </Tag>
            ),
            filters: [
                { text: 'Paid', value: 'paid' },
                { text: 'Partial', value: 'partial' },
                { text: 'Unpaid', value: 'unpaid' },
                { text: 'Draft', value: 'draft' },
            ],
            onFilter: (value, record) => record.computedStatus === value
        },
        {
            title: 'Actions', key: 'actions', width: 180, align: 'center',
            render: (_, inv) => (
                <Space size="small" wrap>
                    <Tooltip title="Preview">
                        <Button icon={<EyeOutlined />} size="small" onClick={() => handlePreview(inv)} />
                    </Tooltip>
                    <Tooltip title="Print">
                        <Button icon={<PrinterOutlined />} size="small" onClick={() => handlePrint(inv, inv.type || 'pos')} />
                    </Tooltip>
                    <Tooltip title="Share">
                        <Button icon={<ShareAltOutlined />} size="small" onClick={() => handleShare(inv)} style={{ color: '#1890ff', borderColor: '#1890ff' }} />
                    </Tooltip>
                    {inv.computedStatus !== 'paid' && (
                        <Tooltip title="Record Payment">
                            <Button icon={<DollarOutlined />} size="small" type="primary" ghost onClick={() => openPaymentModal(inv)} />
                        </Tooltip>
                    )}
                    <Tooltip title="Payment History">
                        <Badge count={payments.filter(p => p.invoiceId === inv.id).length} size="small">
                            <Button icon={<HistoryOutlined />} size="small" onClick={() => openPaymentHistory(inv)} />
                        </Badge>
                    </Tooltip>
                    {inv.lockedAt ? (
                        <Tooltip title="Locked (Finalized)">
                            <LockOutlined style={{ color: '#999', fontSize: 14 }} />
                        </Tooltip>
                    ) : (
                        <Tooltip title="Delete">
                            <Button icon={<DeleteOutlined />} size="small" danger onClick={() => handleDelete(inv)} />
                        </Tooltip>
                    )}
                </Space>
            )
        }
    ];

    // Mobile columns (simplified)
    const mobileColumns = [
        {
            title: 'Invoice', key: 'inv',
            render: (_, inv) => (
                <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Text strong>{inv.invoiceNumber || `#${inv.id.slice(-6)}`}</Text>
                        <Tag color={getStatusColor(inv.computedStatus)} style={{ margin: 0 }}>
                            {getStatusLabel(inv.computedStatus)}
                        </Tag>
                    </div>
                    <div style={{ fontSize: 12, color: '#888', marginTop: 2 }}>
                        {getCustomerName(inv)} • {dayjs(inv.date).format('DD/MM')}
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 }}>
                        <Text strong style={{ color: '#1890ff' }}>₹{inv.total}</Text>
                        <Space size="small">
                            <Button icon={<EyeOutlined />} size="small" onClick={() => handlePreview(inv)} />
                            <Button icon={<PrinterOutlined />} size="small" onClick={() => handlePrint(inv, inv.type || 'pos')} />
                            <Button icon={<ShareAltOutlined />} size="small" onClick={() => handleShare(inv)} style={{ color: '#1890ff', borderColor: '#1890ff' }} />
                            {inv.computedStatus !== 'paid' && (
                                <Button icon={<DollarOutlined />} size="small" type="primary" ghost onClick={() => openPaymentModal(inv)} />
                            )}
                            {inv.lockedAt ? (
                                <LockOutlined style={{ color: '#999' }} />
                            ) : (
                                <Button icon={<DeleteOutlined />} size="small" danger onClick={() => handleDelete(inv)} />
                            )}
                        </Space>
                    </div>
                </div>
            )
        }
    ];

    return (
        <div style={{ padding: isMobile ? 10 : 20 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10, marginBottom: 16 }}>
                <Title level={4} style={{ margin: 0 }}>Invoice History</Title>
                <Space wrap>
                    <Input
                        prefix={<SearchOutlined />}
                        placeholder="Search invoices..."
                        value={searchText}
                        onChange={e => setSearchText(e.target.value)}
                        style={{ width: isMobile ? '100%' : 200 }}
                        allowClear
                    />
                    {!isMobile && (
                        <RangePicker
                            value={dateRange}
                            onChange={setDateRange}
                            format="DD/MM/YYYY"
                            style={{ width: 250 }}
                        />
                    )}
                </Space>
            </div>

            {/* Type Tabs (POS / A4) */}
            <Tabs
                activeKey={activeTab}
                onChange={setActiveTab}
                type="card"
                style={{ marginBottom: 16 }}
                items={[
                    { label: 'POS Invoices', key: 'pos' },
                    { label: 'A4 Invoices', key: 'a4' }
                ]}
            />


            {/* Status Filter Tabs */}
            <div style={{ marginBottom: 12 }}>
                <Radio.Group value={statusFilter} onChange={e => setStatusFilter(e.target.value)} buttonStyle="solid" size="small">
                    <Radio.Button value="all">All ({statusCounts.all})</Radio.Button>
                    <Radio.Button value="paid"><span style={{ color: statusFilter === 'paid' ? '#fff' : '#52c41a' }}>Paid ({statusCounts.paid})</span></Radio.Button>
                    <Radio.Button value="partial"><span style={{ color: statusFilter === 'partial' ? '#fff' : '#fa8c16' }}>Partial ({statusCounts.partial})</span></Radio.Button>
                    <Radio.Button value="unpaid"><span style={{ color: statusFilter === 'unpaid' ? '#fff' : '#ff4d4f' }}>Unpaid ({statusCounts.unpaid})</span></Radio.Button>
                    <Radio.Button value="draft">Draft ({statusCounts.draft})</Radio.Button>
                </Radio.Group>
            </div>

            {filteredInvoices.length === 0 ? (
                <Empty description="No invoices found" style={{ marginTop: 50 }} />
            ) : (
                <Table
                    dataSource={filteredInvoices}
                    columns={isMobile ? mobileColumns : columns}
                    rowKey="id"
                    pagination={{ pageSize: 15, showSizeChanger: false, showTotal: (total) => `${total} invoices` }}
                    size="small"
                    scroll={{ x: isMobile ? undefined : 800 }}
                />
            )}

            {/* PREVIEW MODAL */}
            <Modal
                title="Invoice Preview"
                open={previewVisible}
                onCancel={() => setPreviewVisible(false)}
                width={900}
                centered
                footer={[
                    <Button key="close" onClick={() => setPreviewVisible(false)}>Close</Button>,
                    <Button key="print" icon={<PrinterOutlined />} type="primary" onClick={() => {
                        const win = window.open('', '', 'width=800,height=600');
                        win.document.write(previewHtml);
                        win.document.write('<script>window.onload = function() { window.print(); }</script>');
                        win.document.close();
                    }}>Print</Button>
                ]}
            >
                <div style={{ border: '1px solid #ddd', height: '65vh', overflow: 'auto', background: '#525659', padding: 20, display: 'flex', justifyContent: 'center' }}>
                    <div
                        style={{ background: 'white', boxShadow: '0 4px 15px rgba(0,0,0,0.3)', width: '210mm', minHeight: '297mm', padding: 0, transform: 'scale(0.85)', transformOrigin: 'top center' }}
                        dangerouslySetInnerHTML={{ __html: previewHtml }}
                    />
                </div>
            </Modal>

            {/* RECORD PAYMENT MODAL */}
            <Modal
                title={
                    <div>
                        Record Payment
                        {paymentInvoice && (
                            <Text type="secondary" style={{ marginLeft: 8, fontSize: 13 }}>
                                for {paymentInvoice.invoiceNumber || '#' + paymentInvoice.id.slice(-6)}
                            </Text>
                        )}
                    </div>
                }
                open={paymentModalVisible}
                onCancel={() => setPaymentModalVisible(false)}
                onOk={recordPayment}
                okText="Record Payment"
                centered
                width={420}
            >
                {paymentInvoice && (
                    <div>
                        <div style={{ background: '#f6ffed', padding: 12, borderRadius: 8, marginBottom: 16 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                                <Text type="secondary">Invoice Total:</Text>
                                <Text strong>₹{paymentInvoice.total}</Text>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                                <Text type="secondary">Already Paid:</Text>
                                <Text style={{ color: '#52c41a' }}>₹{Math.round(paymentInvoice.computedPaidAmount)}</Text>
                            </div>
                            <Divider style={{ margin: '6px 0' }} />
                            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                <Text strong>Remaining:</Text>
                                <Text strong style={{ color: '#ff4d4f', fontSize: 16 }}>
                                    ₹{Math.round(paymentInvoice.total - paymentInvoice.computedPaidAmount)}
                                </Text>
                            </div>
                        </div>

                        <div style={{ marginBottom: 12 }}>
                            <Text strong>Payment Amount (₹):</Text>
                            <InputNumber
                                style={{ width: '100%', marginTop: 4 }}
                                size="large"
                                min={1}
                                max={paymentInvoice.total}
                                value={paymentAmount}
                                onChange={setPaymentAmount}
                                placeholder="Enter amount"
                                autoFocus
                            />
                        </div>

                        <div style={{ marginBottom: 12 }}>
                            <Text strong>Payment Mode:</Text>
                            <Select value={paymentMode} onChange={setPaymentMode} style={{ width: '100%', marginTop: 4 }}>
                                <Option value="cash">Cash</Option>
                                <Option value="online">Online / UPI</Option>
                                <Option value="cheque">Cheque</Option>
                                <Option value="other">Other</Option>
                            </Select>
                        </div>

                        <div>
                            <Text strong>Notes (optional):</Text>
                            <Input.TextArea
                                rows={2}
                                value={paymentNotes}
                                onChange={e => setPaymentNotes(e.target.value)}
                                placeholder="Payment reference, cheque number, etc."
                                style={{ marginTop: 4 }}
                            />
                        </div>
                    </div>
                )}
            </Modal>

            {/* PAYMENT HISTORY DRAWER */}
            <Drawer
                title={
                    <div>
                        Payment History
                        {historyInvoice && (
                            <Text type="secondary" style={{ marginLeft: 8, fontSize: 13 }}>
                                {historyInvoice.invoiceNumber || '#' + historyInvoice.id?.slice(-6)}
                            </Text>
                        )}
                    </div>
                }
                open={historyDrawerVisible}
                onClose={() => setHistoryDrawerVisible(false)}
                width={400}
            >
                {historyInvoice && (
                    <div>
                        {/* Summary */}
                        <div style={{ background: '#f6f8fa', padding: 12, borderRadius: 8, marginBottom: 16 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                                <Text>Invoice Total:</Text>
                                <Text strong>₹{historyInvoice.total}</Text>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                                <Text>Total Paid:</Text>
                                <Text strong style={{ color: '#52c41a' }}>₹{Math.round(historyInvoice.computedPaidAmount)}</Text>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                <Text>Balance:</Text>
                                <Text strong style={{ color: historyInvoice.total - historyInvoice.computedPaidAmount > 0 ? '#ff4d4f' : '#52c41a' }}>
                                    ₹{Math.round(historyInvoice.total - historyInvoice.computedPaidAmount)}
                                </Text>
                            </div>
                            <div style={{ marginTop: 6 }}>
                                <Tag color={getStatusColor(historyInvoice.computedStatus)}>
                                    {getStatusLabel(historyInvoice.computedStatus)}
                                </Tag>
                            </div>
                        </div>

                        {/* Payment List */}
                        {invoicePayments.length === 0 ? (
                            <Empty description="No payments recorded yet" />
                        ) : (
                            <List
                                dataSource={invoicePayments}
                                renderItem={payment => (
                                    <List.Item
                                        actions={[
                                            <Button
                                                key="del" size="small" danger icon={<DeleteOutlined />}
                                                onClick={() => {
                                                    Modal.confirm({
                                                        title: 'Delete this payment?',
                                                        onOk: () => {
                                                            deletePayment(payment.id);
                                                            message.success('Payment deleted');
                                                        }
                                                    });
                                                }}
                                            />
                                        ]}
                                    >
                                        <List.Item.Meta
                                            title={
                                                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                                    <Text strong style={{ color: '#52c41a' }}>₹{payment.amount}</Text>
                                                    <Tag>{payment.mode || 'cash'}</Tag>
                                                </div>
                                            }
                                            description={
                                                <div>
                                                    <div style={{ fontSize: 12, color: '#999' }}>{dayjs(payment.date).format('DD/MM/YYYY HH:mm')}</div>
                                                    {payment.notes && <div style={{ fontSize: 12, marginTop: 2 }}>{payment.notes}</div>}
                                                </div>
                                            }
                                        />
                                    </List.Item>
                                )}
                            />
                        )}

                        {/* Quick add payment button */}
                        {historyInvoice.computedStatus !== 'paid' && (
                            <Button
                                type="primary" block icon={<PlusOutlined />}
                                style={{ marginTop: 16 }}
                                onClick={() => {
                                    setHistoryDrawerVisible(false);
                                    openPaymentModal(historyInvoice);
                                }}
                            >
                                Record New Payment
                            </Button>
                        )}
                    </div>
                )}
            </Drawer>

            <ShareInvoiceModal
                visible={shareModalVisible}
                onCancel={() => setShareModalVisible(false)}
                invoice={shareInvoice}
            />
        </div>
    );
}
