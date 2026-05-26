import React, { useState } from 'react';
import { Table, Button, Input, Space, Card, Modal, Typography, Popconfirm, Tag, message } from 'antd';
import { PlusOutlined, SearchOutlined, EditOutlined, DeleteOutlined, ShopOutlined, BarcodeOutlined } from '@ant-design/icons';
import AddProduct from './AddProduct';

const { Title } = Typography;

const ProductList = ({ products, setProducts, language, deleteProduct }) => {
    const [searchText, setSearchText] = useState('');
    const [isModalVisible, setIsModalVisible] = useState(false);
    const [editingProduct, setEditingProduct] = useState(null);

    // --- Actions ---
    const handleAddProduct = () => {
        setEditingProduct(null);
        setIsModalVisible(true);
    };

    const handleEditProduct = (product) => {
        setEditingProduct(product);
        setIsModalVisible(true);
    }

    const handleDeleteProduct = (id) => {
        deleteProduct(id);
        message.success('Product deleted');
    };

    const handleSaveProduct = (values) => {
        if (editingProduct) {
            // Update
            const updatedProducts = products.map(p =>
                p.id === editingProduct.id ? { ...values, id: editingProduct.id } : p
            );
            setProducts(updatedProducts);
            message.success('Product updated');
        } else {
            // Add
            const newProduct = { ...values, id: Date.now().toString() };
            setProducts([...products, newProduct]);
            message.success('Product added');
        }
        setIsModalVisible(false);
    };

    // --- Filtering ---
    const filteredProducts = products.filter(p =>
        p.name.toLowerCase().includes(searchText.toLowerCase()) ||
        (p.barcode && p.barcode.includes(searchText))
    );

    // --- Columns ---
    const columns = [
        {
            title: 'Product',
            dataIndex: 'name',
            key: 'name',
            render: (text, record) => (
                <div>
                    <div style={{ fontWeight: 'bold' }}>{text}</div>
                    <div style={{ fontSize: '12px', color: '#888' }}><BarcodeOutlined /> {record.barcode}</div>
                </div>
            )
        },
        {
            title: 'Category',
            dataIndex: 'category',
            key: 'category',
            responsive: ['md'],
            render: (tag) => <Tag color="blue">{tag}</Tag>
        },
        {
            title: 'Price',
            dataIndex: 'price',
            key: 'price',
            render: (val) => <span style={{ color: 'green', fontWeight: 'bold' }}>₹{val}</span>
        },
        {
            title: 'Stock',
            dataIndex: 'stock',
            key: 'stock',
            render: (val) => (
                <Tag color={val < 5 ? 'red' : val < 20 ? 'orange' : 'green'}>
                    {val} {val < 5 ? '(Low)' : ''}
                </Tag>
            )
        },
        {
            title: 'Actions',
            key: 'actions',
            render: (_, record) => (
                <Space>
                    <Button icon={<EditOutlined />} size="small" onClick={() => handleEditProduct(record)} />
                    <Popconfirm title="Delete product?" onConfirm={() => handleDeleteProduct(record.id)}>
                        <Button icon={<DeleteOutlined />} size="small" danger />
                    </Popconfirm>
                </Space>
            )
        }
    ];

    return (
        <div style={{ paddingBottom: 80 }}>
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <Title level={3} style={{ margin: 0 }}>
                    <ShopOutlined /> {language === 'hi' ? 'इन्वेंटरी' : 'Inventory'}
                </Title>
                <Button type="primary" icon={<PlusOutlined />} onClick={handleAddProduct} size="large">
                    {language === 'hi' ? 'नया आइटम' : 'Add Item'}
                </Button>
            </div>

            {/* Search */}
            <Card style={{ marginBottom: 16 }} styles={{ body: { padding: 16 } }}>
                <Input
                    prefix={<SearchOutlined />}
                    placeholder={language === 'hi' ? 'आइटम खोजें (नाम या बारकोड)...' : 'Search items (Name or Barcode)...'}
                    value={searchText}
                    onChange={e => setSearchText(e.target.value)}
                    size="large"
                    allowClear
                />
            </Card>

            {/* Table */}
            <Table
                columns={columns}
                dataSource={filteredProducts}
                rowKey="id"
                pagination={{ pageSize: 10 }}
                scroll={{ x: true }}
            />

            {/* Add/Edit Modal */}
            <Modal
                title={editingProduct ? "Edit Product" : "Add Product"}
                open={isModalVisible}
                onCancel={() => {
                    setIsModalVisible(false);
                    setEditingProduct(null);
                }} destroyOnHidden
            >
                <AddProduct
                    initialValues={editingProduct}
                    onSave={handleSaveProduct}
                    onCancel={() => setIsModalVisible(false)}
                />
            </Modal>
        </div>
    );
};

export default ProductList;
