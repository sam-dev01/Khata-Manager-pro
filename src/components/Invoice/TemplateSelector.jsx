import React, { useMemo, useState } from 'react';
import { Card, Row, Col, Typography, Tag, Segmented, Empty } from 'antd';
import { CheckCircleFilled } from '@ant-design/icons';
import { getAllTemplates, renderInvoiceHTML, DEFAULT_FIRM_SETTINGS } from './InvoiceTemplateEngine';

// Ensure all templates are registered
import './templates/index';

const { Text } = Typography;

const CATEGORY_COLORS = {
    modern: { bg: '#eef2ff', text: '#6366f1' },
    classic: { bg: '#ecfdf5', text: '#059669' },
    gst: { bg: '#fffbeb', text: '#d97706' },
    thermal: { bg: '#fef2f2', text: '#dc2626' },
    minimal: { bg: '#f9fafb', text: '#6b7280' },
    retail: { bg: '#eff6ff', text: '#2563eb' },
    service: { bg: '#f5f3ff', text: '#7c3aed' },
};

// Sample invoice for thumbnail preview
const SAMPLE_INVOICE = {
    invoiceNumber: 'INV-0001',
    date: new Date().toISOString(),
    customerName: 'Sample Customer',
    customerPhone: '9876543210',
    items: [
        { name: 'Product A', qty: 2, rate: 500, gstRate: 18, hsn: '8471', unit: 'Nos' },
        { name: 'Service B', qty: 1, rate: 1200, gstRate: 18, hsn: '9984', unit: 'Nos' },
    ],
    paymentMode: 'Cash',
    status: 'paid',
};

export default function TemplateSelector({ value, onChange, firmSettings }) {
    const [filterCategory, setFilterCategory] = useState('all');
    const templates = useMemo(() => getAllTemplates(), []);
    const settings = { ...DEFAULT_FIRM_SETTINGS, ...firmSettings };

    const filteredTemplates = filterCategory === 'all'
        ? templates
        : templates.filter(t => t.category === filterCategory);

    const categories = ['all', ...new Set(templates.map(t => t.category))];

    return (
        <div>
            <div style={{ marginBottom: 16 }}>
                <Segmented
                    options={categories.map(c => ({
                        label: <span style={{ textTransform: 'capitalize', fontSize: 12 }}>{c}</span>,
                        value: c,
                    }))}
                    value={filterCategory}
                    onChange={setFilterCategory}
                    size="small"
                />
            </div>

            {filteredTemplates.length === 0 ? (
                <Empty description="No templates in this category" />
            ) : (
                <Row gutter={[16, 16]}>
                    {filteredTemplates.map(template => {
                        const isSelected = value === template.id;
                        const catColor = CATEGORY_COLORS[template.category] || { bg: '#f1f5f9', text: '#64748b' };

                        // Generate mini thumbnail preview
                        let thumbnailHtml = '';
                        try {
                            thumbnailHtml = renderInvoiceHTML(SAMPLE_INVOICE, template.id, settings);
                        } catch (e) {
                            thumbnailHtml = '<div style="padding:20px;color:#999;text-align:center">Preview unavailable</div>';
                        }

                        return (
                            <Col xs={12} sm={8} md={6} key={template.id}>
                                <Card
                                    hoverable
                                    onClick={() => onChange && onChange(template.id)}
                                    style={{
                                        borderRadius: 12,
                                        border: isSelected ? `2px solid ${catColor.text}` : '2px solid transparent',
                                        overflow: 'hidden',
                                        transition: 'all 0.2s ease',
                                        boxShadow: isSelected ? `0 4px 16px ${catColor.text}30` : '0 1px 4px rgba(0,0,0,0.06)',
                                    }}
                                    styles={{ body: { padding: 0 } }}
                                >
                                    {/* Thumbnail */}
                                    <div style={{
                                        height: 160,
                                        overflow: 'hidden',
                                        background: '#fafafa',
                                        position: 'relative',
                                    }}>
                                        <div
                                            style={{
                                                transform: 'scale(0.2)',
                                                transformOrigin: 'top left',
                                                width: '500%',
                                                height: '500%',
                                                pointerEvents: 'none',
                                            }}
                                            dangerouslySetInnerHTML={{ __html: thumbnailHtml }}
                                        />
                                        {isSelected && (
                                            <div style={{
                                                position: 'absolute', top: 8, right: 8,
                                                background: catColor.text, borderRadius: '50%',
                                                width: 24, height: 24, display: 'flex',
                                                alignItems: 'center', justifyContent: 'center',
                                            }}>
                                                <CheckCircleFilled style={{ color: '#fff', fontSize: 14 }} />
                                            </div>
                                        )}
                                    </div>

                                    {/* Label */}
                                    <div style={{ padding: '10px 12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                        <Text strong style={{ fontSize: 12 }}>{template.name}</Text>
                                        <Tag
                                            style={{
                                                fontSize: 9,
                                                background: catColor.bg,
                                                color: catColor.text,
                                                border: 'none',
                                                borderRadius: 4,
                                                textTransform: 'uppercase',
                                                letterSpacing: 0.5,
                                                fontWeight: 600,
                                            }}
                                        >
                                            {template.category}
                                        </Tag>
                                    </div>
                                </Card>
                            </Col>
                        );
                    })}
                </Row>
            )}
        </div>
    );
}
