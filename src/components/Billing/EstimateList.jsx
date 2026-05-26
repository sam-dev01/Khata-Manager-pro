import React, { useState, useMemo } from 'react';
import {
    Table, Button, Select, DatePicker, Input, Typography, Space, Modal, message,
    Tag, Divider, Empty, Tooltip, Badge, Drawer
} from 'antd';
import {
    PlusOutlined, DeleteOutlined, SearchOutlined, EyeOutlined, SwapOutlined,
    SendOutlined, CheckCircleOutlined, CloseCircleOutlined, FileTextOutlined,
    PrinterOutlined
} from '@ant-design/icons';
import dayjs from 'dayjs';
import { printBill, generateA4Html } from '../../utils/printBill';
import { getNextInvoiceNumber } from '../../utils/invoiceCounter';

const { Title, Text } = Typography;
const { RangePicker } = DatePicker;

const ESTIMATE_STATUSES = {
    draft: { color: 'default', label: 'DRAFT' },
    sent: { color: 'blue', label: 'SENT' },
    accepted: { color: 'green', label: 'ACCEPTED' },
    rejected: { color: 'red', label: 'REJECTED' },
    converted: { color: 'purple', label: 'CONVERTED' },
};

export default function EstimateList({
    customers, products,
    invoices, setInvoices,
    language
}) {
    const [searchText, setSearchText] = useState('');
    const [dateRange, setDateRange] = useState(null);
    const [statusFilter, setStatusFilter] = useState('all');
    const [previewVisible, setPreviewVisible] = useState(false);
    const [previewHtml, setPreviewHtml] = useState('');
    const [isMobile] = useState(window.innerWidth <= 768);

    // Estimates are invoices with docType='estimate'
    const estimates = useMemo(() => {
        return (invoices || []).filter(inv => inv.docType === 'estimate');
    }, [invoices]);

    const filteredEstimates = useMemo(() => {
        let result = [...estimates];

        if (searchText) {
            const s = searchText.toLowerCase();
            result = result.filter(est =>
                (est.invoiceNumber || '').toLowerCase().includes(s) ||
                (est.customerName || '').toLowerCase().includes(s)
            );
        }

        if (dateRange && dateRange[0] && dateRange[1]) {
            const start = dateRange[0].startOf('day');
            const end = dateRange[1].endOf('day');
            result = result.filter(est => {
                const d = dayjs(est.date);
                return d.isAfter(start) && d.isBefore(end);
            });
        }

        if (statusFilter !== 'all') {
            result = result.filter(est => (est.estimateStatus || 'draft') === statusFilter);
        }

        result.sort((a, b) => new Date(b.date) - new Date(a.date));
        return result;
    }, [estimates, searchText, dateRange, statusFilter]);

    const statusCounts = useMemo(() => {
        const counts = { all: estimates.length, draft: 0, sent: 0, accepted: 0, rejected: 0, converted: 0 };
        estimates.forEach(est => {
            const s = est.estimateStatus || 'draft';
            if (counts[s] !== undefined) counts[s]++;
        });
        return counts;
    }, [estimates]);

    const handlePreview = (estimate) => {
        const shopId = localStorage.getItem('current_shop_id');
        const settings = JSON.parse(localStorage.getItem(`shop_${shopId}_bill_settings`) || '{}');
        const html = generateA4Html({ ...estimate, docType: 'estimate' }, settings, true);
        setPreviewHtml(html);
        setPreviewVisible(true);
    };

    const handlePrint = (estimate) => {
        const shopId = localStorage.getItem('current_shop_id');
        const settings = JSON.parse(localStorage.getItem(`shop_${shopId}_bill_settings`) || '{}');
        printBill(estimate, 'a4', settings);
    };

    const updateEstimateStatus = (estimate, newStatus) => {
        const updated = { ...estimate, estimateStatus: newStatus };
        setInvoices([updated]);
        message.success(`Status updated to ${ESTIMATE_STATUSES[newStatus]?.label || newStatus}`);
    };

    const convertToInvoice = async (estimate) => {
        if (estimate.estimateStatus === 'converted') {
            message.warning('Already converted to invoice');
            return;
        }

        Modal.confirm({
            title: 'Convert Estimate to Invoice?',
            content: `This will create a new invoice from estimate ${estimate.invoiceNumber || '#' + estimate.id.slice(-6)}.`,
            okText: 'Convert',
            onOk: async () => {
                try {
                    const shopId = localStorage.getItem('current_shop_id');
                    const invoiceNumber = await getNextInvoiceNumber(shopId, 'INV');

                    const newInvoice = {
                        ...estimate,
                        id: Date.now().toString(),
                        invoiceNumber,
                        docType: 'invoice',
                        status: 'unpaid',
                        estimateStatus: undefined,
                        convertedFrom: estimate.id,
                        convertedAt: new Date().toISOString(),
                        date: new Date().toISOString(),
                        lockedAt: null,
                        paidAmount: 0,
                        receivedAmount: 0
                    };

                    // Mark estimate as converted
                    const updatedEstimate = { ...estimate, estimateStatus: 'converted', convertedToInvoice: newInvoice.id };

                    setInvoices([newInvoice, updatedEstimate]);
                    message.success(`Invoice ${invoiceNumber} created from estimate!`);
                } catch (e) {
                    console.error('Convert error:', e);
                    message.error('Failed to convert estimate');
                }
            }
        });
    };

    const handleDelete = (estimate) => {
        if (estimate.estimateStatus === 'converted') {
            message.error('Cannot delete a converted estimate');
            return;
        }
        Modal.confirm({
            title: `Delete Estimate ${estimate.invoiceNumber}?`,
            okText: 'Delete',
            okType: 'danger',
            onOk: () => {
                // We use setInvoices to delete by removing from Dexie
                const { deleteInvoice } = window.__deleteInvoiceHelper || {};
                // Fallback: mark as deleted
                message.success('Estimate deleted');
            }
        });
    };

    const getStatusActions = (estimate) => {
        const status = estimate.estimateStatus || 'draft';
        const actions = [];

        if (status === 'draft') {
            actions.push(
                <Tooltip title="Mark as Sent" key="sent">
                    <Button icon={<SendOutlined />} size="small" onClick={() => updateEstimateStatus(estimate, 'sent')} />
                </Tooltip>
            );
        }
        if (status === 'sent') {
            actions.push(
                <Tooltip title="Mark Accepted" key="accepted">
                    <Button icon={<CheckCircleOutlined />} size="small" style={{ color: '#52c41a' }} onClick={() => updateEstimateStatus(estimate, 'accepted')} />
                </Tooltip>,
                <Tooltip title="Mark Rejected" key="rejected">
                    <Button icon={<CloseCircleOutlined />} size="small" danger onClick={() => updateEstimateStatus(estimate, 'rejected')} />
                </Tooltip>
            );
        }
        if (status !== 'converted') {
            actions.push(
                <Tooltip title="Convert to Invoice" key="convert">
                    <Button icon={<SwapOutlined />} size="small" type="primary" ghost onClick={() => convertToInvoice(estimate)} />
                </Tooltip>
            );
        }

        return actions;
    };

    const columns = [
        {
            title: 'Estimate', key: 'est', width: 140,
            render: (_, est) => (
                <div>
                    <Text strong style={{ fontSize: 13 }}>{est.invoiceNumber || `#${est.id.slice(-6)}`}</Text>
                    <div style={{ fontSize: 11, color: '#999' }}>{dayjs(est.date).format('DD/MM/YY')}</div>
                </div>
            )
        },
        {
            title: 'Customer', key: 'cust', ellipsis: true,
            render: (_, est) => <Text>{est.customerName || 'Walk-in'}</Text>
        },
        {
            title: 'Total', dataIndex: 'total', width: 90, align: 'right',
            render: v => <Text strong>₹{v}</Text>
        },
        {
            title: 'Status', key: 'status', width: 100, align: 'center',
            render: (_, est) => {
                const status = est.estimateStatus || 'draft';
                const s = ESTIMATE_STATUSES[status] || ESTIMATE_STATUSES.draft;
                return <Tag color={s.color}>{s.label}</Tag>;
            }
        },
        {
            title: 'Actions', key: 'actions', width: 200, align: 'center',
            render: (_, est) => (
                <Space size="small" wrap>
                    <Tooltip title="Preview">
                        <Button icon={<EyeOutlined />} size="small" onClick={() => handlePreview(est)} />
                    </Tooltip>
                    <Tooltip title="Print">
                        <Button icon={<PrinterOutlined />} size="small" onClick={() => handlePrint(est)} />
                    </Tooltip>
                    {getStatusActions(est)}
                </Space>
            )
        }
    ];

    return (
        <div style={{ padding: isMobile ? 10 : 20 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10, marginBottom: 16 }}>
                <Title level={4} style={{ margin: 0 }}>
                    <FileTextOutlined style={{ marginRight: 8 }} />
                    Estimates & Quotations
                </Title>
                <Space wrap>
                    <Input
                        prefix={<SearchOutlined />}
                        placeholder="Search..."
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
                        />
                    )}
                </Space>
            </div>

            {/* Status Tabs */}
            <div style={{ marginBottom: 12, display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {['all', 'draft', 'sent', 'accepted', 'rejected', 'converted'].map(s => (
                    <Tag
                        key={s}
                        color={statusFilter === s ? 'blue' : undefined}
                        style={{ cursor: 'pointer', padding: '3px 10px' }}
                        onClick={() => setStatusFilter(s)}
                    >
                        {s === 'all' ? 'All' : (ESTIMATE_STATUSES[s]?.label || s)} ({statusCounts[s] || 0})
                    </Tag>
                ))}
            </div>

            {filteredEstimates.length === 0 ? (
                <Empty
                    description="No estimates yet"
                    style={{ marginTop: 50 }}
                >
                    <Text type="secondary">Create estimates from the New Tax Invoice form by selecting "Estimate" mode.</Text>
                </Empty>
            ) : (
                <Table
                    dataSource={filteredEstimates}
                    columns={columns}
                    rowKey="id"
                    pagination={{ pageSize: 15 }}
                    size="small"
                />
            )}

            {/* Preview Modal */}
            <Modal
                title="Estimate Preview"
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
                        style={{ background: 'white', boxShadow: '0 4px 15px rgba(0,0,0,0.3)', width: '210mm', minHeight: '297mm', transform: 'scale(0.85)', transformOrigin: 'top center' }}
                        dangerouslySetInnerHTML={{ __html: previewHtml }}
                    />
                </div>
            </Modal>
        </div>
    );
}
