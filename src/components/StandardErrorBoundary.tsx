import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface Props {
  children?: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class StandardErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    // Update state so the next render will show the fallback UI.
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo);
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null });
    window.location.reload();
  };

  private handleGoHome = () => {
    this.setState({ hasError: false, error: null });
    window.location.href = '/';
  };

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="min-h-screen bg-cream flex items-center justify-center p-6">
          <div className="max-w-md w-full bg-white rounded-[2.5rem] shadow-elevated border-2 border-sakura/20 p-10 text-center space-y-6 animate-in fade-in zoom-in duration-500">
            <div className="w-20 h-20 bg-sakura/10 rounded-3xl flex items-center justify-center mx-auto mb-4">
              <AlertTriangle className="h-10 w-10 text-sakura" />
            </div>
            
            <div className="space-y-2">
              <h1 className="text-2xl font-black text-slate-800 font-display">Oops! Có lỗi xảy ra 🌸</h1>
              <p className="text-muted-foreground text-sm leading-relaxed">
                Sensei xin lỗi vì sự bất tiện này. Một lỗi không mong muốn đã làm gián đoạn việc học của bạn.
              </p>
            </div>

            {this.state.error && (
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 text-left overflow-auto max-h-32 mb-4">
                <code className="text-[10px] text-slate-400 font-mono break-all">
                  {this.state.error.toString()}
                </code>
              </div>
            )}

            <div className="flex flex-col gap-3 pt-4">
              <Button 
                onClick={this.handleReset}
                className="w-full bg-sakura hover:bg-sakura-dark text-white font-bold rounded-2xl h-12 shadow-lg gap-2"
              >
                <RefreshCw className="h-4 w-4" />
                Thử tải lại trang
              </Button>
              
              <Button 
                variant="ghost"
                onClick={this.handleGoHome}
                className="w-full text-muted-foreground font-bold hover:bg-sakura/5 rounded-2xl h-12 gap-2"
              >
                <Home className="h-4 w-4" />
                Về trang chủ
              </Button>
            </div>
            
            <p className="text-[10px] text-slate-300 uppercase tracking-widest font-black pt-4">
              Lex-Love-Loom Stability Shield
            </p>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default StandardErrorBoundary;
