import React, { useState, useEffect } from 'react';
import { Modal, Form, Input, Button, message, Divider } from 'antd';
import { SettingOutlined } from '@ant-design/icons';

const BillSettings = ({ open, onClose, onSave }) => {
    const [form] = Form.useForm();
    const shopId = localStorage.getItem('current_shop_id');
    const settingsKey = `shop_${shopId}_bill_settings`;

    useEffect(() => {
        if (open) {
            // Load from split keys to match ShopSettings structure
            const billSettings = JSON.parse(localStorage.getItem(settingsKey) || '{}');
            form.setFieldsValue({
                shopName: localStorage.getItem('current_shop_name') || '',
                address: localStorage.getItem(`shop_${shopId}_address`) || '',
                phone: localStorage.getItem(`shop_${shopId}_phone`) || '',
                gstin: localStorage.getItem(`shop_${shopId}_gst`) || '',
                footerMessage: billSettings.footerMessage || ''
            });
        }
    }, [open, form, settingsKey, shopId]);

    const handleFinish = (values) => {
        // 1. Separate core profile fields from bill settings
        const { shopName, address, phone, gstin, ...rest } = values;

        // 2. Update Core Profile in LocalStorage
        if (shopName) localStorage.setItem('current_shop_name', shopName);
        if (address !== undefined) localStorage.setItem(`shop_${shopId}_address`, address);
        if (phone !== undefined) localStorage.setItem(`shop_${shopId}_phone`, phone);
        if (gstin !== undefined) localStorage.setItem(`shop_${shopId}_gst`, gstin);

        // 3. Update Bill Settings (Footer, etc)
        const currentBillSettings = JSON.parse(localStorage.getItem(settingsKey) || '{}');
        const updatedBillSettings = { ...currentBillSettings, ...rest };
        localStorage.setItem(settingsKey, JSON.stringify(updatedBillSettings));

        message.success('Bill Settings Saved!');
        if (onSave) onSave(updatedBillSettings);
        onClose();
    };

    return (
        <Modal
            title="Bill & Print Settings"
            open={open}
            onCancel={onClose}
            onOk={() => form.submit()}
            okText="Save Settings"
        >
            <Form form={form} layout="vertical" onFinish={handleFinish}>
                <Form.Item name="shopName" label="Shop Name" rules={[{ required: true }]}>
                    <Input placeholder="e.g. Gupta Cloth Store" />
                </Form.Item>
                <Form.Item name="address" label="Address">
                    <Input.TextArea rows={2} placeholder="Market Area, City" />
                </Form.Item>
                <Form.Item name="phone" label="Phone Number">
                    <Input placeholder="+91 9876543210" />
                </Form.Item>
                <Form.Item name="gstin" label="GSTIN (Optional)">
                    <Input placeholder="GST Number" />
                </Form.Item>

                <Divider />

                <Form.Item name="footerMessage" label="Footer Message">
                    <Input placeholder="Thank You! Visit Again." />
                </Form.Item>

                <div style={{ textAlign: 'center', marginTop: 16 }}>
                    <a href="#" onClick={(e) => { e.preventDefault(); message.info('Please go to "Settings" in the main menu for full configuration.'); }}>
                        <SettingOutlined /> Go to Advanced Settings
                    </a>
                </div>
            </Form>
        </Modal>
    );
};

export default BillSettings;
