import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { Layout, Menu, Button, message, Drawer, ConfigProvider, Dropdown } from 'antd';
import { themeConfig } from './theme/themeConfig';
import {
  DashboardOutlined, UserOutlined, SoundOutlined, TransactionOutlined,
  PhoneOutlined, BarChartOutlined, WhatsAppOutlined, SafetyOutlined, DollarOutlined,
  LogoutOutlined, MenuFoldOutlined, MenuUnfoldOutlined, ShopOutlined,
  BarcodeOutlined, TeamOutlined, FileTextOutlined, WalletOutlined,
  SettingOutlined, ClockCircleOutlined, WarningOutlined, TagOutlined
} from '@ant-design/icons';
import { ref, onValue, set } from 'firebase/database';
import { database } from './firebase';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, saveToDb, deleteFromDb, hasUnsyncedItems } from './db/db';
import { exportData } from './utils/storage';
import { LocalBackupService } from './services/LocalBackupService';
import { syncService } from './services/SyncManager';

// Auth
import { useAuth } from './context/AuthContext';
import UserLogin from './components/Auth/UserLogin';
import FirmSelector from './components/Auth/FirmSelector';
// Legacy ShopLogin removed or kept as fallback if needed
// import ShopLogin from './components/ShopLogin';

// Billing
import BillingPage from './components/Billing/BillingPage';
import InvoiceList from './components/Billing/InvoiceList';
import EstimateList from './components/Billing/EstimateList';
import RecurringInvoice from './components/Billing/RecurringInvoice';
import ManualInvoiceForm from './components/Billing/ManualInvoiceForm';

// Dashboard
import Dashboard from './components/Dashboard';

// Khata
import CustomerList from './components/CustomerList';
import CustomerStatement from './components/CustomerStatement';
import PaymentReceived from './components/PaymentReceived';
import PaymentOut from './components/PaymentOut';
import PromiseTracker from './components/PromiseTracker';
import CallTracker from './components/CallTracker';
import WhatsAppManager from './components/WhatsAppManager';

// Inventory & Suppliers
import LowStockAlert from './components/Inventory/LowStockAlert';
import ProductList from './components/Inventory/ProductList';
import LabelGenerator from './components/Labels/LabelGenerator';
import SupplierList from './components/Vypari/SupplierList';

import PublicInvoiceView from './components/Invoice/PublicInvoiceView';

// Expenses
import ExpenseList from './components/Expenses/ExpenseList';

// Others
import Reports from './components/Reports';
import ShopSettings from './components/Settings/ShopSettings';
import BackupRestore from './components/BackupRestore';
import AIVoiceAssistant from './components/AIVoiceAssistant';

const { Header, Sider, Content } = Layout;

// ─── Page wrapper for ManualInvoiceForm ───────────────────────────────────────
// ManualInvoiceForm is modal-based; this wrapper renders it as a full page.
function ManualInvoiceFormPage({ products, customers, invoices, setInvoices, setCustomers, onNavigate, ...rest }) {
  const [open, setOpen] = React.useState(true);

  const handleSave = (newInvoice) => {
    setInvoices(newInvoice);
    setOpen(false);
    // Navigate to appropriate list after save
    if (newInvoice.docType === 'estimate') {
      onNavigate('estimates');
    } else {
      onNavigate('invoices');
    }
  };

  const handleClose = () => {
    setOpen(false);
    onNavigate('invoices');
  };

  const handleAddCustomer = (newCustomer) => {
    setCustomers(newCustomer);
  };

  // Re-open if user navigates back to this page
  React.useEffect(() => { setOpen(true); }, []);

  return (
    <ManualInvoiceForm
      open={open}
      onClose={handleClose}
      products={products}
      customers={customers}
      onSave={handleSave}
      onAddCustomer={handleAddCustomer}
    />
  );
}


function App() {
  const { currentUser, currentFirm, userFirms, selectFirm, logout } = useAuth();

  // persistent states (synced with AuthContext)
  const [shopLoggedIn, setShopLoggedIn] = useState(false);
  const [shopId, setShopId] = useState('');
  const [shopName, setShopName] = useState('');

  // Sync local state with AuthContext
  useEffect(() => {
    if (currentUser && currentFirm) {
      setShopLoggedIn(true);
      setShopId(currentFirm.id);
      setShopName(currentFirm.name);
      // Persist for legacy components that read localStorage
      localStorage.setItem('current_shop_id', currentFirm.id);
      localStorage.setItem('current_shop_name', currentFirm.name);
      localStorage.setItem('user_role', currentFirm.role || 'admin');
    } else {
      setShopLoggedIn(false);
      setShopId('');
    }
  }, [currentUser, currentFirm]);

  const [currentMenu, setCurrentMenu] = useState('dashboard');
  const [selectedStatementCustomer, setSelectedStatementCustomer] = useState(null);

  // domain data states (Dexie)
  const customers = useLiveQuery(() => db.customers.where('shopId').equals(shopId).toArray(), [shopId], []) || [];
  const transactions = useLiveQuery(() => db.transactions.where('shopId').equals(shopId).toArray(), [shopId], []) || [];
  const promises = useLiveQuery(() => db.promises.where('shopId').equals(shopId).toArray(), [shopId], []) || [];
  const calls = useLiveQuery(() => db.calls.where('shopId').equals(shopId).toArray(), [shopId], []) || [];
  const products = useLiveQuery(() => db.products.where('shopId').equals(shopId).toArray(), [shopId], []) || [];
  const suppliers = useLiveQuery(() => db.suppliers.where('shopId').equals(shopId).toArray(), [shopId], []) || [];
  const invoices = useLiveQuery(() => db.invoices.where('shopId').equals(shopId).toArray(), [shopId], []) || [];
  const payments = useLiveQuery(() => db.payments.where('shopId').equals(shopId).toArray(), [shopId], []) || [];
  const expenses = useLiveQuery(() => db.expenses.where('shopId').equals(shopId).toArray(), [shopId], []) || [];
  const workers = useLiveQuery(() => db.workers.where('shopId').equals(shopId).toArray(), [shopId], []) || [];

  // Setters (Adapters for Legacy Code)
  // These wrappers ensure that when child components call setX, we update IndexedDB
  const createSetter = (table) => (data) => {
    if (typeof data === 'function') {
      console.warn('Function update not supported fully in offline adapter:', table);
      return;
    }
    const items = Array.isArray(data) ? data : [data];
    const enriched = items.map(i => ({ ...i, shopId }));
    // We use saveToDb which marks them as synced=0 (false)
    saveToDb(table, enriched);
  };

  const createDeleter = (table) => (id) => {
    deleteFromDb(table, id);
  };

  const setCustomers = createSetter('customers');
  const setTransactions = createSetter('transactions');
  const setPromises = createSetter('promises');
  const setCalls = createSetter('calls');
  const setProducts = createSetter('products');
  const setSuppliers = createSetter('suppliers');
  const setInvoices = createSetter('invoices');
  const setPayments = createSetter('payments');
  const setExpenses = createSetter('expenses');
  const setWorkers = createSetter('workers');

  // Deletion Handlers
  const deleteCustomer = createDeleter('customers');
  const deleteTransaction = createDeleter('transactions');
  const deletePromise = createDeleter('promises');
  const deleteCall = createDeleter('calls');
  const deleteProduct = createDeleter('products');
  const deleteSupplier = createDeleter('suppliers');
  const deleteInvoice = createDeleter('invoices');
  const deletePayment = createDeleter('payments');
  const deleteExpense = createDeleter('expenses');
  const deleteWorker = createDeleter('workers');

  const [language, setLanguage] = useState('en');
  const [pendingScanItem, setPendingScanItem] = useState(null); // For auto-adding to bill

  // Role State
  // Derive role from current firm context (not localStorage)
  const userRole = currentFirm?.role || 'admin';

  // UI states
  const [collapsed, setCollapsed] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);

  // Force Manager to Billing
  useEffect(() => {
    if (userRole === 'manager' && currentMenu !== 'billing') {
      setCurrentMenu('billing');
    }
  }, [userRole, currentMenu]);

  // detect mobile
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth <= 768);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  // === Offline / Sync Init ===
  useEffect(() => {
    if (!shopLoggedIn || !shopId) return;

    // Initialize Sync Service
    syncService.init(shopId);

    // Cleanup on unmount or shop switch
    return () => {
      syncService.stop();
    };

  }, [shopLoggedIn, shopId]);

  // --- AUTO BACKUP INTERVAL (30 Mins) ---
  useEffect(() => {
    if (!shopLoggedIn || !LocalBackupService.isAvailable()) return;

    const backupInterval = setInterval(async () => {
      try {
        const shopId = localStorage.getItem('current_shop_id') || 'unknown';
        const fullData = await exportData();
        const filename = `autobackup_${shopId}_interval_${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
        await LocalBackupService.saveBackup(filename, fullData);
        console.debug("Interval Backup saved:", filename);
      } catch (e) {
        console.warn("Interval backup failed", e);
      }
    }, 30 * 60 * 1000); // 30 Mins

    return () => clearInterval(backupInterval);
  }, [shopLoggedIn]);

  // --- GLOBAL SCAN LISTENER ---
  useEffect(() => {
    if (!shopLoggedIn) return;

    let scanBuffer = '';
    let lastKeyTime = 0;

    const handleGlobalKeyDown = (e) => {
      // 1. Ignore if typing in an input field
      if (['INPUT', 'TEXTAREA'].includes(document.activeElement.tagName)) return;

      // 2. Buffer logic (Scanner types fast)
      const now = Date.now();
      if (now - lastKeyTime > 100) {
        scanBuffer = ''; // Reset if too slow (likely manual typing)
      }
      lastKeyTime = now;

      // 3. Handle Enter (End of scan)
      if (e.key === 'Enter') {
        if (scanBuffer.length > 2) { // Min length check
          const product = products.find(p => p.barcode === scanBuffer);
          if (product) {
            message.success(`Scanned: ${product.name}`);
            // If manager, they are already on billing or will be
            setCurrentMenu('billing');
            setPendingScanItem(product);
          }
        }
        scanBuffer = '';
      } else if (e.key.length === 1) {
        // Accumulate chars
        scanBuffer += e.key;
      }
    };

    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, [products, shopLoggedIn]);
  // ----------------------------

  // Logout now uses AuthContext
  const handleLogout = useCallback(async () => {
    try {
      await logout();
      setShopLoggedIn(false);
      message.info('Logged out');
    } catch (err) {
      console.error('Logout error:', err);
      message.error('Failed to logout');
    }
  }, [logout]);

  // ============================================
  // ALL HOOKS MUST BE ABOVE EARLY RETURNS
  // (React Rules of Hooks: same order every render)
  // ============================================

  // Memoize menu items so re-renders are cheaper
  const menuItems = useMemo(() => {
    // If Manager, Only Show Billing (POS)
    if (userRole === 'manager') {
      return [
        { key: 'billing', icon: <BarcodeOutlined />, label: language === 'hi' ? 'नया बिल (POS)' : 'New Bill (POS)' }
      ];
    }

    return [
      { key: 'dashboard', icon: <DashboardOutlined />, label: language === 'hi' ? 'डैशबोर्ड' : 'Dashboard' },

      // Group 1: Khata / Udhari System
      {
        key: 'sub_khata',
        icon: <WalletOutlined />,
        label: language === 'hi' ? 'उधारी खाता (Ledger)' : 'Khata Management',
        children: [
          { key: 'customers', icon: <UserOutlined />, label: language === 'hi' ? 'ग्राहक लिस्ट' : 'Customer List' },
          { key: 'voice', icon: <SoundOutlined />, label: language === 'hi' ? '🎙️ खाता दोस्त (Voice)' : '🎙️ Voice Assistant' },
          { key: 'payment', icon: <DollarOutlined />, label: language === 'hi' ? 'पेमेंट लें (Receive)' : 'Receive Payment' },
          { key: 'payment_out', icon: <DollarOutlined rotate={180} style={{ color: '#ff4d4f' }} />, label: language === 'hi' ? 'उधारी दें (Debit)' : 'Give Credit' },
          { key: 'promises', icon: <TransactionOutlined />, label: language === 'hi' ? 'वादे (Promises)' : 'Promises' },
          { key: 'calls', icon: <PhoneOutlined />, label: language === 'hi' ? 'कॉल ट्रैकर' : 'Call Tracker' },
          { key: 'whatsapp', icon: <WhatsAppOutlined />, label: 'WhatsApp Marketing' },
        ]
      },

      // Group 2: Billing & Shop System
      {
        key: 'sub_billing',
        icon: <ShopOutlined />,
        label: language === 'hi' ? 'दुकान और बिलिंग' : 'Shop & Billing',
        children: [
          { key: 'billing', icon: <BarcodeOutlined />, label: language === 'hi' ? 'नया बिल (POS)' : 'New Bill (POS)' },
          { key: 'new_invoice', icon: <FileTextOutlined />, label: language === 'hi' ? 'नया A4 बिल' : 'New Tax Invoice (A4)' },
          { key: 'invoices', icon: <FileTextOutlined />, label: language === 'hi' ? 'पुराने बिल (History)' : 'Invoice History' },
          { key: 'estimates', icon: <FileTextOutlined />, label: language === 'hi' ? 'कोटेशन (Estimates)' : 'Estimates' },
          { key: 'recurring', icon: <ClockCircleOutlined />, label: language === 'hi' ? 'बार-बार बिल' : 'Recurring Invoices' },
          { key: 'low_stock', icon: <WarningOutlined />, label: language === 'hi' ? 'कम स्टॉक' : 'Low Stock Alert', danger: (products || []).filter(p => (p.stock || 0) < (p.reorderLevel || 5)).length > 0 },
          { key: 'inventory', icon: <ShopOutlined />, label: language === 'hi' ? 'सामान (Products)' : 'Inventory / Stock' },
          { key: 'labels', icon: <TagOutlined />, label: language === 'hi' ? 'प्राइस लेबल' : '🏷️ Label Generator' },
          { key: 'suppliers', icon: <TeamOutlined />, label: language === 'hi' ? 'व्यापारी (Suppliers)' : 'Suppliers' },
          { key: 'expenses', icon: <DollarOutlined style={{ color: '#d32f2f' }} />, label: language === 'hi' ? 'दुकान का खर्चा' : 'Shop Expenses' },
        ]
      },

      { key: 'reports', icon: <BarChartOutlined />, label: language === 'hi' ? 'रिपोर्ट्स' : 'Reports' },
      { key: 'backup', icon: <SafetyOutlined />, label: language === 'hi' ? 'बैकअप' : 'Backup & Restore' },
    ];
  }, [language, userRole]);

  const footerMenuItems = useMemo(() => {
    if (userRole === 'manager') return []; // No settings for manager
    return [
      { type: 'divider' },
      { key: 'settings', icon: <SettingOutlined />, label: language === 'hi' ? 'सेटिंग्स' : 'Settings' }
    ];
  }, [language, userRole]);

  // Memoize props passed down
  const childProps = useMemo(() => ({
    customers, setCustomers, deleteCustomer,
    transactions, setTransactions, deleteTransaction,
    promises, setPromises, deletePromise,
    calls, setCalls, deleteCall,
    products, setProducts, deleteProduct,
    suppliers, setSuppliers, deleteSupplier,
    invoices, setInvoices, deleteInvoice,
    payments, setPayments, deletePayment,
    expenses, setExpenses, deleteExpense,
    workers, setWorkers, deleteWorker,
    language, pendingScanItem, setPendingScanItem, userRole, // Pass userRole
    onNavigate: setCurrentMenu,
    onViewStatement: (customer) => {
      setSelectedStatementCustomer(customer);
      setCurrentMenu('statement');
    }
  }), [
    customers, transactions, promises, calls, products, suppliers, invoices, payments, expenses, workers,
    language, pendingScanItem, userRole
  ]);

  // render content (useCallback not strictly necessary but helps slightly)
  const renderContent = useCallback(() => {
    // Hard restrict render if manager tries to access others
    if (userRole === 'manager' && currentMenu !== 'billing') {
      return <BillingPage {...childProps} />;
    }

    switch (currentMenu) {
      case 'dashboard': return <Dashboard {...childProps} />;
      case 'customers': return <CustomerList {...childProps} />;
      case 'payment': return <PaymentReceived {...childProps} />;
      case 'payment_out': return <PaymentOut {...childProps} />;
      case 'voice': return <AIVoiceAssistant {...childProps} />;
      // case 'voice': return <div>Voice Assistant Temporarily Disabled</div>;
      case 'promises': return <PromiseTracker {...childProps} />;
      case 'calls': return <CallTracker {...childProps} />;
      case 'whatsapp': return <WhatsAppManager {...childProps} setCustomers={setCustomers} />;
      case 'inventory': return <ProductList {...childProps} />;
      case 'labels': return <LabelGenerator products={products} language={language} />;
      case 'billing': return <BillingPage {...childProps} />;
      case 'new_invoice': return (
        <ManualInvoiceFormPage {...childProps} />
      );
      case 'invoices': return <InvoiceList {...childProps} />;
      case 'estimates': return <EstimateList {...childProps} />;
      case 'recurring': return <RecurringInvoice {...childProps} />;
      case 'low_stock': return <LowStockAlert {...childProps} />;
      case 'suppliers': return <SupplierList {...childProps} />;
      case 'expenses': return <ExpenseList {...childProps} />;
      case 'reports': return <Reports {...childProps} invoices={invoices} expenses={expenses} />;
      case 'settings': return <ShopSettings />;
      case 'statement': return (
        <CustomerStatement
          customer={selectedStatementCustomer}
          transactions={transactions}
          shopName={shopName}
          onBack={() => setCurrentMenu('customers')}
        />
      );
      case 'backup': return <BackupRestore {...childProps} currentShopId={shopId} />;
      default: return <Dashboard {...childProps} />;
    }
  }, [currentMenu, childProps, shopId, userRole]);

  // ============================================
  // EARLY RETURNS (after all hooks)
  // ============================================

  // 1. Check if public invoice view
  if (window.location.pathname.startsWith('/invoice/view/')) {
    const pathParts = window.location.pathname.split('/');
    const publicId = pathParts[pathParts.length - 1]; // Last part is ID
    return <PublicInvoiceView publicId={publicId} />;
  }

  // 2. Check Authentication
  if (!currentUser) {
    return <UserLogin />;
  }

  // 2. Check Firm Selection
  if (!currentFirm) {
    return <FirmSelector />;
  }

  // 3. Render Main App (shopLoggedIn is true here)

  // mobile toggle handler
  const onMenuClick = ({ key }) => {
    setCurrentMenu(key);
    if (isMobile) setDrawerOpen(false);
  };

  // Auth check is already handled above (line 240-247)

  // JSX
  return (
    <ConfigProvider theme={themeConfig}>
      <Layout style={{ minHeight: '100vh' }}>
        {/* Desktop sider or mobile drawer */}
        {!isMobile ? (
          <Sider
            collapsible
            collapsed={collapsed}
            onCollapse={setCollapsed}
            breakpoint="md"
            collapsedWidth={80}
            width={240}
            style={{
              position: 'fixed',
              height: '100vh',
              left: 0,
              top: 0,
              bottom: 0,
              zIndex: 1000,
              boxShadow: '4px 0 24px rgba(0,0,0,0.1)'
            }}
            theme="dark"
          >
            <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
              {/* Header */}
              <div style={{
                height: 80,
                color: '#fff',
                fontSize: 24,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: 'rgba(255,255,255,0.05)',
                marginBottom: 16
              }}>
                <div style={{
                  background: 'linear-gradient(135deg, #6366f1, #a855f7)',
                  width: 40,
                  height: 40,
                  borderRadius: 12,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 24,
                  boxShadow: '0 4px 12px rgba(99, 102, 241, 0.4)'
                }}>
                  📊
                </div>
                {!collapsed && <span style={{ marginLeft: 12, fontWeight: '700', letterSpacing: '-0.5px' }}>Khata One</span>}
              </div>

              {/* Scrollable Main Menu */}
              <div style={{ flex: 1, overflowY: 'auto', padding: '0 8px' }}>
                <Menu
                  theme="dark"
                  mode="inline"
                  selectedKeys={[currentMenu]}
                  onClick={onMenuClick}
                  items={menuItems}
                  style={{ background: 'transparent', border: 'none' }}
                />
              </div>

              {/* Fixed Footer Menu */}
              <div style={{ flexShrink: 0, padding: 8 }}>
                <Menu
                  theme="dark"
                  mode="inline"
                  selectedKeys={[currentMenu]}
                  onClick={onMenuClick}
                  items={footerMenuItems}
                  style={{ background: 'transparent' }}
                />
              </div>
            </div>
          </Sider>
        ) : (
          // Mobile: Drawer with menu
          <Drawer
            open={drawerOpen}
            onClose={() => setDrawerOpen(false)}
            placement="left"
            width={280}
            closeIcon={<MenuFoldOutlined style={{ color: '#fff' }} />}
            title={<span style={{ color: '#fff' }}>Khata One</span>}
            styles={{ header: { background: '#1e1b4b', borderBottom: '1px solid rgba(255,255,255,0.1)' }, body: { padding: 0, background: '#1e1b4b' } }}
          >
            <div style={{ height: '100%', overflowY: 'auto', padding: 8 }}>
              <Menu
                theme="dark"
                mode="inline"
                selectedKeys={[currentMenu]}
                onClick={onMenuClick}
                items={[...menuItems, ...footerMenuItems]}
                style={{ background: 'transparent' }}
              />
            </div>
          </Drawer>
        )}

        <Layout style={{ marginLeft: !isMobile ? (collapsed ? 80 : 240) : 0, transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)', height: '100vh', overflow: 'hidden' }}>
          <Header style={{
            background: 'rgba(255, 255, 255, 0.8)',
            backdropFilter: 'blur(12px)',
            padding: '0 24px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
            flexShrink: 0,
            height: 72,
            position: 'sticky',
            top: 0,
            zIndex: 900
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              {isMobile ? (
                <Button
                  type="text"
                  icon={<MenuUnfoldOutlined />}
                  onClick={() => setDrawerOpen(true)}
                  aria-label="Open menu"
                  style={{ fontSize: 20 }}
                />
              ) : (
                <Button
                  type="text"
                  icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
                  onClick={() => setCollapsed(!collapsed)}
                  aria-label="Toggle sidebar"
                />
              )}

              <Dropdown
                menu={{
                  items: [
                    {
                      key: 'current',
                      label: (
                        <div style={{ padding: '4px 0' }}>
                          <div style={{ fontWeight: 600, color: '#111827' }}>{shopName}</div>
                          <div style={{ fontSize: 11, color: '#6b7280' }}>ID: {shopId}</div>
                        </div>
                      ),
                      disabled: true,
                    },
                    { type: 'divider' },
                    {
                      key: 'switch_label',
                      type: 'group',
                      label: 'Switch Firm',
                      children: Object.entries(userFirms)
                        .filter(([id]) => id !== shopId)
                        .map(([id, data]) => ({
                          key: `switch_${id}`,
                          label: (
                            <div
                              onClick={() => {
                                selectFirm(id, data.name, data.role);
                              }}
                              style={{ display: 'flex', alignItems: 'center', gap: 8 }}
                            >
                              <div style={{
                                width: 24, height: 24, borderRadius: '50%',
                                background: '#e0e7ff', color: '#6366f1',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                fontSize: 10, fontWeight: 'bold'
                              }}>
                                {data.name?.charAt(0).toUpperCase()}
                              </div>
                              <span>{data.name}</span>
                            </div>
                          )
                        }))
                    },
                    {
                      key: 'add_new',
                      icon: <ShopOutlined />,
                      label: 'Create New Firm',
                      onClick: () => {
                        selectFirm(null);
                      }
                    }
                  ]
                }}
                trigger={['click']}
              >
                <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0, cursor: 'pointer' }}>
                  <div style={{ fontWeight: 700, color: '#111827', fontSize: 18, lineHeight: 1.2, display: 'flex', alignItems: 'center', gap: 6 }}>
                    {shopName} <span style={{ fontSize: 10, color: '#9ca3af' }}>▼</span>
                  </div>
                  <div style={{ fontSize: 12, color: '#6b7280', fontWeight: 500 }}>
                    Manager Pro • {userRole === 'admin' ? 'Admin' : 'Manager'}
                  </div>
                </div>
              </Dropdown>
            </div>

            <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
              <Button
                onClick={() => setLanguage(language === 'hi' ? 'en' : 'hi')}
                style={{ minWidth: 48, fontWeight: 600 }}
              >
                {language === 'hi' ? 'EN' : 'हिंदी'}
              </Button>
              <Button icon={<LogoutOutlined />} onClick={handleLogout} danger type="text" style={{ background: '#fef2f2', border: '1px solid #fee2e2' }}>
                Logout
              </Button>
            </div>
          </Header>

          <Content style={{
            margin: 0,
            padding: isMobile ? 16 : 32,
            background: '#f3f4f6',
            minHeight: 280,
            overflowY: 'auto',
            overflowX: 'hidden'
          }}>
            <div style={{ maxWidth: 1600, margin: '0 auto' }}>
              {renderContent()}
            </div>
          </Content>
        </Layout>

        {/* Minimal responsive CSS adjustments */}
        <style>{`
          @media (max-width: 768px) {
            .ant-layout-header { padding: 0 16px !important; }
            .ant-layout-content { padding: 12px !important; }
            .ant-menu-item { border-radius: 8px; margin-bottom: 4px; }
          }
        `}</style>
      </Layout>
    </ConfigProvider>
  );
}

export default App;
