export const themeConfig = {
    token: {
        fontFamily: "'Plus Jakarta Sans', 'Noto Sans Devanagari', sans-serif",
        colorPrimary: '#6366f1', // Indigo-500
        colorInfo: '#6366f1',
        colorSuccess: '#10b981', // Emerald-500
        colorWarning: '#f59e0b', // Amber-500
        colorError: '#ef4444', // Red-500
        colorTextBase: '#1f2937', // Gray-900
        colorBgBase: '#ffffff',
        borderRadius: 8,
        wireframe: false,
    },
    components: {
        Button: {
            borderRadius: 8,
            controlHeight: 40,
            controlHeightLG: 48,
            controlHeightSM: 32,
            fontWeight: 500,
            textTransform: 'none',
            paddingContentHorizontal: 20,
        },
        Card: {
            borderRadiusLG: 16,
            boxShadowTertiary: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
        },
        Input: {
            controlHeight: 44,
            borderRadius: 8,
            colorBgContainer: '#f9fafb', // Gray-50
            activeBorderColor: '#6366f1',
            hoverBorderColor: '#818cf8',
        },
        Select: {
            controlHeight: 44,
            borderRadius: 8,
            colorBgContainer: '#f9fafb',
        },
        Table: {
            borderRadiusLG: 12,
            headerBg: '#f3f4f6', // Gray-100
            headerColor: '#374151', // Gray-700
            headerSplitColor: 'transparent',
        },
        Menu: {
            itemBorderRadius: 8,
            itemHeight: 44,
            iconSize: 18,
        },
        Layout: {
            bodyBg: '#f3f4f6',
            headerBg: 'rgba(255, 255, 255, 0.8)',
            siderBg: '#1e1b4b', // Indigo-950
        },
        Typography: {
            fontFamilyCode: "'JetBrains Mono', monospace",
        }
    },
};
