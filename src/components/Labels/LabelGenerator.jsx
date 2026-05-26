import React, { useState, useMemo, useRef } from 'react';
import {
    Card, Row, Col, Select, Input, InputNumber, Button, Slider, Switch,
    Typography, Space, Divider, Tag, Table, Checkbox, Modal, message,
    Tabs, ColorPicker, Tooltip, Badge, Empty, Radio
} from 'antd';
import {
    PrinterOutlined, TagOutlined, SettingOutlined, BarcodeOutlined,
    AppstoreOutlined, CheckOutlined, SearchOutlined, CopyOutlined,
    DownloadOutlined, EyeOutlined, PlusOutlined, MinusOutlined
} from '@ant-design/icons';
import Barcode from 'react-barcode';

const { Title, Text } = Typography;
const { Option } = Select;

// ── Template Definitions ───────────────────────────────────────────────────────
const TEMPLATES = [
    { id: 'classic', name: 'Classic Price Tag', icon: '🏷️', desc: 'Clean minimal design' },
    { id: 'modern', name: 'Modern Bold', icon: '⚡', desc: 'Bold prices, vibrant' },
    { id: 'retail', name: 'Retail Store', icon: '🏪', desc: 'Professional retail style' },
    { id: 'luxury', name: 'Luxury Premium', icon: '💎', desc: 'Gold accents, elegant' },
    { id: 'minimal', name: 'Minimal Clean', icon: '✨', desc: 'White space, modern' },
    { id: 'grocery', name: 'Grocery/Kirana', icon: '🛒', desc: 'Hindi/English, bold' },
    { id: 'barcode_focus', name: 'Barcode Focus', icon: '📊', desc: 'Barcode prominently' },
    { id: 'sale', name: 'Sale / Offer Tag', icon: '🔥', desc: 'Highlight discounts' },
    { id: 'jewelry', name: 'Jewelry Tag', icon: '💍', desc: 'Small, elegant, string-hole' },
];

// ── Barcode Renderer ───────────────────────────────────────────────────────────
function BarcodeImg({ value, width = 1, height = 28, fontSize = 8, background = 'transparent' }) {
    if (!value) return null;
    try {
        return (
            <Barcode
                value={String(value)}
                format="CODE128"
                width={width}
                height={height}
                fontSize={fontSize}
                margin={2}
                background={background}
                displayValue={true}
            />
        );
    } catch {
        return null;
    }
}

// ── Individual Label Templates ─────────────────────────────────────────────────
function LabelClassic({ product, config }) {
    const { shopName, showBarcode, showCategory, labelSize, primaryColor, showMRP, mrpPrice, currency } = config;
    const [w, h] = getLabelDimensions(labelSize);
    return (
        <div style={{
            width: w, height: h, background: '#fff', border: `2px solid ${primaryColor}`,
            borderRadius: 6, padding: 8, display: 'flex', flexDirection: 'column',
            justifyContent: 'space-between', fontFamily: 'Arial, sans-serif',
            boxSizing: 'border-box', overflow: 'hidden', position: 'relative'
        }}>
            {shopName && (
                <div style={{ fontSize: 7, color: primaryColor, fontWeight: 700, textAlign: 'center', letterSpacing: 1, textTransform: 'uppercase', borderBottom: `1px solid ${primaryColor}`, paddingBottom: 3, marginBottom: 3 }}>
                    {shopName}
                </div>
            )}
            {showCategory && product.category && (
                <div style={{ fontSize: 7, color: '#888', textAlign: 'center' }}>{product.category}</div>
            )}
            <div style={{ fontSize: h > 100 ? 11 : 9, fontWeight: 700, color: '#111', textAlign: 'center', lineHeight: 1.2, flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {product.name}
            </div>
            <div style={{ textAlign: 'center' }}>
                {showMRP && mrpPrice && (
                    <div style={{ fontSize: 8, color: '#999', textDecoration: 'line-through' }}>{currency}{mrpPrice}</div>
                )}
                <div style={{ fontSize: h > 100 ? 20 : 16, fontWeight: 900, color: primaryColor }}>
                    {currency}{product.price}
                </div>
            </div>
            {showBarcode && product.barcode && (
                <div style={{ textAlign: 'center', marginTop: 2 }}>
                    <BarcodeImg value={product.barcode} height={20} width={0.9} fontSize={7} />
                </div>
            )}
        </div>
    );
}

function LabelModern({ product, config }) {
    const { shopName, showBarcode, showCategory, labelSize, primaryColor, showMRP, mrpPrice, currency } = config;
    const [w, h] = getLabelDimensions(labelSize);
    return (
        <div style={{
            width: w, height: h, background: primaryColor, borderRadius: 8,
            padding: 8, display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
            fontFamily: 'Arial, sans-serif', boxSizing: 'border-box', overflow: 'hidden'
        }}>
            {shopName && (
                <div style={{ fontSize: 7, color: 'rgba(255,255,255,0.8)', fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase' }}>
                    {shopName}
                </div>
            )}
            <div>
                {showCategory && product.category && (
                    <div style={{ fontSize: 7, color: 'rgba(255,255,255,0.7)', marginBottom: 2, background: 'rgba(0,0,0,0.15)', display: 'inline-block', borderRadius: 3, padding: '1px 4px' }}>{product.category}</div>
                )}
                <div style={{ fontSize: h > 100 ? 12 : 10, fontWeight: 700, color: '#fff', lineHeight: 1.2, marginTop: 2 }}>
                    {product.name}
                </div>
            </div>
            <div style={{ background: '#fff', borderRadius: 6, padding: '4px 8px', textAlign: 'center' }}>
                {showMRP && mrpPrice && <div style={{ fontSize: 7, color: '#999', textDecoration: 'line-through' }}>{currency}{mrpPrice}</div>}
                <div style={{ fontSize: h > 100 ? 22 : 18, fontWeight: 900, color: primaryColor }}>{currency}{product.price}</div>
            </div>
            {showBarcode && product.barcode && (
                <div style={{ background: '#fff', borderRadius: 4, padding: 2, marginTop: 2 }}>
                    <BarcodeImg value={product.barcode} height={16} width={0.8} fontSize={6} />
                </div>
            )}
        </div>
    );
}

function LabelRetail({ product, config }) {
    const { shopName, showBarcode, showCategory, labelSize, primaryColor, showMRP, mrpPrice, currency } = config;
    const [w, h] = getLabelDimensions(labelSize);
    return (
        <div style={{
            width: w, height: h, background: '#f8f9fa', border: '1px solid #dee2e6',
            borderRadius: 4, fontFamily: 'Arial, sans-serif', boxSizing: 'border-box',
            overflow: 'hidden', display: 'flex', flexDirection: 'column'
        }}>
            <div style={{ background: primaryColor, padding: '4px 8px', textAlign: 'center' }}>
                {shopName && <div style={{ fontSize: 7, color: '#fff', fontWeight: 700, letterSpacing: 1 }}>{shopName}</div>}
                {showCategory && product.category && <div style={{ fontSize: 6, color: 'rgba(255,255,255,0.8)' }}>{product.category}</div>}
            </div>
            <div style={{ flex: 1, padding: 6, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                <div style={{ fontSize: h > 100 ? 11 : 9, fontWeight: 700, color: '#212529', textAlign: 'center', lineHeight: 1.2 }}>{product.name}</div>
                <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'baseline', gap: 6 }}>
                    {showMRP && mrpPrice && <span style={{ fontSize: 8, color: '#adb5bd', textDecoration: 'line-through' }}>{currency}{mrpPrice}</span>}
                    <span style={{ fontSize: h > 100 ? 22 : 17, fontWeight: 900, color: primaryColor }}>{currency}{product.price}</span>
                </div>
                {showBarcode && product.barcode && <BarcodeImg value={product.barcode} height={18} width={0.9} fontSize={6} />}
            </div>
        </div>
    );
}

function LabelLuxury({ product, config }) {
    const { shopName, showBarcode, showCategory, labelSize, primaryColor, showMRP, mrpPrice, currency } = config;
    const [w, h] = getLabelDimensions(labelSize);
    const gold = '#c9a84c';
    return (
        <div style={{
            width: w, height: h, background: '#1a1a2e', border: `2px solid ${gold}`,
            borderRadius: 6, padding: 8, display: 'flex', flexDirection: 'column',
            justifyContent: 'space-between', fontFamily: 'Georgia, serif', boxSizing: 'border-box', overflow: 'hidden'
        }}>
            <div style={{ textAlign: 'center', borderBottom: `1px solid ${gold}`, paddingBottom: 4 }}>
                {shopName && <div style={{ fontSize: 7, color: gold, letterSpacing: 2, textTransform: 'uppercase' }}>{shopName}</div>}
                {showCategory && product.category && <div style={{ fontSize: 6, color: 'rgba(201,168,76,0.6)' }}>{product.category}</div>}
            </div>
            <div style={{ textAlign: 'center', flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <div style={{ fontSize: h > 100 ? 11 : 9, color: '#f0e6ca', fontStyle: 'italic', lineHeight: 1.3 }}>{product.name}</div>
            </div>
            <div style={{ textAlign: 'center', borderTop: `1px solid ${gold}`, paddingTop: 4 }}>
                {showMRP && mrpPrice && <div style={{ fontSize: 7, color: 'rgba(201,168,76,0.6)', textDecoration: 'line-through' }}>{currency}{mrpPrice}</div>}
                <div style={{ fontSize: h > 100 ? 20 : 16, fontWeight: 700, color: gold }}>{currency}{product.price}</div>
            </div>
            {showBarcode && product.barcode && (
                <div style={{ background: '#fff', borderRadius: 3, padding: 2, marginTop: 2 }}>
                    <BarcodeImg value={product.barcode} height={14} width={0.8} fontSize={6} />
                </div>
            )}
        </div>
    );
}

function LabelMinimal({ product, config }) {
    const { shopName, showBarcode, labelSize, primaryColor, showMRP, mrpPrice, currency } = config;
    const [w, h] = getLabelDimensions(labelSize);
    return (
        <div style={{
            width: w, height: h, background: '#fff', border: '1px solid #eee',
            borderRadius: 8, padding: 10, display: 'flex', flexDirection: 'column',
            justifyContent: 'space-between', fontFamily: '"Helvetica Neue", sans-serif',
            boxSizing: 'border-box', overflow: 'hidden'
        }}>
            {shopName && (
                <div style={{ fontSize: 6, color: '#bbb', letterSpacing: 2, textTransform: 'uppercase', textAlign: 'right' }}>{shopName}</div>
            )}
            <div style={{ flex: 1, display: 'flex', alignItems: 'center' }}>
                <div style={{ fontSize: h > 100 ? 11 : 9, color: '#333', lineHeight: 1.3, fontWeight: 500 }}>{product.name}</div>
            </div>
            <div>
                <div style={{ width: 30, height: 2, background: primaryColor, marginBottom: 4 }} />
                {showMRP && mrpPrice && <div style={{ fontSize: 7, color: '#ccc', textDecoration: 'line-through' }}>{currency}{mrpPrice}</div>}
                <div style={{ fontSize: h > 100 ? 20 : 16, fontWeight: 900, color: '#111', letterSpacing: -1 }}>{currency}{product.price}</div>
            </div>
            {showBarcode && product.barcode && (
                <BarcodeImg value={product.barcode} height={16} width={0.8} fontSize={6} />
            )}
        </div>
    );
}

function LabelGrocery({ product, config }) {
    const { shopName, showBarcode, labelSize, primaryColor, showMRP, mrpPrice, currency } = config;
    const [w, h] = getLabelDimensions(labelSize);
    return (
        <div style={{
            width: w, height: h, background: '#fff8e1', border: `3px solid ${primaryColor}`,
            borderRadius: 4, padding: 6, display: 'flex', flexDirection: 'column',
            justifyContent: 'space-between', fontFamily: 'Arial, sans-serif',
            boxSizing: 'border-box', overflow: 'hidden'
        }}>
            {shopName && (
                <div style={{ background: primaryColor, margin: '-6px -6px 4px -6px', padding: '3px 6px', fontSize: 7, color: '#fff', fontWeight: 700, textAlign: 'center' }}>{shopName}</div>
            )}
            <div style={{ textAlign: 'center', flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                <div style={{ fontSize: h > 100 ? 12 : 10, fontWeight: 700, color: '#222', lineHeight: 1.2 }}>{product.name}</div>
                {product.unit && <div style={{ fontSize: 7, color: '#666', marginTop: 2 }}>Per {product.unit}</div>}
            </div>
            <div style={{ textAlign: 'center', background: primaryColor, borderRadius: 4, padding: '2px 0' }}>
                {showMRP && mrpPrice && <div style={{ fontSize: 7, color: 'rgba(255,255,255,0.75)', textDecoration: 'line-through' }}>MRP {currency}{mrpPrice}</div>}
                <div style={{ fontSize: h > 100 ? 20 : 16, fontWeight: 900, color: '#fff' }}>{currency}{product.price}</div>
            </div>
            {showBarcode && product.barcode && (
                <div style={{ background: '#fff', marginTop: 3, borderRadius: 2 }}>
                    <BarcodeImg value={product.barcode} height={16} width={0.8} fontSize={6} />
                </div>
            )}
        </div>
    );
}

function LabelBarcodeFirst({ product, config }) {
    const { shopName, showBarcode, labelSize, primaryColor, showMRP, mrpPrice, currency } = config;
    const [w, h] = getLabelDimensions(labelSize);
    return (
        <div style={{
            width: w, height: h, background: '#fff', border: `1px solid #ddd`,
            borderRadius: 4, padding: 6, display: 'flex', flexDirection: 'column',
            justifyContent: 'space-between', fontFamily: 'Arial, sans-serif',
            boxSizing: 'border-box', overflow: 'hidden'
        }}>
            {shopName && (
                <div style={{ fontSize: 6, color: '#888', textAlign: 'center', textTransform: 'uppercase', letterSpacing: 1 }}>{shopName}</div>
            )}
            {showBarcode && product.barcode && (
                <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <BarcodeImg value={product.barcode} height={h > 100 ? 40 : 26} width={1.2} fontSize={8} />
                </div>
            )}
            <div style={{ textAlign: 'center', borderTop: '1px solid #eee', paddingTop: 3 }}>
                <div style={{ fontSize: 8, color: '#555', fontWeight: 500 }}>{product.name}</div>
                <div style={{ fontSize: h > 100 ? 18 : 14, fontWeight: 900, color: primaryColor, marginTop: 1 }}>{currency}{product.price}</div>
            </div>
        </div>
    );
}

function LabelSale({ product, config }) {
    const { shopName, showBarcode, labelSize, primaryColor, showMRP, mrpPrice, currency } = config;
    const [w, h] = getLabelDimensions(labelSize);
    const saving = mrpPrice && product.price ? Math.round(mrpPrice - product.price) : 0;
    const pct = mrpPrice && product.price ? Math.round((saving / mrpPrice) * 100) : 0;
    return (
        <div style={{
            width: w, height: h, background: '#ff0000', borderRadius: 8,
            padding: 6, display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
            fontFamily: 'Arial, sans-serif', boxSizing: 'border-box', overflow: 'hidden',
            position: 'relative'
        }}>
            {pct > 0 && (
                <div style={{
                    position: 'absolute', top: -2, right: -2, background: '#fff200',
                    borderRadius: '50%', width: 32, height: 32, display: 'flex', flexDirection: 'column',
                    alignItems: 'center', justifyContent: 'center', boxShadow: '0 2px 6px rgba(0,0,0,0.3)'
                }}>
                    <div style={{ fontSize: 7, fontWeight: 900, color: '#c00', lineHeight: 1 }}>{pct}%</div>
                    <div style={{ fontSize: 5, color: '#c00', fontWeight: 700 }}>OFF</div>
                </div>
            )}
            {shopName && <div style={{ fontSize: 6, color: 'rgba(255,255,255,0.8)', fontWeight: 700, letterSpacing: 1 }}>{shopName}</div>}
            <div style={{ color: '#fff', fontSize: h > 100 ? 11 : 9, fontWeight: 700, lineHeight: 1.2 }}>{product.name}</div>
            <div>
                {showMRP && mrpPrice && (
                    <div style={{ fontSize: 8, color: 'rgba(255,255,255,0.7)', textDecoration: 'line-through' }}>
                        MRP: {currency}{mrpPrice}
                    </div>
                )}
                <div style={{ background: '#fff200', borderRadius: 4, padding: '2px 6px', display: 'inline-block' }}>
                    <span style={{ fontSize: h > 100 ? 22 : 17, fontWeight: 900, color: '#c00' }}>{currency}{product.price}</span>
                </div>
                {saving > 0 && <div style={{ fontSize: 7, color: '#fff200', marginTop: 2 }}>Save {currency}{saving}!</div>}
            </div>
            {showBarcode && product.barcode && (
                <div style={{ background: '#fff', borderRadius: 3, padding: 2 }}>
                    <BarcodeImg value={product.barcode} height={14} width={0.8} fontSize={6} />
                </div>
            )}
        </div>
    );
}

function LabelJewelry({ product, config }) {
    const { shopName, showBarcode, labelSize, primaryColor, currency } = config;
    const [w, h] = getLabelDimensions(labelSize);
    return (
        <div style={{
            width: w, height: h, background: '#fffdf7', border: `1px solid ${primaryColor}`,
            borderRadius: 4, padding: 5, display: 'flex', flexDirection: 'column',
            justifyContent: 'space-between', fontFamily: 'Georgia, serif',
            boxSizing: 'border-box', overflow: 'hidden', position: 'relative'
        }}>
            {/* String hole */}
            <div style={{
                position: 'absolute', top: 4, left: '50%', transform: 'translateX(-50%)',
                width: 8, height: 8, borderRadius: '50%', border: `1.5px solid ${primaryColor}`, background: '#fff'
            }} />
            <div style={{ marginTop: 14, textAlign: 'center' }}>
                {shopName && <div style={{ fontSize: 6, color: primaryColor, letterSpacing: 1 }}>{shopName}</div>}
                <div style={{ fontSize: 8, fontWeight: 700, color: '#333', lineHeight: 1.2, marginTop: 2 }}>{product.name}</div>
            </div>
            <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: primaryColor }}>{currency}{product.price}</div>
            </div>
            {showBarcode && product.barcode && (
                <BarcodeImg value={product.barcode} height={12} width={0.7} fontSize={5} />
            )}
        </div>
    );
}

// ── Template Renderer ──────────────────────────────────────────────────────────
function LabelRenderer({ product, config }) {
    switch (config.templateId) {
        case 'classic': return <LabelClassic product={product} config={config} />;
        case 'modern': return <LabelModern product={product} config={config} />;
        case 'retail': return <LabelRetail product={product} config={config} />;
        case 'luxury': return <LabelLuxury product={product} config={config} />;
        case 'minimal': return <LabelMinimal product={product} config={config} />;
        case 'grocery': return <LabelGrocery product={product} config={config} />;
        case 'barcode_focus': return <LabelBarcodeFirst product={product} config={config} />;
        case 'sale': return <LabelSale product={product} config={config} />;
        case 'jewelry': return <LabelJewelry product={product} config={config} />;
        default: return <LabelClassic product={product} config={config} />;
    }
}

// ── Size Dimensions (px at 96dpi, scaled) ─────────────────────────────────────
function getLabelDimensions(size) {
    const sizes = {
        xs: [65, 40],
        sm: [90, 55],
        md: [120, 75],
        lg: [160, 100],
        xl: [200, 130],
        'jewelry': [70, 110],
        'shelf': [230, 50],
    };
    return sizes[size] || sizes['md'];
}

const LABEL_SIZES = [
    { value: 'xs', label: 'XS — 1.7×1.1 cm' },
    { value: 'sm', label: 'SM — 2.5×1.5 cm' },
    { value: 'md', label: 'MD — 3.5×2.2 cm (Standard)' },
    { value: 'lg', label: 'LG — 4.5×2.8 cm' },
    { value: 'xl', label: 'XL — 5.5×3.6 cm' },
    { value: 'jewelry', label: 'Jewelry Tag — 2×3 cm' },
    { value: 'shelf', label: 'Shelf Strip — 6.5×1.4 cm' },
];

// ── Main Component ─────────────────────────────────────────────────────────────
const FONTS = [
    { value: 'Arial, sans-serif', label: 'Arial (Default)' },
    { value: 'Georgia, serif', label: 'Georgia (Elegant)' },
    { value: '"Courier New", monospace', label: 'Courier (Retro)' },
    { value: 'Tahoma, sans-serif', label: 'Tahoma (Clean)' },
    { value: 'Impact, sans-serif', label: 'Impact (Bold)' },
];

export default function LabelGenerator({ products = [], language }) {
    const shopName = localStorage.getItem('current_shop_name') || localStorage.getItem('current_firm_name') || '';

    const [config, setConfig] = useState({
        templateId: 'classic',
        labelSize: 'md',
        primaryColor: '#1890ff',
        currency: '₹',
        shopName,
        showBarcode: true,
        showCategory: true,
        showMRP: false,
        mrpPrice: '',
        labelsPerRow: 4,
        copies: 1,
        fontFamily: 'Arial, sans-serif',
        showDiscount: true,
        customNote: '',
    });

    // Manual product entry
    const [manualProduct, setManualProduct] = useState(null);
    const [manualForm, setManualForm] = useState({ name: '', price: '', barcode: '', category: '', unit: '' });

    const updateConfig = (key, val) => setConfig(prev => ({ ...prev, [key]: val }));

    const applyManualProduct = () => {
        if (!manualForm.name || !manualForm.price) { message.warning('Name and price required'); return; }
        setManualProduct({ ...manualForm, id: 'manual_' + Date.now(), price: parseFloat(manualForm.price) || 0 });
        message.success('Manual product set for preview');
    };

    // Product selection
    const [selectedProductIds, setSelectedProductIds] = useState([]);
    const [searchText, setSearchText] = useState('');
    const [previewProduct, setPreviewProduct] = useState(null);
    const [printModalVisible, setPrintModalVisible] = useState(false);
    const printRef = useRef(null);

    const filteredProducts = useMemo(() =>
        products.filter(p =>
            p.name?.toLowerCase().includes(searchText.toLowerCase()) ||
            p.barcode?.includes(searchText) ||
            p.category?.toLowerCase().includes(searchText.toLowerCase())
        ), [products, searchText]);

    const selectedProducts = useMemo(() =>
        selectedProductIds.map(id => products.find(p => p.id === id)).filter(Boolean),
        [selectedProductIds, products]);

    const livePreviewProduct = previewProduct || manualProduct || selectedProducts[0] || filteredProducts[0] || {
        name: 'Sample Product', price: 99.00, barcode: '8901234567890', category: 'Category'
    };

    // ── Print Logic ──────────────────────────────────────────────────────────────
    const handlePrint = () => {
        if (selectedProducts.length === 0) {
            message.warning('Please select at least one product');
            return;
        }
        setPrintModalVisible(true);
    };

    const doPrint = () => {
        const printWindow = window.open('', '_blank', 'width=1200,height=800');
        const [lw, lh] = getLabelDimensions(config.labelSize);
        const mmW = Math.round(lw * 0.264583);
        const mmH = Math.round(lh * 0.264583);

        // Build all labels (with copies)
        const allLabels = [];
        selectedProducts.forEach(p => {
            for (let i = 0; i < config.copies; i++) allLabels.push(p);
        });

        // Serialize each label as HTML string
        // We use an iframe approach: render to hidden div, extract HTML, open in print window
        const labelsHtml = allLabels.map(p => {
            const mrp = config.showMRP ? config.mrpPrice || '' : '';
            return buildLabelHtml(p, config, lw, lh, mmW, mmH);
        }).join('');

        const cols = Math.max(1, config.labelsPerRow);
        const html = `<!DOCTYPE html><html><head><title>Print Labels</title>
      <style>
        *{box-sizing:border-box;margin:0;padding:0}
        body{font-family:Arial,sans-serif;background:#fff;padding:5mm}
        .label-grid{display:grid;grid-template-columns:repeat(${cols},${mmW}mm);gap:3mm;justify-content:start}
        .label{width:${mmW}mm;height:${mmH}mm;overflow:hidden;page-break-inside:avoid;-webkit-print-color-adjust:exact;print-color-adjust:exact;}
        @media print{body{padding:3mm}@page{margin:5mm}}
      </style>
    </head><body>
      <div class="label-grid">${labelsHtml}</div>
      <script>window.onload=()=>{setTimeout(()=>window.print(),400)}</script>
    </body></html>`;

        printWindow.document.write(html);
        printWindow.document.close();
        setPrintModalVisible(false);
    };

    // Product table columns
    const productColumns = [
        {
            title: '', key: 'sel', width: 40,
            render: (_, p) => (
                <Checkbox
                    checked={selectedProductIds.includes(p.id)}
                    onChange={e => {
                        if (e.target.checked) setSelectedProductIds(prev => [...prev, p.id]);
                        else setSelectedProductIds(prev => prev.filter(id => id !== p.id));
                    }}
                />
            )
        },
        {
            title: 'Product', key: 'name',
            render: (_, p) => (
                <div>
                    <Text strong style={{ fontSize: 13 }}>{p.name}</Text>
                    {p.category && <div style={{ fontSize: 11, color: '#888' }}>{p.category}</div>}
                </div>
            )
        },
        { title: 'Price', dataIndex: 'price', key: 'price', width: 80, render: v => <Text strong style={{ color: '#15803d' }}>{config.currency}{v}</Text> },
        {
            title: '', key: 'preview', width: 50,
            render: (_, p) => (
                <Button size="small" icon={<EyeOutlined />} onClick={() => setPreviewProduct(p)} />
            )
        }
    ];

    return (
        <div style={{ padding: '0 0 60px 0' }}>
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
                <div>
                    <Title level={3} style={{ margin: 0 }}>🏷️ Label &amp; Price Tag Generator</Title>
                    <Text type="secondary">Design, preview and print professional price labels — works offline</Text>
                </div>
                <Space wrap>
                    {selectedProductIds.length > 0 && (
                        <Tag color="blue" style={{ fontSize: 14, padding: '4px 12px' }}>
                            {selectedProductIds.length * config.copies} labels ready
                        </Tag>
                    )}
                    <Button icon={<PrinterOutlined />} type="primary" size="large" onClick={handlePrint}
                        disabled={selectedProductIds.length === 0}>
                        Print Labels {selectedProductIds.length > 0 && `(${selectedProductIds.length})`}
                    </Button>
                </Space>
            </div>

            <Row gutter={[16, 16]}>
                {/* ── LEFT: Template + Config ── */}
                <Col xs={24} lg={8}>
                    <Tabs defaultActiveKey="template" items={[
                        {
                            key: 'template',
                            label: <><AppstoreOutlined /> Template</>,
                            children: (
                                <div style={{ maxHeight: 'calc(100vh - 220px)', overflowY: 'auto', paddingRight: 4 }}>
                                    <Text type="secondary" style={{ fontSize: 12, marginBottom: 8, display: 'block' }}>Select a design template:</Text>
                                    <Row gutter={[8, 8]}>
                                        {TEMPLATES.map(t => (
                                            <Col span={12} key={t.id}>
                                                <div
                                                    onClick={() => updateConfig('templateId', t.id)}
                                                    style={{
                                                        border: `2px solid ${config.templateId === t.id ? config.primaryColor : '#e8e8e8'}`,
                                                        borderRadius: 8, padding: 10, cursor: 'pointer',
                                                        background: config.templateId === t.id ? '#f0f4ff' : '#fafafa',
                                                        transition: 'all 0.2s', position: 'relative'
                                                    }}
                                                >
                                                    {config.templateId === t.id && (
                                                        <div style={{ position: 'absolute', top: 4, right: 4, color: config.primaryColor }}><CheckOutlined /></div>
                                                    )}
                                                    <div style={{ fontSize: 20 }}>{t.icon}</div>
                                                    <div style={{ fontSize: 11, fontWeight: 700, marginTop: 2 }}>{t.name}</div>
                                                    <div style={{ fontSize: 9, color: '#888', marginTop: 1 }}>{t.desc}</div>
                                                </div>
                                            </Col>
                                        ))}
                                    </Row>
                                </div>
                            )
                        },
                        {
                            key: 'settings',
                            label: <><SettingOutlined /> Settings</>,
                            children: (
                                <div style={{ maxHeight: 'calc(100vh - 220px)', overflowY: 'auto' }}>
                                    <Space direction="vertical" style={{ width: '100%' }} size={10}>
                                        <div>
                                            <Text strong style={{ fontSize: 12 }}>Label Size</Text>
                                            <Select value={config.labelSize} onChange={v => updateConfig('labelSize', v)} style={{ width: '100%', marginTop: 4 }}>
                                                {LABEL_SIZES.map(s => <Option key={s.value} value={s.value}>{s.label}</Option>)}
                                            </Select>
                                        </div>
                                        <div>
                                            <Text strong style={{ fontSize: 12 }}>Shop Name on Label</Text>
                                            <Input value={config.shopName} onChange={e => updateConfig('shopName', e.target.value)} placeholder="Shop name..." style={{ marginTop: 4 }} size="small" />
                                        </div>
                                        <div>
                                            <Text strong style={{ fontSize: 12 }}>Font Style</Text>
                                            <Select value={config.fontFamily} onChange={v => updateConfig('fontFamily', v)} style={{ width: '100%', marginTop: 4 }} size="small">
                                                {FONTS.map(f => <Option key={f.value} value={f.value}>{f.label}</Option>)}
                                            </Select>
                                        </div>
                                        <div>
                                            <Text strong style={{ fontSize: 12 }}>Currency Symbol</Text>
                                            <Select value={config.currency} onChange={v => updateConfig('currency', v)} style={{ width: '100%', marginTop: 4 }} size="small">
                                                <Option value="₹">₹ Rupee</Option>
                                                <Option value="$">$ Dollar</Option>
                                                <Option value="€">€ Euro</Option>
                                                <Option value="£">£ Pound</Option>
                                                <Option value="">None</Option>
                                            </Select>
                                        </div>
                                        <div>
                                            <Text strong style={{ fontSize: 12 }}>Primary Color</Text>
                                            <div style={{ marginTop: 4 }}>
                                                <ColorPicker value={config.primaryColor} onChange={(c) => updateConfig('primaryColor', c.toHexString())}
                                                    presets={[{ label: 'Presets', colors: ['#1890ff','#52c41a','#fa541c','#722ed1','#eb2f96','#faad14','#c9a84c','#ff0000','#1a1a2e','#2d3748','#059669','#dc2626'] }]} />
                                            </div>
                                        </div>
                                        <div>
                                            <Text strong style={{ fontSize: 12 }}>Custom Note (small text)</Text>
                                            <Input value={config.customNote} onChange={e => updateConfig('customNote', e.target.value)} placeholder="e.g. Handmade · GST Incl." style={{ marginTop: 4 }} size="small" maxLength={30} />
                                        </div>
                                        <Divider style={{ margin: '6px 0' }} />
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                            <Text strong style={{ fontSize: 12 }}>Show Barcode</Text>
                                            <Switch checked={config.showBarcode} onChange={v => updateConfig('showBarcode', v)} size="small" />
                                        </div>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                            <Text strong style={{ fontSize: 12 }}>Show Category</Text>
                                            <Switch checked={config.showCategory} onChange={v => updateConfig('showCategory', v)} size="small" />
                                        </div>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                            <Text strong style={{ fontSize: 12 }}>Show MRP &amp; Savings</Text>
                                            <Switch checked={config.showMRP} onChange={v => updateConfig('showMRP', v)} size="small" />
                                        </div>
                                        {config.showMRP && (
                                            <div>
                                                <Text strong style={{ fontSize: 12 }}>MRP Price</Text>
                                                <InputNumber value={config.mrpPrice} onChange={v => updateConfig('mrpPrice', v)} style={{ width: '100%', marginTop: 4 }} size="small" placeholder="Enter MRP..." prefix={config.currency} />
                                                {discountPct > 0 && <Tag color="red" style={{ marginTop: 4 }}>{discountPct}% OFF auto-calculated</Tag>}
                                            </div>
                                        )}
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                            <Text strong style={{ fontSize: 12 }}>Show Discount Badge</Text>
                                            <Switch checked={config.showDiscount} onChange={v => updateConfig('showDiscount', v)} size="small" />
                                        </div>
                                        <Divider style={{ margin: '6px 0' }} />
                                        <div>
                                            <Text strong style={{ fontSize: 12 }}>Labels per Row (Print)</Text>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4 }}>
                                                <Button size="small" icon={<MinusOutlined />} onClick={() => updateConfig('labelsPerRow', Math.max(1, config.labelsPerRow - 1))} />
                                                <Text strong style={{ fontSize: 16, minWidth: 24, textAlign: 'center' }}>{config.labelsPerRow}</Text>
                                                <Button size="small" icon={<PlusOutlined />} onClick={() => updateConfig('labelsPerRow', Math.min(10, config.labelsPerRow + 1))} />
                                            </div>
                                        </div>
                                        <div>
                                            <Text strong style={{ fontSize: 12 }}>Copies per Label</Text>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4 }}>
                                                <Button size="small" icon={<MinusOutlined />} onClick={() => updateConfig('copies', Math.max(1, config.copies - 1))} />
                                                <Text strong style={{ fontSize: 16, minWidth: 24, textAlign: 'center' }}>{config.copies}</Text>
                                                <Button size="small" icon={<PlusOutlined />} onClick={() => updateConfig('copies', Math.min(50, config.copies + 1))} />
                                            </div>
                                        </div>
                                    </Space>
                                </div>
                            )
                        },
                        {
                            key: 'manual',
                            label: <><PlusOutlined /> Manual</>,
                            children: (
                                <div style={{ maxHeight: 'calc(100vh - 220px)', overflowY: 'auto' }}>
                                    <Text type="secondary" style={{ fontSize: 12, display: 'block', marginBottom: 12 }}>
                                        Create a label without adding to inventory
                                    </Text>
                                    <Space direction="vertical" style={{ width: '100%' }} size={8}>
                                        <div>
                                            <Text strong style={{ fontSize: 12 }}>Product Name *</Text>
                                            <Input value={manualForm.name} onChange={e => setManualForm(p => ({ ...p, name: e.target.value }))} placeholder="e.g. Basmati Rice 5kg" size="small" style={{ marginTop: 4 }} />
                                        </div>
                                        <div>
                                            <Text strong style={{ fontSize: 12 }}>Price *</Text>
                                            <Input value={manualForm.price} onChange={e => setManualForm(p => ({ ...p, price: e.target.value }))} placeholder="e.g. 299" size="small" style={{ marginTop: 4 }} prefix={config.currency} type="number" />
                                        </div>
                                        <div>
                                            <Text strong style={{ fontSize: 12 }}>Barcode (optional)</Text>
                                            <Input value={manualForm.barcode} onChange={e => setManualForm(p => ({ ...p, barcode: e.target.value }))} placeholder="e.g. 8901234567890" size="small" style={{ marginTop: 4 }} />
                                        </div>
                                        <div>
                                            <Text strong style={{ fontSize: 12 }}>Category (optional)</Text>
                                            <Input value={manualForm.category} onChange={e => setManualForm(p => ({ ...p, category: e.target.value }))} placeholder="e.g. Grocery" size="small" style={{ marginTop: 4 }} />
                                        </div>
                                        <div>
                                            <Text strong style={{ fontSize: 12 }}>Unit (optional)</Text>
                                            <Input value={manualForm.unit} onChange={e => setManualForm(p => ({ ...p, unit: e.target.value }))} placeholder="e.g. per kg" size="small" style={{ marginTop: 4 }} />
                                        </div>
                                        <Button type="primary" block onClick={applyManualProduct} style={{ marginTop: 8 }}>
                                            ✅ Use This for Label
                                        </Button>
                                        {manualProduct && (
                                            <Tag color="green" closable onClose={() => setManualProduct(null)} style={{ fontSize: 12, padding: '4px 8px' }}>
                                                ✅ {manualProduct.name} — {config.currency}{manualProduct.price}
                                            </Tag>
                                        )}
                                    </Space>
                                </div>
                            )
                        }
                    ]} />
                </Col>

                {/* ── CENTER: Live Preview ── */}
                <Col xs={24} lg={8}>
                    <Card
                        size="small"
                        title={<><EyeOutlined /> Live Preview</>}
                        extra={<Text type="secondary" style={{ fontSize: 11 }}>Click product to preview</Text>}
                        style={{ height: '100%' }}
                    >
                        {/* Large preview */}
                        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 16, padding: 20, background: '#f5f5f5', borderRadius: 8 }}>
                            <div style={{ transform: 'scale(1.8)', transformOrigin: 'center center' }}>
                                <LabelRenderer product={livePreviewProduct} config={config} />
                            </div>
                        </div>
                        <Divider style={{ margin: '12px 0' }}>
                            <Text type="secondary" style={{ fontSize: 11 }}>Grid Preview ({config.labelsPerRow} per row)</Text>
                        </Divider>
                        {/* Mini grid preview */}
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, justifyContent: 'center', maxHeight: 300, overflowY: 'auto' }}>
                            {(selectedProducts.length > 0 ? selectedProducts : [livePreviewProduct]).map((p, i) => (
                                <div key={i} onClick={() => setPreviewProduct(p)} style={{ cursor: 'pointer', opacity: previewProduct?.id === p.id ? 1 : 0.8, transition: 'opacity 0.2s' }}>
                                    <LabelRenderer product={p} config={config} />
                                </div>
                            ))}
                        </div>
                    </Card>
                </Col>

                {/* ── RIGHT: Product Selection ── */}
                <Col xs={24} lg={8}>
                    <Card
                        size="small"
                        title={
                            <Space>
                                <BarcodeOutlined />
                                <span>Select Products</span>
                                {selectedProductIds.length > 0 && <Tag color="blue">{selectedProductIds.length} selected</Tag>}
                            </Space>
                        }
                        extra={
                            <Space size={4}>
                                <Button size="small" onClick={() => setSelectedProductIds(filteredProducts.map(p => p.id))}>All</Button>
                                <Button size="small" onClick={() => setSelectedProductIds([])}>None</Button>
                            </Space>
                        }
                    >
                        <Input
                            prefix={<SearchOutlined />}
                            placeholder="Search products..."
                            value={searchText}
                            onChange={e => setSearchText(e.target.value)}
                            style={{ marginBottom: 8 }}
                            size="small"
                            allowClear
                        />
                        {products.length === 0 ? (
                            <Empty description="No products found. Add products to Inventory first." style={{ marginTop: 20 }} />
                        ) : (
                            <Table
                                columns={productColumns}
                                dataSource={filteredProducts}
                                rowKey="id"
                                size="small"
                                pagination={{ pageSize: 10, showSizeChanger: false }}
                                rowClassName={r => selectedProductIds.includes(r.id) ? 'selected-row' : ''}
                                onRow={r => ({
                                    onClick: () => {
                                        setPreviewProduct(r);
                                        if (selectedProductIds.includes(r.id)) setSelectedProductIds(prev => prev.filter(id => id !== r.id));
                                        else setSelectedProductIds(prev => [...prev, r.id]);
                                    }
                                })}
                                scroll={{ y: 380 }}
                                showHeader={false}
                            />
                        )}
                    </Card>
                </Col>
            </Row>

            {/* Print Preview Modal */}
            <Modal
                title={<><PrinterOutlined /> Print Preview</>}
                open={printModalVisible}
                onCancel={() => setPrintModalVisible(false)}
                width={700}
                footer={[
                    <Button key="cancel" onClick={() => setPrintModalVisible(false)}>Cancel</Button>,
                    <Button key="print" type="primary" icon={<PrinterOutlined />} onClick={doPrint}>
                        Print Labels ({selectedProducts.length * config.copies} total)
                    </Button>
                ]}
            >
                <div style={{ background: '#525659', padding: 16, borderRadius: 8, minHeight: 200, maxHeight: 500, overflowY: 'auto' }}>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                        {selectedProducts.map((p, i) => (
                            Array.from({ length: config.copies }).map((_, ci) => (
                                <div key={`${i}-${ci}`} style={{ background: '#fff', padding: 3, borderRadius: 3 }}>
                                    <LabelRenderer product={p} config={config} />
                                </div>
                            ))
                        ))}
                    </div>
                </div>
                <div style={{ marginTop: 12, display: 'flex', gap: 16, fontSize: 13, color: '#666' }}>
                    <span>📦 {selectedProducts.length} products × {config.copies} copies = <strong>{selectedProducts.length * config.copies} labels</strong></span>
                    <span>📐 {config.labelsPerRow} per row</span>
                </div>
            </Modal>

            <style>{`
        .selected-row td { background: #e6f4ff !important; }
        .ant-table-row:hover td { background: #f0f7ff !important; cursor: pointer; }
      `}</style>
        </div>
    );
}

// ── HTML Label Builder for Print Window ───────────────────────────────────────
function buildLabelHtml(product, config, lw, lh, mmW, mmH) {
    const { templateId, primaryColor, shopName, currency, showBarcode, showCategory, showMRP, mrpPrice } = config;
    const price = product.price || 0;
    const name = product.name || '';
    const category = product.category || '';
    const barcode = product.barcode || '';

    const mrpSection = showMRP && mrpPrice
        ? `<div style="font-size:7px;color:#999;text-decoration:line-through">${currency}${mrpPrice}</div>`
        : '';
    const shopSection = shopName ? `<div class="shop-name">${shopName}</div>` : '';
    const catSection = showCategory && category ? `<div class="category">${category}</div>` : '';

    // Offline-safe barcode: use text representation (no external API)
    const barcodeSection = showBarcode && barcode
        ? `<div style="text-align:center;background:#fff;padding:2px;border-radius:2px"><div style="font-family:'Courier New',monospace;font-size:8px;letter-spacing:1px;word-break:break-all">${barcode}</div><div style="font-size:6px;color:#666;margin-top:1px">|||||||||||||||||||||||||||||||</div></div>`
        : '';

    const templates = {
        classic: `
      <div style="width:${mmW}mm;height:${mmH}mm;background:#fff;border:2px solid ${primaryColor};border-radius:4px;padding:3px;display:flex;flex-direction:column;justify-content:space-between;box-sizing:border-box;overflow:hidden;font-family:Arial,sans-serif">
        ${shopSection ? `<div style="font-size:6px;color:${primaryColor};font-weight:700;text-align:center;text-transform:uppercase;border-bottom:1px solid ${primaryColor};padding-bottom:2px">${shopName}</div>` : ''}
        ${catSection ? `<div style="font-size:6px;color:#888;text-align:center">${category}</div>` : ''}
        <div style="font-size:9px;font-weight:700;text-align:center;color:#111;flex:1;display:flex;align-items:center;justify-content:center">${name}</div>
        <div style="text-align:center">${mrpSection}<div style="font-size:16px;font-weight:900;color:${primaryColor}">${currency}${price}</div></div>
        ${barcodeSection}
      </div>`,
        modern: `
      <div style="width:${mmW}mm;height:${mmH}mm;background:${primaryColor};border-radius:6px;padding:4px;display:flex;flex-direction:column;justify-content:space-between;box-sizing:border-box;overflow:hidden;font-family:Arial,sans-serif">
        ${shopName ? `<div style="font-size:6px;color:rgba(255,255,255,0.8);font-weight:700">${shopName}</div>` : ''}
        <div style="font-size:10px;font-weight:700;color:#fff;line-height:1.2">${name}</div>
        <div style="background:#fff;border-radius:4px;padding:2px 6px;text-align:center">${mrpSection}<div style="font-size:18px;font-weight:900;color:${primaryColor}">${currency}${price}</div></div>
        ${showBarcode && barcode ? `<div style="background:#fff;border-radius:3px;padding:1px">${barcodeSection}</div>` : ''}
      </div>`,
        sale: `
      <div style="width:${mmW}mm;height:${mmH}mm;background:#ff0000;border-radius:6px;padding:4px;display:flex;flex-direction:column;justify-content:space-between;box-sizing:border-box;overflow:hidden;font-family:Arial,sans-serif;position:relative">
        ${shopName ? `<div style="font-size:6px;color:rgba(255,255,255,0.8);font-weight:700">${shopName}</div>` : ''}
        <div style="font-size:10px;font-weight:700;color:#fff;line-height:1.2">${name}</div>
        <div>${mrpSection ? `<div style="font-size:7px;color:rgba(255,255,255,0.7);text-decoration:line-through">MRP: ${currency}${mrpPrice}</div>` : ''}<div style="background:#fff200;border-radius:3px;padding:1px 4px;display:inline-block"><span style="font-size:18px;font-weight:900;color:#c00">${currency}${price}</span></div></div>
        ${showBarcode && barcode ? `<div style="background:#fff;border-radius:2px;padding:1px">${barcodeSection}</div>` : ''}
      </div>`,
        luxury: `
      <div style="width:${mmW}mm;height:${mmH}mm;background:#1a1a2e;border:2px solid #c9a84c;border-radius:4px;padding:4px;display:flex;flex-direction:column;justify-content:space-between;box-sizing:border-box;overflow:hidden;font-family:Georgia,serif">
        <div style="text-align:center;border-bottom:1px solid #c9a84c;padding-bottom:3px">${shopName ? `<div style="font-size:6px;color:#c9a84c;letter-spacing:2px;text-transform:uppercase">${shopName}</div>` : ''}</div>
        <div style="text-align:center;flex:1;display:flex;align-items:center;justify-content:center"><div style="font-size:9px;color:#f0e6ca;font-style:italic">${name}</div></div>
        <div style="text-align:center;border-top:1px solid #c9a84c;padding-top:3px">${mrpSection}<div style="font-size:17px;font-weight:700;color:#c9a84c">${currency}${price}</div></div>
        ${showBarcode && barcode ? `<div style="background:#fff;border-radius:2px;padding:1px;margin-top:2px">${barcodeSection}</div>` : ''}
      </div>`,
    };

    return `<div class="label">${templates[templateId] || templates.classic}</div>`;
}
