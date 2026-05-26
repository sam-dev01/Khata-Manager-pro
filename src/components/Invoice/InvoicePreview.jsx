import React, { useState, useMemo, useRef } from 'react';
import { Modal, Select, Button, Space, Tooltip, Divider, Tag, Segmented } from 'antd';
import {
    PrinterOutlined, EyeOutlined, FilePdfOutlined,
    ExpandOutlined, CompressOutlined, MailOutlined,
    ShareAltOutlined, DownloadOutlined, ZoomInOutlined, ZoomOutOutlined
} from '@ant-design/icons';
import { renderInvoiceHTML, getAllTemplates } from './InvoiceTemplateEngine';

// Ensure all templates are registered
import './templates/index';

const { Option, OptGroup } = Select;

const CATEGORIES = [
    { key: 'all', label: 'All' },
    { key: 'modern', label: 'Modern' },
    { key: 'classic', label: 'Classic' },
    { key: 'gst', label: 'GST' },
    { key: 'thermal', label: 'Thermal' },
    { key: 'minimal', label: 'Minimal' },
];

const CATEGORY_COLORS = {
    modern: '#6366f1',
    classic: '#059669',
    gst: '#d97706',
    thermal: '#dc2626',
    minimal: '#6b7280',
    retail: '#2563eb',
    service: '#7c3aed',
};

export default function InvoicePreview({
    open,
    onClose,
    invoice,
    firmSettings,
    defaultTemplate,
    onPrint,
    onExportPDF,
    onShare,
}) {
    const [selectedTemplate, setSelectedTemplate] = useState(defaultTemplate || 'modern-clean');
    const [zoom, setZoom] = useState(100);
    const [fullscreen, setFullscreen] = useState(false);
    const previewRef = useRef(null);

    const templates = useMemo(() => getAllTemplates(), []);

    const renderedHTML = useMemo(() => {
        if (!invoice) return '';
        try {
            return renderInvoiceHTML(invoice, selectedTemplate, firmSettings);
        } catch (e) {
            console.error('Template render error:', e);
            return `<div style="padding:40px;text-align:center;color:#ef4444"><h3>Template Error</h3><p>${e.message}</p></div>`;
        }
    }, [invoice, selectedTemplate, firmSettings]);

    const handlePrint = () => {
        const printWindow = window.open('', '_blank', 'width=900,height=700');
        printWindow.document.write(`
            <!DOCTYPE html>
            <html>
            <head>
                <title>Invoice - ${invoice?.invoiceNumber || ''}</title>
                <style>
                    @media print { body { margin: 0; } @page { margin: 10mm; } }
                    body { font-family: 'Inter', 'Segoe UI', sans-serif; }
                </style>
            </head>
            <body>${renderedHTML}</body>
            </html>
        `);
        printWindow.document.close();
        setTimeout(() => {
            printWindow.print();
        }, 300);
        if (onPrint) onPrint(invoice, selectedTemplate);
    };

    const handleExportPDF = () => {
        if (onExportPDF) {
            onExportPDF(renderedHTML, invoice);
        } else {
            handlePrint(); // Fallback to print
        }
    };

    const handleShare = () => {
        if (onShare) {
            onShare(invoice);
        }
    };

    // Group templates by category
    const groupedTemplates = {};
    templates.forEach(t => {
        if (!groupedTemplates[t.category]) groupedTemplates[t.category] = [];
        groupedTemplates[t.category].push(t);
    });

    return (
        <Modal
            open={open}
            onCancel={onClose}
            width={fullscreen ? '100vw' : 960}
            style={fullscreen ? { top: 0, padding: 0, maxWidth: '100vw' } : { top: 20 }}
            styles={{
                body: { padding: 0, background: '#f1f5f9', height: fullscreen ? 'calc(100vh - 55px)' : '80vh', overflow: 'hidden', display: 'flex', flexDirection: 'column' }
            }}
            footer={null}
            title={
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingRight: 32 }}>
                    <Space size={12}>
                        <EyeOutlined style={{ color: '#6366f1' }} />
                        <span style={{ fontWeight: 700 }}>Invoice Preview</span>
                        {invoice?.invoiceNumber && <Tag color="blue">#{invoice.invoiceNumber}</Tag>}
                    </Space>
                    <Space size={8}>
                        <Select
                            value={selectedTemplate}
                            onChange={setSelectedTemplate}
                            style={{ width: 200 }}
                            size="small"
                            dropdownStyle={{ maxHeight: 300 }}
                        >
                            {Object.entries(groupedTemplates).map(([cat, temps]) => (
                                <OptGroup key={cat} label={<span style={{ fontWeight: 700, textTransform: 'uppercase', fontSize: 10, letterSpacing: 1, color: CATEGORY_COLORS[cat] || '#666' }}>{cat}</span>}>
                                    {temps.map(t => (
                                        <Option key={t.id} value={t.id}>{t.name}</Option>
                                    ))}
                                </OptGroup>
                            ))}
                        </Select>

                        <Divider type="vertical" />

                        <Tooltip title="Zoom Out">
                            <Button size="small" icon={<ZoomOutOutlined />} onClick={() => setZoom(z => Math.max(50, z - 10))} disabled={zoom <= 50} />
                        </Tooltip>
                        <span style={{ fontSize: 12, color: '#64748b', minWidth: 36, textAlign: 'center' }}>{zoom}%</span>
                        <Tooltip title="Zoom In">
                            <Button size="small" icon={<ZoomInOutlined />} onClick={() => setZoom(z => Math.min(200, z + 10))} disabled={zoom >= 200} />
                        </Tooltip>

                        <Divider type="vertical" />

                        <Tooltip title="Print">
                            <Button type="primary" size="small" icon={<PrinterOutlined />} onClick={handlePrint}>Print</Button>
                        </Tooltip>
                        <Tooltip title="Export PDF">
                            <Button size="small" icon={<FilePdfOutlined />} onClick={handleExportPDF} />
                        </Tooltip>
                        <Tooltip title="Share">
                            <Button size="small" icon={<ShareAltOutlined />} onClick={handleShare} />
                        </Tooltip>
                        <Tooltip title={fullscreen ? 'Exit Fullscreen' : 'Fullscreen'}>
                            <Button size="small" icon={fullscreen ? <CompressOutlined /> : <ExpandOutlined />} onClick={() => setFullscreen(f => !f)} />
                        </Tooltip>
                    </Space>
                </div>
            }
            destroyOnClose
        >
            <div ref={previewRef} style={{ flex: 1, overflow: 'auto', padding: 24, display: 'flex', justifyContent: 'center' }}>
                <div style={{
                    transform: `scale(${zoom / 100})`,
                    transformOrigin: 'top center',
                    transition: 'transform 0.2s ease',
                    background: '#fff',
                    boxShadow: '0 4px 24px rgba(0,0,0,0.1)',
                    borderRadius: 8,
                    maxWidth: 900,
                    width: '100%',
                    minHeight: 600,
                }}>
                    <div dangerouslySetInnerHTML={{ __html: renderedHTML }} />
                </div>
            </div>
        </Modal>
    );
}
