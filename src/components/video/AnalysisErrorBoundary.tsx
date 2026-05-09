import React from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface Props {
  children: React.ReactNode;
  onRetry?: () => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class AnalysisErrorBoundary extends React.Component<Props, State> {
  state: State = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('[AnalysisPanel ErrorBoundary]', error, info);
  }

  reset = () => {
    this.setState({ hasError: false, error: null });
    this.props.onRetry?.();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="p-6 m-4 rounded-2xl bg-amber-50 border border-amber-200 text-amber-800 space-y-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 mt-0.5 flex-shrink-0" />
            <div className="space-y-1">
              <h4 className="font-semibold">Dữ liệu phân tích bị thiếu hoặc không hợp lệ</h4>
              <p className="text-sm text-amber-700/90">
                Sensei không thể hiển thị kết quả này. Hãy thử phân tích lại nhé 🌸
              </p>
              {this.state.error?.message && (
                <p className="text-xs text-amber-700/70 mt-1 font-mono break-all">
                  {this.state.error.message}
                </p>
              )}
            </div>
          </div>
          {this.props.onRetry && (
            <Button
              onClick={this.reset}
              size="sm"
              className="bg-sakura hover:bg-sakura/90 text-white rounded-xl"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Thử lại phân tích
            </Button>
          )}
        </div>
      );
    }
    return this.props.children;
  }
}
