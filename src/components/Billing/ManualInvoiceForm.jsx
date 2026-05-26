import React, { useState, useEffect } from 'react';
import { Modal, Form, Select, DatePicker, Input, InputNumber, Button, Table, Typography, Space, message, Divider, Switch, Row, Col, Segmented, Tag } from 'antd';
import { PlusOutlined, DeleteOutlined, PrinterOutlined, SaveOutlined, EyeOutlined, UserAddOutlined, LockOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { printBill } from '../../utils/printBill';
import { GST_SLABS, calcInvoiceTotals, roundToIndian } from '../../utils/gstUtils';
import { getNextInvoiceNumber } from '../../utils/invoiceCounter';
import { deriveInvoiceStatus } from '../../utils/statusUtils';

const { Title, Text } = Typography;
const { Option } = Select;

const ManualInvoiceForm = ({
    open,
    onClose,
    products,
    customers,
    onSave, // Function(newInvoice)
    onAddCustomer // Function(newCustomer)
}) => {
    const [form] = Form.useForm();
    const [rows, setRows] = useState([{ key: 1, name: '', qty: 1, unit: 'Pcs', price: 0, amount: 0, hsn: '', gstRate: 18, discount: 0, discountType: 'flat' }]);
    const [selectedCustomer, setSelectedCustomer] = useState(null);
    const [newCustomerName, setNewCustomerName] = useState('');
    const [subTotal, setSubTotal] = useState(0);
    const [billDiscount, setBillDiscount] = useState(0);
    const [grandTotal, setGrandTotal] = useState(0);
    const [isGstBill, setIsGstBill] = useState(true);
    const [isInterState, setIsInterState] = useState(false);
    const [docType, setDocType] = useState('invoice'); // 'invoice' | 'estimate' | 'proforma'

    // Calculated tax breakup
    const [taxBreakup, setTaxBreakup] = useState({ cgst: 0, sgst: 0, igst: 0, totalTax: 0, slabWise: {} });
    const [lineItems, setLineItems] = useState([]);
    const [totalItemDiscount, setTotalItemDiscount] = useState(0);

    // POS Flow State
    const [isLocked, setIsLocked] = useState(false); // Locks form after print
    const [showPaymentModal, setShowPaymentModal] = useState(false);
    const [receivedAmount, setReceivedAmount] = useState('');
    const [paymentMode, setPaymentMode] = useState('cash');

    // Refs for Focus Management
    const nameInputRefs = React.useRef([]);
    const qtyInputRefs = React.useRef([]);
    const priceInputRefs = React.useRef([]);
    const paymentInputRef = React.useRef(null);

    const emptyRow = { key: 1, name: '', qty: 1, unit: 'Pcs', price: 0, amount: 0, hsn: '', gstRate: isGstBill ? 18 : 0, discount: 0, discountType: 'flat' };

    // Initial Row & Reset
    const resetForm = () => {
        setRows([{ ...emptyRow }]);
        form.resetFields();
        form.setFieldsValue({ date: dayjs(), paymentMode: 'cash' });
        setBillDiscount(0);
        setSelectedCustomer(null);
        setNewCustomerName('');
        setIsGstBill(true);
        setIsInterState(false);
        setDocType('invoice');
        setIsLocked(false);
        setShowPaymentModal(false);
        setReceivedAmount('');
        setGrandTotal(0);
        setSubTotal(0);
        setTaxBreakup({ cgst: 0, sgst: 0, igst: 0, totalTax: 0, slabWise: {} });
        setLineItems([]);
        setTotalItemDiscount(0);

        setTimeout(() => {
            if (nameInputRefs.current[0]) nameInputRefs.current[0].focus();
        }, 100);
    };

    useEffect(() => {
        if (open) {
            resetForm();
        }
    }, [open]);

    // Recalculate Totals using GST engine
    useEffect(() => {
        const itemsForCalc = rows.map(r => ({
            ...r,
            gstRate: isGstBill ? (r.gstRate || 0) : 0,
        }));
        const result = calcInvoiceTotals(itemsForCalc, billDiscount, isInterState);
        setSubTotal(result.subTotal);
        setTaxBreakup(result.taxBreakup);
        setGrandTotal(result.grandTotal);
        setLineItems(result.lineItems);
        setTotalItemDiscount(result.totalItemDiscount);
    }, [rows, billDiscount, isGstBill, isInterState]);

    const handleProductSelect = (key, productId) => {
        const product = products.find(p => p.id === productId);
        if (product) {
            setRows(prev => prev.map(r => {
                if (r.key === key) {
                    return {
                        ...r,
                        name: product.name,
                        price: product.price,
                        productId: product.id,
                        unit: product.unit || 'Pcs',
                        hsn: product.hsn || '',
                        gstRate: product.gstRate || (isGstBill ? 18 : 0),
                        amount: r.qty * product.price
                    };
                }
                return r;
            }));
        }
    };

    const updateRow = (key, field, value) => {
        setRows(prev => prev.map(r => {
            if (r.key === key) {
                const updated = { ...r, [field]: value };
                if (field === 'qty' || field === 'price') {
                    updated.amount = updated.qty * updated.price;
                }
                return updated;
            }
            return r;
        }));
    };

    const addRow = () => {
        if (isLocked) return;
        const newKey = rows.length > 0 ? Math.max(...rows.map(r => r.key)) + 1 : 1;
        setRows([...rows, { key: newKey, name: '', qty: 1, unit: 'Pcs', price: 0, amount: 0, hsn: '', gstRate: isGstBill ? 18 : 0, discount: 0, discountType: 'flat' }]);

        setTimeout(() => {
            const index = rows.length;
            if (nameInputRefs.current[index]) nameInputRefs.current[index].focus();
        }, 50);
    };

    const removeRow = (key) => {
        setRows(rows.filter(r => r.key !== key));
        if (rows.length <= 1) {
            setRows([{ ...emptyRow }]);
        }
    };

    const getDocTypePrefix = () => {
        switch (docType) {
            case 'estimate': return 'EST';
            case 'proforma': return 'PRO';
            default: return 'INV';
        }
    };

    const getInvoiceData = async (values) => {
        let customerName = 'Walk-in Customer';
        let customerId = selectedCustomer;

        if (selectedCustomer === 'new_custom' && newCustomerName) {
            customerName = newCustomerName;
            customerId = 'new_' + Date.now();
        } else if (selectedCustomer && selectedCustomer !== 'walkin') {
            const c = customers.find(x => x.id === selectedCustomer);
            if (c) customerName = c.name;
        }

        // Get auto invoice number
        const shopId = localStorage.getItem('current_shop_id');
        const prefix = getDocTypePrefix();
        let invoiceNumber = '';
        try {
            invoiceNumber = await getNextInvoiceNumber(shopId, prefix);
        } catch (e) {
            console.warn('Invoice counter error, using fallback', e);
            invoiceNumber = `${prefix}-${Date.now().toString().slice(-6)}`;
        }

        const paidAmount = parseFloat(receivedAmount) || 0;

        return {
            id: Date.now().toString(),
            invoiceNumber,
            docType,
            date: values.date ? values.date.toISOString() : new Date().toISOString(),
            dueDate: values.dueDate ? values.dueDate.toISOString() : null,
            items: lineItems.map(r => ({
                id: r.productId || 'manual_' + Date.now() + Math.random(),
                name: r.name,
                qty: r.qty,
                unit: r.unit,
                price: r.price,
                hsn: r.hsn || '',
                gstRate: r.gstRate || 0,
                discount: r.discount || 0,
                discountType: r.discountType || 'flat',
                taxableValue: r.taxableValue,
                cgst: r.cgst || 0,
                sgst: r.sgst || 0,
                igst: r.igst || 0,
                itemTax: r.itemTax || 0,
                itemTotal: r.itemTotal || 0,
                stock: 999
            })),
            subTotal,
            billDiscount,
            totalItemDiscount,
            taxBreakup,
            isInterState,
            total: grandTotal,
            receivedAmount: paidAmount,
            paidAmount,
            paymentMode: values.paymentMode || paymentMode || 'cash',
            customerId: customerId,
            customerName: customerName,
            shopName: localStorage.getItem('current_shop_name') || 'My Shop',
            type: 'a4',
            isGstBill: isGstBill,
            status: deriveInvoiceStatus(grandTotal, paidAmount, values.paymentMode || paymentMode || 'cash'),
            lockedAt: Date.now(),
            isNewCustomer: selectedCustomer === 'new_custom',
            newCustomerDetails: selectedCustomer === 'new_custom' ? { name: newCustomerName, id: customerId } : null
        };
    };

    const handlePreview = () => {
        const values = form.getFieldsValue();
        if (!values.date) values.date = dayjs();
        if (!selectedCustomer) { message.error('Select User for Preview'); return; }

        // For preview, we use a sync version (no invoice number generation)
        const previewInvoice = {
            id: 'PREVIEW',
            date: new Date().toISOString(),
            items: lineItems,
            subTotal,
            discount: billDiscount,
            taxBreakup,
            isInterState,
            tax: taxBreakup.totalTax,
            total: grandTotal,
            customerName: customers.find(c => c.id === selectedCustomer)?.name || 'Walk-in Customer',
            shopName: localStorage.getItem('current_shop_name') || 'My Shop',
            type: 'a4',
            isGstBill,
            docType
        };

        const shopId = localStorage.getItem('current_shop_id');
        const settings = JSON.parse(localStorage.getItem(`shop_${shopId}_bill_settings`) || '{}');
        printBill(previewInvoice, 'a4', settings);
    };

    const handleFinish = async (values, action = 'save_print') => {
        if (!selectedCustomer) {
            message.error('Please select a customer (or generic)');
            return;
        }
        if (selectedCustomer === 'new_custom' && !newCustomerName.trim()) {
            message.error('Please enter customer name');
            return;
        }
        if (rows.length === 0 || !rows[0].name) {
            message.error('Please add at least one item');
            return;
        }

        const invoice = await getInvoiceData(values);

        // 1. PRINT / PREVIEW
        if (action === 'print' || action === 'save_print') {
            const shopId = localStorage.getItem('current_shop_id');
            const settings = JSON.parse(localStorage.getItem(`shop_${shopId}_bill_settings`) || '{}');
            printBill(invoice, 'a4', settings);
        }

        // 2. SAVE (if not just printing)
        if (action === 'save' || action === 'save_print') {
            onSave(invoice);
            onClose();
            message.success(`${docType === 'estimate' ? 'Estimate' : docType === 'proforma' ? 'Proforma' : 'Invoice'} ${invoice.invoiceNumber} Saved`);
        }
    };

    // --- POS FLOW HANDLERS ---
    const handleKeyDown = (e, index, field) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            e.stopPropagation();

            if (field === 'name') {
                const val = e.target.value || rows[index].name;
                if (!val) {
                    handlePrintAndProceed();
                } else {
                    if (!rows[index].name && val) {
                        updateRow(rows[index].key, 'name', val);
                    }
                    if (priceInputRefs.current[index]) {
                        priceInputRefs.current[index].focus();
                        priceInputRefs.current[index].select && priceInputRefs.current[index].select();
                    }
                }
            } else if (field === 'price') {
                addRow();
            }
        }
    };

    const handlePrintAndProceed = () => {
        const hasItems = rows.some(r => r.name);
        if (!hasItems) {
            message.error('Add at least one item');
            return;
        }

        const values = form.getFieldsValue();
        // Sync preview invoice (no counter increment)
        const previewInvoice = {
            id: Date.now().toString(),
            date: new Date().toISOString(),
            items: lineItems,
            subTotal,
            discount: billDiscount,
            taxBreakup,
            isInterState,
            tax: taxBreakup.totalTax,
            total: grandTotal,
            paymentMode: 'Pending',
            shopName: localStorage.getItem('current_shop_name') || 'My Shop',
            type: 'pos',
            isGstBill
        };

        const shopId = localStorage.getItem('current_shop_id');
        const settings = JSON.parse(localStorage.getItem(`shop_${shopId}_bill_settings`) || '{}');
        printBill(previewInvoice, 'pos', settings);

        setIsLocked(true);
        setShowPaymentModal(true);

        setTimeout(() => {
            if (paymentInputRef.current) paymentInputRef.current.focus();
        }, 300);
    };

    const handleFinalSave = async () => {
        if (!receivedAmount) {
            message.error('Enter received amount');
            return;
        }

        const values = form.getFieldsValue();
        let invoice = await getInvoiceData(values);

        const finalAmt = parseFloat(receivedAmount);
        invoice.total = finalAmt;
        invoice.receivedAmount = finalAmt;
        invoice.paidAmount = finalAmt;
        invoice.status = deriveInvoiceStatus(finalAmt, finalAmt, paymentMode);

        onSave(invoice);
        message.success(`Bill ${invoice.invoiceNumber} Saved`);

        resetForm();
    };

    const columns = [
        {
            title: 'Item Name',
            dataIndex: 'name',
            render: (text, record, index) => (
                <Select
                    showSearch
                    mode="combobox"
                    placeholder="Item"
                    style={{ width: '100%' }}
                    value={text}
                    disabled={isLocked}
                    onChange={(val) => {
                        const p = products.find(x => x.name === val || x.id === val);
                        if (p) handleProductSelect(record.key, p.id);
                        else updateRow(record.key, 'name', val);
                    }}
                    onInputKeyDown={(e) => handleKeyDown(e, index, 'name')}
                    onKeyDown={(e) => {
                        if (e.key === 'Enter') handleKeyDown(e, index, 'name');
                    }}
                    ref={el => nameInputRefs.current[index] = el}
                    defaultActiveFirstOption={false}
                    showArrow={false}
                    filterOption={false}
                >
                    {products.map(p => <Option key={p.id} value={p.name}>{p.name}</Option>)}
                </Select>
            )
        },
        {
            title: 'HSN',
            dataIndex: 'hsn',
            width: 80,
            render: (val, record) => (
                <Input
                    size="small"
                    value={val}
                    onChange={e => updateRow(record.key, 'hsn', e.target.value)}
                    disabled={isLocked}
                    placeholder="HSN"
                    style={{ width: '100%' }}
                />
            )
        },
        {
            title: 'Unit',
            dataIndex: 'unit',
            width: 75,
            render: (val, record) => (
                <Select
                    value={val}
                    onChange={v => updateRow(record.key, 'unit', v)}
                    disabled={isLocked}
                    style={{ width: '100%' }}
                    showSearch
                    optionFilterProp="children"
                >
                    <Option value="Pcs">Pcs</Option>
                    <Option value="Mtr">Mtr</Option>
                    <Option value="Kg">Kg</Option>
                    <Option value="Box">Box</Option>
                    <Option value="Set">Set</Option>
                    <Option value="Dzn">Dzn</Option>
                </Select>
            )
        },
        {
            title: 'Qty',
            dataIndex: 'qty',
            width: 65,
            render: (val, record, index) => (
                <InputNumber
                    min={0.1}
                    value={val}
                    onChange={v => updateRow(record.key, 'qty', v)}
                    disabled={isLocked}
                    onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                            e.preventDefault();
                            if (priceInputRefs.current[index]) {
                                priceInputRefs.current[index].focus();
                                priceInputRefs.current[index].select && priceInputRefs.current[index].select();
                            }
                        }
                    }}
                    style={{ width: '100%' }}
                />
            )
        },
        {
            title: 'Rate',
            dataIndex: 'price',
            width: 80,
            render: (val, record, index) => (
                <InputNumber
                    min={0}
                    value={val}
                    onChange={v => updateRow(record.key, 'price', v)}
                    disabled={isLocked}
                    ref={el => priceInputRefs.current[index] = el}
                    onKeyDown={(e) => handleKeyDown(e, index, 'price')}
                    style={{ width: '100%' }}
                />
            )
        },
        ...(isGstBill ? [{
            title: 'GST%',
            dataIndex: 'gstRate',
            width: 70,
            render: (val, record) => (
                <Select
                    size="small"
                    value={val}
                    onChange={v => updateRow(record.key, 'gstRate', v)}
                    disabled={isLocked}
                    style={{ width: '100%' }}
                >
                    {GST_SLABS.map(s => <Option key={s} value={s}>{s}%</Option>)}
                </Select>
            )
        }] : []),
        {
            title: 'Disc',
            width: 65,
            render: (_, record) => (
                <InputNumber
                    size="small" min={0}
                    value={record.discount}
                    onChange={v => updateRow(record.key, 'discount', v || 0)}
                    disabled={isLocked}
                    style={{ width: '100%' }}
                    placeholder="₹"
                />
            )
        },
        {
            title: 'Amount',
            dataIndex: 'amount',
            width: 80,
            render: (val, record) => {
                const li = lineItems.find(l => l.key === record.key);
                return <Text strong>₹{li ? Math.round(li.itemTotal) : Math.round(val)}</Text>;
            }
        },
        {
            title: '',
            width: 40,
            render: (_, record) => <Button danger icon={<DeleteOutlined />} onClick={() => removeRow(record.key)} disabled={isLocked} size="small" />
        }
    ];

    const docTypeLabel = docType === 'estimate' ? 'Estimate' : docType === 'proforma' ? 'Proforma Invoice' : isGstBill ? 'Tax Invoice' : 'Bill';

    return (
        <Modal
            title={
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingRight: 30, flexWrap: 'wrap', gap: 8 }}>
                    <span>{docTypeLabel}</span>
                    <Space size="small">
                        <Segmented
                            size="small"
                            value={docType}
                            onChange={setDocType}
                            options={[
                                { label: 'Invoice', value: 'invoice' },
                                { label: 'Estimate', value: 'estimate' },
                                { label: 'Proforma', value: 'proforma' },
                            ]}
                        />
                        <Text style={{ fontSize: 12 }}>GST:</Text>
                        <Switch checked={isGstBill} onChange={setIsGstBill} size="small" />
                        {isGstBill && (
                            <Tag
                                color={isInterState ? 'blue' : 'default'}
                                style={{ cursor: 'pointer', margin: 0 }}
                                onClick={() => setIsInterState(!isInterState)}
                            >
                                {isInterState ? 'IGST' : 'CGST+SGST'}
                            </Tag>
                        )}
                    </Space>
                </div>
            }
            open={open}
            onCancel={onClose}
            width={1050}
            footer={null}
        >
            <Form form={form} layout="vertical" onFinish={handleFinish}>
                <Row gutter={16}>
                    <Col span={10}>
                        <Form.Item label="Customer" required>
                            <Select
                                showSearch
                                placeholder="Select or Add New"
                                onChange={(val) => {
                                    if (val === 'add_new_trigger') {
                                        setSelectedCustomer('new_custom');
                                    } else {
                                        setSelectedCustomer(val);
                                    }
                                }}
                                optionFilterProp="children"
                                value={selectedCustomer === 'new_custom' ? 'new_custom' : selectedCustomer}
                                dropdownRender={menu => (
                                    <>
                                        {menu}
                                        <Divider style={{ margin: '8px 0' }} />
                                        <Button type="text" block icon={<UserAddOutlined />} onClick={() => setSelectedCustomer('new_custom')}>
                                            Add New Customer
                                        </Button>
                                    </>
                                )}
                            >
                                <Option value="walkin">Walk-in Customer</Option>
                                {customers.map(c => <Option key={c.id} value={c.id}>{c.name}</Option>)}
                                <Option value="new_custom" style={{ display: 'none' }}>+ Add New</Option>
                            </Select>
                        </Form.Item>
                        {selectedCustomer === 'new_custom' && (
                            <Form.Item label="Enter Customer Name" required>
                                <Input
                                    placeholder="Customer Name"
                                    value={newCustomerName}
                                    onChange={e => setNewCustomerName(e.target.value)}
                                    autoFocus
                                />
                            </Form.Item>
                        )}
                    </Col>
                    <Col span={6}>
                        <Form.Item name="date" label="Invoice Date" required>
                            <DatePicker style={{ width: '100%' }} format="DD/MM/YYYY" />
                        </Form.Item>
                    </Col>
                    {docType !== 'estimate' && (
                        <Col span={6}>
                            <Form.Item name="dueDate" label="Due Date">
                                <DatePicker style={{ width: '100%' }} format="DD/MM/YYYY" placeholder="Optional" />
                            </Form.Item>
                        </Col>
                    )}
                    <Col span={docType !== 'estimate' ? 2 : 8} style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', paddingTop: 10 }}>
                        <Button onClick={handlePreview} icon={<EyeOutlined />}>Preview {docTypeLabel}</Button>
                    </Col>
                </Row>

                <Table
                    dataSource={rows}
                    columns={columns}
                    pagination={false}
                    size="small"
                    scroll={{ x: 800 }}
                    footer={() => <Button type="dashed" onClick={addRow} icon={<PlusOutlined />} block disabled={isLocked}>Add Item</Button>}
                />

                <div style={{ marginTop: 16, display: 'flex', justifyContent: 'flex-end' }}>
                    <div style={{ width: 320 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                            <Text>Subtotal:</Text>
                            <Text strong>₹{subTotal}</Text>
                        </div>

                        {totalItemDiscount > 0 && (
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                                <Text type="secondary">Item Discounts:</Text>
                                <Text style={{ color: '#ff4d4f' }}>-₹{totalItemDiscount}</Text>
                            </div>
                        )}

                        {isGstBill && taxBreakup.totalTax > 0 && (
                            <>
                                {isInterState ? (
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                                        <Text type="secondary">IGST:</Text>
                                        <Text style={{ color: '#1890ff' }}>+₹{taxBreakup.igst}</Text>
                                    </div>
                                ) : (
                                    <>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                                            <Text type="secondary">CGST:</Text>
                                            <Text style={{ color: '#1890ff' }}>+₹{taxBreakup.cgst}</Text>
                                        </div>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                                            <Text type="secondary">SGST:</Text>
                                            <Text style={{ color: '#1890ff' }}>+₹{taxBreakup.sgst}</Text>
                                        </div>
                                    </>
                                )}
                                {/* Slab-wise breakup */}
                                {Object.keys(taxBreakup.slabWise).length > 1 && (
                                    <div style={{ background: '#f6f8fa', padding: '4px 8px', borderRadius: 4, marginBottom: 6, fontSize: 11, color: '#666' }}>
                                        {Object.entries(taxBreakup.slabWise).map(([slab, data]) => (
                                            data.totalTax > 0 && (
                                                <div key={slab} style={{ display: 'flex', justifyContent: 'space-between' }}>
                                                    <span>@{slab}: ₹{data.taxableValue}</span>
                                                    <span>Tax: ₹{data.totalTax}</span>
                                                </div>
                                            )
                                        ))}
                                    </div>
                                )}
                            </>
                        )}

                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, alignItems: 'center' }}>
                            <Text>Bill Discount:</Text>
                            <InputNumber min={0} value={billDiscount} onChange={setBillDiscount} size="small" style={{ width: 80 }} />
                        </div>
                        <Divider style={{ margin: '8px 0' }} />
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 18 }}>
                            <Text strong>Total:</Text>
                            <Text strong style={{ color: '#1890ff' }}>₹{grandTotal}</Text>
                        </div>
                    </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 24 }}>
                    <Form.Item name="paymentMode" label="Payment Mode" style={{ marginBottom: 0 }}>
                        <Select defaultValue="cash" style={{ width: 120 }}>
                            <Option value="cash">Cash</Option>
                            <Option value="online">Online</Option>
                            <Option value="credit">Credit</Option>
                        </Select>
                    </Form.Item>
                    <Space>
                        <Button
                            icon={<SaveOutlined />}
                            size="large"
                            onClick={() => {
                                form.validateFields().then(values => handleFinish(values, 'save'));
                            }}
                        >
                            Save
                        </Button>
                        <Button
                            icon={<PrinterOutlined />}
                            size="large"
                            onClick={() => {
                                form.validateFields().then(values => handleFinish(values, 'print'));
                            }}
                        >
                            Print
                        </Button>
                        <Button
                            type="primary"
                            icon={<LockOutlined />}
                            size="large"
                            onClick={() => {
                                form.validateFields().then(values => handleFinish(values, 'save_print'));
                            }}
                        >
                            Save & Print
                        </Button>
                    </Space>
                </div>
            </Form>

            <Modal
                title="Settle Bill"
                open={showPaymentModal}
                closable={false}
                footer={[
                    <Button key="save" type="primary" size="large" onClick={handleFinalSave} icon={<LockOutlined />}>
                        Save Bill (Enter)
                    </Button>
                ]}
                width={400}
                centered
            >
                <div style={{ textAlign: 'center' }}>
                    <Title level={4}>Bill Printed!</Title>
                    <Divider />
                    <Text type="secondary">System Total: ₹{grandTotal}</Text>
                    {taxBreakup.totalTax > 0 && (
                        <div style={{ fontSize: 11, color: '#1890ff', marginTop: 2 }}>
                            incl. Tax ₹{taxBreakup.totalTax}
                        </div>
                    )}
                    <div style={{ marginTop: 20 }}>
                        <Text strong style={{ fontSize: 16 }}>Enter Received Amount (Final):</Text>
                        <Input
                            ref={paymentInputRef}
                            style={{ marginTop: 10, fontSize: 24, textAlign: 'center', height: 60 }}
                            value={receivedAmount}
                            onChange={(e) => setReceivedAmount(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') handleFinalSave();
                            }}
                            autoFocus
                            placeholder="₹"
                        />
                    </div>
                </div>
            </Modal>
        </Modal>
    );
};

export default ManualInvoiceForm;
