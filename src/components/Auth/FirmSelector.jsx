import React, { useState } from 'react';
import { Card, Button, Avatar, Typography, Row, Col, Space, Badge, Modal, Input, Form, message } from 'antd';
import { ShopOutlined, PlusOutlined, LogoutOutlined } from '@ant-design/icons';
import { useAuth } from '../../context/AuthContext';

const { Title, Text } = Typography;

export default function FirmSelector() {
    const { userFirms, selectFirm, createFirm, logout, currentUser } = useAuth();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const [form] = Form.useForm();

    const firmsList = Object.entries(userFirms).map(([id, data]) => ({
        id,
        ...data
    }));

    const handleSelect = (firm) => {
        selectFirm(firm.id, firm.name, firm.role);
    };

    const handleCreate = async (values) => {
        setLoading(true);
        try {
            await createFirm(values.name);
            message.success('Firm Created Successfully');
            setIsModalOpen(false);
            form.resetFields();
        } catch (e) {
            console.error(e);
            message.error(e.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={{ minHeight: '100vh', padding: 40, background: '#f8fafc' }}>
            <div style={{ maxWidth: 800, margin: '0 auto' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 32 }}>
                    <div>
                        <Title level={2} style={{ margin: 0 }}>Select Firm</Title>
                        <Text type="secondary">Welcome back, {currentUser?.email}</Text>
                    </div>
                    <Button icon={<LogoutOutlined />} onClick={() => logout()} danger>Logout</Button>
                </div>

                <Row gutter={[24, 24]}>
                    {firmsList.map(firm => (
                        <Col xs={24} sm={12} md={8} key={firm.id}>
                            <Card
                                hoverable
                                onClick={() => handleSelect(firm)}
                                style={{ borderRadius: 16, textAlign: 'center', height: '100%' }}
                            >
                                <Avatar
                                    size={64}
                                    icon={<ShopOutlined />}
                                    style={{ backgroundColor: '#6366f1', marginBottom: 16 }}
                                    gap={4}
                                >
                                    {firm.name?.charAt(0)}
                                </Avatar>
                                <Title level={4} style={{ marginBottom: 4 }}>{firm.name}</Title>
                                <Badge
                                    status="success"
                                    text={<span style={{ textTransform: 'capitalize' }}>{firm.role}</span>}
                                />
                                <div style={{ marginTop: 12, fontSize: 12, color: '#9ca3af' }}>ID: {firm.id}</div>
                            </Card>
                        </Col>
                    ))}

                    {/* Create New Firm Card */}
                    <Col xs={24} sm={12} md={8}>
                        <Card
                            hoverable
                            onClick={() => setIsModalOpen(true)}
                            style={{ borderRadius: 16, height: '100%', border: '2px dashed #e2e8f0', background: 'transparent' }}
                            styles={{ body: { display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%' } }}
                        >
                            <Button type="dashed" shape="circle" size="large" icon={<PlusOutlined />} style={{ marginBottom: 16 }} />
                            <Text strong>Create New Firm</Text>
                        </Card>
                    </Col>
                </Row>
            </div>

            <Modal
                title="Create New Firm"
                open={isModalOpen}
                onCancel={() => setIsModalOpen(false)}
                footer={null}
            >
                <Form form={form} onFinish={handleCreate} layout="vertical">
                    <Form.Item name="name" label="Firm Name" rules={[{ required: true }]}>
                        <Input placeholder="e.g. My Awesome Shop" />
                    </Form.Item>
                    <Form.Item>
                        <Button type="primary" htmlType="submit" loading={loading} block>Create Firm</Button>
                    </Form.Item>
                </Form>
            </Modal>
        </div>
    );
}
