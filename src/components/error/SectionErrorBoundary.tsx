import React, { Component, type ReactNode } from 'react';
import { AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface Props {
  children: ReactNode;
  name: string;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class SectionErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error(`[${this.props.name}] Error:`, error, errorInfo);
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;

      return (
        <div className="rounded-2xl border-2 border-dashed border-red-200 bg-red-50/50 p-8 text-center space-y-3">
          <AlertTriangle className="h-8 w-8 text-red-400 mx-auto" />
          <p className="text-sm font-bold text-red-600">
            {this.props.name} tạm thời không hiển thị được
          </p>
          <p className="text-xs text-red-400 max-w-md mx-auto">
            {this.state.error?.message ?? 'Lỗi không xác định'}
          </p>
          <Button variant="outline" size="sm" onClick={this.handleRetry} className="text-xs">
            Thử lại
          </Button>
        </div>
      );
    }

    return this.props.children;
  }
}
