import React, { useState } from 'react';
import { Card, Form, Input, Button, message, Tabs } from 'antd';
import { UserOutlined, LockOutlined, ShopOutlined } from '@ant-design/icons';
import { useAuth } from '../auth/AuthProvider';

const Login = () => {
  const [loading, setLoading] = useState(false);
  const { login, register } = useAuth();

  const handleLogin = async (values) => {
    setLoading(true);
    try {
      await login(values.email, values.password);
      message.success('Logged in successfully!');
    } catch (error) {
      message.error('Login failed: ' + error.message);
    }
    setLoading(false);
  };

  const handleRegister = async (values) => {
    if (values.password !== values.confirmPassword) {
      message.error('Passwords do not match');
      return;
    }

    setLoading(true);
    try {
      await register(values.email, values.password, values.shopName);
      message.success('Account created! Shop created successfully!');
    } catch (error) {
      message.error('Registration failed: ' + error.message);
    }
    setLoading(false);
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
    }}>
      <Card style={{ width: 400, boxShadow: '0 4px 20px rgba(0,0,0,0.1)' }}>
        <h1 style={{ textAlign: 'center', marginBottom: 24 }}>📊 Khata Manager Pro</h1>

        <Tabs
          defaultActiveKey="login"
          items={[
            {
              key: 'login',
              label: 'Login',
              children: (
                <Form onFinish={handleLogin} layout="vertical">
                  <Form.Item name="email" rules={[{ required: true, type: 'email' }]}>
                    <Input prefix={<UserOutlined />} placeholder="Email" size="large" />
                  </Form.Item>
                  <Form.Item name="password" rules={[{ required: true }]}>
                    <Input.Password prefix={<LockOutlined />} placeholder="Password" size="large" />
                  </Form.Item>
                  <Button type="primary" htmlType="submit" block size="large" loading={loading}>
                    Login
                  </Button>
                </Form>
              )
            },
            {
              key: 'register',
              label: 'Register',
              children: (
                <Form onFinish={handleRegister} layout="vertical">
                  <Form.Item name="shopName" rules={[{ required: true }]}>
                    <Input prefix={<ShopOutlined />} placeholder="Shop Name" size="large" />
                  </Form.Item>
                  <Form.Item name="email" rules={[{ required: true, type: 'email' }]}>
                    <Input prefix={<UserOutlined />} placeholder="Email" size="large" />
                  </Form.Item>
                  <Form.Item name="password" rules={[{ required: true, min: 6 }]}>
                    <Input.Password prefix={<LockOutlined />} placeholder="Password (min 6 chars)" size="large" />
                  </Form.Item>
                  <Form.Item name="confirmPassword" rules={[{ required: true }]}>
                    <Input.Password prefix={<LockOutlined />} placeholder="Confirm Password" size="large" />
                  </Form.Item>
                  <Button type="primary" htmlType="submit" block size="large" loading={loading}>
                    Create Account & Shop
                  </Button>
                </Form>
              )
            }
          ]}
        />
      </Card>
    </div>
  );
};

export default Login;
