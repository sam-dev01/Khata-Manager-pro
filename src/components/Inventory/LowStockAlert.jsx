import React, { useState } from 'react';
import {
    Card, Table, Button, Tag, Typography, Space, InputNumber, Input,
    Row, Col, Statistic, message, Tooltip, Badge, Empty
} from 'antd';
import {
    WarningOutlined, ReloadOutlined, DownloadOutlined,
    ShopOutlined, SearchOutlined, ExclamationCircleOutlined
} from '@ant-design/icons';

const { Title, Text } = Typography;
const { Search } = Input;

const LowStockAlert = ({ products, setProducts, suppliers, language }) => {
    const [threshold, setThreshold] = useState(5);
    const [search, setSearch] = useState('');
    const [reordering, setReordering] = useState({});

    const allProducts = products || [];

    // Filter low stock
    const lowStockProducts = allProducts.filter(p => {
        const level = p.reorderLevel || threshold;
        return (p.stock || 0) < level;
    });

    const filteredProducts = lowStockProducts.filter(p =>
        p.name?.toLowerCase().includes(search.toLowerCase()) ||
        p.barcode?.includes(search)
    );

    // Stats
    const outOfStock = filteredProducts.filter(p => (p.stock || 0) === 0).length;
    const criticalStock = filteredProducts.filter(p => (p.stock || 0) > 0 && (p.stock || 0) <= 2).length;

    const handleMarkReordered = (product) => {
        setReordering(prev => ({ ...prev, [product.id]: true }));
        setTimeout(() => {
            message.success(`${product.name} marked as reordered`);
            setReordering(prev => ({ ...prev, [product.id]: false }));
        }, 800);
    };

    const handleUpdateReorderLevel = (productId, level) => {
        const updated = allProducts.map(p =>
            p.id === productId ? { ...p, reorderLevel: level } : p
        );
        setProducts(updated);
    };

    const exportCSV = () => {
        const headers = ['Name', 'Barcode', 'Current Stock', 'Reorder Level', 'Category', 'Price'];
        const rows = filteredProducts.map(p => [
            p.name, p.barcode || '', p.stock || 0,
            p.reorderLevel || threshold, p.category || '', p.price || 0
        ]);
        const csv = [headers, ...rows].map(r => r.join(',')).join('\n');
        const blob = new Blob([csv], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `low_stock_${new Date().toISOString().slice(0, 10)}.csv`;
        a.click();
        URL.revokeObjectURL(url);
        message.success('CSV exported');
    };

    const columns = [
        {
            title: language === 'hi' ? 'सामान' : 'Product',
            dataIndex: 'name',
            key: 'name',
            render: (name, record) => (
                <div>
                    <Text strong>{name}</Text>
                    {record.barcode && <div><Text type="secondary" style={{ fontSize: 11 }}>#{record.barcode}</Text></div>}
                </div>
            )
        },
        {
            title: language === 'hi' ? 'स्टॉक' : 'Stock',
            dataIndex: 'stock',
            key: 'stock',
            width: 100,
            sorter: (a, b) => (a.stock || 0) - (b.stock || 0),
            render: (stock) => {
                const s = stock || 0;
                const color = s === 0 ? 'red' : s <= 2 ? 'orange' : 'gold';
                return <Tag color={color} style={{ fontSize: 14, fontWeight: 700, padding: '2px 10px' }}>{s}</Tag>;
            }
        },
        {
            title: language === 'hi' ? 'रिऑर्डर लेवल' : 'Reorder Level',
            key: 'reorderLevel',
            width: 140,
            render: (_, record) => (
                <InputNumber
                    min={1} max={999}
                    value={record.reorderLevel || threshold}
                    size="small"
                    onChange={(val) => handleUpdateReorderLevel(record.id, val)}
                    style={{ width: 80 }}
                />
            )
        },
        {
            title: language === 'hi' ? 'कीमत' : 'Price',
            dataIndex: 'price',
            key: 'price',
            width: 100,
            render: (price) => <Text>₹{price || 0}</Text>
        },
        {
            title: language === 'hi' ? 'स्थिति' : 'Status',
            key: 'status',
            width: 120,
            render: (_, record) => {
                const s = record.stock || 0;
                if (s === 0) return <Tag color="red" icon={<ExclamationCircleOutlined />}>Out of Stock</Tag>;
                if (s <= 2) return <Tag color="orange" icon={<WarningOutlined />}>Critical</Tag>;
                return <Tag color="gold" icon={<WarningOutlined />}>Low Stock</Tag>;
            }
        },
        {
            title: language === 'hi' ? 'कार्य' : 'Action',
            key: 'action',
            width: 140,
            render: (_, record) => (
                <Button
                    size="small"
                    type="primary"
                    icon={<ReloadOutlined />}
                    loading={reordering[record.id]}
                    onClick={() => handleMarkReordered(record)}
                    style={{ background: '#6366f1', border: 'none' }}
                >
                    {language === 'hi' ? 'रिऑर्डर' : 'Reorder'}
                </Button>
            )
        }
    ];

    return (
        <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                <Title level={2} style={{ margin: 0 }}>
                    <WarningOutlined style={{ color: '#f59e0b', marginRight: 8 }} />
                    {language === 'hi' ? 'कम स्टॉक अलर्ट' : 'Low Stock Alert'}
                </Title>
                <Button icon={<DownloadOutlined />} onClick={exportCSV}>
                    {language === 'hi' ? 'CSV डाउनलोड' : 'Export CSV'}
                </Button>
            </div>

            {/* Summary Cards */}
            <Row gutter={[16, 16]} style={{ marginBottom: 20 }}>
                <Col xs={24} sm={8}>
                    <Card style={{ background: '#fff1f0', border: '1px solid #ffa39e' }}>
                        <Statistic title={language === 'hi' ? 'स्टॉक खत्म' : 'Out of Stock'} value={outOfStock}
                            valueStyle={{ color: '#cf1322' }} prefix={<ExclamationCircleOutlined />} />
                    </Card>
                </Col>
                <Col xs={24} sm={8}>
                    <Card style={{ background: '#fff7e6', border: '1px solid #ffd591' }}>
                        <Statistic title={language === 'hi' ? 'बहुत कम (≤2)' : 'Critical (≤2)'} value={criticalStock}
                            valueStyle={{ color: '#d46b08' }} prefix={<WarningOutlined />} />
                    </Card>
                </Col>
                <Col xs={24} sm={8}>
                    <Card style={{ background: '#fffbe6', border: '1px solid #ffe58f' }}>
                        <Statistic title={language === 'hi' ? 'कुल कम स्टॉक' : 'Total Low Stock'} value={lowStockProducts.length}
                            valueStyle={{ color: '#ad8b00' }} prefix={<ShopOutlined />} />
                    </Card>
                </Col>
            </Row>

            {/* Filters */}
            <Card style={{ marginBottom: 16 }}>
                <Space wrap>
                    <Search
                        placeholder={language === 'hi' ? 'नाम या बारकोड से खोजें' : 'Search by name or barcode'}
                        onChange={e => setSearch(e.target.value)}
                        style={{ width: 260 }}
                        allowClear
                    />
                    <Space>
                        <Text>{language === 'hi' ? 'डिफ़ॉल्ट थ्रेशोल्ड:' : 'Default threshold:'}</Text>
                        <InputNumber min={1} max={100} value={threshold} onChange={setThreshold} style={{ width: 80 }} />
                        <Text type="secondary">{language === 'hi' ? 'यूनिट' : 'units'}</Text>
                    </Space>
                </Space>
            </Card>

            {/* Table */}
            {filteredProducts.length === 0 ? (
                <Card>
                    <Empty
                        image={<ShopOutlined style={{ fontSize: 64, color: '#52c41a' }} />}
                        description={<Text type="secondary">{language === 'hi' ? 'सभी सामान का स्टॉक ठीक है! 🎉' : 'All products are well-stocked! 🎉'}</Text>}
                    />
                </Card>
            ) : (
                <Card>
                    <Table
                        columns={columns}
                        dataSource={filteredProducts}
                        rowKey="id"
                        pagination={{ pageSize: 20 }}
                        scroll={{ x: 700 }}
                        rowClassName={(record) => (record.stock || 0) === 0 ? 'ant-table-row-danger' : ''}
                    />
                </Card>
            )}
        </div>
    );
};

export default LowStockAlert;
