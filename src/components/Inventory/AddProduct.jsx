import React, { useState, useEffect } from 'react';
import { Form, Input, InputNumber, Button, Select, Row, Col, Divider, message, Space } from 'antd';
import { BarcodeOutlined, ScanOutlined } from '@ant-design/icons';
import Barcode from 'react-barcode';

const { Option } = Select;

const AddProduct = ({ initialValues, onSave, onCancel }) => {
    const [form] = Form.useForm();
    const [barcodeValue, setBarcodeValue] = useState('');

    useEffect(() => {
        if (initialValues) {
            form.setFieldsValue(initialValues);
            setBarcodeValue(initialValues.barcode || '');
        } else {
            form.resetFields();
            setBarcodeValue('');
        }
    }, [initialValues, form]);

    const generateBarcode = () => {
        // Simple logic: timestamp + random 3 digits
        const code = Date.now().toString().slice(-8) + Math.floor(Math.random() * 1000).toString().padStart(3, '0');
        setBarcodeValue(code);
        form.setFieldsValue({ barcode: code });
    };

    const handleSubmit = (values) => {
        if (!barcodeValue && !values.barcode) {
            // Auto-generate if missing? Or allow empty? Let's require it or auto-gen
            // For now, let's just warn or auto-gen silently.
            // Let's auto-gen if empty.
            const code = Date.now().toString().slice(-8) + Math.floor(Math.random() * 1000).toString().padStart(3, '0');
            values.barcode = code;
        }
        onSave({ ...values, barcode: barcodeValue || values.barcode });
    };

    // Handle barcode scanner input (basic implementation)
    // Real implementation listening to keypresses is complex, usually scanners act as keyboards.
    // We'll rely on the input field being focused for now, or the user clicking "Generate".

    return (
        <Form
            form={form}
            layout="vertical"
            onFinish={handleSubmit}
            initialValues={{ stock: 0, price: 0, purchasePrice: 0 }}
        >
            <Row gutter={16}>
                <Col span={24}>
                    <div style={{ textAlign: 'center', marginBottom: 20, height: 80, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f5f5f5', borderRadius: 8 }}>
                        {barcodeValue ? (
                            <Barcode value={barcodeValue} width={2} height={50} fontSize={14} />
                        ) : (
                            <span style={{ color: '#999' }}>No Barcode</span>
                        )}
                    </div>
                </Col>
            </Row>

            <Row gutter={16}>
                <Col span={12}>
                    <Form.Item
                        name="barcode"
                        label="Barcode"
                        rules={[{ required: true, message: 'Please enter or generate a barcode' }]}
                    >
                        <Space.Compact style={{ width: '100%' }}>
                            <Input
                                placeholder="Scan or Generate"
                                value={barcodeValue}
                                onChange={(e) => setBarcodeValue(e.target.value)}
                            />
                            <Button icon={<BarcodeOutlined />} onClick={generateBarcode} />
                        </Space.Compact>
                    </Form.Item>
                </Col>
                <Col span={12}>
                    <Form.Item name="category" label="Category" rules={[{ required: true }]}>
                        <Select showSearch placeholder="Select Category" optionFilterProp="children">
                            <Option value="General">General</Option>
                            <Option value="Grocery">Grocery</Option>
                            <Option value="Electronics">Electronics</Option>
                            <Option value="Clothing">Clothing</Option>
                            <Option value="Medicine">Medicine</Option>
                        </Select>
                    </Form.Item>
                </Col>
            </Row>

            <Form.Item name="name" label="Product Name" rules={[{ required: true }]}>
                <Input placeholder="Enter product name" />
            </Form.Item>

            <Row gutter={16}>
                <Col span={8}>
                    <Form.Item name="purchasePrice" label="Purchase Price">
                        <InputNumber
                            style={{ width: '100%' }}
                            formatter={value => `₹ ${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                            parser={value => value.replace(/\₹\s?|(,*)/g, '')}
                        />
                    </Form.Item>
                </Col>
                <Col span={8}>
                    <Form.Item name="price" label="Selling Price" rules={[{ required: true }]}>
                        <InputNumber
                            style={{ width: '100%' }}
                            formatter={value => `₹ ${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                            parser={value => value.replace(/\₹\s?|(,*)/g, '')}
                        />
                    </Form.Item>
                </Col>
                <Col span={8}>
                    <Form.Item name="stock" label="Stock Qty" rules={[{ required: true }]}>
                        <InputNumber style={{ width: '100%' }} />
                    </Form.Item>
                </Col>
            </Row>

            <Divider />

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
                <Button onClick={onCancel}>Cancel</Button>
                <Button type="primary" htmlType="submit">Save Product</Button>
            </div>
        </Form>
    );
};

export default AddProduct;
