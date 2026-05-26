import React, { useState, useEffect } from 'react';
import { Button, Select, Form, InputNumber, Radio, Space, Row, Col, Typography, Divider, Input, message } from 'antd';
import { PrinterOutlined, SettingOutlined } from '@ant-design/icons';
import SingleLabel from './SingleLabel';

const { Option } = Select;
const { Text } = Typography;

// Standard A4: 210mm x 297mm
const MM_TO_PX = 3.7795275591; // 1mm = ~3.78px

const PRESETS = {
    'oddy-24': {
        name: 'Oddy 24 (3 x 8)',
        cols: 3,
        rows: 8,
        width: 64, // mm
        height: 33.9, // mm
        marginTop: 12, // Approx
        marginLeft: 7,
        hPitch: 66, // horizontal pitch (width + gap)
        vPitch: 34, // vertical pitch (height + gap)
        fontSize: 12,
        barcodeHeight: 20
    },
    'oddy-65': {
        name: 'Oddy 65 (5 x 13)',
        cols: 5,
        rows: 13,
        width: 38.1,
        height: 21.2,
        marginTop: 10,
        marginLeft: 5,
        hPitch: 40,
        vPitch: 22,
        fontSize: 10,
        barcodeHeight: 15
    },
    'oddy-84': {
        name: 'Oddy 84 (4 x 21)',
        cols: 4,
        rows: 21,
        width: 46,
        height: 11, // Very small height
        marginTop: 10,
        marginLeft: 5,
        hPitch: 48,
        vPitch: 13,
        fontSize: 9,
        barcodeHeight: 10
    }
};

const BarcodePrinter = ({ items = [] }) => {
    const [preset, setPreset] = useState('oddy-65');
    const [settings, setSettings] = useState(PRESETS['oddy-65']);
    const [showSettings, setShowSettings] = useState(false);
    const [startPos, setStartPos] = useState(1); // Start from label N (for partial sheets)

    // Configuration
    const [labelConfig, setLabelConfig] = useState({
        showName: true,
        showPrice: true,
        showBarcode: true,
        showQR: false,
        customTextTop: '',
        customTextBottom: '',
        boldPrice: true,
        bgColor: '#ffffff',
        textColor: '#000000',
        barcodeWidthScale: 1
    });

    useEffect(() => {
        // Load saved settings from ShopSettings if available
        const savedSettings = localStorage.getItem('labelSettings');
        if (savedSettings) {
            try {
                const parsed = JSON.parse(savedSettings);
                if (parsed.preset) setPreset(parsed.preset);
                if (parsed.settings) setSettings(parsed.settings);
                if (parsed.config) setLabelConfig(prev => ({ ...prev, ...parsed.config }));
            } catch (e) {
                console.error("Error loading label settings", e);
            }
        }
    }, []);

    const handlePresetChange = (val) => {
        setPreset(val);
        if (val !== 'custom') {
            setSettings(PRESETS[val]);
        }
    };

    const updateSetting = (key, val) => {
        setSettings(prev => ({ ...prev, [key]: val }));
    };

    const updateConfig = (key, val) => {
        setLabelConfig(prev => ({ ...prev, [key]: val }));
    };

    // Flatten items based on Qty
    const allLabels = [];
    items.forEach(item => {
        for (let i = 0; i < item.qty; i++) {
            allLabels.push(item);
        }
    });

    // Handle Start Position (Fill empty slots)
    const emptySlots = Array.from({ length: startPos - 1 }).fill(null);
    const printableLabels = [...emptySlots, ...allLabels];

    return (
        <div>
            {/* Controls */}
            <div className="no-print" style={{ marginBottom: 20, padding: 15, background: '#f5f5f5', borderRadius: 6 }}>
                <Row gutter={16} align="bottom">
                    <Col span={8}>
                        <Text>Label Preset</Text>
                        <Select style={{ width: '100%' }} value={preset} onChange={handlePresetChange}>
                            {Object.keys(PRESETS).map(k => <Option key={k} value={k}>{PRESETS[k].name}</Option>)}
                            <Option value="custom">Custom Configuration</Option>
                        </Select>
                    </Col>
                    <Col span={6}>
                        <Text>Start From Label #</Text>
                        <InputNumber min={1} value={startPos} onChange={setStartPos} style={{ width: '100%' }} />
                        <Text type="secondary" style={{ fontSize: 10 }}>Use for partially used sheets</Text>
                    </Col>
                    <Col span={6}>
                        <Button icon={<SettingOutlined />} onClick={() => setShowSettings(!showSettings)}>
                            {showSettings ? 'Hide Settings' : 'Quick Settings'}
                        </Button>
                    </Col>
                    <Col span={4}>
                        <Button type="primary" icon={<PrinterOutlined />} onClick={() => window.print()} block>Print</Button>
                    </Col>
                </Row>

                {showSettings && (
                    <div style={{ marginTop: 15, paddingTop: 15, borderTop: '1px solid #ddd' }}>
                        <div style={{ marginBottom: 10 }}>
                            <Text type="secondary">Note: Permanent changes should be made in Main Settings &gt; Labels.</Text>
                        </div>
                        <Divider orientation="left" style={{ margin: '5px 0' }}>One-Time Tweaks</Divider>
                        <Row gutter={[16, 8]}>
                            <Col span={12}>
                                <Text style={{ fontSize: 12 }}>Top Text</Text>
                                <Input size="small" value={labelConfig.customTextTop} onChange={e => updateConfig('customTextTop', e.target.value)} />
                            </Col>
                            <Col span={12}>
                                <Text style={{ fontSize: 12 }}>Bottom Text</Text>
                                <Input size="small" value={labelConfig.customTextBottom} onChange={e => updateConfig('customTextBottom', e.target.value)} />
                            </Col>
                        </Row>
                        <Row gutter={[10, 10]} style={{ marginTop: 10 }}>
                            <Col span={6}><Text style={{ fontSize: 12 }}>Top Marg</Text><InputNumber size="small" value={settings.marginTop} onChange={v => updateSetting('marginTop', v)} /></Col>
                            <Col span={6}><Text style={{ fontSize: 12 }}>Left Marg</Text><InputNumber size="small" value={settings.marginLeft} onChange={v => updateSetting('marginLeft', v)} /></Col>
                        </Row>
                    </div>
                )}
            </div>

            {/* Print Preview Canvas (A4) */}
            <div
                id="barcode-print-area"
                style={{
                    width: '210mm',
                    minHeight: '297mm', // A4 Height
                    background: 'white',
                    margin: '0 auto',
                    paddingTop: `${settings.marginTop}mm`,
                    paddingLeft: `${settings.marginLeft}mm`,
                    position: 'relative',
                    overflow: 'hidden',
                    boxShadow: '0 0 10px rgba(0,0,0,0.1)'
                }}
            >
                <div style={{
                    display: 'grid',
                    gridTemplateColumns: `repeat(${settings.cols}, ${settings.width}mm)`,
                    rowGap: `${settings.vPitch - settings.height}mm`,
                    columnGap: `${settings.hPitch - settings.width}mm`
                }}>
                    {printableLabels.map((item, idx) => (
                        <div key={idx}>
                            {item && (
                                <SingleLabel
                                    item={item}
                                    settings={settings}
                                    config={labelConfig}
                                />
                            )}
                        </div>
                    ))}
                </div>
            </div>

            <style>{`
        @media print {
            body * { visibility: hidden; }
            #barcode-print-area, #barcode-print-area * { visibility: visible; }
            #barcode-print-area { 
                position: absolute; 
                left: 0; 
                top: 0; 
                margin: 0; 
                box-shadow: none;
                background: white;
            }
            .no-print { display: none; }
            @page { size: auto; margin: 0mm; } 
        }
      `}</style>
        </div>
    );
};

export default BarcodePrinter;
