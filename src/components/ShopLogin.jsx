// src/components/ShopLogin.jsx
import React, { useState } from "react";
import { Input, Button, message, Typography, Card, Divider, Modal, Checkbox } from "antd";
import { UserOutlined, LockOutlined, ShopOutlined, RocketOutlined, LoginOutlined } from '@ant-design/icons';
import { loadShopMeta, verifyShopPassword, createNewShop } from "../utils/storage";
import { signInAnonymously } from "firebase/auth";
import { auth } from "../firebase";

const { Title, Text } = Typography;

export default function ShopLogin({ onShopSelected }) {
  const [loading, setLoading] = useState(false);
  const [isRegistering, setIsRegistering] = useState(false);
  const [isManagerLogin, setIsManagerLogin] = useState(false);

  // Form States
  const [shopId, setShopId] = useState(localStorage.getItem('current_shop_id') || "");
  const [password, setPassword] = useState("");
  const [shopName, setShopName] = useState("");

  const handleNameChange = (e) => {
    const val = e.target.value;
    setShopName(val);
    const slug = val.trim().toLowerCase().replace(/[^a-z0-9]/g, '_');
    setShopId(slug);
  };

  const handleLogin = async () => {
    if (!shopId) {
      message.warning("Please enter Shop ID");
      return;
    }
    setLoading(true);
    try {
      // 0. Ensure Firebase Auth (Critical for Sync)
      if (!auth.currentUser) {
        try {
          await signInAnonymously(auth);
        } catch (e) {
          console.error("Auth failed", e);
          // We might allow login to fail if local, but better to warn
        }
      }

      // 1. Load Meta
      const meta = await loadShopMeta(shopId);
      if (!meta) {
        if (!isManagerLogin && window.confirm(`Shop ID "${shopId}" not found. Create it?`)) {
          setIsRegistering(true);
          setShopName(shopId); // Suggested name
          setLoading(false);
          return;
        }
        throw new Error("Shop ID not found");
      }

      // 2. Manager Login Logic
      if (isManagerLogin) {
        // For manager, we need to check the 'billSettings' stored inside the shop data
        // Ideally we should have this in meta, but currently it's in the big data blob or localStorage if local
        // Limitation: If logging in from a NEW device as manager, we need to fetch the full data first.
        // loadShopMeta might not have the manager password if it's stored in data.

        // HACK: For this specific app architecture where data is synced to localStorage...
        // If it's a new device, we might fail unless we fetch data.
        // Let's assume for now we are on the same device or we fetch data.
        // Actually, let's look at how data is loaded. 
        // We can't easily fetch full data without auth.
        // But for this local-first app, we might rely on localStorage being present or shared.

        // BETTER APPROACH: The user is expected to sync first or be owner.
        // But the request says "Sub-login role".
        // Let's check if we can verify against what we have.

        const storedSettings = localStorage.getItem(`shop_${shopId}_bill_settings`);
        // This is problematic if switching devices. 
        // However, given the constraints, let's use what we have locally or in meta if we put it there.
        // We put it in billSettings in localStorage in the previous step.

        let mgrPwd = '';
        if (storedSettings) {
          const parsed = JSON.parse(storedSettings);
          mgrPwd = parsed.managerPassword;

          // Check if Manager Login is Disabled
          if (parsed.managerLoginEnabled === false) {
            throw new Error("Manager Login is Disabled by Admin");
          }
        }

        // If not found locally, we can't login as manager on a fresh device with this simple arch
        // unless we expose it in public meta (insecure) or require admin login first.
        // For this task, we assume the device is set up.

        if (!mgrPwd) {
          throw new Error("Manager access not configured on this device.");
        }

        if (password !== mgrPwd) {
          throw new Error("Invalid Manager Password");
        }

        finalize(meta, 'manager');
        return;
      }

      // 3. Admin Login Logic
      // Password Check
      if (meta.passwordHash && meta.salt) {
        if (!password) throw new Error("Password required");
        const ok = await verifyShopPassword(password, meta.salt, meta.passwordHash);
        if (!ok) throw new Error("Incorrect password");
      }

      finalize(meta, 'admin');
    } catch (err) {
      if (err.message.includes('disabled')) {
        setIsManagerLogin(false); // Auto uncheck if disabled
      }
      message.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async () => {
    if (!shopName) {
      message.warning("Shop Name is required");
      return;
    }
    if (!password) {
      message.warning("Secure Password is required to create a shop");
      return;
    }

    setLoading(true);
    try {
      // Try Auth content, but ignore if it fails (Offline Mode)
      if (!auth.currentUser) {
        try {
          await signInAnonymously(auth);
        } catch (e) {
          console.error("Auth Attempt Failed", e);
          throw new Error("Could not authenticate with Cloud. Please check connection.");
        }
      }

      // Strong Check
      if (!auth.currentUser) {
        throw new Error("Authentication Failed. Please enable 'Anonymous' sign-in in Firebase Console.");
      }

      const result = await createNewShop(shopName, password, { shopId: shopId || null });
      // With the change, createNewShop throws on error, or returns object on success.
      // But verify strictly.
      if (!result || !result.success) throw new Error("Unknown creation error");

      // Show Success Modal with ID
      Modal.success({
        title: 'Shop Created Successfully! 🎉',
        content: (
          <div>
            <p>Your Shop ID is:</p>
            <Typography.Title level={2} copyable>{result.shopId}</Typography.Title>
            <p>Please save this ID to login from other devices.</p>
          </div>
        ),
        onOk: () => finalize({ id: result.shopId, name: result.shopName }, 'admin'),
      });

    } catch (err) {
      console.error(err);
      message.error("Registration Failed: " + (err.message || "Connection Error"));
      message.warn("Please check your internet connection and try again.");
    } finally {
      setLoading(false);
    }
  };

  // Helper to save shop to Saved List
  const addToSavedShops = (id, name) => {
    try {
      const saved = JSON.parse(localStorage.getItem('saved_shops') || '[]');
      // Remove if exists
      const filtered = saved.filter(s => s.id !== id);
      // Add to top
      filtered.unshift({ id, name });
      localStorage.setItem('saved_shops', JSON.stringify(filtered.slice(0, 5))); // Keep last 5
    } catch (e) {
      console.error(e);
    }
  };

  const finalize = async (meta, role) => {
    addToSavedShops(meta.id, meta.name || meta.id);

    localStorage.setItem('shop_logged_in', 'true');
    localStorage.setItem('current_shop_id', meta.id);
    localStorage.setItem('current_shop_name', meta.name || meta.id);
    localStorage.setItem('user_role', role); // Store Role

    // TRIGGER FULL DOWNLOAD
    try {
      message.loading({ content: 'Syncing with cloud...', key: 'sync' });
      // Dynamic import to avoid circular dep if any, though SyncManager is safe
      const { syncService } = await import('../services/SyncManager');
      syncService.init(meta.id);
      await syncService.downloadCloudData();
      message.success({ content: 'Sync Complete!', key: 'sync' });
    } catch (e) {
      console.error(e);
      message.error({ content: `Sync Failed: ${e.message}`, key: 'sync', duration: 4 });
    }

    if (onShopSelected) {
      onShopSelected(meta);
      // Removed window.location.reload() for instant switching
    }
  };

  return (
    <div style={{ minHeight: '100vh', background: '#f0f2f5', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <Card style={{ width: 400, boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}>
        <div style={{ textAlign: 'center', marginBottom: 20 }}>
          <div style={{ fontSize: 40, marginBottom: 10 }}>{isRegistering ? '🚀' : '🏪'}</div>
          <Title level={3}>
            {isRegistering ? "Create Shop" : (isManagerLogin ? "Manager Login" : "Shop Login")}
          </Title>
          <Text type="secondary">{isRegistering ? "Start your digital ledger" : "Welcome back"}</Text>
        </div>

        {isRegistering && (
          <div style={{ marginBottom: 15 }}>
            <Text strong>Shop Name</Text>
            <Input
              size="large"
              placeholder="e.g. My General Store"
              prefix={<ShopOutlined />}
              value={shopName}
              onChange={handleNameChange}
            />
          </div>
        )}

        <div style={{ marginBottom: 15 }}>
          <Text strong>Shop ID {isRegistering && "(Optional)"}</Text>
          <Input
            size="large"
            placeholder={isRegistering ? "Auto-generated if empty" : "Enter Shop ID"}
            prefix={<UserOutlined />}
            value={shopId}
            onChange={e => setShopId(e.target.value)}
          />
        </div>

        <div style={{ marginBottom: 20 }}>
          <Text strong>
            {isManagerLogin ? "Manager Password" : "Password"}
          </Text>
          <Input.Password
            size="large"
            placeholder={isManagerLogin ? "Manager Password" : (isRegistering ? "Set a secure password" : "Enter password")}
            prefix={<LockOutlined />}
            value={password}
            onChange={e => setPassword(e.target.value)}
          />
        </div>

        {/* Saved Shops List */}
        <div style={{ marginBottom: 20 }}>
          {(() => {
            const saved = JSON.parse(localStorage.getItem('saved_shops') || '[]');
            if (saved.length === 0 || isRegistering) return null;

            return (
              <div style={{ marginBottom: 16 }}>
                <Text type="secondary" style={{ fontSize: 12 }}>QUICK LOGIN</Text>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 8 }}>
                  {saved.map(s => (
                    <div
                      key={s.id}
                      onClick={() => {
                        setShopId(s.id);
                        setShopName(s.name);
                        // If we had stored passwords/tokens safely, we could auto-login here.
                        // For now, just pre-fill.
                        // If user wants "Switch Firm", they likely want to just click and go.
                        // We can implement a "Remember Me" later.
                      }}
                      style={{
                        padding: '10px',
                        border: shopId === s.id ? '1px solid #6366f1' : '1px solid #e5e7eb',
                        borderRadius: '8px',
                        cursor: 'pointer',
                        background: shopId === s.id ? '#eff6ff' : '#fff',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 10
                      }}
                    >
                      <div style={{ width: 32, height: 32, borderRadius: '50%', background: '#e0e7ff', color: '#6366f1', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold' }}>
                        {s.name.charAt(0).toUpperCase()}
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 600 }}>{s.name}</div>
                        <div style={{ fontSize: 10, color: '#6b7280' }}>{s.id}</div>
                      </div>
                      {shopId === s.id && <div style={{ color: '#6366f1' }}>●</div>}
                    </div>
                  ))}
                </div>
                <Divider style={{ margin: '16px 0' }} />
              </div>
            );
          })()}
        </div>

        {!isRegistering && (
          <div style={{ marginBottom: 20 }}>
            <Checkbox checked={isManagerLogin} onChange={e => setIsManagerLogin(e.target.checked)}>
              Login as Manager (Restricted Access)
            </Checkbox>
          </div>
        )}

        <Button
          type="primary"
          block
          size="large"
          onClick={isRegistering ? handleRegister : handleLogin}
          loading={loading}
          icon={isRegistering ? <RocketOutlined /> : <LoginOutlined />}
        >
          {isRegistering ? "Create Shop" : (isManagerLogin ? "Manager Login" : "Login")}
        </Button>

        <Divider />

        <div style={{ textAlign: 'center' }}>
          <Button type="link" onClick={() => { setIsRegistering(!isRegistering); setPassword(""); setIsManagerLogin(false); }}>
            {isRegistering ? "Already have a shop? Login" : "New User? Create Shop"}
          </Button>

          <div style={{ marginTop: 10 }}>
            <Button
              type="text"
              danger
              size="small"
              onClick={() => {
                if (window.confirm("Reset App? This clears local data.")) {
                  localStorage.clear();
                  window.location.reload();
                }
              }}
            >
              Reset App (Clear Data)
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}
