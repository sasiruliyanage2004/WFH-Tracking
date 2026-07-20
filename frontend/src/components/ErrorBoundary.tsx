import React, { Component, ErrorInfo, ReactNode } from 'react';
import { Box, Typography, Button, Paper } from '@mui/material';

interface Props {
  children?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, errorInfo: null };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    this.setState({
      error,
      errorInfo
    });
    console.error("Uncaught error:", error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <Box sx={{ p: 4, display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', bgcolor: '#0f172a' }}>
          <Paper sx={{ p: 4, maxWidth: 600, width: '100%', borderRadius: 3, border: '1px solid #ef4444', bgcolor: '#1e293b' }}>
            <Typography variant="h5" color="error" sx={{ fontWeight: 700, mb: 2 }}>
              Something went wrong.
            </Typography>
            <Typography variant="body2" sx={{ color: '#94a3b8', mb: 2 }}>
              An unexpected error occurred in the application. Please share the details below:
            </Typography>
            <Box sx={{ p: 2, bgcolor: '#0f172a', borderRadius: 2, overflowX: 'auto', mb: 3, border: '1px solid #334155' }}>
              <pre style={{ color: '#f87171', margin: 0, fontSize: '0.8rem', fontFamily: 'monospace', whiteSpace: 'pre-wrap' }}>
                {this.state.error && this.state.error.toString()}
                {"\n\nComponent Stack:\n"}
                {this.state.errorInfo && this.state.errorInfo.componentStack}
              </pre>
            </Box>
            <Button variant="contained" color="primary" onClick={() => window.location.reload()} sx={{ borderRadius: 2 }}>
              Reload Page
            </Button>
          </Paper>
        </Box>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
