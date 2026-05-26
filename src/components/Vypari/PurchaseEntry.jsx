import React, { useState, useRef, useEffect } from 'react';
import { Card, Table, Button, Input, Select, DatePicker, InputNumber, Typography, Row, Col, Modal, message, Space, Divider, Tag } from 'antd';
import { PlusOutlined, DeleteOutlined, SaveOutlined, BarcodeOutlined, PrinterOutlined, ArrowLeftOutlined, ScanOutlined, CameraOutlined, FileImageOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import Barcode from 'react-barcode';
import CameraScanner from '../Common/CameraScanner';
import BillOCR from './BillOCR';
import BarcodePrinter from './BarcodePrinter';

const { Title, Text } = Typography;
const { Option } = Select;

const PurchaseEntry = ({
    onBack,
    suppliers,
    products, setProducts,
    setTransactions,
    transactions
}) => {
    // Bill Header State
    const [supplierId, setSupplierId] = useState(null);
    const [billNo, setBillNo] = useState('');
    const [billDate, setBillDate] = useState(dayjs());
    const [globalMargin, setGlobalMargin] = useState(20); // Default 20%

    // Items State
    const [items, setItems] = useState([]);

    // Scan/Add Item State
    const [scanCode, setScanCode] = useState('');
    const [selectedProduct, setSelectedProduct] = useState(null);

    // Barcode Modal
    const [barcodeModalVisible, setBarcodeModalVisible] = useState(false);
    // Camera Modal
    // Camera Modal
    const [cameraVisible, setCameraVisible] = useState(false);
    const [ocrVisible, setOcrVisible] = useState(false);

    // --- Item Logic ---

    // 1. Add Item to Bill
    const addItem = (product) => {
        // Check if already in bill
        const existing = items.find(i => i.productId === product.id);
        if (existing) {
            message.warning('Item already in bill. Update quantity below.');
            return;
        }

        // Auto-calc selling price based on existing or default
        // If product needs price update, it happens here
        const purchaseRate = product.purchasePrice || 0;
        const sellingRate = calculateSellingPrice(purchaseRate, globalMargin);

        const newItem = {
            id: Date.now(),
            productId: product.id,
            name: product.name,
            barcode: product.barcode,
            qty: 1,
            purchaseRate: purchaseRate,
            sellingRate: sellingRate,
            margin: globalMargin // Store margin specific to this item entry
        };

        setItems([newItem, ...items]);
        setScanCode('');
        setSelectedProduct(null);
    };

    // 2. Handle Product Search/Scan
    const handleScan = (e) => {
        if (e.key === 'Enter') {
            const product = products.find(p => p.barcode === scanCode);
            if (product) {
                addItem(product);
            } else {
                message.error('Product not found in Inventory. Add it first if it is new.');
                // Optional: Prompt to create new product on fly
            }
        }
    };

    const handleCameraScan = (code) => {
        const product = products.find(p => p.barcode === code);
        if (product) {
            addItem(product);
            message.success('Added: ' + product.name);
        } else {
            message.error('Product not found: ' + code);
        }
    };

    const handleOCRData = (data) => {
        if (data.billNo) setBillNo(data.billNo);
        if (data.date) setBillDate(data.date);

        if (data.items && data.items.length > 0) {
            const newItems = [];
            data.items.forEach((ocrItem, idx) => {
                // Try to find product by name (Simple fuzzy: includes)
                // In real world, use fuse.js or similar
                const match = products.find(p => p.name.toLowerCase() === ocrItem.name.toLowerCase() || p.name.toLowerCase().includes(ocrItem.name.toLowerCase()));

                if (match) {
                    // Start with existing product props
                    const sellRate = calculateSellingPrice(ocrItem.rate, globalMargin);
                    newItems.push({
                        id: Date.now() + Math.random(),
                        productId: match.id,
                        name: match.name,
                        barcode: match.barcode,
                        qty: ocrItem.qty,
                        purchaseRate: ocrItem.rate,
                        sellingRate: sellRate,
                        margin: globalMargin
                    });
                } else {
                    // New Product detected!
                    // We treat it as a new product that will be created on Save?
                    // OR we just add it to the bill items with a null productId?
                    // Better: Add it with a special flag
                    const sellRate = calculateSellingPrice(ocrItem.rate, globalMargin);
                    newItems.push({
                        id: Date.now() + Math.random(),
                        productId: null, // Indicates New Product
                        name: ocrItem.name,
                        // Fix: Use Random 6-digit number to ensure visual uniqueness and avoid sequential confusion
                        barcode: 'GEN-' + Math.floor(100000 + Math.random() * 900000).toString(),
                        qty: ocrItem.qty,
                        purchaseRate: ocrItem.rate,
                        sellingRate: sellRate,
                        margin: globalMargin,
                        isNew: true
                    });
                }
            });

            // Append to existing items
            setItems(prev => [...prev, ...newItems]);
            message.success(`Auto-Added ${newItems.length} items from Bill!`);
        }
    };

    const handleProductSelect = (val) => {
        const product = products.find(p => p.id === val);
        if (product) addItem(product);
    };

    // 3. Update Item Row
    const updateItem = (id, field, val) => {
        setItems(items.map(item => {
            if (item.id === id) {
                const updatedItem = { ...item, [field]: val };

                // Smart Logic: If Purchase Rate or Margin changes, update Selling Rate
                if (field === 'purchaseRate') {
                    updatedItem.sellingRate = calculateSellingPrice(val, item.margin);
                }

                // If user manually changes Sell Rate, maybe update Margin? (Optional, let's keep simple)

                return updatedItem;
            }
            return item;
        }));
    };

    const calculateSellingPrice = (pPrice, margin) => {
        const p = parseFloat(pPrice) || 0;
        const m = parseFloat(margin) || 0;
        return Math.round(p * (1 + m / 100));
    };

    // Apply Global Margin to all items
    const applyGlobalMargin = (newMargin) => {
        setGlobalMargin(newMargin);
        setItems(items.map(item => ({
            ...item,
            margin: newMargin,
            sellingRate: calculateSellingPrice(item.purchaseRate, newMargin)
        })));
        message.success(`Applied ${newMargin}% margin to all items`);
    };

    const removeItem = (id) => {
        setItems(items.filter(i => i.id !== id));
    };

    // --- Save Logic ---
    const handleSave = () => {
        if (!supplierId) return message.error('Select Supplier');
        if (items.length === 0) return message.error('No items in bill');

        const totalAmount = items.reduce((sum, i) => sum + (i.qty * i.purchaseRate), 0);

        let finalProducts = [...products];
        const billSummaryItems = [];

        // 1. Process Items (Update Stock or Create New)
        items.forEach(item => {
            if (item.isNew || !item.productId) {
                // Create New Product
                const newProduct = {
                    id: Date.now().toString() + Math.random().toString().slice(2, 5),
                    name: item.name,
                    barcode: item.barcode,
                    stock: item.qty,
                    purchasePrice: item.purchaseRate,
                    price: item.sellingRate,
                    category: 'General' // Default
                };
                finalProducts.push(newProduct);
                billSummaryItems.push(`${item.name} (NEW) x${item.qty}`);
            } else {
                // Update Existing Product
                finalProducts = finalProducts.map(p => {
                    if (p.id === item.productId) {
                        return {
                            ...p,
                            stock: (p.stock || 0) + item.qty,
                            purchasePrice: item.purchaseRate,
                            price: item.sellingRate
                        };
                    }
                    return p;
                });
                billSummaryItems.push(`${item.name} x${item.qty}`);
            }
        });

        setProducts(finalProducts);

        // 2. Add Supplier Transaction (Purchase Bill)
        const newTxn = {
            id: Date.now().toString(),
            supplierId: supplierId,
            type: 'purchase_bill',
            amount: totalAmount,
            date: billDate.toISOString(),
            notes: `Bill #${billNo} (${items.length} items)`,
            itemsSummary: billSummaryItems.join(', ')
        };
        setTransactions([...transactions, newTxn]);

        message.success('Stock Updated & Purchase Recorded!');
        onBack();
    };

    const totalBillAmount = items.reduce((sum, i) => sum + (i.qty * i.purchaseRate), 0);

    // --- Table Columns ---
    const columns = [
        {
            title: 'Item',
            dataIndex: 'name',
            key: 'name',
            width: 200,
            render: (t, r) => (
                r.isNew || !r.productId ? (
                    <Input
                        value={r.name}
                        onChange={e => updateItem(r.id, 'name', e.target.value)}
                        placeholder="Item Name"
                    />
                ) : (
                    <div>
                        <Text strong>{t}</Text>
                        <div style={{ fontSize: 10, color: '#888' }}>ID: {r.productId}</div>
                    </div>
                )
            )
        },
        {
            title: 'Barcode',
            key: 'barcode',
            width: 150,
            render: (_, r) => (
                <Input
                    value={r.barcode}
                    onChange={e => updateItem(r.id, 'barcode', e.target.value)}
                    disabled={!r.isNew && !!r.productId} // Disable if existing product
                    placeholder="Barcode"
                    suffix={r.isNew ? <BarcodeOutlined style={{ color: '#aaa' }} /> : null}
                />
            )
        },
        {
            title: 'Qty',
            key: 'qty',
            width: 80,
            render: (_, r) => <InputNumber min={1} value={r.qty} onChange={v => updateItem(r.id, 'qty', v)} style={{ width: '100%' }} />
        },
        {
            title: 'Purchase Rate',
            key: 'purchaseRate',
            width: 110,
            render: (_, r) => (
                <InputNumber
                    value={r.purchaseRate}
                    onChange={v => updateItem(r.id, 'purchaseRate', v)}
                    style={{ width: '100%' }}
                    prefix="₹"
                />
            )
        },
        {
            title: 'Selling Rate (Auto)',
            key: 'sellingRate',
            width: 110,
            render: (_, r) => (
                <InputNumber
                    value={r.sellingRate}
                    onChange={v => updateItem(r.id, 'sellingRate', v)}
                    style={{ width: '100%', fontWeight: 'bold', color: '#1890ff' }}
                    prefix="₹"
                />
            )
        },
        {
            title: 'Total',
            key: 'total',
            width: 100,
            render: (_, r) => <Text>₹{Math.round(r.qty * r.purchaseRate)}</Text>
        },
        {
            title: '',
            key: 'action',
            width: 50,
            render: (_, r) => <Button danger icon={<DeleteOutlined />} onClick={() => removeItem(r.id)} size="small" />
        }
    ];

    return (
        <div className="fade-in">
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', marginBottom: 16 }}>
                <Button icon={<ArrowLeftOutlined />} onClick={onBack} style={{ marginRight: 16 }} />
                <Title level={3} style={{ margin: 0 }}>Create Purchase Bill</Title>
            </div>

            {/* Bill Details Card */}
            <Card style={{ marginBottom: 16 }}
                title={
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span>Bill Details</span>
                        <Button
                            icon={<FileImageOutlined />}
                            onClick={() => setOcrVisible(true)}
                            type="dashed"
                            style={{ color: '#1890ff', borderColor: '#1890ff' }}
                            size="small"
                        >
                            Scan Bill
                        </Button>
                    </div>
                }
                styles={{ body: { padding: '12px 8px' } }}>
                <Row gutter={[8, 12]}>
                    <Col xs={24} md={8}>
                        <Text style={{ fontSize: 12, color: '#888' }}>Supplier</Text>
                        <Select
                            showSearch
                            style={{ width: '100%' }}
                            placeholder="Select Supplier"
                            optionFilterProp="children"
                            onChange={setSupplierId}
                            value={supplierId}
                        >
                            {suppliers.map(s => <Option key={s.id} value={s.id}>{s.name}</Option>)}
                        </Select>
                    </Col>
                    <Col xs={12} md={5}>
                        <Text style={{ fontSize: 12, color: '#888' }}>Bill No</Text>
                        <Input value={billNo} onChange={e => setBillNo(e.target.value)} placeholder="e.g. 001" />
                    </Col>
                    <Col xs={12} md={5}>
                        <Text style={{ fontSize: 12, color: '#888' }}>Date</Text>
                        <DatePicker style={{ width: '100%' }} value={billDate} onChange={setBillDate} format="DD/MM/YYYY" />
                    </Col>
                    <Col xs={24} md={6}>
                        <Text style={{ fontSize: 12, color: '#888' }}>Global Margin (%)</Text>
                        <div style={{ display: 'flex' }}>
                            <InputNumber
                                value={globalMargin}
                                onChange={setGlobalMargin}
                                placeholder="%"
                                style={{ width: '100%' }}
                            />
                            <Button type="primary" onClick={() => applyGlobalMargin(globalMargin)} style={{ marginLeft: 8 }}>Set</Button>
                        </div>
                    </Col>
                </Row>
            </Card>

            {/* Add Item Section */}
            <Card style={{ marginBottom: 16 }} styles={{ body: { padding: 12 } }}>
                <Row gutter={16}>
                    <Col xs={12} md={8}>
                        <Space.Compact style={{ width: '100%' }}>
                            <Input
                                prefix={<ScanOutlined />}
                                placeholder="Scan Barcode + Enter"
                                value={scanCode}
                                onChange={e => setScanCode(e.target.value)}
                                onKeyDown={handleScan}
                            />
                            <Button icon={<CameraOutlined />} onClick={() => setCameraVisible(true)} />
                        </Space.Compact>
                    </Col>
                    <Col xs={12} md={10}>
                        <Select
                            showSearch
                            style={{ width: '100%' }}
                            placeholder="Search Product by Name"
                            optionFilterProp="text"
                            value={selectedProduct}
                            onChange={handleProductSelect}
                            filterOption={(input, option) => option.text.toLowerCase().includes(input.toLowerCase())}
                        >
                            {products.map(p => (
                                <Option key={p.id} value={p.id} text={`${p.name} ${p.barcode}`}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                        <span>{p.name}</span>
                                        <span style={{ fontSize: 10, color: '#888' }}>{p.barcode}</span>
                                    </div>
                                </Option>
                            ))}
                        </Select>
                    </Col>
                    <Col xs={24} md={6}>
                        <Button
                            type="dashed"
                            icon={<PlusOutlined />}
                            onClick={() => {
                                const newItem = {
                                    id: Date.now(),
                                    isNew: true,
                                    name: '',
                                    barcode: 'GEN-' + Math.floor(1000 + Math.random() * 9000),
                                    qty: 1,
                                    purchaseRate: 0,
                                    sellingRate: 0,
                                    margin: globalMargin
                                };
                                setItems([newItem, ...items]);
                                message.info('Added new manual item row');
                            }}
                            block
                        >
                            Add Manual Item
                        </Button>
                    </Col>
                </Row>
            </Card>

            {/* Items Table */}
            <Table
                columns={columns}
                dataSource={items}
                rowKey="id"
                pagination={false}
                scroll={{ x: true }}
                summary={pageData => (
                    <Table.Summary.Row>
                        <Table.Summary.Cell index={0} colSpan={4} align="right">
                            <Text strong>Total Purchase Amount</Text>
                        </Table.Summary.Cell>
                        <Table.Summary.Cell index={1}>
                            <Text type="danger" strong style={{ fontSize: 16 }}>₹{totalBillAmount}</Text>
                        </Table.Summary.Cell>
                    </Table.Summary.Row>
                )}
            />

            {/* Footer Actions */}
            <div style={{ marginTop: 20, display: 'flex', justifyContent: 'flex-end', gap: 16 }}>
                {items.length > 0 && (
                    <Button icon={<BarcodeOutlined />} onClick={() => setBarcodeModalVisible(true)}>
                        Print Barcodes
                    </Button>
                )}
                <Button type="primary" size="large" icon={<SaveOutlined />} onClick={handleSave}>
                    Save Bill & Update Stock
                </Button>
            </div>

            {/* Barcode Modal */}
            <Modal
                title="Generate Barcodes (Oddy / A4)"
                open={barcodeModalVisible}
                onCancel={() => setBarcodeModalVisible(false)}
                footer={null}
                width={900}
                style={{ top: 20 }}
            >
                <BarcodePrinter items={items} />
            </Modal>

            <CameraScanner
                visible={cameraVisible}
                onClose={() => setCameraVisible(false)}
                onScan={handleCameraScan}
            />

            <BillOCR
                visible={ocrVisible}
                onClose={() => setOcrVisible(false)}
                onDataExtracted={handleOCRData}
            />
        </div>
    );
};

export default PurchaseEntry;
