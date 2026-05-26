import React, { useState, useMemo } from 'react';
import {
  Card, Row, Col, Statistic, Typography, Table, Space, DatePicker,
  Button, message, Tabs, Divider, Tag, Empty
} from 'antd';
import {
  BarChartOutlined, DownloadOutlined, TrophyOutlined,
  UserOutlined, RiseOutlined, FallOutlined, PrinterOutlined,
  ShoppingOutlined, CalendarOutlined
} from '@ant-design/icons';
import {
  getTotalOutstanding, getTopDebtors, getVillageStats
} from '../utils/calculations';
import dayjs from 'dayjs';

const { Title, Text } = Typography;
const { RangePicker } = DatePicker;

const Reports = ({ customers, transactions, invoices, expenses, language }) => {
  const [dateRange, setDateRange] = useState([dayjs().subtract(30, 'days'), dayjs()]);
  const [eodDate, setEodDate] = useState(dayjs());

  // ── Khata calculations ──
  const filteredTransactions = transactions.filter(t => {
    const d = dayjs(t.date);
    return d.isAfter(dateRange[0].subtract(1, 'day')) && d.isBefore(dateRange[1].add(1, 'day'));
  });
  const totalCredit = filteredTransactions.filter(t => t.type === 'credit').reduce((s, t) => s + t.amount, 0);
  const totalDebit = filteredTransactions.filter(t => t.type === 'debit').reduce((s, t) => s + t.amount, 0);
  const netFlow = totalDebit - totalCredit;
  const totalOutstanding = getTotalOutstanding(customers, transactions);
  const topDebtors = getTopDebtors(customers, transactions, 10);
  const villageStats = getVillageStats(customers, transactions);
  const collectionRate = totalCredit > 0 ? Math.round((totalDebit / totalCredit) * 100) : 0;

  // ── P&L calculations ──
  const allInvoices = invoices || [];
  const allExpenses = expenses || [];

  const plInvoices = useMemo(() => allInvoices.filter(inv => {
    const d = dayjs(inv.date);
    return d.isAfter(dateRange[0].subtract(1, 'day')) && d.isBefore(dateRange[1].add(1, 'day'));
  }), [allInvoices, dateRange]);

  const plExpenses = useMemo(() => allExpenses.filter(e => {
    const d = dayjs(e.date);
    return d.isAfter(dateRange[0].subtract(1, 'day')) && d.isBefore(dateRange[1].add(1, 'day'));
  }), [allExpenses, dateRange]);

  const revenue = plInvoices.reduce((sum, inv) => sum + (inv.total || 0), 0);
  const gstCollected = plInvoices.reduce((sum, inv) => sum + (inv.taxBreakup?.totalTax || 0), 0);
  const revenueExGST = revenue - gstCollected;
  const cogs = plInvoices.reduce((sum, inv) =>
    sum + (inv.items || []).reduce((s, item) => {
      const cost = item.purchasePrice || item.costPrice || (item.price * 0.7) || 0;
      return s + cost * (item.qty || 1);
    }, 0), 0);
  const grossProfit = revenueExGST - cogs;
  const totalExpenses = plExpenses.reduce((sum, e) => sum + Number(e.amount || 0), 0);
  const netProfit = grossProfit - totalExpenses;
  const grossMargin = revenueExGST > 0 ? Math.round((grossProfit / revenueExGST) * 100) : 0;
  const netMargin = revenueExGST > 0 ? Math.round((netProfit / revenueExGST) * 100) : 0;
  const expenseByCategory = plExpenses.reduce((acc, e) => {
    const cat = e.category || 'Other';
    acc[cat] = (acc[cat] || 0) + Number(e.amount || 0);
    return acc;
  }, {});

  // ── Product-wise Sales ──
  const productSalesData = useMemo(() => {
    const map = {};
    plInvoices.forEach(inv => {
      (inv.items || []).forEach(item => {
        const key = item.name || item.id || 'Unknown';
        if (!map[key]) map[key] = { name: key, qtySold: 0, revenue: 0, discount: 0 };
        map[key].qtySold += (item.qty || 1);
        map[key].revenue += (item.itemTotal || item.price * (item.qty || 1) || 0);
        map[key].discount += (item.itemDiscount || 0);
      });
    });
    return Object.values(map).sort((a, b) => b.revenue - a.revenue);
  }, [plInvoices]);

  // ── End-of-Day calculations ──
  const eodInvoices = useMemo(() => {
    const dateStr = eodDate.format('YYYY-MM-DD');
    return allInvoices.filter(inv => dayjs(inv.date).format('YYYY-MM-DD') === dateStr);
  }, [allInvoices, eodDate]);

  const eodExpenses = useMemo(() => {
    const dateStr = eodDate.format('YYYY-MM-DD');
    return allExpenses.filter(e => dayjs(e.date).format('YYYY-MM-DD') === dateStr);
  }, [allExpenses, eodDate]);

  const eodRevenue = eodInvoices.reduce((s, i) => s + (i.total || 0), 0);
  const eodGst = eodInvoices.reduce((s, i) => s + (i.taxBreakup?.totalTax || 0), 0);
  const eodDiscount = eodInvoices.reduce((s, i) => s + (Number(i.billDiscount || 0) + Number(i.totalItemDiscount || 0)), 0);
  const eodExpenseTotal = eodExpenses.reduce((s, e) => s + Number(e.amount || 0), 0);
  const eodNet = eodRevenue - eodExpenseTotal;
  const eodCashBills = eodInvoices.filter(i => (i.paymentMode || '').toLowerCase() === 'cash');
  const eodOnlineBills = eodInvoices.filter(i => (i.paymentMode || '').toLowerCase() === 'online');
  const eodCreditBills = eodInvoices.filter(i => (i.paymentMode || '').toLowerCase() === 'credit');

  // ── Export ──
  const exportReport = () => {
    const report = {
      dateRange: { from: dateRange[0].format('YYYY-MM-DD'), to: dateRange[1].format('YYYY-MM-DD') },
      summary: { totalCustomers: customers.length, totalOutstanding, totalCreditGiven: totalCredit, totalPaymentsReceived: totalDebit, netCashFlow: netFlow, collectionRate: `${collectionRate}%` },
      topDebtors: topDebtors.map((d, i) => ({ rank: i + 1, name: d.name, village: d.village, phone: d.phone, outstanding: d.balance })),
      generatedAt: new Date().toISOString()
    };
    const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `khata_report_${dayjs().format('YYYY-MM-DD')}.json`; a.click();
    URL.revokeObjectURL(url);
    message.success('Report downloaded');
  };

  // ── End-of-Day Print ──
  const printEodReport = () => {
    const shopName = localStorage.getItem('current_shop_name') || 'My Shop';
    const html = `<html><head><title>End of Day Report - ${eodDate.format('DD/MM/YYYY')}</title>
      <style>
        body{font-family:Arial,sans-serif;margin:20px;color:#111}
        h1{font-size:22px;margin:0}h2{font-size:16px;margin:8px 0 4px}
        .header{text-align:center;border-bottom:2px solid #333;padding-bottom:12px;margin-bottom:16px}
        .row{display:flex;justify-content:space-between;padding:5px 0;border-bottom:1px dotted #ccc}
        .bold{font-weight:bold}.green{color:#166534}.red{color:#991b1b}
        .total-row{font-size:17px;font-weight:bold;display:flex;justify-content:space-between;padding:10px 0;border-top:2px solid #333;margin-top:8px}
        table{width:100%;border-collapse:collapse;margin:8px 0;font-size:12px}
        th{background:#f3f4f6;padding:5px 8px;text-align:left;border:1px solid #ddd}
        td{padding:4px 8px;border:1px solid #ddd}
        .section{margin-bottom:20px}
        @media print{body{margin:10px}}
      </style></head><body>
      <div class="header">
        <h1>${shopName}</h1>
        <div>End of Day Report</div>
        <div style="font-size:18px;font-weight:bold;margin-top:6px">${eodDate.format('dddd, DD MMMM YYYY')}</div>
      </div>
      <div class="section">
        <h2>📊 Sales Summary</h2>
        <div class="row"><span>Total Bills</span><span class="bold">${eodInvoices.length}</span></div>
        <div class="row"><span>Cash Bills (${eodCashBills.length})</span><span class="bold green">₹${eodCashBills.reduce((s, i) => s + (i.total || 0), 0).toLocaleString('en-IN')}</span></div>
        <div class="row"><span>Online/UPI Bills (${eodOnlineBills.length})</span><span class="bold" style="color:#1d4ed8">₹${eodOnlineBills.reduce((s, i) => s + (i.total || 0), 0).toLocaleString('en-IN')}</span></div>
        <div class="row"><span>Credit/Udhari Bills (${eodCreditBills.length})</span><span class="bold" style="color:#c2410c">₹${eodCreditBills.reduce((s, i) => s + (i.total || 0), 0).toLocaleString('en-IN')}</span></div>
        <div class="row"><span>Discounts Given</span><span class="red">-₹${Math.round(eodDiscount).toLocaleString('en-IN')}</span></div>
        <div class="row"><span>GST Collected</span><span style="color:#6d28d9">₹${Math.round(eodGst).toLocaleString('en-IN')}</span></div>
        <div class="total-row"><span>TOTAL SALES</span><span class="green">₹${eodRevenue.toLocaleString('en-IN')}</span></div>
      </div>
      <div class="section">
        <h2>💸 Expenses</h2>
        ${eodExpenses.length === 0
        ? '<div style="color:#666">No expenses recorded today</div>'
        : eodExpenses.map(e => `<div class="row"><span>${e.category || 'Other'}: ${e.description || ''}</span><span class="red">-₹${Number(e.amount || 0).toLocaleString('en-IN')}</span></div>`).join('')}
        <div class="total-row"><span>TOTAL EXPENSES</span><span class="red">₹${eodExpenseTotal.toLocaleString('en-IN')}</span></div>
      </div>
      <div class="total-row" style="font-size:20px;border-top:3px double #333;margin-top:16px">
        <span>NET CASH</span>
        <span class="${eodNet >= 0 ? 'green' : 'red'}">₹${Math.abs(eodNet).toLocaleString('en-IN')} ${eodNet < 0 ? '(Loss)' : ''}</span>
      </div>
      <div class="section" style="margin-top:24px">
        <h2>🧾 All Bills</h2>
        <table><thead><tr><th>Invoice</th><th>Time</th><th>Customer</th><th>Mode</th><th style="text-align:right">Amount</th></tr></thead>
        <tbody>${eodInvoices.map(inv => `<tr>
          <td>${inv.invoiceNumber || `#${(inv.id || '').slice(-6)}`}</td>
          <td>${dayjs(inv.date).format('HH:mm')}</td>
          <td>${inv.customerName || 'Walk-in'}</td>
          <td>${(inv.paymentMode || 'cash').toUpperCase()}</td>
          <td style="text-align:right"><b>₹${inv.total}</b></td>
        </tr>`).join('')}</tbody></table>
      </div>
      <div style="text-align:center;margin-top:30px;color:#666;font-size:11px">
        Generated by Khata Manager Pro • ${dayjs().format('DD/MM/YYYY hh:mm A')}
      </div>
      <script>window.onload=()=>window.print();</script>
      </body></html>`;
    const win = window.open('', '_blank', 'width=900,height=700');
    win.document.write(html);
    win.document.close();
  };

  // ── Shared date filter ──
  const DateFilter = () => (
    <Card style={{ marginBottom: 24 }}>
      <Space wrap>
        <Text strong>{language === 'hi' ? 'समय अवधि:' : 'Period:'}</Text>
        <RangePicker value={dateRange} onChange={dates => dates && setDateRange(dates)} format="DD/MM/YYYY" size="large" />
        <Button onClick={() => setDateRange([dayjs().startOf('month'), dayjs()])}>This Month</Button>
        <Button onClick={() => setDateRange([dayjs().subtract(1, 'month').startOf('month'), dayjs().subtract(1, 'month').endOf('month')])}>Last Month</Button>
        <Button onClick={() => setDateRange([dayjs().subtract(30, 'days'), dayjs()])}>{language === 'hi' ? 'पिछले 30 दिन' : 'Last 30 Days'}</Button>
        <Button onClick={() => setDateRange([dayjs().startOf('year'), dayjs()])}>This Year</Button>
      </Space>
    </Card>
  );

  const PLRow = ({ label, value, indent = false, bold = false, color, border = false }) => (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: `${bold ? 12 : 8}px ${indent ? 24 : 0}px`, borderTop: border ? '2px solid #d9d9d9' : undefined }}>
      <Text style={{ fontWeight: bold ? 700 : 400, fontSize: bold ? 15 : 14, color: indent ? '#595959' : '#262626' }}>{label}</Text>
      <Text style={{ fontWeight: bold ? 700 : 500, fontSize: bold ? 16 : 14, color: color || '#262626' }}>
        {value < 0 ? '-' : ''}₹{Math.abs(value).toLocaleString('en-IN')}
      </Text>
    </div>
  );

  // ── Khata Tab ──
  const debtorColumns = [
    { title: '#', key: 'rank', width: 50, render: (_, __, i) => <Space>{i === 0 && <TrophyOutlined style={{ color: '#faad14' }} />}{i + 1}</Space> },
    { title: 'Name', dataIndex: 'name', key: 'name', render: t => <Text strong>{t}</Text> },
    { title: 'Village', dataIndex: 'village', key: 'village', render: t => t || '-' },
    { title: 'Phone', dataIndex: 'phone', key: 'phone', render: t => t || '-' },
    { title: 'Outstanding', dataIndex: 'balance', key: 'balance', render: v => <Text strong style={{ color: '#ff4d4f' }}>₹{v.toLocaleString('en-IN')}</Text>, sorter: (a, b) => b.balance - a.balance },
  ];
  const villageColumns = [
    { title: 'Village', dataIndex: 'village', key: 'village', render: t => <Text strong>{t}</Text> },
    { title: 'Customers', dataIndex: 'customerCount', key: 'customerCount' },
    { title: 'Outstanding', dataIndex: 'totalOutstanding', key: 'totalOutstanding', render: v => <Text strong style={{ color: v > 0 ? '#ff4d4f' : '#52c41a' }}>₹{v.toLocaleString('en-IN')}</Text>, sorter: (a, b) => b.totalOutstanding - a.totalOutstanding },
  ];

  const khataTab = (
    <div>
      <DateFilter />
      <Row gutter={[16, 16]}>
        <Col xs={24} sm={12} lg={6}><Card><Statistic title="Total Customers" value={customers.length} prefix={<UserOutlined />} valueStyle={{ color: '#1890ff' }} /></Card></Col>
        <Col xs={24} sm={12} lg={6}><Card><Statistic title="Total Outstanding" value={totalOutstanding} prefix="₹" valueStyle={{ color: '#ff4d4f' }} /></Card></Col>
        <Col xs={24} sm={12} lg={6}><Card><Statistic title="Credit Given" value={totalCredit} prefix={<RiseOutlined />} suffix="₹" valueStyle={{ color: '#faad14' }} /><Text type="secondary" style={{ fontSize: 12 }}>({filteredTransactions.filter(t => t.type === 'credit').length} txns)</Text></Card></Col>
        <Col xs={24} sm={12} lg={6}><Card><Statistic title="Payments Received" value={totalDebit} prefix={<FallOutlined />} suffix="₹" valueStyle={{ color: '#52c41a' }} /><Text type="secondary" style={{ fontSize: 12 }}>({filteredTransactions.filter(t => t.type === 'debit').length} txns)</Text></Card></Col>
        <Col xs={24} sm={12} lg={6}><Card><Statistic title="Net Cash Flow" value={Math.abs(netFlow)} prefix={netFlow >= 0 ? '+' : '-'} suffix="₹" valueStyle={{ color: netFlow >= 0 ? '#52c41a' : '#ff4d4f' }} /></Card></Col>
        <Col xs={24} sm={12} lg={6}><Card><Statistic title="Collection Rate" value={collectionRate} suffix="%" valueStyle={{ color: collectionRate >= 80 ? '#52c41a' : '#faad14' }} /></Card></Col>
      </Row>
      <Card title={<Space><TrophyOutlined style={{ color: '#faad14' }} />Top 10 Debtors</Space>} style={{ marginTop: 24 }}>
        <Table columns={debtorColumns} dataSource={topDebtors} rowKey="id" pagination={false} scroll={{ x: 700 }} />
      </Card>
      <Card title={<Space><BarChartOutlined />Village-wise Stats</Space>} style={{ marginTop: 24 }}>
        <Table columns={villageColumns} dataSource={villageStats} rowKey="village" pagination={{ pageSize: 10 }} scroll={{ x: 500 }} />
      </Card>
    </div>
  );

  // ── P&L Tab ──
  const plTab = (
    <div>
      <Card style={{ marginBottom: 24 }}>
        <Space wrap>
          <Text strong>Period:</Text>
          <RangePicker value={dateRange} onChange={dates => dates && setDateRange(dates)} format="DD/MM/YYYY" size="large" />
          <Button onClick={() => setDateRange([dayjs().startOf('month'), dayjs()])}>This Month</Button>
          <Button onClick={() => setDateRange([dayjs().subtract(1, 'month').startOf('month'), dayjs().subtract(1, 'month').endOf('month')])}>Last Month</Button>
          <Button onClick={() => setDateRange([dayjs().startOf('year'), dayjs()])}>This Year</Button>
          <Button icon={<PrinterOutlined />} onClick={() => window.print()}>Print</Button>
        </Space>
      </Card>
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24} sm={12} lg={6}>
          <Card style={{ background: '#f0f9ff', border: '1px solid #bae6fd' }}>
            <Statistic title="Revenue (incl. GST)" value={revenue} prefix="₹" valueStyle={{ color: '#0369a1' }} />
            <Text type="secondary" style={{ fontSize: 12 }}>GST: ₹{Math.round(gstCollected).toLocaleString('en-IN')}</Text>
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card style={{ background: grossProfit >= 0 ? '#f0fdf4' : '#fff1f0', border: `1px solid ${grossProfit >= 0 ? '#bbf7d0' : '#ffa39e'}` }}>
            <Statistic title="Gross Profit" value={Math.abs(grossProfit)} prefix={grossProfit < 0 ? '-₹' : '₹'} valueStyle={{ color: grossProfit >= 0 ? '#15803d' : '#cf1322' }} />
            <Tag color={grossMargin >= 20 ? 'green' : grossMargin >= 10 ? 'orange' : 'red'}>{grossMargin}% margin</Tag>
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card style={{ background: '#fff7ed', border: '1px solid #fed7aa' }}>
            <Statistic title="Total Expenses" value={totalExpenses} prefix="₹" valueStyle={{ color: '#c2410c' }} />
            <Text type="secondary" style={{ fontSize: 12 }}>{plExpenses.length} entries</Text>
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card style={{ background: netProfit >= 0 ? '#f0fdf4' : '#fff1f0', border: `1px solid ${netProfit >= 0 ? '#86efac' : '#fca5a5'}` }}>
            <Statistic title="Net Profit / Loss" value={Math.abs(netProfit)} prefix={netProfit < 0 ? '-₹' : '₹'} valueStyle={{ color: netProfit >= 0 ? '#15803d' : '#dc2626', fontSize: 26, fontWeight: 800 }} />
            <Tag color={netMargin >= 15 ? 'green' : netMargin >= 5 ? 'orange' : 'red'}>{netMargin}% net margin</Tag>
          </Card>
        </Col>
      </Row>
      <Card title={<Space><BarChartOutlined />P&L Statement — {dateRange[0].format('DD MMM YYYY')} to {dateRange[1].format('DD MMM YYYY')}</Space>}>
        <PLRow label="REVENUE" value={revenueExGST} bold color="#0369a1" />
        <PLRow label="Invoice Revenue (ex-GST)" value={revenueExGST} indent />
        <PLRow label="GST Collected (liability, not income)" value={gstCollected} indent color="#6366f1" />
        <Divider style={{ margin: '6px 0' }} />
        <PLRow label="COST OF GOODS SOLD (COGS)" value={cogs} bold color="#c2410c" />
        <PLRow label="Estimated purchase cost of items sold" value={cogs} indent />
        <Divider style={{ margin: '6px 0' }} />
        <PLRow label="GROSS PROFIT" value={grossProfit} bold border color={grossProfit >= 0 ? '#15803d' : '#dc2626'} />
        <Divider style={{ margin: '6px 0' }} />
        <PLRow label="OPERATING EXPENSES" value={totalExpenses} bold color="#c2410c" />
        {Object.entries(expenseByCategory).map(([cat, amt]) => (
          <PLRow key={cat} label={cat} value={amt} indent />
        ))}
        {plExpenses.length === 0 && <Text type="secondary" style={{ padding: '8px 24px', display: 'block' }}>No expenses recorded for this period</Text>}
        <Divider style={{ margin: '6px 0' }} />
        <PLRow label="NET PROFIT / LOSS" value={netProfit} bold border color={netProfit >= 0 ? '#15803d' : '#dc2626'} />
        <div style={{ marginTop: 16, padding: '12px 16px', background: '#f9fafb', borderRadius: 8 }}>
          <Text type="secondary" style={{ fontSize: 12 }}>
            💡 COGS is estimated at 70% of selling price for items without a recorded purchase price. Set purchase prices in your product catalog for accurate P&L.
          </Text>
        </div>
      </Card>
    </div>
  );

  // ── Product Sales Tab ──
  const totalProductRevenue = productSalesData.reduce((s, p) => s + p.revenue, 0);
  const productColumns = [
    { title: '#', key: 'rank', width: 50, render: (_, __, i) => <Text type="secondary">{i + 1}</Text> },
    { title: 'Product', dataIndex: 'name', key: 'name', render: t => <Text strong>{t}</Text>, ellipsis: true },
    { title: 'Qty Sold', dataIndex: 'qtySold', key: 'qtySold', width: 100, align: 'center', sorter: (a, b) => b.qtySold - a.qtySold, render: v => <Tag color="blue">{v}</Tag> },
    { title: 'Discount Given', dataIndex: 'discount', key: 'discount', width: 130, align: 'right', render: v => v > 0 ? <Text type="danger">-₹{Math.round(v).toLocaleString('en-IN')}</Text> : '-' },
    { title: 'Revenue', dataIndex: 'revenue', key: 'revenue', width: 130, align: 'right', render: v => <Text strong style={{ color: '#15803d' }}>₹{Math.round(v).toLocaleString('en-IN')}</Text>, sorter: (a, b) => b.revenue - a.revenue },
  ];

  const printProductReport = () => {
    const shopName = localStorage.getItem('current_shop_name') || 'My Shop';
    const win = window.open('', '_blank', 'width=900,height=700');
    const html = `<html><head><title>Product Sales Report</title>
      <style>body{font-family:Arial;margin:20px}table{width:100%;border-collapse:collapse}th,td{border:1px solid #ddd;padding:8px;text-align:left}th{background:#f3f4f6}.header{text-align:center;border-bottom:2px solid #333;padding-bottom:12px;margin-bottom:20px}</style></head>
      <body>
      <div class="header"><h1>${shopName}</h1><h2>Product Sales Report</h2><div>${dateRange[0].format('DD/MM/YYYY')} to ${dateRange[1].format('DD/MM/YYYY')}</div></div>
      <table><thead><tr><th>#</th><th>Product</th><th>Qty Sold</th><th>Discount Given</th><th>Revenue</th></tr></thead>
      <tbody>${productSalesData.map((p, i) => `<tr><td>${i + 1}</td><td><b>${p.name}</b></td><td>${p.qtySold}</td><td>₹${Math.round(p.discount).toLocaleString('en-IN')}</td><td><b>₹${Math.round(p.revenue).toLocaleString('en-IN')}</b></td></tr>`).join('')}</tbody>
      <tfoot><tr><td colspan="4"><b>TOTAL</b></td><td><b>₹${Math.round(totalProductRevenue).toLocaleString('en-IN')}</b></td></tr></tfoot>
      </table>
      <div style="text-align:center;margin-top:30px;font-size:11px;color:#666">Generated by Khata Manager Pro • ${dayjs().format('DD/MM/YYYY hh:mm A')}</div>
      <script>window.onload=()=>window.print();</script></body></html>`;
    win.document.write(html);
    win.document.close();
  };

  const productTab = (
    <div>
      <DateFilter />
      {productSalesData.length === 0 ? (
        <Empty description="No sales data for selected period" style={{ marginTop: 50 }} />
      ) : (
        <>
          <Row gutter={[16, 16]} style={{ marginBottom: 20 }}>
            <Col xs={24} sm={12} lg={6}>
              <Card style={{ background: '#f0fdf4', border: '1px solid #bbf7d0' }}>
                <Statistic title="Unique Products Sold" value={productSalesData.length} prefix={<ShoppingOutlined />} valueStyle={{ color: '#15803d' }} />
              </Card>
            </Col>
            <Col xs={24} sm={12} lg={6}>
              <Card>
                <Statistic title="Total Product Revenue" value={Math.round(totalProductRevenue)} prefix="₹" valueStyle={{ color: '#0369a1' }} />
              </Card>
            </Col>
            <Col xs={24} sm={12} lg={6}>
              <Card>
                <Text type="secondary" style={{ fontSize: 12 }}>TOP SELLING (by qty)</Text>
                <div style={{ marginTop: 4 }}><Text strong style={{ fontSize: 15 }}>{productSalesData[0]?.name || '-'}</Text></div>
                {productSalesData[0] && <Tag color="blue" style={{ marginTop: 4 }}>{productSalesData[0].qtySold} units sold</Tag>}
              </Card>
            </Col>
            <Col xs={24} sm={12} lg={6}>
              <Card>
                <Text type="secondary" style={{ fontSize: 12 }}>HIGHEST REVENUE</Text>
                <div style={{ marginTop: 4 }}><Text strong style={{ fontSize: 15 }}>{productSalesData[0]?.name || '-'}</Text></div>
                {productSalesData[0] && <Tag color="green" style={{ marginTop: 4 }}>₹{Math.round(productSalesData[0].revenue).toLocaleString('en-IN')}</Tag>}
              </Card>
            </Col>
          </Row>
          <Card
            title={<Space><BarChartOutlined />Product-wise Sales ({plInvoices.length} invoices in period)</Space>}
            extra={<Button icon={<PrinterOutlined />} size="small" onClick={printProductReport}>Print Report</Button>}
          >
            <Table
              columns={productColumns}
              dataSource={productSalesData}
              rowKey="name"
              pagination={{ pageSize: 20 }}
              size="small"
              summary={data => (
                <Table.Summary.Row>
                  <Table.Summary.Cell colSpan={3} index={0}><Text strong>Total</Text></Table.Summary.Cell>
                  <Table.Summary.Cell index={3} align="right"><Text type="danger">-₹{Math.round(data.reduce((s, r) => s + r.discount, 0)).toLocaleString('en-IN')}</Text></Table.Summary.Cell>
                  <Table.Summary.Cell index={4} align="right"><Text strong style={{ color: '#15803d' }}>₹{Math.round(data.reduce((s, r) => s + r.revenue, 0)).toLocaleString('en-IN')}</Text></Table.Summary.Cell>
                </Table.Summary.Row>
              )}
            />
          </Card>
        </>
      )}
    </div>
  );

  // ── End of Day Tab ──
  const eodInvColumns = [
    { title: 'Invoice', dataIndex: 'invoiceNumber', key: 'inv', width: 130, render: (v, r) => <Text strong>{v || `#${r.id?.slice(-6)}`}</Text> },
    { title: 'Time', dataIndex: 'date', key: 'time', width: 80, render: v => dayjs(v).format('HH:mm') },
    { title: 'Customer', key: 'cust', render: (_, r) => r.customerName || 'Walk-in', ellipsis: true },
    { title: 'Mode', dataIndex: 'paymentMode', key: 'mode', width: 90, render: v => <Tag color={v === 'cash' ? 'green' : v === 'online' ? 'blue' : 'orange'}>{(v || 'cash').toUpperCase()}</Tag> },
    { title: 'Total', dataIndex: 'total', key: 'total', width: 100, align: 'right', render: v => <Text strong>₹{v}</Text> },
  ];

  const eodTab = (
    <div>
      <Card style={{ marginBottom: 20 }}>
        <Space wrap>
          <Text strong><CalendarOutlined /> Select Day:</Text>
          <DatePicker value={eodDate} onChange={d => d && setEodDate(d)} format="DD/MM/YYYY" size="large" />
          <Button onClick={() => setEodDate(dayjs())}>Today</Button>
          <Button onClick={() => setEodDate(dayjs().subtract(1, 'day'))}>Yesterday</Button>
          <Button type="primary" icon={<PrinterOutlined />} onClick={printEodReport}>Print Day Report</Button>
        </Space>
      </Card>

      <Row gutter={[16, 16]} style={{ marginBottom: 20 }}>
        <Col xs={12} sm={8} lg={4}>
          <Card style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 26, fontWeight: 800, color: '#15803d' }}>₹{eodRevenue.toLocaleString('en-IN')}</div>
            <Text type="secondary">Total Sales ({eodInvoices.length} bills)</Text>
          </Card>
        </Col>
        <Col xs={12} sm={8} lg={4}>
          <Card style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 20, fontWeight: 700, color: '#15803d' }}>₹{eodCashBills.reduce((s, i) => s + (i.total || 0), 0).toLocaleString('en-IN')}</div>
            <Text type="secondary">Cash ({eodCashBills.length})</Text>
          </Card>
        </Col>
        <Col xs={12} sm={8} lg={4}>
          <Card style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 20, fontWeight: 700, color: '#1d4ed8' }}>₹{eodOnlineBills.reduce((s, i) => s + (i.total || 0), 0).toLocaleString('en-IN')}</div>
            <Text type="secondary">Online ({eodOnlineBills.length})</Text>
          </Card>
        </Col>
        <Col xs={12} sm={8} lg={4}>
          <Card style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 20, fontWeight: 700, color: '#c2410c' }}>₹{eodCreditBills.reduce((s, i) => s + (i.total || 0), 0).toLocaleString('en-IN')}</div>
            <Text type="secondary">Credit ({eodCreditBills.length})</Text>
          </Card>
        </Col>
        <Col xs={12} sm={8} lg={4}>
          <Card style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 20, fontWeight: 700, color: '#b45309' }}>-₹{Math.round(eodDiscount).toLocaleString('en-IN')}</div>
            <Text type="secondary">Discounts</Text>
          </Card>
        </Col>
        <Col xs={12} sm={8} lg={4}>
          <Card style={{ textAlign: 'center', background: eodNet >= 0 ? '#f0fdf4' : '#fff1f0' }}>
            <div style={{ fontSize: 20, fontWeight: 800, color: eodNet >= 0 ? '#15803d' : '#dc2626' }}>₹{Math.abs(eodNet).toLocaleString('en-IN')}</div>
            <Text type="secondary">Net Cash (after exp.)</Text>
          </Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]}>
        <Col xs={24} lg={16}>
          <Card title={`🧾 Bills on ${eodDate.format('DD MMM YYYY')} (${eodInvoices.length})`}>
            {eodInvoices.length === 0 ? <Empty description="No bills on this day" /> : (
              <Table
                columns={eodInvColumns}
                dataSource={eodInvoices}
                rowKey="id"
                size="small"
                pagination={{ pageSize: 10 }}
                summary={() => (
                  <Table.Summary.Row>
                    <Table.Summary.Cell colSpan={4} index={0}><Text strong>Total</Text></Table.Summary.Cell>
                    <Table.Summary.Cell index={4} align="right"><Text strong style={{ color: '#15803d' }}>₹{eodRevenue.toLocaleString('en-IN')}</Text></Table.Summary.Cell>
                  </Table.Summary.Row>
                )}
              />
            )}
          </Card>
        </Col>
        <Col xs={24} lg={8}>
          <Card title={`💸 Expenses on ${eodDate.format('DD MMM YYYY')}`}>
            {eodExpenses.length === 0 ? <Empty description="No expenses today" /> : (
              eodExpenses.map(e => (
                <div key={e.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #f0f0f0' }}>
                  <div>
                    <Text strong>{e.category || 'Other'}</Text>
                    {e.description && <div style={{ fontSize: 12, color: '#888' }}>{e.description}</div>}
                  </div>
                  <Text type="danger" strong>-₹{Number(e.amount || 0).toLocaleString('en-IN')}</Text>
                </div>
              ))
            )}
            {eodExpenses.length > 0 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 12, paddingTop: 8, borderTop: '2px solid #333' }}>
                <Text strong>Total</Text>
                <Text strong type="danger">-₹{eodExpenseTotal.toLocaleString('en-IN')}</Text>
              </div>
            )}
          </Card>
        </Col>
      </Row>
    </div>
  );

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <Title level={2}>{language === 'hi' ? '📊 रिपोर्ट और विश्लेषण' : '📊 Reports & Analytics'}</Title>
        <Button type="primary" icon={<DownloadOutlined />} onClick={exportReport}>
          {language === 'hi' ? 'रिपोर्ट डाउनलोड करें' : 'Export Report'}
        </Button>
      </div>
      <Tabs
        defaultActiveKey="khata"
        size="large"
        items={[
          { key: 'khata', label: '📒 Khata Report', children: khataTab },
          { key: 'pl', label: '📈 Profit & Loss', children: plTab },
          { key: 'products', label: '🛍️ Product Sales', children: productTab },
          { key: 'eod', label: '📅 End of Day', children: eodTab },
        ]}
      />
    </div>
  );
};

export default Reports;
