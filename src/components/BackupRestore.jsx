// src/components/BackupRestore.jsx

import React, { useState, useMemo, useCallback, useRef } from 'react';
import {
  Card, Button, Upload, message, Space, Alert, Divider, Statistic, Row, Col,
  Modal, Typography, Spin, Tooltip, Steps
} from 'antd';
import {
  DownloadOutlined,
  UploadOutlined,
  CloudDownloadOutlined,
  ReloadOutlined,
  SafetyOutlined,
  ExclamationCircleOutlined,
  GoogleOutlined,
  DatabaseOutlined,
  HistoryOutlined,
  FileDoneOutlined,
  CheckCircleOutlined
} from '@ant-design/icons';
import { exportData, importData, loadData, getCurrentShopInfo } from '../utils/storage';

const { confirm } = Modal;
const { Title, Text, Paragraph } = Typography;
const { Step } = Steps;

const BackupRestore = ({
  customers = [], setCustomers,
  transactions = [], setTransactions,
  promises = [], setPromises,
  calls = [], setCalls,
  products = [], setProducts,
  suppliers = [], setSuppliers,
  invoices = [], setInvoices,
  payments = [], setPayments,
  expenses = [], setExpenses,
  workers = [], setWorkers,
  language = 'en'
}) => {
  const [loading, setLoading] = useState(false);
  const [uploadPreview, setUploadPreview] = useState(null);
  const [previewVisible, setPreviewVisible] = useState(false);
  const [lastBackupAt, setLastBackupAt] = useState(localStorage.getItem('last_backup_time') || null);
  const undoSnapshotRef = useRef(null);
  const shopInfo = getCurrentShopInfo() || { shopName: '—', shopId: '—' };

  // Drive Modal
  const [driveModalVisible, setDriveModalVisible] = useState(false);

  // Derived counts (memoized)
  const counts = useMemo(() => ({
    customers: customers.length,
    transactions: transactions.length,
    promises: promises.length,
    invoices: invoices.length,
    payments: payments.length,
    products: products.length
  }), [customers, transactions, promises, invoices, payments, products]);

  // Build structured JSON for export (fallback)
  const buildExportObject = useCallback(() => ({
    meta: {
      shopName: shopInfo.shopName || '',
      shopId: shopInfo.shopId || '',
      exportedAt: Date.now(),
      version: '2.0'
    },
    customers: customers || [],
    transactions: transactions || [],
    promises: promises || [],
    calls: calls || [],
    products: products || [],
    suppliers: suppliers || [],
    invoices: invoices || [],
    payments: payments || [],
    expenses: expenses || [],
    workers: workers || []
  }), [customers, transactions, promises, calls, products, suppliers, invoices, payments, expenses, workers, shopInfo]);

  const triggerDownload = (blob, filename) => {
    try {
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error('Download fallback failed', e);
      message.error('Download failed');
    }
  };

  const handleDownload = useCallback(async (isDrive = false) => {
    setLoading(true);
    try {
      // 1. Prepare Data
      const fallbackObj = buildExportObject();
      const exported = await exportData(); // Try getting from Dexie/DB first
      const filename = `KhataManager_Backup_${shopInfo.shopId || 'shop'}_${new Date().toISOString().slice(0, 10)}.json`;

      let finalData = fallbackObj;
      if (exported && typeof exported === 'object' && ('customers' in exported || 'products' in exported)) {
        finalData = exported;
      }

      // 2. Download File
      const str = JSON.stringify(finalData, null, 2);
      const blob = new Blob([str], { type: 'application/json' });
      triggerDownload(blob, filename);

      // 3. Update State
      const now = Date.now();
      setLastBackupAt(now);
      localStorage.setItem('last_backup_time', now);

      message.success({
        content: language === 'hi' ? '✅ बैकअप फाइल डाउनलोड हो गई!' : '✅ Backup file downloaded!',
        key: 'backup_dl'
      });

      // 4. Drive Logic
      if (isDrive) {
        setDriveModalVisible(true);
        // Open Drive in new tab
        window.open('https://drive.google.com/drive/u/0/my-drive', '_blank');
      }

    } catch (error) {
      console.error('handleDownload error', error);
      message.error(language === 'hi' ? 'डाउनलोड फेल' : 'Download failed');
    } finally {
      setLoading(false);
    }
  }, [exportData, buildExportObject, shopInfo, language]);

  // Validate JSON structure
  const isValidBackupObject = (obj) => {
    if (!obj || typeof obj !== 'object') return false;
    // Check for at least one major collection
    return ['customers', 'transactions', 'products', 'invoices'].some(k => k in obj);
  };

  const handleRestore = (file) => {
    if (!file) return false;
    setLoading(true);

    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const text = e.target.result;
        let parsed;
        try { parsed = JSON.parse(text); } catch (err) {
          message.error(language === 'hi' ? 'फाइल JSON नहीं है' : 'Invalid JSON file');
          setLoading(false); return;
        }

        if (!isValidBackupObject(parsed)) {
          message.error(language === 'hi' ? 'गलत बैकअप फाइल' : 'Invalid backup format');
          setLoading(false); return;
        }

        setUploadPreview({
          customers: (parsed.customers || []).length,
          transactions: (parsed.transactions || []).length,
          products: (parsed.products || []).length,
          invoices: (parsed.invoices || []).length,
          raw: parsed
        });
        setPreviewVisible(true);
      } catch (err) {
        console.error('restore parse error', err);
        message.error('Error reading file');
      } finally {
        setLoading(false);
      }
    };
    reader.onerror = () => { setLoading(false); message.error('Read error'); };
    reader.readAsText(file);
    return false;
  };

  const confirmRestoreApply = async () => {
    const preview = uploadPreview;
    if (!preview) return;

    confirm({
      title: language === 'hi' ? 'क्या आप सुनिश्चित हैं?' : 'Are you sure?',
      icon: <ExclamationCircleOutlined style={{ color: 'red' }} />,
      content: (
        <div>
          <Paragraph type="danger">
            {language === 'hi'
              ? 'रिस्टोर करने पर मौजूदा डेटा पूरी तरह बदल जाएगा। यह प्रक्रिया वापस नहीं की जा सकती।'
              : 'Restoring will REPLACE ALL current data. This action cannot be fully undone if sync overwrites it.'}
          </Paragraph>
          <Text strong>Backing up current state automatically before restore...</Text>
        </div>
      ),
      okText: language === 'hi' ? 'हाँ, रिस्टोर करें' : 'Restoe Data',
      okType: 'danger',
      cancelText: language === 'hi' ? 'नहीं' : 'Cancel',
      async onOk() {
        setLoading(true);
        try {
          // Snapshot for Undo
          const snapshot = {
            customers, transactions, promises, calls, products, suppliers, invoices, payments, expenses, workers, takenAt: Date.now()
          };
          undoSnapshotRef.current = snapshot;
          try { localStorage.setItem(`khata_undo_${shopInfo.shopId}`, JSON.stringify(snapshot)); } catch (e) { }

          const data = preview.raw;

          // Apply State
          setCustomers(data.customers || []);
          setTransactions(data.transactions || []);
          setPromises(data.promises || []);
          setCalls(data.calls || []);
          setProducts(data.products || []);
          setSuppliers(data.suppliers || []);
          setInvoices(data.invoices || []);
          setPayments(data.payments || []);
          setExpenses(data.expenses || []);
          setWorkers(data.workers || []);

          // Sync to Cloud
          await importData(data); // This pushes to DB

          message.success(language === 'hi' ? '✅ डेटा रिस्टोर हो गया!' : '✅ Data restored successfully!');
          setPreviewVisible(false);
          setUploadPreview(null);
        } catch (err) {
          console.error('restore error', err);
          message.error('Restore failed');
        } finally {
          setLoading(false);
        }
      }
    });
  };

  const handleRefreshFromCloud = useCallback(async () => {
    setLoading(true);
    try {
      const data = await loadData();
      if (!data) {
        message.warn(language === 'hi' ? 'क्लाउड पर डेटा नहीं मिला' : 'No data found on cloud');
        setLoading(false);
        return;
      }
      setCustomers(data.customers || []);
      setTransactions(data.transactions || []);
      setPromises(data.promises || []);
      setCalls(data.calls || []);
      setProducts(data.products || []);
      setSuppliers(data.suppliers || []);
      setInvoices(data.invoices || []);
      setPayments(data.payments || []);
      setExpenses(data.expenses || []);
      setWorkers(data.workers || []);
      await importData(data);
      message.success(language === 'hi' ? '✅ क्लाउड से अपडेट हो गया!' : '✅ Latest data loaded from cloud!');
    } catch (error) {
      console.error('Refresh error:', error);
      message.error(language === 'hi' ? 'रिफ्रेश फेल' : 'Refresh failed');
    } finally {
      setLoading(false);
    }
  }, [setCustomers, setTransactions, setPromises, setCalls, setProducts, setSuppliers, setInvoices, setPayments, setExpenses, setWorkers, language]);

  // --- UI COMPONENTS ---

  const StatCard = ({ title, value, icon, color }) => (
    <Card bordered={false} bodyStyle={{ padding: 12 }}>
      <Space>
        <div style={{ background: color, borderRadius: '50%', padding: 8, display: 'flex' }}>
          {React.cloneElement(icon, { style: { color: '#fff', fontSize: 18 } })}
        </div>
        <div>
          <Text type="secondary" style={{ fontSize: 12 }}>{title}</Text>
          <div style={{ fontSize: 20, fontWeight: 'bold', lineHeight: 1 }}>{value}</div>
        </div>
      </Space>
    </Card>
  );

  return (
    <div style={{ maxWidth: 1200, margin: '20px auto' }}>

      {/* Header Stats Area */}
      <div style={{ marginBottom: 24 }}>
        <Title level={2}><SafetyOutlined /> Backup & Restore</Title>
        <Text type="secondary">Manage your shop data securely. Last backup: {lastBackupAt ? new Date(parseInt(lastBackupAt)).toLocaleString() : 'Never'}</Text>
      </div>

      <Row gutter={[16, 16]}>
        <Col xs={12} sm={6} md={4}><StatCard title="Customers" value={counts.customers} icon={<UserOutlined />} color="#1890ff" /></Col>
        <Col xs={12} sm={6} md={4}><StatCard title="Transactions" value={counts.transactions} icon={<RetweetOutlined />} color="#52c41a" /></Col>
        <Col xs={12} sm={6} md={4}><StatCard title="Invoices" value={counts.invoices} icon={<FileTextOutlined />} color="#faad14" /></Col>
        <Col xs={12} sm={6} md={4}><StatCard title="Products" value={counts.products} icon={<ShoppingOutlined />} color="#eb2f96" /></Col>
      </Row>

      <Divider />

      <Row gutter={[24, 24]}>
        {/* LEFT: BACKUP */}
        <Col xs={24} md={12}>
          <Card
            title={<span><CloudDownloadOutlined /> Export / Backup</span>}
            hoverable
            style={{ height: '100%' }}
          >
            <Alert
              message="Keep your data safe!"
              description="Download a copy of your data regularly. It includes all customers, transactions, and settings."
              type="info"
              showIcon
              style={{ marginBottom: 20 }}
            />

            <Space direction="vertical" style={{ width: '100%' }} size="large">
              <Button
                type="primary"
                size="large"
                icon={<DownloadOutlined />}
                block
                style={{ height: 60, fontSize: 18 }}
                onClick={() => handleDownload(false)}
              >
                Download to Device
              </Button>

              <div style={{ textAlign: 'center', position: 'relative' }}>
                <Divider>OR</Divider>
              </div>

              <Button
                size="large"
                icon={<GoogleOutlined />}
                block
                danger
                style={{ height: 60, fontSize: 18, borderColor: '#ea4335', color: '#ea4335' }}
                onClick={() => handleDownload(true)}
              >
                Save to Google Drive
              </Button>
              <Text type="secondary" style={{ fontSize: 12, display: 'block', textAlign: 'center' }}>
                (Downloads file & opens Drive for upload)
              </Text>
            </Space>
          </Card>
        </Col>

        {/* RIGHT: RESTORE */}
        <Col xs={24} md={12}>
          <Card
            title={<span><HistoryOutlined /> Restore Data</span>}
            hoverable
            style={{ height: '100%' }}
            extra={<Button type="link" onClick={handleRefreshFromCloud} icon={<ReloadOutlined />}>Sync Cloud</Button>}
          >
            <Alert
              message="Restore from File"
              description="Import a previously downloaded backup file. This will overwrite current data."
              type="warning"
              showIcon
              style={{ marginBottom: 20 }}
            />

            <div style={{ border: '2px dashed #d9d9d9', borderRadius: 8, padding: 30, textAlign: 'center', background: '#fafafa' }}>
              <Upload
                beforeUpload={handleRestore}
                accept=".json"
                showUploadList={false}
                disabled={loading}
              >
                <Button type="primary" size="large" icon={<UploadOutlined />}>
                  Select Backup File
                </Button>
              </Upload>
              <div style={{ marginTop: 10, color: '#999' }}>Supported format: .json</div>
            </div>

            {uploadPreview && (
              <div style={{ marginTop: 20, background: '#f6ffed', padding: 15, borderRadius: 8, border: '1px solid #b7eb8f' }}>
                <Space align="center">
                  <CheckCircleOutlined style={{ color: '#52c41a', fontSize: 20 }} />
                  <div>
                    <Text strong>Backup File Validated</Text><br />
                    <Text type="secondary">Contains {uploadPreview.customers} Customers, {uploadPreview.transactions} Transactions</Text>
                  </div>
                  <Button type="link" onClick={() => setPreviewVisible(true)}>View Details</Button>
                </Space>
                <Button type="primary" block style={{ marginTop: 15 }} onClick={confirmRestoreApply}>
                  Confirm Restore
                </Button>
              </div>
            )}
          </Card>
        </Col>
      </Row>

      {/* DRIVE INSTRUCTIONS MODAL */}
      <Modal
        title="Save to Google Drive"
        open={driveModalVisible}
        onOk={() => setDriveModalVisible(false)}
        onCancel={() => setDriveModalVisible(false)}
        footer={[<Button key="ok" type="primary" onClick={() => setDriveModalVisible(false)}>Done</Button>]}
      >
        <Steps direction="vertical" current={1}>
          <Step title="File Downloaded" description="The backup file has been saved to your device's Downloads folder." status="finish" icon={<FileDoneOutlined />} />
          <Step title="Google Drive Opened" description="We opened Google Drive in a new tab for you." status="process" icon={<GoogleOutlined />} />
          <Step title="Drag & Drop" description="Drag the downloaded file into the Google Drive window to upload it safely." />
        </Steps>
      </Modal>

      {/* RAW PREVIEW MODAL */}
      <Modal
        title="Backup File Preview"
        open={previewVisible}
        onCancel={() => setPreviewVisible(false)}
        width={800}
        footer={null}
      >
        <div style={{ maxHeight: '60vh', overflow: 'auto', background: '#f5f5f5', padding: 10, borderRadius: 4 }}>
          <pre style={{ fontSize: 11 }}>
            {JSON.stringify(uploadPreview?.raw || {}, null, 2)}
          </pre>
        </div>
      </Modal>
    </div>
  );
};

// Icons needed for Stats (internal definitions if not imported)
import { UserOutlined, RetweetOutlined, FileTextOutlined, ShoppingOutlined } from '@ant-design/icons';

export default BackupRestore;
