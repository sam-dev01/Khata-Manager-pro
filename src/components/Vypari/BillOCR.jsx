import React, { useState } from 'react';
import { Modal, Button, Upload, message, Spin, Table, Input, InputNumber, DatePicker, Row, Col } from 'antd';
import { UploadOutlined, ScanOutlined, DeleteOutlined, PlusOutlined, CheckCircleOutlined } from '@ant-design/icons';
import Tesseract from 'tesseract.js';
import { GoogleGenerativeAI } from "@google/generative-ai";
import dayjs from 'dayjs';
import { parseIndianBill } from '../../utils/indianBillParser';

const BillOCR = ({ visible, onClose, onDataExtracted }) => {
    const [step, setStep] = useState('upload'); // upload | scanning | review
    const [progress, setProgress] = useState('');
    const [parsedData, setParsedData] = useState({ items: [], meta: {} });

    // AI Init
    const API_KEY = import.meta.env.VITE_GEMINI_API_KEY;
    let genAI = null;
    if (API_KEY) {
        try {
            genAI = new GoogleGenerativeAI(API_KEY);
        } catch (e) {
            console.error("Gemini init failed", e);
        }
    }

    const fileToGenerativePart = async (file) => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => {
                const base64Data = reader.result.split(',')[1];
                resolve({
                    inlineData: {
                        data: base64Data,
                        mimeType: file.type
                    }
                });
            };
            reader.onerror = reject;
            reader.readAsDataURL(file);
        });
    };

    const processImage = async (file) => {
        setStep('scanning');
        setProgress('Analyze Bill...');

        let rawText = '';

        // 1. Try Gemini For TEXT EXTRACTION ONLY (Fast & Accurate)
        if (genAI) {
            try {
                setProgress('AI Text Extraction...');
                const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
                const imagePart = await fileToGenerativePart(file);
                // Instruction: Just get the text!
                const prompt = "Extract all text from this image line by line. Do not help, do not format as JSON. Just raw text transcription.";
                const result = await model.generateContent([prompt, imagePart]);
                rawText = result.response.text();
            } catch (err) {
                console.error("AI Text Failed", err);
            }
        }

        // 2. Fallback to Tesseract if AI failed
        if (!rawText) {
            try {
                setProgress('OCR Scanning (Local)...');
                const result = await Tesseract.recognize(file, 'eng', {
                    logger: m => m.status === 'recognizing text' && setProgress(`Reading... ${(m.progress * 100).toFixed(0)}%`)
                });
                rawText = result.data.text;
            } catch (err) {
                message.error("Scanning failed completely.");
                setStep('upload');
                return;
            }
        }

        // 3. Process Text with Indian Parser
        setProgress('Parsing Data...');
        const result = parseIndianBill(rawText);

        // Add unique IDs for table
        const itemsWithId = result.items.map((i, idx) => ({ ...i, key: idx }));

        setParsedData({
            items: itemsWithId,
            billNo: result.meta.billNo,
            date: result.meta.date,
            total: result.meta.total,
        });

        setStep('review');
    };

    const handleSave = () => {
        const finalData = {
            billNo: parsedData.billNo,
            date: parsedData.date,
            items: parsedData.items,
            amount: parseFloat(parsedData.total) || 0
        };

        if (finalData.items.length === 0) {
            message.warning("No items to add!");
            return;
        }

        onDataExtracted(finalData);
        onClose();
        setStep('upload'); // Reset
    };

    // Table Columns for Editing
    const columns = [
        {
            title: 'Item Name',
            dataIndex: 'name',
            render: (text, record) => (
                <Input
                    value={text}
                    onChange={e => updateItem(record.key, 'name', e.target.value)}
                />
            )
        },
        {
            title: 'Qty',
            dataIndex: 'qty',
            width: 80,
            render: (val, record) => (
                <InputNumber
                    min={0}
                    value={val}
                    onChange={v => updateItem(record.key, 'qty', v)}
                    style={{ width: '100%' }}
                />
            )
        },
        {
            title: 'Rate',
            dataIndex: 'rate',
            width: 100,
            render: (val, record) => (
                <InputNumber
                    min={0}
                    value={val}
                    onChange={v => updateItem(record.key, 'rate', v)}
                    style={{ width: '100%' }}
                />
            )
        },
        {
            title: 'Amount',
            dataIndex: 'amount',
            width: 100,
            render: (val, record) => (
                <span>{(record.qty * record.rate).toFixed(2)}</span>
            )
        },
        {
            title: '',
            width: 50,
            render: (_, record) => (
                <Button
                    type="text"
                    danger
                    icon={<DeleteOutlined />}
                    onClick={() => deleteItem(record.key)}
                />
            )
        }
    ];

    const updateItem = (key, field, value) => {
        const newItems = parsedData.items.map(item => {
            if (item.key === key) {
                return { ...item, [field]: value };
            }
            return item;
        });
        // Recalculate total if needed, or just let user override total?
        // Let's summing up from items for total is safer?
        // But Bill total might have tax. Let's keep total separate for now or auto-calc.
        setParsedData({ ...parsedData, items: newItems });
    };

    const deleteItem = (key) => {
        setParsedData({ ...parsedData, items: parsedData.items.filter(i => i.key !== key) });
    };

    const addItem = () => {
        const newItem = { key: Date.now(), name: '', qty: 1, rate: 0, amount: 0 };
        setParsedData({ ...parsedData, items: [...parsedData.items, newItem] });
    };

    return (
        <Modal
            open={visible}
            onCancel={() => { setStep('upload'); onClose(); }}
            title={<span><ScanOutlined /> Scan & Verify Bill</span>}
            width={800}
            footer={step === 'review' ? [
                <Button key="back" onClick={() => setStep('upload')}>Rescan</Button>,
                <Button key="submit" type="primary" onClick={handleSave} icon={<CheckCircleOutlined />}>
                    Confirm & Add to Inventory
                </Button>
            ] : null}
        >
            {step === 'scanning' && (
                <div style={{ textAlign: 'center', padding: 40 }}>
                    <Spin size="large" />
                    <p style={{ marginTop: 20 }}>{progress}</p>
                </div>
            )}

            {step === 'upload' && (
                <div style={{ textAlign: 'center', padding: 40 }}>
                    <Upload
                        beforeUpload={file => { processImage(file); return false; }}
                        showUploadList={false}
                        accept="image/*"
                    >
                        <Button type="primary" size="large" icon={<UploadOutlined />} style={{ height: 50, width: 200 }}>
                            Upload Bill Photo
                        </Button>
                    </Upload>
                    <p style={{ color: '#888', marginTop: 10 }}>Supports receipts, handwritten bills, and A4 invoices.</p>
                </div>
            )}

            {step === 'review' && (
                <div>
                    <Row gutter={16} style={{ marginBottom: 15 }}>
                        <Col span={8}>
                            <label>Bill No</label>
                            <Input
                                value={parsedData.billNo}
                                onChange={e => setParsedData({ ...parsedData, billNo: e.target.value })}
                            />
                        </Col>
                        <Col span={8}>
                            <label>Date</label>
                            <div style={{ display: 'block' }}>
                                {/* Simple Date display/edit fallback since dayjs obj handling in Input is tricky */}
                                <Input
                                    value={parsedData.date ? dayjs(parsedData.date).format('DD/MM/YYYY') : ''}
                                    placeholder="DD/MM/YYYY"
                                    onChange={e => {
                                        // Basic raw string assumption or better: use DatePicker
                                        // sticking to Input for robust raw edit
                                    }}
                                />
                            </div>
                        </Col>
                        <Col span={8}>
                            <label>Total Amount</label>
                            <InputNumber
                                value={parsedData.total}
                                style={{ width: '100%' }}
                                onChange={v => setParsedData({ ...parsedData, total: v })}
                            />
                        </Col>
                    </Row>

                    <Table
                        dataSource={parsedData.items}
                        columns={columns}
                        pagination={false}
                        size="small"
                        footer={() => <Button type="dashed" onClick={addItem} icon={<PlusOutlined />}>Add Item</Button>}
                        scroll={{ y: 300 }}
                    />
                </div>
            )}
        </Modal>
    );
};

export default BillOCR;
