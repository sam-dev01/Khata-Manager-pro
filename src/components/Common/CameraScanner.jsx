import React, { useEffect, useRef, useState } from 'react';
import { Html5QrcodeScanner, Html5QrcodeScanType } from 'html5-qrcode';
import { Modal, Button, message } from 'antd';

const CameraScanner = ({ onScan, onClose, visible, scanDelay = 2000 }) => {
    const scannerRef = useRef(null);
    const lastScannedRef = useRef(null);
    const lastScanTimeRef = useRef(0);

    useEffect(() => {
        if (visible) {
            // Small delay to ensure modal DOM is ready
            const timer = setTimeout(() => {
                // Config
                const config = {
                    fps: 10,
                    qrbox: { width: 250, height: 250 },
                    aspectRatio: 1.0,
                    supportedScanTypes: [Html5QrcodeScanType.SCAN_TYPE_CAMERA]
                };

                // Clear previous instance if any (safety)
                const elem = document.getElementById('reader');
                if (elem) elem.innerHTML = '';

                try {
                    scannerRef.current = new Html5QrcodeScanner("reader", config, /* verbose= */ false);
                    scannerRef.current.render((decodedText) => {
                        const now = Date.now();
                        // Debounce: Ignore same code if scanned quickly
                        if (decodedText === lastScannedRef.current && (now - lastScanTimeRef.current < scanDelay)) {
                            return;
                        }

                        lastScannedRef.current = decodedText;
                        lastScanTimeRef.current = now;

                        // Success Callback
                        // Play beep?
                        // const audio = new Audio('/beep.mp3'); audio.play().catch(e=>{}); 

                        onScan(decodedText);
                        message.success('Scanned!');
                    }, (error) => {
                        // Error Callback (ignore usually)
                    });
                } catch (err) {
                    console.error("Scanner Error", err);
                }
            }, 300);

            return () => {
                clearTimeout(timer);
                if (scannerRef.current) {
                    try {
                        scannerRef.current.clear().catch(err => console.error("Failed to clear scanner", err));
                    } catch (e) { /* ignore */ }
                }
            };
        }
    }, [visible, onScan, scanDelay]);

    return (
        <Modal
            open={visible}
            onCancel={onClose}
            footer={null}
            title="Scan Barcode"
            destroyOnHidden={true}
            zIndex={2000} // High Z-index to be on top
        >
            <div id="reader" style={{ width: '100%', minHeight: '300px' }}></div>
            <div style={{ textAlign: 'center', marginTop: 10, color: '#666' }}>
                Point camera at Barcode / QR Code
            </div>
        </Modal>
    );
};

export default CameraScanner;
