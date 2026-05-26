import React from 'react';
import { Card, Row, Col, Statistic, Typography, List, Tag, Empty, Space, Button, Avatar, Badge } from 'antd';
import {
  WalletOutlined,
  RiseOutlined,
  FallOutlined,
  UserOutlined,
  BellOutlined,
  TrophyOutlined,
  ClockCircleOutlined,
  FileTextOutlined,
  BarcodeOutlined,
  PlusOutlined,
  WarningOutlined,
  CheckCircleOutlined,
  ExclamationCircleOutlined,
} from '@ant-design/icons';
import { calculateBalance } from '../utils/calculations';
import { deriveInvoiceStatus } from '../utils/statusUtils';
import dayjs from 'dayjs';

const { Title, Text } = Typography;

const Dashboard = ({ customers, transactions, promises, products, invoices, expenses, payments, language, onNavigate }) => {
  const custTransactions = transactions.filter(t => t.customerId);
  const today = new Date().toDateString();
  const todayDate = dayjs();

  // ── Promises due today/overdue ──
  const duePromises = (promises || []).filter(p => {
    if (p.status !== 'pending') return false;
    const due = dayjs(p.dueDate);
    return due.isBefore(todayDate, 'day') || due.isSame(todayDate, 'day');
  });
  const totalDueAmount = duePromises.reduce((sum, p) => sum + (Number(p.amount) || 0), 0);

  // ── Khata stats ──
  const todayTxns = custTransactions.filter(t => new Date(t.date).toDateString() === today);
  const todaysCredit = todayTxns.filter(t => t.type === 'credit').reduce((sum, t) => sum + t.amount, 0);
  const todaysDebit = todayTxns.filter(t => t.type === 'debit').reduce((sum, t) => sum + t.amount, 0);
  const totalOutstanding = customers.reduce((sum, c) => sum + calculateBalance(c.id, custTransactions), 0);

  // ── Invoice stats ──
  const allInvoices = invoices || [];
  const todayInvoices = allInvoices.filter(inv => new Date(inv.date).toDateString() === today);
  const todaySales = todayInvoices.reduce((sum, inv) => sum + (inv.total || 0), 0);
  const todayInvoiceCount = todayInvoices.length;

  // Monthly GST collected
  const currentMonth = new Date().getMonth();
  const currentYear = new Date().getFullYear();
  const monthlyInvoices = allInvoices.filter(inv => {
    const d = new Date(inv.date);
    return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
  });
  const monthlyGST = monthlyInvoices.reduce((sum, inv) => sum + (inv.taxBreakup?.totalTax || 0), 0);
  const monthlyRevenue = monthlyInvoices.reduce((sum, inv) => sum + (inv.total || 0), 0);

  // Unpaid/partial invoices
  const allPayments = payments || [];
  const unpaidInvoices = allInvoices.filter(inv => {
    const paidSoFar = allPayments.filter(p => p.invoiceId === inv.id).reduce((s, p) => s + p.amount, 0);
    const totalPaid = (inv.paidAmount || 0) + paidSoFar;
    const status = deriveInvoiceStatus(inv.total, totalPaid, inv.paymentMode);
    return status === 'unpaid' || status === 'partial';
  });
  const unpaidTotal = unpaidInvoices.reduce((sum, inv) => {
    const paidSoFar = allPayments.filter(p => p.invoiceId === inv.id).reduce((s, p) => s + p.amount, 0);
    return sum + Math.max(0, inv.total - (inv.paidAmount || 0) - paidSoFar);
  }, 0);

  // Overdue invoices (past due date, not fully paid)
  const overdueInvoices = allInvoices.filter(inv => {
    if (!inv.dueDate) return false;
    const paidSoFar = allPayments.filter(p => p.invoiceId === inv.id).reduce((s, p) => s + p.amount, 0);
    const totalPaid = (inv.paidAmount || 0) + paidSoFar;
    const status = deriveInvoiceStatus(inv.total, totalPaid, inv.paymentMode);
    return (status === 'unpaid' || status === 'partial') && dayjs(inv.dueDate).isBefore(todayDate, 'day');
  });

  // Inventory stats
  const lowStockCount = products ? products.filter(p => p.stock < (p.reorderLevel || 5)).length : 0;

  // Monthly expenses
  const monthlyExpenses = expenses
    ? expenses.filter(e => {
      const d = new Date(e.date);
      return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
    }).reduce((sum, e) => sum + Number(e.amount), 0)
    : 0;

  // Top debtors
  const topDebtors = customers
    .map(c => ({ ...c, balance: calculateBalance(c.id, custTransactions) }))
    .filter(c => c.balance > 0)
    .sort((a, b) => b.balance - a.balance)
    .slice(0, 5);

  // Last 7 days chart data
  const weekData = Array.from({ length: 7 }, (_, i) => {
    const d = dayjs().subtract(6 - i, 'day');
    const dateStr = d.format('YYYY-MM-DD');
    const dayTxns = custTransactions.filter(t => dayjs(t.date).format('YYYY-MM-DD') === dateStr);
    const dayInvs = allInvoices.filter(inv => dayjs(inv.date).format('YYYY-MM-DD') === dateStr);
    return {
      name: d.format('DD MMM'),
      given: dayTxns.filter(t => t.type === 'credit').reduce((s, t) => s + t.amount, 0),
      received: dayTxns.filter(t => t.type === 'debit').reduce((s, t) => s + t.amount, 0),
      sales: dayInvs.reduce((s, inv) => s + (inv.total || 0), 0),
    };
  });
  const maxVal = Math.max(...weekData.map(d => Math.max(d.given, d.received, d.sales)), 100);

  // Recent activity: merge invoices + transactions, sort by date desc
  const recentActivity = [
    ...todayInvoices.map(inv => ({ type: 'invoice', date: inv.date, label: `Invoice ${inv.invoiceNumber || inv.id.slice(-4)}`, amount: inv.total, color: '#6366f1' })),
    ...todayTxns.map(t => {
      const c = customers.find(cu => cu.id === t.customerId);
      return { type: 'txn', date: t.date, label: c?.name || 'Customer', amount: t.amount, txnType: t.type, color: t.type === 'credit' ? '#faad14' : '#52c41a' };
    }),
  ].sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 8);

  const StatCard = ({ title, value, icon, color1, color2, prefix, suffix, textColor, onClick, badge }) => (
    <div
      className="premium-card fade-in"
      style={{ padding: '20px', height: '100%', background: '#fff', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', cursor: onClick ? 'pointer' : 'default' }}
      onClick={onClick}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <Text type="secondary" style={{ fontSize: '12px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>{title}</Text>
          <div style={{ fontSize: '28px', fontWeight: '800', color: textColor || '#111827', marginTop: '6px', letterSpacing: '-1px' }}>
            {prefix}{(value || 0).toLocaleString('en-IN')}{suffix}
          </div>
          {badge && <Tag color={badge.color} style={{ marginTop: 6 }}>{badge.text}</Tag>}
        </div>
        <div style={{
          width: 44, height: 44, borderRadius: 12,
          background: `linear-gradient(135deg, ${color1}, ${color2})`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: '#fff', fontSize: 20, boxShadow: `0 4px 10px ${color1}66`
        }}>
          {icon}
        </div>
      </div>
    </div>
  );

  return (
    <div style={{ paddingBottom: 40 }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }} className="fade-in">
        <Title level={2} style={{ margin: 0, fontWeight: 800, letterSpacing: '-0.5px' }}>
          {language === 'hi' ? '📊 डैशबोर्ड' : 'Dashboard'}
        </Title>
        <Tag color="blue" style={{ padding: '6px 12px', fontSize: 14, borderRadius: 6 }}>
          {dayjs().format('DD MMMM YYYY')}
        </Tag>
      </div>

      {/* ── Quick Actions ── */}
      <Card style={{ marginBottom: 20, background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)', border: 'none' }} className="fade-in">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
          <Text strong style={{ color: '#fff', fontSize: 16 }}>⚡ {language === 'hi' ? 'त्वरित कार्य' : 'Quick Actions'}</Text>
          <Space wrap>
            <Button icon={<BarcodeOutlined />} onClick={() => onNavigate?.('billing')} style={{ background: 'rgba(255,255,255,0.2)', border: '1px solid rgba(255,255,255,0.4)', color: '#fff', fontWeight: 600 }}>
              {language === 'hi' ? 'नया POS बिल' : 'New POS Bill'}
            </Button>
            <Button icon={<FileTextOutlined />} onClick={() => onNavigate?.('new_invoice')} style={{ background: 'rgba(255,255,255,0.2)', border: '1px solid rgba(255,255,255,0.4)', color: '#fff', fontWeight: 600 }}>
              {language === 'hi' ? 'नया A4 बिल' : 'New A4 Invoice'}
            </Button>
            <Button icon={<PlusOutlined />} onClick={() => onNavigate?.('customers')} style={{ background: 'rgba(255,255,255,0.2)', border: '1px solid rgba(255,255,255,0.4)', color: '#fff', fontWeight: 600 }}>
              {language === 'hi' ? 'नया ग्राहक' : 'Add Customer'}
            </Button>
            <Button icon={<FileTextOutlined />} onClick={() => onNavigate?.('invoices')} style={{ background: 'rgba(255,255,255,0.2)', border: '1px solid rgba(255,255,255,0.4)', color: '#fff', fontWeight: 600 }}>
              {language === 'hi' ? 'बिल इतिहास' : 'Invoice History'}
            </Button>
          </Space>
        </div>
      </Card>

      {/* ── Overdue Invoices Alert ── */}
      {overdueInvoices.length > 0 && (
        <Card style={{ marginBottom: 20, borderLeft: '5px solid #ff4d4f', background: '#fff1f0' }} className="fade-in"
          title={
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span><ExclamationCircleOutlined style={{ color: '#ff4d4f', marginRight: 8 }} />{language === 'hi' ? 'बकाया बिल (Overdue)' : 'Overdue Invoices'}</span>
              <Space>
                <Tag color="red" style={{ fontSize: 13, padding: '3px 10px' }}>{overdueInvoices.length} {language === 'hi' ? 'बिल' : 'invoices'}</Tag>
                <Button size="small" type="primary" danger onClick={() => onNavigate?.('invoices')}>{language === 'hi' ? 'देखें' : 'View All'}</Button>
              </Space>
            </div>
          }
        >
          <List size="small" dataSource={overdueInvoices.slice(0, 3)} renderItem={inv => {
            const customer = customers.find(c => c.id === inv.customerId);
            const daysOverdue = todayDate.diff(dayjs(inv.dueDate), 'day');
            return (
              <List.Item>
                <List.Item.Meta
                  avatar={<WarningOutlined style={{ fontSize: 20, color: '#ff4d4f' }} />}
                  title={<Text strong>{customer?.name || inv.customerName || 'Walk-in'} — ₹{inv.total?.toLocaleString('en-IN')}</Text>}
                  description={<span>Invoice #{inv.invoiceNumber || inv.id?.slice(-4)} • <Tag color="red">{daysOverdue} {language === 'hi' ? 'दिन लेट' : 'days overdue'}</Tag></span>}
                />
              </List.Item>
            );
          }} />
        </Card>
      )}

      {/* ── Promises Due Alert ── */}
      {duePromises.length > 0 && (
        <Card style={{ marginBottom: 20, borderLeft: '5px solid #faad14', background: '#fffbe6' }} className="fade-in"
          title={
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span><BellOutlined style={{ color: '#faad14', marginRight: 8 }} />{language === 'hi' ? 'आज की वसूली' : 'Collect Today'}</span>
              <Tag color="orange" style={{ fontSize: 13, padding: '3px 10px' }}>₹{totalDueAmount.toLocaleString('en-IN')} Pending</Tag>
            </div>
          }
        >
          <List size="small" dataSource={duePromises.slice(0, 3)} renderItem={item => {
            const customer = customers.find(c => c.id === item.customerId);
            const isOverdue = dayjs(item.dueDate).isBefore(todayDate, 'day');
            return (
              <List.Item>
                <List.Item.Meta
                  avatar={<ClockCircleOutlined style={{ fontSize: 20, color: isOverdue ? '#ff4d4f' : '#faad14' }} />}
                  title={<Text strong>{customer?.name || 'Unknown'} — <Text style={{ color: '#cf1322' }}>₹{item.amount}</Text></Text>}
                  description={item.notes || 'Promised to pay'}
                />
                {isOverdue && <Tag color="red">OVERDUE</Tag>}
              </List.Item>
            );
          }} />
        </Card>
      )}

      {/* ── Stats Row 1: Billing ── */}
      <Row gutter={[16, 16]}>
        <Col xs={24} sm={12} lg={6}>
          <StatCard title={language === 'hi' ? 'आज की बिक्री' : "Today's Sales"} value={todaySales} icon={<TrophyOutlined />} color1="#84fab0" color2="#8fd3f4" prefix="₹"
            badge={todayInvoiceCount > 0 ? { text: `${todayInvoiceCount} invoices`, color: 'green' } : null}
            onClick={() => onNavigate?.('invoices')} />
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <StatCard title={language === 'hi' ? 'बकाया बिल' : 'Unpaid Invoices'} value={unpaidTotal} icon={<ExclamationCircleOutlined />} color1="#f43f5e" color2="#fb7185" prefix="₹"
            textColor={unpaidTotal > 0 ? '#e11d48' : undefined}
            badge={unpaidInvoices.length > 0 ? { text: `${unpaidInvoices.length} pending`, color: 'red' } : null}
            onClick={() => onNavigate?.('invoices')} />
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <StatCard title={language === 'hi' ? 'GST (इस महीने)' : 'GST Collected (Month)'} value={Math.round(monthlyGST)} icon={<CheckCircleOutlined />} color1="#667eea" color2="#764ba2" prefix="₹"
            badge={{ text: `₹${monthlyRevenue.toLocaleString('en-IN')} revenue`, color: 'purple' }} />
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <StatCard title={language === 'hi' ? 'कम स्टॉक' : 'Low Stock Items'} value={lowStockCount} icon={<WarningOutlined />} color1="#f59e0b" color2="#fbbf24"
            textColor={lowStockCount > 0 ? '#d97706' : undefined}
            onClick={() => onNavigate?.('inventory')} />
        </Col>
      </Row>

      {/* ── Stats Row 2: Khata ── */}
      <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
        <Col xs={24} sm={12} lg={6}>
          <StatCard title={language === 'hi' ? 'कुल बाकी (खाता)' : 'Total Outstanding'} value={totalOutstanding} icon={<WalletOutlined />} color1="#8b5cf6" color2="#d946ef" prefix="₹" />
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <StatCard title={language === 'hi' ? 'आज की उधारी' : "Today's Credit Given"} value={todaysCredit} icon={<RiseOutlined />} color1="#f6d365" color2="#fda085" prefix="₹" />
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <StatCard title={language === 'hi' ? 'आज वसूला' : "Today's Collection"} value={todaysDebit} icon={<FallOutlined />} color1="#43e97b" color2="#38f9d7" prefix="₹" />
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <StatCard title={language === 'hi' ? 'कुल ग्राहक' : 'Total Customers'} value={customers.length} icon={<UserOutlined />} color1="#4facfe" color2="#00f2fe"
            onClick={() => onNavigate?.('customers')} />
        </Col>
      </Row>

      {/* ── Chart + Top Debtors ── */}
      <Row gutter={[16, 16]} style={{ marginTop: 20 }}>
        <Col xs={24} lg={16}>
          <Card className="premium-card fade-in" title={language === 'hi' ? '📈 पिछले 7 दिन का ट्रेंड' : '📈 Last 7 Days Trend'} style={{ height: '100%' }}>
            <div style={{ height: 240, display: 'flex', alignItems: 'flex-end', justifyContent: 'space-around', padding: '16px 0' }}>
              {weekData.map((d, i) => (
                <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '12%' }}>
                  <div style={{ display: 'flex', alignItems: 'flex-end', height: 180, width: '100%', gap: 3 }}>
                    <div style={{ flex: 1, background: '#6366f1', height: `${(d.sales / maxVal) * 100}%`, borderRadius: '3px 3px 0 0', transition: 'height 1s ease', opacity: 0.85 }} title={`Sales: ₹${d.sales}`} />
                    <div style={{ flex: 1, background: '#faad14', height: `${(d.given / maxVal) * 100}%`, borderRadius: '3px 3px 0 0', transition: 'height 1s ease', opacity: 0.8 }} title={`Credit: ₹${d.given}`} />
                    <div style={{ flex: 1, background: '#52c41a', height: `${(d.received / maxVal) * 100}%`, borderRadius: '3px 3px 0 0', transition: 'height 1s ease', opacity: 0.8 }} title={`Received: ₹${d.received}`} />
                  </div>
                  <Text type="secondary" style={{ fontSize: 10, marginTop: 6 }}>{d.name}</Text>
                </div>
              ))}
            </div>
            <div style={{ textAlign: 'center', marginTop: 8 }}>
              <Space size="large">
                <Space><div style={{ width: 12, height: 12, background: '#6366f1', borderRadius: 2 }} /> {language === 'hi' ? 'बिक्री' : 'Sales'}</Space>
                <Space><div style={{ width: 12, height: 12, background: '#faad14', borderRadius: 2 }} /> {language === 'hi' ? 'उधारी' : 'Credit'}</Space>
                <Space><div style={{ width: 12, height: 12, background: '#52c41a', borderRadius: 2 }} /> {language === 'hi' ? 'जमा' : 'Received'}</Space>
              </Space>
            </div>
          </Card>
        </Col>

        <Col xs={24} lg={8}>
          <Card className="premium-card fade-in"
            title={<Space><TrophyOutlined style={{ color: '#faad14' }} />{language === 'hi' ? 'सबसे बड़े बाकीदार' : 'Top Debtors'}</Space>}
            extra={<Button type="link" size="small" onClick={() => onNavigate?.('customers')}>{language === 'hi' ? 'सभी देखें' : 'View All'}</Button>}
            style={{ height: '100%' }}
          >
            <List dataSource={topDebtors} renderItem={(item, index) => (
              <List.Item>
                <List.Item.Meta
                  avatar={<div style={{ width: 28, height: 28, borderRadius: '50%', background: index === 0 ? '#ffd700' : '#f0f0f0', color: index === 0 ? '#fff' : '#666', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: 12 }}>{index + 1}</div>}
                  title={<Text strong style={{ fontSize: 13 }}>{item.name}</Text>}
                  description={<Text type="secondary" style={{ fontSize: 11 }}>{item.village}</Text>}
                />
                <Text type="danger" strong>₹{item.balance.toLocaleString('en-IN')}</Text>
              </List.Item>
            )} />
            {topDebtors.length === 0 && <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="No Data" />}
          </Card>
        </Col>
      </Row>

      {/* ── Recent Activity ── */}
      <Card className="premium-card fade-in" style={{ marginTop: 20 }}
        title={<Space><ClockCircleOutlined style={{ color: '#1890ff' }} />{language === 'hi' ? 'आज की गतिविधि' : "Today's Activity"}</Space>}
      >
        {recentActivity.length > 0 ? (
          <List dataSource={recentActivity} renderItem={item => (
            <List.Item actions={[
              item.type === 'invoice'
                ? <Tag color="purple">INVOICE</Tag>
                : <Tag color={item.txnType === 'credit' ? 'orange' : 'green'}>{item.txnType?.toUpperCase()}</Tag>
            ]}>
              <List.Item.Meta
                avatar={<div style={{ width: 36, height: 36, borderRadius: 10, background: item.type === 'invoice' ? '#ede9fe' : item.txnType === 'credit' ? '#fff7e6' : '#f6ffed', display: 'flex', alignItems: 'center', justifyContent: 'center', color: item.color, fontSize: 16 }}>
                  {item.type === 'invoice' ? <FileTextOutlined /> : item.txnType === 'credit' ? <RiseOutlined /> : <FallOutlined />}
                </div>}
                title={<Text strong>{item.label}</Text>}
                description={dayjs(item.date).format('hh:mm A')}
              />
              <Text strong style={{ color: item.color, fontSize: 15 }}>₹{item.amount?.toLocaleString('en-IN')}</Text>
            </List.Item>
          )} />
        ) : (
          <Empty description={language === 'hi' ? 'आज कोई गतिविधि नहीं' : 'No activity today'} />
        )}
      </Card>
    </div>
  );
};

export default Dashboard;
