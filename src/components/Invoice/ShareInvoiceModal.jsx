import React, { useState } from 'react';
import { Modal, Button, Input, Space, QRCode, message, Typography, Divider, Spin } from 'antd';
import {
    WhatsAppOutlined,
    CopyOutlined,
    LinkOutlined,
    ShareAltOutlined,
    CheckCircleOutlined
} from '@ant-design/icons';
import { createPublicInvoiceLink, getPublicInvoiceUrl, shareOnWhatsApp } from '../../utils/shareUtils';
import { useAuth } from '../../context/AuthContext';

const { Text, Title, Paragraph } = Typography;

const ShareInvoiceModal = ({ visible, onCancel, invoice }) => {
    const { currentUser } = useAuth();
    const [loading, setLoading] = useState(false);
    const [publicUrl, setPublicUrl] = useState('');
    const [copied, setCopied] = useState(false);

    const handleGenerateLink = async () => {
        if (!invoice) return;
        setLoading(true);
        try {
            const shopId = localStorage.getItem('current_shop_id');
            const settings = JSON.parse(localStorage.getItem(`shop_${shopId}_bill_settings`) || '{}');
            const publicId = await createPublicInvoiceLink(invoice, currentUser.uid, settings);
            const url = getPublicInvoiceUrl(publicId);
            setPublicUrl(url);
        } catch (error) {
            console.error("Link generation failed:", error);
            message.error("Failed to generate link");
        } finally {
            setLoading(false);
        }
    };

    const handleCopy = () => {
        navigator.clipboard.writeText(publicUrl);
        setCopied(true);
        message.success("Link copied to clipboard!");
        setTimeout(() => setCopied(false), 2000);
    };

    const handleWhatsAppShare = () => {
        if (!publicUrl) return;
        const customerName = invoice.customerName || 'Customer';
        const shopName = invoice.shopName || 'Our Shop';
        const text = `Hello ${customerName}, here is your invoice from ${shopName}. Total: ₹${invoice.total}. View details: ${publicUrl}`;
        window.open(`https://wa.me/${invoice.customerPhone ? '91' + invoice.customerPhone : ''}?text=${encodeURIComponent(text)}`, '_blank');
    };

    // Reset state when modal opens
    React.useEffect(() => {
        if (visible && !publicUrl) {
            // Auto-generate link on open? Maybe better to let user click to generate to save DB writes
            // But for better UX, let's auto-generate if not already present
            // For now, manual generation to keep control
        }
        if (!visible) {
            setPublicUrl('');
            setCopied(false);
        }
    }, [visible]);

    return (
        <Modal
            title={<Space><ShareAltOutlined /> Share Invoice</Space>}
            open={visible}
            onCancel={onCancel}
            footer={null}
            centered
        >
            {!publicUrl ? (
                <div style={{ textAlign: 'center', padding: '20px 0' }}>
                    <Button
                        type="primary"
                        size="large"
                        icon={<LinkOutlined />}
                        onClick={handleGenerateLink}
                        loading={loading}
                    >
                        Generate Secure Link to Share
                    </Button>
                    <Paragraph type="secondary" style={{ marginTop: 12 }}>
                        Creates a secure, public link for your customer to view and download this invoice.
                    </Paragraph>
                </div>
            ) : (
                <div style={{ textAlign: 'center' }}>
                    <div style={{ marginBottom: 20, background: '#f5f5f5', padding: 16, borderRadius: 8 }}>
                        <QRCode value={publicUrl} size={160} style={{ margin: '0 auto' }} />
                        <Text type="secondary" style={{ display: 'block', marginTop: 8 }}>Scan to view invoice</Text>
                    </div>

                    <Input.Group compact style={{ marginBottom: 20 }}>
                        <Input
                            style={{ width: 'calc(100% - 80px)' }}
                            value={publicUrl}
                            readOnly
                        />
                        <Button
                            type={copied ? 'primary' : 'default'}
                            icon={copied ? <CheckCircleOutlined /> : <CopyOutlined />}
                            onClick={handleCopy}
                            style={{ width: 80 }}
                        >
                            {copied ? 'Copied' : 'Copy'}
                        </Button>
                    </Input.Group>

                    <Space size="large" style={{ width: '100%', justifyContent: 'center' }}>
                        <Button
                            type="primary"
                            style={{ backgroundColor: '#25D366', borderColor: '#25D366' }}
                            icon={<WhatsAppOutlined />}
                            size="large"
                            onClick={handleWhatsAppShare}
                        >
                            Share on WhatsApp
                        </Button>
                    </Space>
                </div>
            )}
        </Modal>
    );
};

export default ShareInvoiceModal;
