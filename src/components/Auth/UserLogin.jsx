import React, { useState } from 'react';
import { Form, Input, Button, Card, Typography, Alert, message } from 'antd';
import { UserOutlined, LockOutlined, LoginOutlined } from '@ant-design/icons';
import { useAuth } from '../../context/AuthContext';

const { Title, Text } = Typography;

export default function UserLogin() {
    const { login, signup } = useAuth();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [isLogin, setIsLogin] = useState(true);
    const [form] = Form.useForm();

    const onFinish = async (values) => {
        setLoading(true);
        setError('');
        try {
            if (isLogin) {
                await login(values.email, values.password);
                message.success('Login Successful');
            } else {
                await signup(values.email, values.password);
                message.success('Account Created Successfully');
            }
        } catch (err) {
            console.error(err);
            // User-friendly error messages
            const code = err.code;
            let msg = err.message;
            if (code === 'auth/user-not-found') msg = 'No account found with this email.';
            else if (code === 'auth/wrong-password') msg = 'Incorrect password.';
            else if (code === 'auth/email-already-in-use') msg = 'An account with this email already exists.';
            else if (code === 'auth/weak-password') msg = 'Password is too weak (min 6 characters).';
            else if (code === 'auth/invalid-email') msg = 'Invalid email address.';
            else if (code === 'auth/too-many-requests') msg = 'Too many attempts. Please try again later.';

            setError(msg);
        } finally {
            setLoading(false);
        }
    };

    const toggleMode = () => {
        setIsLogin(!isLogin);
        setError('');
        form.resetFields();
    };

    return (
        <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', padding: 16 }}>
            <Card style={{ maxWidth: 420, width: '100%', boxShadow: '0 20px 60px rgba(0,0,0,0.15)', borderRadius: 20, border: 'none' }}>
                <div style={{ textAlign: 'center', marginBottom: 28 }}>
                    <div style={{
                        width: 64, height: 64, borderRadius: 16,
                        background: 'linear-gradient(135deg, #6366f1, #a855f7)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        margin: '0 auto 16px', fontSize: 28, color: '#fff',
                        boxShadow: '0 8px 24px rgba(99,102,241,0.3)'
                    }}>
                        📊
                    </div>
                    <Title level={3} style={{ margin: 0, color: '#1e1b4b' }}>Khata Manager Pro</Title>
                    <Text type="secondary" style={{ fontSize: 14 }}>
                        {isLogin ? 'Sign in to access your firms' : 'Create a new account'}
                    </Text>
                </div>

                {error && <Alert message={error} type="error" showIcon style={{ marginBottom: 16, borderRadius: 10 }} />}

                <Form
                    form={form}
                    name="auth_form"
                    onFinish={onFinish}
                    size="large"
                    layout="vertical"
                >
                    <Form.Item
                        name="email"
                        rules={[
                            { required: true, message: 'Please enter your email' },
                            { type: 'email', message: 'Please enter a valid email' }
                        ]}
                    >
                        <Input
                            prefix={<UserOutlined style={{ color: '#9ca3af' }} />}
                            placeholder="Email address"
                            style={{ borderRadius: 10, height: 48 }}
                        />
                    </Form.Item>

                    <Form.Item
                        name="password"
                        rules={[
                            { required: true, message: 'Please enter your password' },
                            ...(!isLogin ? [{ min: 6, message: 'Password must be at least 6 characters' }] : [])
                        ]}
                    >
                        <Input.Password
                            prefix={<LockOutlined style={{ color: '#9ca3af' }} />}
                            placeholder="Password"
                            style={{ borderRadius: 10, height: 48 }}
                        />
                    </Form.Item>

                    <Form.Item style={{ marginBottom: 12 }}>
                        <Button
                            type="primary"
                            htmlType="submit"
                            block
                            loading={loading}
                            icon={isLogin ? <LoginOutlined /> : <UserOutlined />}
                            style={{
                                height: 48, borderRadius: 10, fontWeight: 600, fontSize: 15,
                                background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                                border: 'none',
                                boxShadow: '0 4px 16px rgba(99,102,241,0.3)'
                            }}
                        >
                            {isLogin ? 'Sign In' : 'Create Account'}
                        </Button>
                    </Form.Item>
                </Form>

                <div style={{ textAlign: 'center', marginTop: 8 }}>
                    <Text
                        style={{ cursor: 'pointer', color: '#6366f1', fontWeight: 500, fontSize: 13 }}
                        onClick={toggleMode}
                    >
                        {isLogin ? "Don't have an account? Create one" : "Already have an account? Sign in"}
                    </Text>
                </div>
            </Card>
        </div>
    );
}
