import React from 'react';
import Barcode from 'react-barcode';

const SingleLabel = ({
    item,
    settings,
    config,
    style = {}
}) => {
    if (!item) return null;

    const {
        width,
        height,
        fontSize,
        barcodeHeight,
        checkDigit // some presets might need this? usually handled by Barcode comp
    } = settings;

    const {
        showName = true,
        showPrice = true,
        showBarcode = true,
        showQR = false,
        customTextTop = '',
        customTextBottom = '',
        boldPrice = true,
        // New Customization Props
        bgColor = '#ffffff',
        textColor = '#000000',
        barcodeWidthScale = 1 // 1=narrow, 2=standard, 3=wide
    } = config;

    return (
        <div
            style={{
                width: `${width}mm`,
                height: `${height}mm`,
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
                alignItems: 'center',
                overflow: 'hidden',
                backgroundColor: bgColor,
                color: textColor,
                ...style
            }}
        >
            {customTextTop && (
                <div style={{ fontSize: fontSize, fontWeight: 'bold', marginBottom: 2 }}>{customTextTop}</div>
            )}

            {showName && (
                <div style={{
                    fontSize: fontSize,
                    fontWeight: 'bold',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    maxWidth: '95%',
                    lineHeight: 1
                }}>
                    {item.name ? item.name.slice(0, 20) : 'Item Name'}
                </div>
            )}

            {showQR && (
                <img
                    src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent((item.name || '') + ' - ' + (item.barcode || ''))}`}
                    alt="QR"
                    style={{ width: barcodeHeight * 2, height: barcodeHeight * 2, margin: '2px 0' }}
                />
            )}

            {showBarcode && (
                <div style={{ background: 'white', padding: '2px', borderRadius: 2 }}>
                    <Barcode
                        value={item.barcode || '12345678'}
                        width={barcodeWidthScale || 1}
                        height={barcodeHeight}
                        fontSize={fontSize - 2}
                        margin={0}
                        displayValue={true}
                        background={bgColor === '#ffffff' ? '#ffffff' : 'transparent'} // React-barcode bg
                        lineColor={textColor}
                    />
                </div>
            )}

            {showPrice && (
                <div style={{ fontSize: fontSize, lineHeight: 1, fontWeight: boldPrice ? 'bold' : 'normal' }}>
                    ₹{item.sellingRate || '0.00'}
                </div>
            )}

            {customTextBottom && (
                <div style={{ fontSize: fontSize - 2, marginTop: 2 }}>{customTextBottom}</div>
            )}
        </div>
    );
};

export default SingleLabel;
