import React from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';

export class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="fixed inset-0 bg-background flex flex-col items-center justify-center p-6 text-center z-50">
          <div className="bg-card border border-border rounded-2xl p-8 max-w-md shadow-2xl flex flex-col items-center">
            <div className="w-16 h-16 rounded-full bg-red-500/10 flex items-center justify-center mb-6">
              <AlertTriangle className="text-red-500" size={32} />
            </div>
            <h1 className="text-2xl font-bold text-foreground mb-3">Oops! Something went wrong</h1>
            <p className="text-muted-foreground mb-8 text-sm leading-relaxed">
              We've encountered an unexpected error. Please try refreshing the page or check your connection.
            </p>
            <Button 
              onClick={() => window.location.reload()}
              className="w-full bg-primary hover:bg-primary/90 text-primary-foreground gap-2 h-12 rounded-xl font-medium"
            >
              <RefreshCw size={18} />
              Reload Application
            </Button>
            {process.env.NODE_ENV === 'development' && (
              <div className="mt-6 p-4 bg-muted rounded-lg w-full text-left overflow-auto max-h-48">
                <p className="text-xs text-red-400 font-mono whitespace-pre-wrap">
                  {this.state.error?.toString()}
                </p>
              </div>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
