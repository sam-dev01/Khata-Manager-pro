import React from 'react';
import { Button, Result } from 'antd';

/**
 * Global Error Boundary — catches any unhandled React render errors
 * and shows a friendly fallback UI instead of a blank white screen.
 *
 * Usage: Wrap <App /> in <ErrorBoundary> in main.jsx
 */
class ErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false, error: null };
    }

    static getDerivedStateFromError(error) {
        return { hasError: true, error };
    }

    componentDidCatch(error, info) {
        // Log to console.error only — never expose to users
        console.error('🔴 App crashed:', error, info.componentStack);
    }

    handleReload = () => {
        this.setState({ hasError: false, error: null });
        window.location.reload();
    };

    render() {
        if (this.state.hasError) {
            return (
                <div style={{
                    minHeight: '100vh',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
                }}>
                    <Result
                        status="500"
                        title="Something went wrong"
                        subTitle="An unexpected error occurred. Your data is safe — please reload the app."
                        extra={
                            <Button
                                type="primary"
                                size="large"
                                onClick={this.handleReload}
                                style={{
                                    background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                                    border: 'none',
                                    borderRadius: 10,
                                    fontWeight: 600
                                }}
                            >
                                🔄 Reload App
                            </Button>
                        }
                        style={{
                            background: 'white',
                            borderRadius: 20,
                            padding: 48,
                            boxShadow: '0 20px 60px rgba(0,0,0,0.2)'
                        }}
                    />
                </div>
            );
        }

        return this.props.children;
    }
}

export default ErrorBoundary;
