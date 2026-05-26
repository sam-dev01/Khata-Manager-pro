import React, { useRef } from 'react';
import { Button, Card, Table, Typography, Divider, Space, Tag } from 'antd';
import { PrinterOutlined, WhatsAppOutlined, ArrowLeftOutlined, ShopOutlined, FileTextOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';

const { Title, Text } = Typography;

const CustomerStatement = ({ customer, transactions, shopName, onBack }) => {
    if (!customer) return null;

    // Filter transactions for this customer
    const customerTxns = transactions
        .filter(t => t.customerId === customer.id)
        .sort((a, b) => new Date(b.date) - new Date(a.date)); // Newest first for view, but maybe Oldest first for statement? 
    // Statements are usually oldest to newest to show running balance. 
    // Let's do Oldest First for the table loop to calculate running balance.

    const sortedForStatement = [...customerTxns].sort((a, b) => new Date(a.date) - new Date(b.date));

    let runningBalance = 0;
    const dataWithBalance = sortedForStatement.map(t => {
        if (t.type === 'credit') runningBalance += t.amount; // Udhaar increases balance
        else runningBalance -= t.amount; // Payment decreases balance
        return { ...t, runningBalance };
    });

    const totalDue = runningBalance; // Final balance

    const handlePrint = () => {
        window.print();
    };

    const handlePrintLedger = () => {
        const sName = shopName || localStorage.getItem('current_shop_name') || 'My Shop';
        const totalCredit = sortedForStatement.filter(t => t.type === 'credit').reduce((s, t) => s + t.amount, 0);
        const totalDebit = sortedForStatement.filter(t => t.type === 'debit').reduce((s, t) => s + t.amount, 0);
        const html = `<html><head><title>Ledger - ${customer.name}</title>
          <style>
            body{font-family:Arial,sans-serif;margin:24px;color:#111;font-size:13px}
            h1{font-size:22px;margin:0}h2{margin:6px 0;font-size:14px;font-weight:normal}
            .header{text-align:center;border-bottom:2px solid #333;padding-bottom:12px;margin-bottom:20px}
            .info{display:flex;justify-content:space-between;margin-bottom:20px}
            table{width:100%;border-collapse:collapse;margin-bottom:16px}
            th{background:#f3f4f6;padding:7px 10px;text-align:left;border:1px solid #d1d5db;font-size:12px}
            td{padding:6px 10px;border:1px solid #e5e7eb;font-size:12px}
            .credit{color:#c2410c}.debit{color:#15803d}.balance{font-weight:700}
            .total-row{background:#f9fafb;font-weight:bold}
            .footer{text-align:center;margin-top:32px;border-top:1px solid #e5e7eb;padding-top:12px;font-size:11px;color:#666}
            .summary-box{display:flex;gap:20px;margin-bottom:20px}
            .box{flex:1;border:1px solid #e5e7eb;border-radius:6px;padding:10px;text-align:center}
            .box-val{font-size:18px;font-weight:800;margin-top:4px}
            @media print{body{margin:10px}}
          </style></head><body>
          <div class="header">
            <h1>${sName}</h1>
            <h2>Customer Account Statement</h2>
            <div style="font-size:12px;color:#555">Printed: ${dayjs().format('DD MMMM YYYY, hh:mm A')}</div>
          </div>
          <div class="info">
            <div>
              <div style="font-size:11px;color:#888;margin-bottom:2px">ACCOUNT HOLDER</div>
              <div style="font-size:17px;font-weight:700">${customer.name}</div>
              <div>${customer.village || ''}</div>
              <div>${customer.phone || ''}</div>
            </div>
            <div style="text-align:right">
              <div style="font-size:11px;color:#888;margin-bottom:2px">TOTAL BALANCE DUE</div>
              <div style="font-size:26px;font-weight:800;color:${totalDue > 0 ? '#dc2626' : '#15803d'}">₹${totalDue.toLocaleString('en-IN')}</div>
              <div style="font-size:11px;color:#888">${totalDue > 0 ? 'Customer owes you' : 'No dues'}</div>
            </div>
          </div>
          <div class="summary-box">
            <div class="box"><div style="font-size:11px;color:#888">TOTAL CREDIT (UDHARI)</div><div class="box-val" style="color:#dc2626">₹${totalCredit.toLocaleString('en-IN')}</div></div>
            <div class="box"><div style="font-size:11px;color:#888">TOTAL PAYMENTS RECEIVED</div><div class="box-val" style="color:#15803d">₹${totalDebit.toLocaleString('en-IN')}</div></div>
            <div class="box"><div style="font-size:11px;color:#888">TRANSACTIONS</div><div class="box-val">${sortedForStatement.length}</div></div>
          </div>
          <table>
            <thead><tr><th>#</th><th>Date</th><th>Description</th><th style="text-align:right">Credit (Udhari)</th><th style="text-align:right">Payment</th><th style="text-align:right">Balance</th></tr></thead>
            <tbody>
            ${dataWithBalance.map((t, i) => `<tr>
              <td>${i + 1}</td>
              <td>${dayjs(t.date).format('DD/MM/YYYY')}</td>
              <td>${t.notes || (t.type === 'credit' ? 'Items Purchased' : 'Payment Received')}</td>
              <td style="text-align:right" class="credit">${t.type === 'credit' ? '₹' + t.amount.toLocaleString('en-IN') : '-'}</td>
              <td style="text-align:right" class="debit">${t.type === 'debit' ? '₹' + t.amount.toLocaleString('en-IN') : '-'}</td>
              <td style="text-align:right" class="balance">₹${t.runningBalance.toLocaleString('en-IN')}</td>
            </tr>`).join('')}
            </tbody>
            <tfoot><tr class="total-row">
              <td colspan="3"><b>CLOSING BALANCE</b></td>
              <td style="text-align:right;color:#dc2626">₹${totalCredit.toLocaleString('en-IN')}</td>
              <td style="text-align:right;color:#15803d">₹${totalDebit.toLocaleString('en-IN')}</td>
              <td style="text-align:right;font-size:15px">₹${totalDue.toLocaleString('en-IN')}</td>
            </tr></tfoot>
          </table>
          <div class="footer">
            <div>Generated by Khata Manager Pro • ${sName}</div>
            <div style="margin-top:4px">This is a computer generated statement and does not require a signature.</div>
          </div>
          <script>window.onload=()=>window.print();</script>
          </body></html>`;
        const win = window.open('', '_blank', 'width=900,height=720');
        win.document.write(html);
        win.document.close();
    };

    const handleShare = () => {
        const text = `*Khata Statement for ${customer.name}*\n` +
            `Shop: ${shopName}\n\n` +
            `Total Due: ₹${totalDue}\n` +
            `Last Payment: ${customerTxns.find(t => t.type === 'debit') ? '₹' + customerTxns.find(t => t.type === 'debit').amount + ' on ' + dayjs(customerTxns.find(t => t.type === 'debit').date).format('DD/MM') : 'None'}\n\n` +
            `Please pay the outstanding amount soon. Thank you!`;

        const url = `https://wa.me/${customer.phone}?text=${encodeURIComponent(text)}`;
        window.open(url, '_blank');
    };

    const columns = [
        {
            title: 'Date',
            dataIndex: 'date',
            key: 'date',
            render: (d) => dayjs(d).format('DD MMM YYYY'),
        },
        {
            title: 'Description',
            dataIndex: 'notes',
            key: 'notes',
            render: (text, record) => text || (record.type === 'credit' ? 'Items Purchased' : 'Payment Received'),
        },
        {
            title: 'Debit (-)',
            key: 'debit',
            render: (text, record) => record.type === 'debit' ? `₹${record.amount}` : '-',
            align: 'right',
            className: 'text-green'
        },
        {
            title: 'Credit (+)',
            key: 'credit',
            render: (text, record) => record.type === 'credit' ? `₹${record.amount}` : '-',
            align: 'right',
            className: 'text-red'
        },
        {
            title: 'Balance',
            dataIndex: 'runningBalance',
            key: 'balance',
            render: (bal) => <Text strong>₹{bal}</Text>,
            align: 'right',
        },
    ];

    return (
        <div className="statement-page">
            {/* NO-PRINT HEADER */}
            <div className="no-print" style={{ marginBottom: 20, display: 'flex', justifyContent: 'space-between' }}>
                <Button icon={<ArrowLeftOutlined />} onClick={onBack}>Back to List</Button>
                <Space>
                    <Button icon={<WhatsAppOutlined />} style={{ background: '#25D366', color: 'white', borderColor: '#25D366' }} onClick={handleShare}>Share on WhatsApp</Button>
                    <Button icon={<FileTextOutlined />} onClick={handlePrintLedger}>Print Ledger (A4)</Button>
                    <Button type="primary" icon={<PrinterOutlined />} onClick={handlePrint}>Print / Save PDF</Button>
                </Space>
            </div>

            {/* PRINTABLE AREA */}
            <Card className="print-area" bordered={false} style={{ maxWidth: 800, margin: '0 auto', boxShadow: '0 0 20px rgba(0,0,0,0.1)' }}>

                {/* Header */}
                <div style={{ textAlign: 'center', marginBottom: 40, borderBottom: '2px solid #f0f0f0', paddingBottom: 20 }}>
                    <ShopOutlined style={{ fontSize: 48, color: '#1890ff', marginBottom: 10 }} />
                    <Title level={2} style={{ margin: 0 }}>{shopName || 'My Shop'}</Title>
                    <Text type="secondary">Official Account Statement</Text>
                </div>

                {/* Info Grid */}
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 40 }}>
                    <div>
                        <Text type="secondary" style={{ fontSize: 12 }}>BILLED TO</Text><br />
                        <Title level={4} style={{ margin: '4px 0' }}>{customer.name}</Title>
                        <Text>{customer.village || 'General Customer'}</Text><br />
                        <Text>{customer.phone}</Text>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                        <Text type="secondary" style={{ fontSize: 12 }}>STATEMENT DATE</Text><br />
                        <Text strong>{dayjs().format('DD MMM YYYY')}</Text><br />
                        <br />
                        <Text type="secondary" style={{ fontSize: 12 }}>TOTAL DUE AMOUNT</Text><br />
                        <Title level={3} style={{ margin: 0, color: totalDue > 0 ? '#ff4d4f' : '#52c41a' }}>₹{totalDue}</Title>
                    </div>
                </div>

                {/* Transaction Table */}
                <Table
                    dataSource={dataWithBalance.slice().reverse()} // Show newest first on the paper? No, usually statement is chronological. Let's keep chronological.
                    // Actually, let's keep it defined by the `dataWithBalance` which is sorted Old->New. 
                    // But standard for views is New->Old.
                    // Let's stick to chronological (Old -> New) so running balance makes sense visually reading down.
                    // Wait, 'dataWithBalance' IS chronological.
                    columns={columns}
                    pagination={false}
                    rowKey="id"
                    size="middle"
                    bordered
                />

                {/* Footer */}
                <div style={{ marginTop: 60, textAlign: 'center', paddingTop: 20, borderTop: '1px solid #f0f0f0' }}>
                    <Text type="secondary">Generated by Khata Manager Pro • {dayjs().format('DD/MM/YYYY hh:mm A')}</Text>
                    <br />
                    <Text type="secondary" style={{ fontSize: 10 }}>Thank you for your business!</Text>
                </div>

            </Card>

            {/* Print Styles */}
            <style>{`
        @media print {
          body * {
            visibility: hidden;
          }
          .statement-page, .statement-page * {
            visibility: visible;
          }
          .statement-page {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
          }
          .no-print {
            display: none !important;
          }
          .ant-card {
            box-shadow: none !important;
            border: none !important;
          }
          /* Ensure colors print */
          .text-red { color: #ff4d4f !important; -webkit-print-color-adjust: exact; }
          .text-green { color: #52c41a !important; -webkit-print-color-adjust: exact; }
        }
      `}</style>
        </div>
    );
};

export default CustomerStatement;
