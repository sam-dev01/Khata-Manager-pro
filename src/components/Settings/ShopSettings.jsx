import React, { useState, useEffect } from 'react';
import { Typography, Tabs, Form, Input, Button, Card, Switch, Select, message, Divider, Space, InputNumber, Row, Col, Alert, Upload, Image } from 'antd';
import { SaveOutlined, ShopOutlined, PrinterOutlined, DatabaseOutlined, UploadOutlined, EyeOutlined, FilePdfOutlined, UserOutlined, LockOutlined, TagOutlined, CloudDownloadOutlined, CloudSyncOutlined, PlusOutlined, DeleteOutlined } from '@ant-design/icons';
import { printBill, generatePosHtml, generateA4Html } from '../../utils/printBill';
import { database, auth } from '../../firebase';
import { ref, set, get, child } from 'firebase/database';
import SingleLabel from '../Vypari/SingleLabel';
import { syncService } from '../../services/SyncManager';
import { LocalBackupService } from '../../services/LocalBackupService';
import LocalBackupPanel from './LocalBackupPanel';

const { Title, Text } = Typography;
const { Option } = Select;

// --- PRESETS ---
const PRESETS = {
    'standard_50x25': { name: 'Standard (50x25mm)', width: 50, height: 25, cols: 2, rows: 1, barcodeHeight: 8 }, // Adjusted barcodeHeight
    'small_38x25': { name: 'Small (38x25mm)', width: 38, height: 25, cols: 2, rows: 1, barcodeHeight: 8 },
    'qr_25x25': { name: 'QR Square (25x25mm)', width: 25, height: 25, cols: 3, rows: 1, barcodeHeight: 0 }
};

const getBase64 = (file) =>
    new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve(reader.result);
        reader.onerror = (error) => reject(error);
    });

// --- BillPreview Component ---
// --- BillPreview Component ---
const BillPreview = ({ type, form, profileForm, logoFileList, signatureFileList }) => {
    const billingValues = Form.useWatch([], form);
    const profileValues = Form.useWatch([], profileForm);
    const [iframeContent, setIframeContent] = useState('');

    useEffect(() => {
        const timer = setTimeout(async () => {
            const dummyInvoice = {
                id: 'PREVIEW-001',
                date: new Date().toISOString(),
                customerName: 'Preview Customer',
                items: [
                    { name: 'Apple', qty: 2, price: 100 },
                    { name: 'Banana', qty: 1, price: 50 },
                    { name: 'Orange Juice 1L', qty: 1, price: 120 }
                ],
                subTotal: 370,
                tax: 0,
                total: 370,
                discount: 0,
                shopName: profileValues?.shopName || localStorage.getItem('current_shop_name') || 'Your Shop Name'
            };

            // Resolve Images for Preview (Blob URL or Base64)
            let logoPreview = '';
            if (logoFileList && logoFileList.length > 0) {
                const file = logoFileList[0];
                if (file.url) logoPreview = file.url;
                else if (file.thumbUrl) logoPreview = file.thumbUrl;
                else if (file.originFileObj) logoPreview = URL.createObjectURL(file.originFileObj);
            }

            let sigPreview = '';
            if (signatureFileList && signatureFileList.length > 0) {
                const file = signatureFileList[0];
                if (file.url) sigPreview = file.url;
                else if (file.thumbUrl) sigPreview = file.thumbUrl;
                else if (file.originFileObj) sigPreview = URL.createObjectURL(file.originFileObj);
            }

            const shopId = localStorage.getItem('current_shop_id');
            const fullSettings = {
                ...(billingValues || {}),
                ...(profileValues || {}),
                // Fallbacks if profile form is empty (initial load)
                shopName: profileValues?.shopName || localStorage.getItem('current_shop_name'),
                shopAddress: profileValues?.shopAddress || localStorage.getItem(`shop_${shopId}_address`),
                shopPhone: profileValues?.shopPhone || localStorage.getItem(`shop_${shopId}_phone`),
                shopGst: profileValues?.shopGst || localStorage.getItem(`shop_${shopId}_gst`),
                shopEmail: profileValues?.shopEmail || localStorage.getItem(`shop_${shopId}_email`),
                logo: logoPreview || localStorage.getItem(`shop_${shopId}_logo`),
                signature: sigPreview || localStorage.getItem(`shop_${shopId}_signature`)
            };

            let html = '';
            if (type === 'pos') {
                html = generatePosHtml(dummyInvoice, fullSettings, true);
            } else {
                html = generateA4Html(dummyInvoice, fullSettings, true);
            }
            setIframeContent(html);
        }, 300); // 300ms debounce

        return () => clearTimeout(timer);
    }, [billingValues, profileValues, type, logoFileList, signatureFileList]);

    const widthSetting = (billingValues && billingValues.printerWidth) || '80mm';
    const is58mm = widthSetting === '58mm';
    const posWidth = is58mm ? '220px' : '300px';

    return (
        <div style={{
            width: '100%',
            height: '100%',
            background: '#525659', // Darker background for contrast
            borderRadius: 8,
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'flex-start',
            padding: 20,
            overflow: 'auto',
            boxShadow: 'inset 0 0 10px rgba(0,0,0,0.2)'
        }}>
            <div style={{
                position: 'relative',
                background: 'white',
                boxShadow: '0 4px 15px rgba(0,0,0,0.3)',
                width: type === 'pos' ? posWidth : '210mm',
                minHeight: type === 'pos' ? 'auto' : '297mm',
                transform: type === 'a4' ? 'scale(0.43)' : 'none', // Scaled down to fit
                transformOrigin: 'top center',
                marginBottom: type === 'a4' ? '-160px' : '0'
            }}>
                <iframe
                    srcDoc={iframeContent}
                    style={{
                        width: '100%',
                        height: type === 'pos' ? '600px' : '297mm',
                        border: 'none',
                        display: 'block',
                        pointerEvents: 'none' // Prevent interaction within preview
                    }}
                    title="Bill Preview"
                />
            </div>
        </div>
    );
};

// --- LabelSettingsTab Component ---
const LabelSettingsTab = () => {
    const [preset, setPreset] = useState('standard_50x25');
    const [settings, setSettings] = useState(PRESETS['standard_50x25']);
    const [config, setConfig] = useState({
        showName: true, showPrice: true, showBarcode: true, showQR: false,
        boldPrice: true, barcodeWidthScale: 2, bgColor: '#ffffff', textColor: '#000000'
    });

    useEffect(() => {
        const shopId = localStorage.getItem('current_shop_id');
        const saved = localStorage.getItem(`shop_${shopId}_label_settings`) || localStorage.getItem(`shop_${shopId} _label_settings`);
        if (saved) {
            try {
                const parsed = JSON.parse(saved);
                if (parsed.preset) setPreset(parsed.preset);
                if (parsed.settings) setSettings(parsed.settings);
                if (parsed.config) setConfig(parsed.config);
            } catch (e) {
                console.error("Error loading label settings", e);
            }
        }
    }, []);

    const handleSave = () => {
        const shopId = localStorage.getItem('current_shop_id');
        const data = { preset, settings, config };
        localStorage.setItem(`shop_${shopId}_label_settings`, JSON.stringify(data));
        message.success('Label Settings Saved!');
    };

    const updateConfig = (k, v) => setConfig(prev => ({ ...prev, [k]: v }));
    const updateSetting = (k, v) => setSettings(prev => ({ ...prev, [k]: v }));

    const handlePresetChange = (val) => {
        setPreset(val);
        if (val !== 'custom') setSettings(PRESETS[val]);
    };

    const dummyItem = {
        name: 'Demo Product',
        barcode: '123456789',
        sellingRate: '199.00'
    };

    return (
        <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap' }}>
            <div style={{ flex: 1, minWidth: 300 }}>
                <Divider orientation="left">Preset & Layout</Divider>
                <Form layout="vertical">
                    <Form.Item label="Preset Template">
                        <Select value={preset} onChange={handlePresetChange}>
                            {Object.keys(PRESETS).map(k => <Option key={k} value={k}>{PRESETS[k].name}</Option>)}
                            <Option value="custom">Custom</Option>
                        </Select>
                    </Form.Item>
                </Form>

                <Row gutter={[8, 8]}>
                    <Col xs={24} md={12}><Text style={{ fontSize: 12 }}>Cols</Text><InputNumber style={{ width: '100%' }} value={settings.cols} onChange={v => updateSetting('cols', v)} /></Col>
                    <Col xs={24} md={12}><Text style={{ fontSize: 12 }}>Rows</Text><InputNumber style={{ width: '100%' }} value={settings.rows} onChange={v => updateSetting('rows', v)} /></Col>
                    <Col xs={24} md={12}><Text style={{ fontSize: 12 }}>Width (mm)</Text><InputNumber style={{ width: '100%' }} value={settings.width} onChange={v => updateSetting('width', v)} /></Col>
                    <Col xs={24} md={12}><Text style={{ fontSize: 12 }}>Height (mm)</Text><InputNumber style={{ width: '100%' }} value={settings.height} onChange={v => updateSetting('height', v)} /></Col>
                </Row>

                <Divider orientation="left">Appearance</Divider>
                <Row gutter={[16, 16]}>
                    <Col xs={24} md={12}>
                        <Text>Background</Text><br />
                        <input type="color" value={config.bgColor} onChange={e => updateConfig('bgColor', e.target.value)} style={{ width: '100%' }} />
                    </Col>
                    <Col xs={24} md={12}>
                        <Text>Text Color</Text><br />
                        <input type="color" value={config.textColor} onChange={e => updateConfig('textColor', e.target.value)} style={{ width: '100%' }} />
                    </Col>
                    <Col xs={24} md={12}>
                        <Text>Barcode Width</Text><br />
                        <Select value={config.barcodeWidthScale} onChange={v => updateConfig('barcodeWidthScale', v)} style={{ width: '100%' }}>
                            <Option value={1}>Thin (1)</Option>
                            <Option value={2}>Medium (2)</Option>
                            <Option value={3}>Thick (3)</Option>
                        </Select>
                    </Col>
                    <Col xs={24} md={12}>
                        <Text>Barcode Height</Text><br />
                        <InputNumber value={settings.barcodeHeight} onChange={v => updateSetting('barcodeHeight', v)} style={{ width: '100%' }} />
                    </Col>
                </Row>

                <Divider orientation="left">Content</Divider>
                <Space wrap>
                    <div style={{ display: 'flex', gap: 5 }}><input type="checkbox" checked={config.showName} onChange={e => updateConfig('showName', e.target.checked)} /> Name</div>
                    <div style={{ display: 'flex', gap: 5 }}><input type="checkbox" checked={config.showPrice} onChange={e => updateConfig('showPrice', e.target.checked)} /> Price</div>
                    <div style={{ display: 'flex', gap: 5 }}><input type="checkbox" checked={config.showBarcode} onChange={e => updateConfig('showBarcode', e.target.checked)} /> Barcode</div>
                    <div style={{ display: 'flex', gap: 5 }}><input type="checkbox" checked={config.showQR} onChange={e => updateConfig('showQR', e.target.checked)} /> QR</div>
                    <div style={{ display: 'flex', gap: 5 }}><input type="checkbox" checked={config.boldPrice} onChange={e => updateConfig('boldPrice', e.target.checked)} /> Bold Price</div>
                </Space>

                <div style={{ marginTop: 20 }}>
                    <Button type="primary" icon={<SaveOutlined />} onClick={handleSave} block>Save Label Settings</Button>
                </div>
            </div>

            <div style={{ flex: 1, minWidth: 300, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <Typography.Title level={4}>Live Preview</Typography.Title>
                <div style={{
                    border: '1px solid #ddd',
                    padding: 20,
                    background: '#f0f2f5',
                    borderRadius: 8,
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                    minHeight: 200,
                    width: '100%'
                }}>
                    <SingleLabel
                        item={dummyItem}
                        settings={settings}
                        config={config}
                        style={{ border: '1px dashed #999' }}
                    />
                </div>
                <Text type="secondary" style={{ marginTop: 10 }}>* Preview shows one label with current dimensions.</Text>
            </div>
        </div>
    );
};


// --- ShopSettings Main Component ---
const ShopSettings = () => {
    const [form] = Form.useForm();
    const [billingForm] = Form.useForm();
    const shopId = localStorage.getItem('current_shop_id');
    const getNamespacedKey = (key) => `shop_${shopId}_${key}`;
    const getStoredSetting = (key, fallback = '') => {
        const normalizedKey = getNamespacedKey(key);
        return localStorage.getItem(normalizedKey) ?? localStorage.getItem(`${normalizedKey} `) ?? fallback;
    };

    // Image Upload State
    const [logoFileList, setLogoFileList] = useState([]);
    const [signatureFileList, setSignatureFileList] = useState([]);

    const handleImageChange = async ({ fileList }, type) => {
        if (type === 'logo') setLogoFileList(fileList);
        else setSignatureFileList(fileList);
    };

    const handlePreview = async (file) => {
        if (!file.url && !file.preview) {
            file.preview = await getBase64(file.originFileObj);
        }
        const imgWindow = window.open(file.url || file.preview);
        imgWindow?.document.write(`<img src="${file.url || file.preview}" style="max-width: 100%"/>`);
    };

    const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
    useEffect(() => {
        const handleResize = () => setIsMobile(window.innerWidth <= 768);
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    useEffect(() => {
        // Load settings
        const shopName = localStorage.getItem('current_shop_name') || '';
        const shopAddress = getStoredSetting('address');
        const shopPhone = getStoredSetting('phone');
        const shopEmail = getStoredSetting('email');
        const shopGst = getStoredSetting('gst');
        const billSettings = JSON.parse(getStoredSetting('bill_settings', '{}'));

        // Load Images
        const savedLogo = getStoredSetting('logo');
        if (savedLogo) {
            setLogoFileList([{ uid: '-1', name: 'logo.png', status: 'done', url: savedLogo }]);
        }
        const savedSig = getStoredSetting('signature');
        if (savedSig) {
            setSignatureFileList([{ uid: '-1', name: 'signature.png', status: 'done', url: savedSig }]);
        }

        // PRE-FILL ALL FORMS
        form.setFieldsValue({
            shopName, shopAddress, shopPhone, shopEmail, shopGst,
            managerPassword: billSettings.managerPassword || '',
            bankName: billSettings.bankName || '',
            bankAccount: billSettings.bankAccount || '',
            bankIfsc: billSettings.bankIfsc || '',
            upiId: billSettings.upiId || ''
        });

        billingForm.setFieldsValue({
            defaultFormat: billSettings.defaultFormat || 'pos',
            footerMessage: billSettings.footerMessage || 'Thank you, Visit Again!',
            terms: billSettings.terms || '',
            showLogo: billSettings.showLogo || false,
            printerWidth: billSettings.printerWidth || '80mm',
            invoiceStyle: billSettings.invoiceStyle || 'standard',
            posFontSize: billSettings.posFontSize || '12px',
            posBillLanguage: billSettings.posBillLanguage || 'both',
            posTransliterateItems: billSettings.posTransliterateItems !== false,
            showBankDetails: billSettings.showBankDetails || false
        });

        // Security settings are also in billSettings currently (mixed)
        form.setFieldsValue({
            managerLoginEnabled: billSettings.managerLoginEnabled !== false // Default true
        });

    }, [form, billingForm, shopId]);

    // Unified Save Handler for Profile/Bank/Security
    const handleProfileSave = async (values) => {
        try {
            message.loading({ content: 'Saving settings...', key: 'save' });

            // 1. Process Images to Base64
            let logoBase64 = getStoredSetting('logo');
            if (logoFileList.length > 0) {
                if (logoFileList[0].originFileObj) {
                    logoBase64 = await getBase64(logoFileList[0].originFileObj);
                } else if (logoFileList[0].url) {
                    logoBase64 = logoFileList[0].url;
                }
            } else {
                logoBase64 = ''; // Cleared
            }

            let signatureBase64 = getStoredSetting('signature');
            if (signatureFileList.length > 0) {
                if (signatureFileList[0].originFileObj) {
                    signatureBase64 = await getBase64(signatureFileList[0].originFileObj);
                } else if (signatureFileList[0].url) {
                    signatureBase64 = signatureFileList[0].url;
                }
            } else {
                signatureBase64 = '';
            }

            // 2. Prepare Data
            const shopName = values.shopName || localStorage.getItem('current_shop_name');
            const shopAddress = values.shopAddress !== undefined ? values.shopAddress : getStoredSetting('address');
            const shopPhone = values.shopPhone !== undefined ? values.shopPhone : getStoredSetting('phone');
            const shopEmail = values.shopEmail !== undefined ? values.shopEmail : getStoredSetting('email');
            const shopGst = values.shopGst !== undefined ? values.shopGst : getStoredSetting('gst');

            // Update Bill Settings (Bank, Security)
            const existingBillSettings = JSON.parse(getStoredSetting('bill_settings', '{}'));
            const newBillSettings = { ...existingBillSettings };

            if (values.managerPassword !== undefined) newBillSettings.managerPassword = values.managerPassword;
            if (values.bankName !== undefined) newBillSettings.bankName = values.bankName;
            if (values.bankAccount !== undefined) newBillSettings.bankAccount = values.bankAccount;
            if (values.bankIfsc !== undefined) newBillSettings.bankIfsc = values.bankIfsc;
            if (values.upiId !== undefined) newBillSettings.upiId = values.upiId;
            if (values.managerLoginEnabled !== undefined) newBillSettings.managerLoginEnabled = values.managerLoginEnabled;

            // 3. Save to LocalStorage
            localStorage.setItem('current_shop_name', shopName);
            localStorage.setItem(getNamespacedKey('address'), shopAddress);
            localStorage.setItem(getNamespacedKey('phone'), shopPhone);
            localStorage.setItem(getNamespacedKey('email'), shopEmail);
            localStorage.setItem(getNamespacedKey('gst'), shopGst);
            localStorage.setItem(getNamespacedKey('logo'), logoBase64);
            localStorage.setItem(getNamespacedKey('signature'), signatureBase64);
            localStorage.setItem(getNamespacedKey('bill_settings'), JSON.stringify(newBillSettings));

            // 4. Save to Firebase (Cloud Sync)
            if (auth.currentUser && shopId) {
                const shopData = {
                    shopName,
                    shopAddress,
                    shopPhone,
                    shopEmail,
                    shopGst,
                    logo: logoBase64,
                    signature: signatureBase64,
                    billSettings: newBillSettings,
                    updatedAt: new Date().toISOString(),
                    userId: auth.currentUser.uid
                };
                await set(ref(database, `firms/${shopId}/settings`), shopData);
            }

            message.success({ content: 'Settings Saved & Synced!', key: 'save' });
        } catch (error) {
            console.error("Save Error:", error);
            message.error({ content: 'Failed to save settings', key: 'save' });
        }
    };

    const handleBillingSave = async (values) => {
        try {
            message.loading({ content: 'Saving preferences...', key: 'save_bill' });
            const existingBillSettings = JSON.parse(getStoredSetting('bill_settings', '{}'));
            const settings = {
                ...existingBillSettings,
                ...values // Merges all billing fields
            };

            localStorage.setItem(getNamespacedKey('bill_settings'), JSON.stringify(settings));

            if (auth.currentUser && shopId) {
                await set(ref(database, `firms/${shopId}/settings/billSettings`), settings);
            }
            message.success({ content: 'Billing Settings Updated!', key: 'save_bill' });
        } catch (error) {
            console.error(error);
            message.error({ content: 'Failed to update', key: 'save_bill' });
        }
    };

    const handlePreviewStyle = () => {
        const values = billingForm.getFieldsValue();
        const dummyInvoice = {
            id: 'DEMO-123',
            date: new Date().toISOString(),
            items: [
                { name: 'Demo Product 1', qty: 2, price: 100 },
                { name: 'Demo Service', qty: 1, price: 500 }
            ],
            subTotal: 700,
            discount: 0,
            tax: 0,
            total: 700,
            paymentMode: 'cash',
            shopName: localStorage.getItem('current_shop_name') || 'Your Shop Name'
        };
        const settings = {
            ...values,
            shopName: localStorage.getItem('current_shop_name'),
            shopAddress: localStorage.getItem(getNamespacedKey('address')),
            shopPhone: localStorage.getItem(getNamespacedKey('phone')),
            shopGst: localStorage.getItem(getNamespacedKey('gst'))
        };
        printBill(dummyInvoice, 'a4', settings);
    };

    const handlePreviewPOS = () => {
        const values = billingForm.getFieldsValue();
        const width = values.printerWidth || '80mm';
        const dummyInvoice = {
            id: 'POS-TEST',
            date: new Date().toISOString(),
            items: [
                { name: 'Milk 1L', qty: 2, price: 60 },
                { name: 'Bread', qty: 1, price: 40 },
                { name: 'Butter 500g', qty: 1, price: 280 }
            ],
            subTotal: 440,
            discount: 10,
            tax: 0,
            total: 430,
            paymentMode: 'upi',
            shopName: localStorage.getItem('current_shop_name') || 'Your Shop Name'
        };
        const settings = {
            ...values,
            printerWidth: width,
            shopName: localStorage.getItem('current_shop_name'),
            shopAddress: localStorage.getItem(getNamespacedKey('address')),
            shopPhone: localStorage.getItem(getNamespacedKey('phone')),
            shopGst: localStorage.getItem(getNamespacedKey('gst'))
        };
        printBill(dummyInvoice, 'pos', settings);
    };

    // --- TAB ITEMS ---
    const items = [
        {
            key: 'general',
            label: <span><ShopOutlined /> General Profile</span>,
            children: (
                <Card title="Shop Details">
                    <Form form={form} layout="vertical" onFinish={handleProfileSave}>
                        <Row gutter={16}>
                            <Col xs={24} md={12}>
                                <Form.Item label="Shop Logo">
                                    <Upload
                                        listType="picture-card"
                                        fileList={logoFileList}
                                        onPreview={handlePreview}
                                        onChange={(info) => handleImageChange(info, 'logo')}
                                        beforeUpload={() => false}
                                        maxCount={1}
                                    >
                                        {logoFileList.length < 1 && <div><PlusOutlined /><div style={{ marginTop: 8 }}>Upload</div></div>}
                                    </Upload>
                                </Form.Item>
                            </Col>
                            <Col xs={24} md={12}>
                                <Form.Item label="Authorized Signature">
                                    <Upload
                                        listType="picture-card"
                                        fileList={signatureFileList}
                                        onPreview={handlePreview}
                                        onChange={(info) => handleImageChange(info, 'signature')}
                                        beforeUpload={() => false}
                                        maxCount={1}
                                    >
                                        {signatureFileList.length < 1 && <div><PlusOutlined /><div style={{ marginTop: 8 }}>Upload</div></div>}
                                    </Upload>
                                </Form.Item>
                            </Col>

                            <Col xs={24} md={12}>
                                <Form.Item name="shopName" label="Shop Name" rules={[{ required: true }]}>
                                    <Input prefix={<ShopOutlined />} />
                                </Form.Item>
                            </Col>
                            <Col xs={24} md={12}>
                                <Form.Item name="shopPhone" label="Phone">
                                    <Input />
                                </Form.Item>
                            </Col>
                            <Col xs={24}>
                                <Form.Item name="shopAddress" label="Address">
                                    <Input.TextArea rows={2} />
                                </Form.Item>
                            </Col>
                            <Col xs={24} md={12}>
                                <Form.Item name="shopEmail" label="Email">
                                    <Input />
                                </Form.Item>
                            </Col>
                            <Col xs={24} md={12}>
                                <Form.Item name="shopGst" label="GST Number">
                                    <Input />
                                </Form.Item>
                            </Col>
                        </Row>
                        <Button type="primary" htmlType="submit" icon={<SaveOutlined />}>Save Details</Button>
                    </Form>
                </Card>
            )
        },
        {
            key: 'banking',
            label: <span><DatabaseOutlined /> Bank & UPI</span>,
            children: (
                <Card title="Bank Account & UPI">
                    <Form form={form} layout="vertical" onFinish={handleProfileSave}>
                        <Row gutter={16}>
                            <Col xs={24} md={12}>
                                <Form.Item name="bankName" label="Bank Name"><Input /></Form.Item>
                            </Col>
                            <Col xs={24} md={12}>
                                <Form.Item name="bankAccount" label="Account Number"><Input /></Form.Item>
                            </Col>
                            <Col xs={24} md={12}>
                                <Form.Item name="bankIfsc" label="IFSC Code"><Input /></Form.Item>
                            </Col>
                            <Col xs={24} md={12}>
                                <Form.Item name="upiId" label="UPI ID (for QR)"><Input /></Form.Item>
                            </Col>
                        </Row>
                        <Button type="primary" htmlType="submit" icon={<SaveOutlined />}>Save Banking</Button>
                    </Form>
                </Card>
            )
        },
        {
            key: 'security',
            label: <span><LockOutlined /> Security</span>,
            children: (
                <Card title="Security & Access">
                    <Form form={form} layout="vertical" onFinish={handleProfileSave}>
                        <Form.Item name="managerLoginEnabled" label="Enable Manager Login" valuePropName="checked" extra="Allow staff to login using manager password">
                            <Switch />
                        </Form.Item>
                        <Form.Item name="managerPassword" label="Manager Password" extra="Password for staff/manager login role">
                            <Input.Password placeholder="Set password" />
                        </Form.Item>
                        <Button type="primary" htmlType="submit" icon={<SaveOutlined />}>Update Security</Button>
                    </Form>
                </Card>
            )
        },
        {
            key: 'billing',
            label: <span><FilePdfOutlined /> Billing Preferences</span>,
            children: (
                <Row gutter={24}>
                    <Col xs={24} lg={12}>
                        <Card title="Billing Configuration">
                            <Form form={billingForm} layout="vertical" onFinish={handleBillingSave}>
                                <Row gutter={16}>
                                    <Col xs={24} md={12}>
                                        <Form.Item name="defaultFormat" label="Default Bill Format">
                                            <Select>
                                                <Option value="pos">POS (Thermal)</Option>
                                                <Option value="a4">A4 (Tax Invoice)</Option>
                                            </Select>
                                        </Form.Item>
                                    </Col>
                                    <Col xs={24} md={12}>
                                        <Form.Item name="invoiceStyle" label="A4 Invoice Style">
                                            <Select>
                                                <Option value="standard">Standard (Blue)</Option>
                                                <Option value="modern">Modern Professional</Option>
                                                <Option value="minimalist">Minimalist Black/White</Option>
                                                <Option value="geometric">Geometric Shapes</Option>
                                                <Option value="wave">Creative Wave</Option>
                                            </Select>
                                        </Form.Item>
                                    </Col>
                                    <Col xs={24}>
                                        <Form.Item name="terms" label="Terms & Conditions (Footer)">
                                            <Input.TextArea rows={3} />
                                        </Form.Item>
                                    </Col>
                                    <Col xs={24}>
                                        <Form.Item name="footerMessage" label="Thank You Message">
                                            <Input />
                                        </Form.Item>
                                    </Col>
                                    <Col xs={24}>
                                        <Form.Item name="showBankDetails" label="Show Bank Details on Bill" valuePropName="checked">
                                            <Switch />
                                        </Form.Item>
                                    </Col>
                                </Row>
                                <Space>
                                    <Button type="primary" htmlType="submit" icon={<SaveOutlined />}>Save Config</Button>
                                    <Button icon={<EyeOutlined />} onClick={handlePreviewStyle}>Print Preview (Browser)</Button>
                                </Space>
                            </Form>
                        </Card>
                    </Col>
                    <Col xs={24} lg={12}>
                        <Card title="Values Preview" bodyStyle={{ padding: 0, overflow: 'hidden' }}>
                            <BillPreview
                                type="a4"
                                form={billingForm}
                                profileForm={form}
                                logoFileList={logoFileList}
                                signatureFileList={signatureFileList}
                            />
                        </Card>
                    </Col>
                </Row>
            )
        },
        {
            key: 'pos',
            label: <span><PrinterOutlined /> POS & Printer</span>,
            children: (
                <Row gutter={24}>
                    <Col xs={24} lg={12}>
                        <Card title="POS Printer Settings">
                            <Form form={billingForm} layout="vertical" onFinish={handleBillingSave}>
                                <Form.Item name="printerWidth" label="Printer Paper Width">
                                    <Select>
                                        <Option value="80mm">80mm (Standard Receipt)</Option>
                                        <Option value="58mm">58mm (Small Handheld)</Option>
                                    </Select>
                                </Form.Item>
                                <Form.Item name="posFontSize" label="Font Size">
                                    <Select>
                                        <Option value="10px">Small (Compact)</Option>
                                        <Option value="12px">Medium (Standard)</Option>
                                        <Option value="14px">Large (Accessible)</Option>
                                    </Select>
                                </Form.Item>
                                <Form.Item name="posBillLanguage" label="Language on Bill">
                                    <Select>
                                        <Option value="en">English Only</Option>
                                        <Option value="hi">Hindi Only</Option>
                                        <Option value="both">Bilingual (Hindi + Eng)</Option>
                                    </Select>
                                </Form.Item>
                                <Form.Item name="posTransliterateItems" label="Auto-Translate Item Names" valuePropName="checked">
                                    <Switch checkedChildren="On" unCheckedChildren="Off" />
                                </Form.Item>
                                <Space>
                                    <Button type="primary" htmlType="submit" icon={<SaveOutlined />}>Save POS Settings</Button>
                                    <Button onClick={handlePreviewPOS}>Test Print</Button>
                                </Space>
                            </Form>
                        </Card>
                    </Col>
                    <Col xs={24} lg={12}>
                        <Card title="Live Preview" bodyStyle={{ padding: 0, overflow: 'hidden' }}>
                            <BillPreview
                                type="pos"
                                form={billingForm}
                                profileForm={form}
                                logoFileList={logoFileList}
                                signatureFileList={signatureFileList}
                            />
                        </Card>
                    </Col>
                </Row>
            )
        },
        {
            key: 'sync',
            label: <span><CloudSyncOutlined /> Data Sync</span>,
            children: (
                <Card title="Cloud Synchronization">
                    <div style={{ textAlign: 'center', padding: 20 }}>
                        {/* CLOUD RESTORE */}
                        <Card
                            title={<span><CloudDownloadOutlined style={{ marginRight: 8 }} /> Download & Restore Data (Cloud)</span>}
                            style={{ marginBottom: 20 }}
                        >
                            <Alert
                                message="For Emergency / New Device Only"
                                description="This will download the latest data from the cloud and replace your local database. Use this if you cleared your cache or are setting up a new device."
                                type="warning"
                                showIcon
                                style={{ marginBottom: 15 }}
                            />
                            <Button
                                type="primary"
                                danger
                                icon={<CloudDownloadOutlined />}
                                onClick={() => syncService.downloadCloudData()}
                            >
                                Download & Restore from Cloud
                            </Button>
                            <div style={{ marginTop: 10, fontSize: 12, color: '#999' }}>
                                Note: Your data is automatically synced to the cloud every few seconds.
                            </div>
                        </Card>

                        {/* LOCAL BACKUPS (ELECTRON ONLY) */}
                        {LocalBackupService.isAvailable() && (
                            <LocalBackupPanel />
                        )}
                        <Divider />

                        <div style={{ background: '#f6ffed', padding: 10, borderRadius: 4, border: '1px solid #b7eb8f', display: 'inline-block' }}>
                            <Text type="success">
                                ✅ Auto-Sync is enabled when online.
                            </Text>
                        </div>
                    </div>
                </Card>
            )
        },
        {
            key: 'labels',
            label: <span><TagOutlined /> Barcode Labels</span>,
            children: <LabelSettingsTab />
        }
    ];

    return (
        <div style={{ maxWidth: 1400, margin: '20px auto', padding: '0 20px' }}>
            <div style={{ marginBottom: 20 }}>
                <Title level={2} style={{ margin: 0 }}>⚙️ Settings</Title>
                <Text type="secondary">Manage your shop profile, billing preferences, and devices</Text>
            </div>

            <Tabs
                defaultActiveKey="general"
                tabPosition="top"
                items={items}
                size="large"
                style={{ background: '#fff', borderRadius: 8, padding: 20, minHeight: '80vh' }}
            />
        </div>
    );
};

export default ShopSettings;
