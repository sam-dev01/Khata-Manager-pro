import React, { useEffect, useState, useMemo } from 'react';
import { Card, Spin, Button, Result, Typography, Divider, Space } from 'antd';
import { DownloadOutlined, PrinterOutlined, SafetyCertificateOutlined } from '@ant-design/icons';
import DOMPurify from 'dompurify';
import { getPublicInvoice } from '../../utils/shareUtils';
import { renderInvoiceHTML } from './InvoiceTemplateEngine';
import './templates/index'; // Register all templates
import dayjs from 'dayjs';

const { Title, Text } = Typography;

const PublicInvoiceView = ({ publicId }) => {
    const id = publicId;
    const [invoice, setInvoice] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchInvoice = async () => {
            if (!id) return;
            try {
                const data = await getPublicInvoice(id);
                if (data) {
                    setInvoice(data);
                } else {
                    setError('Invoice not found or link expired.');
                }
            } catch (err) {
                console.error("Error fetching invoice:", err);
                setError('Failed to load invoice. Please try again later.');
            } finally {
                setLoading(false);
            }
        };

        fetchInvoice();
    }, [id]);

    const renderedHTML = useMemo(() => {
        if (!invoice) return '';
        try {
            // Use stored firm settings if available, otherwise empty object (defaults will apply)
            const settings = invoice.firmSettings || {};
            // Use stored template ID or default to minimal/modern-clean
            const templateId = invoice.templateId || 'minimal';
            const raw = renderInvoiceHTML(invoice, templateId, settings);
            // ✅ SECURITY: Sanitize HTML to prevent stored XSS attacks from malicious invoice data
            return DOMPurify.sanitize(raw, {
                USE_PROFILES: { html: true },
                ADD_TAGS: ['style'],          // Allow <style> for invoice templates
                FORCE_BODY: true,
            });
        } catch (e) {
            console.error('Template render error:', e);
            return DOMPurify.sanitize(
                `<div style="padding:40px;text-align:center;color:#ef4444"><h3>Template Error</h3><p>${e.message}</p></div>`
            );
        }
    }, [invoice]);

    const handlePrint = () => {
        window.print();
    };

    if (loading) {
        return (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', background: '#f0f2f5' }}>
                <Spin size="large" tip="Loading secure invoice..." />
            </div>
        );
    }

    if (error) {
        return (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', background: '#f0f2f5' }}>
                <Result
                    status="404"
                    title="Invoice Not Found"
                    subTitle={error}
                    extra={<Button type="primary" href="/">Go Home</Button>}
                />
            </div>
        );
    }

    return (
        <div style={{ minHeight: '100vh', background: '#f0f2f5', padding: '20px 0' }}>
            <div style={{ maxWidth: 850, margin: '0 auto', padding: '0 16px' }}>
                {/* Header Actions (Hidden in Print) */}
                <Card className="no-print" style={{ marginBottom: 16, borderRadius: 8, boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
                        <Space>
                            <SafetyCertificateOutlined style={{ color: '#52c41a', fontSize: 20 }} />
                            <div>
                                <Text strong style={{ display: 'block' }}>Secure Invoice View</Text>
                                <Text type="secondary" style={{ fontSize: 12 }}>Verified by Khata Manager Pro</Text>
                            </div>
                        </Space>
                        <Space>
                            <Button icon={<PrinterOutlined />} onClick={handlePrint}>Print</Button>
                            {/* Download PDF is same as print for now (Use Save as PDF) */}
                        </Space>
                    </div>
                </Card>

                {/* Invoice Content */}
                <div id="invoice-content" style={{
                    background: '#fff',
                    borderRadius: 8,
                    boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
                    overflow: 'hidden',
                    minHeight: 600
                }}>
                    <div dangerouslySetInnerHTML={{ __html: renderedHTML }} />
                </div>

                <div className="no-print" style={{ textAlign: 'center', marginTop: 24, paddingBottom: 24 }}>
                    <Text type="secondary" style={{ fontSize: 12 }}>
                        Generated securely by Khata Manager Pro • {dayjs(invoice._createdAt).format('DD MMM YYYY HH:mm')}
                    </Text>
                </div>
            </div>

            {/* Print Styles */}
            <style>{`
                @media print {
                    .no-print { display: none !important; }
                    body { background: #fff !important; }
                    #invoice-content { box-shadow: none !important; border: none !important; margin: 0 !important; }
                    .ant-layout { background: #fff !important; }
                }
            `}</style>
        </div>
    );
};

export default PublicInvoiceView;
