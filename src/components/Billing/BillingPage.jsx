
import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
    Row, Col, Card, Input, Table, Button, Typography, Select, Modal,
    Radio, InputNumber, message, Tag, List, Divider, Drawer, Space, Tabs, Badge, Segmented
} from 'antd';
import {
    SearchOutlined, ShoppingCartOutlined, UserOutlined, DeleteOutlined,
    BarcodeOutlined, PrinterOutlined, CameraOutlined, SettingOutlined,
    ClearOutlined, CreditCardOutlined, MoneyCollectOutlined, WalletOutlined,
    CheckCircleOutlined, CalculatorOutlined, ShoppingOutlined, EyeOutlined,
    LockOutlined
} from '@ant-design/icons';
import dayjs from 'dayjs';
import { exportData, sanitizeShopId } from '../../utils/storage';
import { LocalBackupService } from '../../services/LocalBackupService';
import CameraScanner from '../Common/CameraScanner';
import BillSettings from './BillSettings';
import { printBill, generatePosHtml, generateA4Html } from '../../utils/printBill';
import { GST_SLABS, calcInvoiceTotals, roundToIndian } from '../../utils/gstUtils';
import { getNextInvoiceNumber, peekNextInvoiceNumber } from '../../utils/invoiceCounter';
import { deriveInvoiceStatus } from '../../utils/statusUtils';

const { Title, Text } = Typography;
const { Option } = Select;

const BillingPage = ({
    products, setProducts,
    customers,
    invoices, setInvoices,
    transactions, setTransactions,
    language, pendingScanItem, setPendingScanItem,
    userRole // from props
}) => {
    // --- STATE ---
    const [cart, setCart] = useState([]);
    const [searchText, setSearchText] = useState('');
    const [selectedCustomer, setSelectedCustomer] = useState(null);
    const [billDiscount, setBillDiscount] = useState(0);
    const [isInterState, setIsInterState] = useState(false);

    // UI State
    const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
    const [paymentModalOpen, setPaymentModalOpen] = useState(false);
    const [settingsVisible, setSettingsVisible] = useState(false);
    const [cameraVisible, setCameraVisible] = useState(false);

    // Preview State
    const [previewVisible, setPreviewVisible] = useState(false);
    const [previewHtml, setPreviewHtml] = useState('');
    const [cartDrawerVisible, setCartDrawerVisible] = useState(false); // Mobile

    // Payment Logic State
    const [paymentMode, setPaymentMode] = useState('cash'); // cash, online, credit
    const [receivedAmount, setReceivedAmount] = useState('');
    const [printFormat, setPrintFormat] = useState('pos'); // pos or a4

    // Refs
    const searchInputRef = useRef(null);
    const paymentInputRef = useRef(null);
    const tempInvoiceId = useRef(null); // Persist ID between Print and Save

    // --- CALCULATIONS (GST-aware) ---
    const { lineItems, subTotal, totalItemDiscount, taxBreakup, grandTotal } = useMemo(
        () => calcInvoiceTotals(cart, billDiscount, isInterState),
        [cart, billDiscount, isInterState]
    );
    const changeAmount = (parseFloat(receivedAmount) || 0) - grandTotal;

    // --- EFFECT: Resize & Focus ---
    useEffect(() => {
        const handleResize = () => setIsMobile(window.innerWidth <= 768);
        window.addEventListener('resize', handleResize);
        if (!isMobile && searchInputRef.current) searchInputRef.current.focus();
        return () => window.removeEventListener('resize', handleResize);
    }, [isMobile]);

    // --- EFFECT: Global Scan Listener Redirect ---
    useEffect(() => {
        if (pendingScanItem) {
            addToCart(pendingScanItem);
            setPendingScanItem(null);
        }
    }, [pendingScanItem]);

    // --- EFFECT: Keyboard Shortcuts ---
    useEffect(() => {
        const handleKeys = (e) => {
            if (e.key === 'F2') {
                e.preventDefault();
                searchInputRef.current?.focus();
            }
            if (e.key === 'F9') {
                e.preventDefault();
                if (cart.length > 0) handleCheckout();
            }
            if (e.key === 'Escape') {
                if (paymentModalOpen) setPaymentModalOpen(false);
                else if (searchText) setSearchText('');
            }
        };
        window.addEventListener('keydown', handleKeys);
        return () => window.removeEventListener('keydown', handleKeys);
    }, [cart, paymentModalOpen, searchText]);


    // --- CART ACTIONS ---
    const addToCart = (product) => {
        if (product.stock <= 0) {
            message.warning('Out of stock!');
            return;
        }
        const existing = cart.find(item => item.id === product.id);
        if (existing) {
            if (existing.qty >= product.stock) {
                message.warning('Not enough stock!');
                return;
            }
            setCart(cart.map(item => item.id === product.id ? { ...item, qty: item.qty + 1 } : item));
        } else {
            setCart([...cart, {
                ...product, qty: 1,
                gstRate: product.gstRate || 0,
                hsn: product.hsn || '',
                discount: 0,
                discountType: 'flat'
            }]);
        }
        message.success('Added');
        setSearchText('');
        if (!isMobile) searchInputRef.current?.focus();
    };

    const updateQty = (id, delta) => {
        setCart(cart.map(item => {
            if (item.id === id) {
                const newQty = item.qty + delta;
                if (newQty <= 0) return item;
                const product = products.find(p => p.id === id);
                if (newQty > product.stock) {
                    message.warning('Stock limit reached');
                    return item;
                }
                return { ...item, qty: newQty };
            }
            return item;
        }));
    };

    const updateCartItem = (id, field, value) => {
        setCart(cart.map(item => item.id === id ? { ...item, [field]: value } : item));
    };

    const removeFromCart = (id) => setCart(cart.filter(item => item.id !== id));

    const clearBill = () => {
        setCart([]);
        setBillDiscount(0);
        setSelectedCustomer(null);
        setReceivedAmount('');
        setPaymentMode('cash');
        setSearchText('');
        setIsInterState(false);
        if (!isMobile) searchInputRef.current?.focus();
    };

    // --- SEARCH ---
    const handleSearch = (e) => {
        const val = e.target.value;
        setSearchText(val);
        const exactMatch = products.find(p => p.barcode === val);
        if (exactMatch) {
            addToCart(exactMatch);
        }
    };

    const filteredProducts = useMemo(() => {
        if (!searchText) return products;
        return products.filter(p =>
            p.name.toLowerCase().includes(searchText.toLowerCase()) ||
            (p.barcode && p.barcode.includes(searchText))
        );
    }, [products, searchText]);


    // --- CHECKOUT & PAYMENT ---
    const handleCheckout = () => {
        if (cart.length === 0) return message.warning('Cart is empty');

        // 1. Generate ID & Prepare Invoice for Printing
        const tId = Date.now().toString();
        tempInvoiceId.current = tId; // Store for final save

        const previewInvoice = {
            id: tId,
            date: new Date().toISOString(),
            items: lineItems,
            subTotal,
            discount: billDiscount,
            totalItemDiscount,
            taxBreakup,
            total: grandTotal,
            isInterState,
            receivedAmount: 0,
            paymentMode: 'Pending',
            customerName: customers.find(c => c.id === selectedCustomer)?.name || 'Walk-in Customer',
            shopName: localStorage.getItem('current_shop_name') || 'My Shop',
            type: 'pos',
            createdBy: {
                role: userRole || 'admin',
                user: userRole === 'admin' ? 'Owner' : 'Manager'
            }
        };

        // 2. Print Immediately
        const shopId = localStorage.getItem('current_shop_id');
        const settings = JSON.parse(localStorage.getItem(`shop_${shopId}_bill_settings`) || '{}');
        printBill(previewInvoice, printFormat, settings);

        // 3. Open Payment Modal
        setPaymentModalOpen(true);
        setReceivedAmount(''); // Reset received amount
        setTimeout(() => paymentInputRef.current?.focus(), 300);
    };

    const handleQuickCash = (amt) => {
        const current = parseFloat(receivedAmount) || 0;
        setReceivedAmount((current + amt).toString());
    };

    const finalizeBill = async () => {
        // Validation
        if (paymentMode === 'credit' && !selectedCustomer) {
            message.error('Select Customer for Credit Sale');
            return;
        }
        if (paymentMode === 'cash' && changeAmount < 0) {
            message.warning('Received amount is less than total!');
        }

        // 1. Get auto invoice number
        const shopId = localStorage.getItem('current_shop_id');
        let invoiceNumber = '';
        try {
            invoiceNumber = await getNextInvoiceNumber(shopId, 'POS');
        } catch (e) {
            console.warn('Invoice counter error, using fallback', e);
            invoiceNumber = `POS-${Date.now().toString().slice(-6)}`;
        }

        // 2. Create Invoice (Use persisted ID if available)
        const finalId = tempInvoiceId.current || Date.now().toString();
        const paidAmount = parseFloat(receivedAmount) || 0;

        let finalBillDiscount = billDiscount;
        let finalGrandTotal = grandTotal;

        // If paying via Cash/Online and amount is negotiated (less than total but > 0)
        // We treat the difference as a discount/round-off so status becomes PAID
        if ((paymentMode === 'cash' || paymentMode === 'online') && paidAmount > 0 && paidAmount < grandTotal) {
            const diff = grandTotal - paidAmount;
            finalBillDiscount = (finalBillDiscount || 0) + diff;
            finalGrandTotal = paidAmount;
        }

        const newInvoice = {
            id: finalId,
            invoiceNumber,
            date: new Date().toISOString(),
            items: lineItems,
            subTotal,
            billDiscount: finalBillDiscount, // Use adjusted discount
            totalItemDiscount,
            taxBreakup,
            total: finalGrandTotal, // Use adjusted total
            isInterState,
            receivedAmount: paidAmount,
            paidAmount,
            paymentMode: paymentMode,
            customerId: selectedCustomer || null,
            shopName: localStorage.getItem('current_shop_name') || 'My Shop',
            type: 'pos',
            status: deriveInvoiceStatus(finalGrandTotal, paidAmount, paymentMode), // Status is derived from new totals
            lockedAt: Date.now(),
            createdBy: {
                role: userRole || 'admin',
                user: userRole === 'admin' ? 'Owner' : 'Manager'
            }
        };

        // 3. Reduce Stock
        const changedProducts = [];
        products.forEach(p => {
            const inCart = cart.find(c => c.id === p.id);
            if (inCart) {
                changedProducts.push({ ...p, stock: p.stock - inCart.qty });
            }
        });

        // 4. Update Ledger (if credit)
        if (paymentMode === 'credit') {
            const newTxn = {
                id: Date.now().toString(),
                customerId: selectedCustomer,
                amount: grandTotal,
                type: 'credit',
                date: new Date().toISOString(),
                notes: `Bill ${invoiceNumber} (${cart.length} items)`
            };
            setTransactions([newTxn]);
        }

        // 5. Save
        setInvoices([newInvoice]);
        if (changedProducts.length > 0) {
            setProducts(changedProducts);
        }

        message.success(`Bill ${invoiceNumber} Saved!`);

        // 6. Reset — Invoice is now locked
        setPaymentModalOpen(false);
        tempInvoiceId.current = null;
        clearBill();
    };


    // --- RENDER ---
    // Cart columns with GST/Discount columns
    const cartColumns = [
        {
            title: 'Item', dataIndex: 'name', ellipsis: true,
            render: t => <div style={{ fontSize: 13, fontWeight: 500 }}>{t}</div>
        },
        {
            title: 'Qty', dataIndex: 'qty', width: 90, render: (q, r) => (
                <div style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <Button size="small" onClick={() => updateQty(r.id, -1)} style={{ padding: '0 5px' }}>-</Button>
                    <div style={{ width: 20, textAlign: 'center', fontSize: 12 }}>{q}</div>
                    <Button size="small" onClick={() => updateQty(r.id, 1)} style={{ padding: '0 5px' }}>+</Button>
                </div>
            )
        },
        {
            title: 'GST%', dataIndex: 'gstRate', width: 75, render: (val, r) => (
                <Select size="small" value={val} onChange={v => updateCartItem(r.id, 'gstRate', v)} style={{ width: 65 }}>
                    {GST_SLABS.map(s => <Option key={s} value={s}>{s}%</Option>)}
                </Select>
            )
        },
        {
            title: 'Disc', key: 'disc', width: 70, render: (_, r) => (
                <InputNumber
                    size="small" min={0} value={r.discount}
                    onChange={v => updateCartItem(r.id, 'discount', v || 0)}
                    style={{ width: 60 }}
                    placeholder="₹"
                />
            )
        },
        {
            title: 'Total', key: 'tot', width: 75, align: 'right',
            render: (_, r) => {
                const li = lineItems.find(l => l.id === r.id);
                return <Text strong>₹{li ? li.itemTotal : r.price * r.qty}</Text>;
            }
        },
        {
            title: '', key: 'del', width: 30,
            render: (_, r) => <DeleteOutlined onClick={() => removeFromCart(r.id)} style={{ color: '#ff4d4f', cursor: 'pointer' }} />
        }
    ];

    // Simplified columns for mobile
    const mobileCartColumns = [
        { title: 'Item', dataIndex: 'name', ellipsis: true },
        {
            title: 'Qty', dataIndex: 'qty', render: (q, r) => (
                <Space>
                    <Button size="small" onClick={() => updateQty(r.id, -1)}>-</Button>
                    {q}
                    <Button size="small" onClick={() => updateQty(r.id, 1)}>+</Button>
                </Space>
            )
        },
        {
            title: 'Total', render: (_, r) => {
                const li = lineItems.find(l => l.id === r.id);
                return `₹${li ? li.itemTotal : r.price * r.qty}`;
            }
        }
    ];

    return (
        <div style={{ height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            {/* 1. TOP BAR */}
            <div style={{
                background: '#fff', padding: '10px 20px',
                borderBottom: '1px solid #f0f0f0',
                display: 'flex', justifyContent: 'space-between', alignItems: 'center'
            }}>
                <Space.Compact style={{ width: isMobile ? '70%' : '400px' }} size="large">
                    <Input
                        ref={searchInputRef}
                        placeholder="Scan Barcode / Search Item (F2)"
                        prefix={<SearchOutlined style={{ color: '#1890ff' }} />}
                        value={searchText}
                        onChange={handleSearch}
                        allowClear
                    />
                    <Button icon={<CameraOutlined />} onClick={() => setCameraVisible(true)} />
                </Space.Compact>

                {/* Customer Selector (Desktop) */}
                {!isMobile && (
                    <Select
                        showSearch
                        style={{ width: 250 }}
                        placeholder="Select Customer (Optional)"
                        value={selectedCustomer}
                        onChange={setSelectedCustomer}
                        optionFilterProp="children"
                        allowClear
                        size="large"
                    >
                        {customers.map(c => <Option key={c.id} value={c.id}>{c.name} - {c.village}</Option>)}
                    </Select>
                )}

                <Space>
                    {!isMobile && <Text type="secondary" style={{ fontSize: 12 }}>F9: Pay | F2: Search</Text>}
                    {userRole !== 'manager' && <Button icon={<SettingOutlined />} onClick={() => setSettingsVisible(true)} />}
                </Space>
            </div>

            {/* 2. MAIN CONTENT SPLIT */}
            <div style={{ flex: 1, display: 'flex', overflow: 'hidden', background: '#f0f2f5' }}>

                {/* LEFT: PRODUCTS GRID */}
                <div style={{ flex: 1, padding: 10, overflowY: 'auto' }}>
                    {filteredProducts.length === 0 ? (
                        <div style={{ textAlign: 'center', marginTop: 50, color: '#999' }}>
                            <ShoppingOutlined style={{ fontSize: 40, marginBottom: 10 }} />
                            <p>No products found</p>
                        </div>
                    ) : (
                        <Row gutter={[10, 10]}>
                            {filteredProducts.map(p => (
                                <Col xs={12} sm={8} md={6} lg={6} xl={4} key={p.id}>
                                    <Card
                                        hoverable
                                        size="small"
                                        onClick={() => addToCart(p)}
                                        style={{
                                            textAlign: 'center', cursor: 'pointer',
                                            border: p.stock <= 0 ? '1px solid #ffccc7' : '1px solid #f0f0f0',
                                            opacity: p.stock <= 0 ? 0.6 : 1
                                        }}
                                        bodyStyle={{ padding: 10 }}
                                    >
                                        <div style={{ fontSize: 13, fontWeight: 'bold', height: 36, overflow: 'hidden', lineHeight: '18px' }}>
                                            {p.name}
                                        </div>
                                        <div style={{ marginTop: 5 }}>
                                            <Tag color="#108ee9" style={{ margin: 0 }}>₹{p.price}</Tag>
                                        </div>
                                        <div style={{ fontSize: 11, color: '#999', marginTop: 4 }}>
                                            Qty: {p.stock}
                                            {p.gstRate > 0 && <span style={{ marginLeft: 4 }}>| GST {p.gstRate}%</span>}
                                        </div>
                                    </Card>
                                </Col>
                            ))}
                        </Row>
                    )}
                </div>

                {/* RIGHT: CART (Desktop) */}
                {!isMobile && (
                    <div style={{ width: 450, background: '#fff', borderLeft: '1px solid #e8e8e8', display: 'flex', flexDirection: 'column' }}>
                        {/* Cart Header */}
                        <div style={{ padding: '10px 15px', background: '#fafafa', borderBottom: '1px solid #e8e8e8', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <Text strong><ShoppingCartOutlined /> Current Bill</Text>
                            <Space size="small">
                                <Tag color={isInterState ? 'blue' : 'default'} style={{ cursor: 'pointer', margin: 0 }}
                                    onClick={() => setIsInterState(!isInterState)}>
                                    {isInterState ? 'IGST' : 'CGST+SGST'}
                                </Tag>
                                <Button type="link" danger size="small" onClick={clearBill}>Clear All</Button>
                            </Space>
                        </div>

                        {/* Cart Items */}
                        <div style={{ flex: 1, overflowY: 'auto', padding: 0 }}>
                            <Table
                                dataSource={cart}
                                rowKey="id"
                                pagination={false}
                                size="small"
                                showHeader={true}
                                columns={cartColumns}
                            />
                        </div>

                        {/* Cart Footer with Tax Breakup */}
                        <div style={{ padding: 12, background: '#f6ffed', borderTop: '1px solid #b7eb8f' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
                                <Text type="secondary" style={{ fontSize: 12 }}>Subtotal</Text>
                                <Text style={{ fontSize: 12 }}>₹{subTotal}</Text>
                            </div>
                            {totalItemDiscount > 0 && (
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
                                    <Text type="secondary" style={{ fontSize: 12 }}>Item Discounts</Text>
                                    <Text style={{ fontSize: 12, color: '#ff4d4f' }}>-₹{totalItemDiscount}</Text>
                                </div>
                            )}
                            {/* Tax breakup */}
                            {taxBreakup.totalTax > 0 && (
                                <>
                                    {isInterState ? (
                                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
                                            <Text type="secondary" style={{ fontSize: 12 }}>IGST</Text>
                                            <Text style={{ fontSize: 12, color: '#1890ff' }}>+₹{taxBreakup.igst}</Text>
                                        </div>
                                    ) : (
                                        <>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 2 }}>
                                                <Text type="secondary" style={{ fontSize: 12 }}>CGST</Text>
                                                <Text style={{ fontSize: 12, color: '#1890ff' }}>+₹{taxBreakup.cgst}</Text>
                                            </div>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
                                                <Text type="secondary" style={{ fontSize: 12 }}>SGST</Text>
                                                <Text style={{ fontSize: 12, color: '#1890ff' }}>+₹{taxBreakup.sgst}</Text>
                                            </div>
                                        </>
                                    )}
                                </>
                            )}
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, alignItems: 'center' }}>
                                <Text type="secondary" style={{ fontSize: 12 }}>Bill Discount</Text>
                                <InputNumber
                                    size="small" min={0} value={billDiscount}
                                    onChange={setBillDiscount} style={{ width: 80, textAlign: 'right' }}
                                />
                            </div>
                            <Divider style={{ margin: '5px 0' }} />
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 22, fontWeight: 'bold', color: '#135200' }}>
                                <span>Total</span>
                                <span>₹{grandTotal}</span>
                            </div>
                            <Button
                                type="primary" size="large" block
                                style={{ marginTop: 8, height: 48, fontSize: 17, fontWeight: 'bold' }}
                                onClick={handleCheckout}
                                disabled={cart.length === 0}
                            >
                                Checkout (F9)
                            </Button>
                        </div>
                    </div>
                )}
            </div>

            {/* 3. MOBILE FOOTER BAR */}
            {isMobile && (
                <div style={{
                    position: 'fixed', bottom: 0, left: 0, right: 0,
                    background: '#fff', borderTop: '1px solid #ddd',
                    padding: '10px 15px', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    zIndex: 100, boxShadow: '0 -2px 10px rgba(0,0,0,0.05)'
                }}>
                    <div>
                        <div style={{ fontSize: 12, color: '#888' }}>{cart.length} Items</div>
                        <div style={{ fontSize: 18, fontWeight: 'bold', color: '#1890ff' }}>₹{grandTotal}</div>
                    </div>
                    <Space>
                        <Button onClick={clearBill} icon={<DeleteOutlined />} danger />
                        <Button type="primary" onClick={() => setCartDrawerVisible(true)}>View Cart</Button>
                        <Button type="primary" style={{ background: '#52c41a' }} onClick={handleCheckout}>Checkout</Button>
                    </Space>
                </div>
            )}

            {/* 4. MODALS & DRAWERS */}
            {/* Mobile Cart Drawer */}
            <Drawer
                title="Current Bill" placement="bottom" height="80vh"
                open={cartDrawerVisible} onClose={() => setCartDrawerVisible(false)}
            >
                <Table
                    dataSource={cart} rowKey="id" pagination={false}
                    columns={mobileCartColumns}
                />
                {taxBreakup.totalTax > 0 && (
                    <div style={{ marginTop: 10, padding: '5px 10px', background: '#f0f5ff', borderRadius: 6 }}>
                        <Text type="secondary" style={{ fontSize: 12 }}>
                            Tax: {isInterState ? `IGST ₹${taxBreakup.igst}` : `CGST ₹${taxBreakup.cgst} + SGST ₹${taxBreakup.sgst}`}
                        </Text>
                    </div>
                )}
                <div style={{ marginTop: 20, textAlign: 'right' }}>
                    <Title level={3}>Total: ₹{grandTotal}</Title>
                    <Button type="primary" block size="large" onClick={() => { setCartDrawerVisible(false); handleCheckout(); }}>Checkout</Button>
                </div>
            </Drawer>


            {/* MAIN PAYMENT MODAL */}
            <Modal
                open={paymentModalOpen}
                onCancel={() => setPaymentModalOpen(false)}
                footer={null}
                width={500}
                centered
                destroyOnClose
            >
                <div style={{ textAlign: 'center', marginBottom: 20 }}>
                    <Text type="secondary">System Total</Text>
                    <div style={{ fontSize: 24, color: '#888', textDecoration: receivedAmount && parseFloat(receivedAmount) !== grandTotal ? 'line-through' : 'none' }}>
                        ₹{grandTotal}
                    </div>
                    {taxBreakup.totalTax > 0 && (
                        <div style={{ fontSize: 11, color: '#1890ff', marginTop: 2 }}>
                            incl. {isInterState ? `IGST ₹${taxBreakup.igst}` : `CGST ₹${taxBreakup.cgst} + SGST ₹${taxBreakup.sgst}`}
                        </div>
                    )}
                </div>

                <Tabs
                    activeKey={paymentMode}
                    onChange={setPaymentMode}
                    centered
                    items={[
                        {
                            key: 'cash', label: <span><MoneyCollectOutlined /> CASH</span>, children: (
                                <div>
                                    <div style={{ marginBottom: 15, background: '#f9f9f9', padding: 15, borderRadius: 8 }}>
                                        <Text strong>Final / Negotiated Amount:</Text>
                                        <Input
                                            ref={paymentInputRef}
                                            size="large" prefix="₹"
                                            style={{ fontSize: 24, fontWeight: 'bold', color: '#1890ff', marginTop: 5 }}
                                            value={receivedAmount}
                                            onChange={e => setReceivedAmount(e.target.value)}
                                            placeholder="Enter Final Amount"
                                        />
                                    </div>
                                    <Space wrap style={{ marginBottom: 20, justifyContent: 'center' }}>
                                        <Tag color="green" style={{ cursor: 'pointer', padding: '5px 10px', fontSize: 14 }} onClick={() => setReceivedAmount(grandTotal.toString())}>
                                            Bill Amount (₹{grandTotal})
                                        </Tag>
                                        <Tag color="orange" style={{ cursor: 'pointer', padding: '5px 10px', fontSize: 14 }} onClick={() => setReceivedAmount(Math.round(grandTotal - 10).toString())}>
                                            - ₹10
                                        </Tag>
                                        <Tag color="orange" style={{ cursor: 'pointer', padding: '5px 10px', fontSize: 14 }} onClick={() => setReceivedAmount(Math.round(grandTotal - 50).toString())}>
                                            - ₹50
                                        </Tag>
                                    </Space>
                                </div>
                            )
                        },
                        {
                            key: 'online', label: <span><CreditCardOutlined /> ONLINE / UPI</span>, children: (
                                <div style={{ textAlign: 'center', padding: 20 }}>
                                    <CheckCircleOutlined style={{ fontSize: 40, color: '#52c41a', marginBottom: 10 }} />
                                    <p>Mark as Paid via UPI / Bank</p>
                                    <div style={{ marginTop: 10 }}>
                                        <Text>Paying Amount:</Text>
                                        <Input
                                            prefix="₹" style={{ width: 150, marginLeft: 10 }}
                                            value={receivedAmount}
                                            onChange={e => setReceivedAmount(e.target.value)}
                                        />
                                    </div>
                                </div>
                            )
                        },
                        {
                            key: 'credit', label: <span><WalletOutlined /> CREDIT (UDHARI)</span>, children: (
                                <div style={{ padding: 10 }}>
                                    <Text strong>Select Customer for Credit:</Text>
                                    <Select
                                        style={{ width: '100%', marginTop: 5 }}
                                        size="large" placeholder="Select Customer"
                                        showSearch optionFilterProp="children"
                                        value={selectedCustomer}
                                        onChange={setSelectedCustomer}
                                    >
                                        {customers.map(c => <Option key={c.id} value={c.id}>{c.name}</Option>)}
                                    </Select>
                                    <div style={{ marginTop: 15 }}>
                                        <Text>Credit Amount:</Text>
                                        <Input
                                            prefix="₹" style={{ width: 150, marginLeft: 10 }}
                                            value={receivedAmount}
                                            onChange={e => setReceivedAmount(e.target.value)}
                                        />
                                    </div>
                                </div>
                            )
                        }
                    ]}
                />

                <Divider style={{ margin: '15px 0' }} />

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <Text>Print Format:</Text>
                        <Radio.Group value={printFormat} onChange={e => setPrintFormat(e.target.value)} buttonStyle="solid" size="small">
                            <Radio.Button value="pos">POS (Thermal)</Radio.Button>
                            <Radio.Button value="a4">A4 (Standard)</Radio.Button>
                        </Radio.Group>
                    </div>
                    <Button
                        icon={<EyeOutlined />}
                        onClick={() => {
                            const finalAmt = receivedAmount ? parseFloat(receivedAmount) : grandTotal;
                            const prevInvoice = {
                                id: (invoices.length + 1).toString().padStart(3, '0'),
                                date: new Date().toISOString(),
                                customerName: customers.find(c => c.id === selectedCustomer)?.name || 'Walk-in Customer',
                                items: lineItems,
                                subTotal,
                                discount: billDiscount,
                                taxBreakup,
                                isInterState,
                                tax: taxBreakup.totalTax,
                                total: finalAmt,
                                paymentMode: paymentMode
                            };

                            const html = printFormat === 'pos'
                                ? generatePosHtml(prevInvoice, JSON.parse(localStorage.getItem('shopSettings') || '{}'), true)
                                : generateA4Html(prevInvoice, JSON.parse(localStorage.getItem('shopSettings') || '{}'), true);

                            setPreviewHtml(html);
                            setPreviewVisible(true);
                        }}
                    >
                        Preview Bill
                    </Button>
                </div>

                <Button type="primary" block size="large" style={{ height: 50, fontSize: 18 }} onClick={finalizeBill} icon={<LockOutlined />}>
                    CONFIRM & SAVE (Locked)
                </Button>

            </Modal>

            {/* PREVIEW MODAL */}
            <Modal
                title="Invoice Preview"
                open={previewVisible}
                onCancel={() => setPreviewVisible(false)}
                footer={[
                    <Button key="close" onClick={() => setPreviewVisible(false)}>Close</Button>,
                    <Button key="print" type="primary" icon={<PrinterOutlined />} onClick={() => {
                        const win = window.open('', '', 'width=800,height=600');
                        win.document.write(previewHtml);
                        win.document.write('<script>window.onload = function() { window.print(); }</script>');
                        win.document.close();
                    }}>Print Now (Direct)</Button>
                ]}
                width={900}
                centered
            >
                <div style={{ border: '1px solid #ddd', height: '65vh', overflow: 'auto', background: '#525659', padding: 20, display: 'flex', justifyContent: 'center' }}>
                    <div
                        style={{
                            background: 'white',
                            boxShadow: '0 4px 15px rgba(0,0,0,0.3)',
                            width: printFormat === 'pos' ? '320px' : '210mm',
                            minHeight: printFormat === 'pos' ? 'auto' : '297mm',
                            padding: 0,
                            transform: printFormat === 'a4' ? 'scale(0.85)' : 'none',
                            transformOrigin: 'top center'
                        }}
                        dangerouslySetInnerHTML={{ __html: previewHtml }}
                    />
                </div>
            </Modal>


            {/* Bill Settings Drawer */}
            <Drawer title="Bill Settings" open={settingsVisible} onClose={() => setSettingsVisible(false)}>
                <BillSettings />
            </Drawer>

            {/* Camera Scanner */}
            <CameraScanner
                visible={cameraVisible}
                onClose={() => setCameraVisible(false)}
                onScan={(code) => {
                    const p = products.find(x => x.barcode === code);
                    if (p) {
                        addToCart(p);
                        setCameraVisible(false);
                    } else {
                        message.error('Product not found');
                    }
                }}
            />
        </div>
    );
};

export default BillingPage;
