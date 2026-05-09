import React from "react";
import { AlertTriangle, RefreshCw, Wifi } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface LoadErrorRetryProps {
  title?: string;
  description?: string;
  error?: Error | string | null;
  onRetry: () => void;
  retryLabel?: string;
  className?: string;
  /** Hiển thị compact (inline) thay vì full panel */
  compact?: boolean;
}

/**
 * UI hiển thị khi tải dữ liệu thất bại, kèm nút thử lại thân thiện tiếng Việt.
 */
export const LoadErrorRetry: React.FC<LoadErrorRetryProps> = ({
  title = "Không thể tải dữ liệu",
  description = "Có thể do mạng yếu hoặc máy chủ tạm bận. Hãy thử lại sau giây lát.",
  error,
  onRetry,
  retryLabel = "Thử lại",
  className,
  compact = false,
}) => {
  const errMsg = typeof error === "string" ? error : error?.message;
  const isNetwork = errMsg?.toLowerCase().includes("network") || errMsg?.toLowerCase().includes("fetch");

  if (compact) {
    return (
      <div className={cn("flex items-center justify-between gap-3 p-4 rounded-2xl bg-destructive/5 border border-destructive/20", className)}>
        <div className="flex items-center gap-3 min-w-0">
          <AlertTriangle className="h-5 w-5 text-destructive shrink-0" />
          <div className="min-w-0">
            <p className="text-sm font-bold text-foreground truncate">{title}</p>
            {errMsg && <p className="text-xs text-muted-foreground truncate">{errMsg}</p>}
          </div>
        </div>
        <Button size="sm" onClick={onRetry} className="bg-sakura hover:bg-sakura-dark text-white rounded-xl shrink-0 gap-2">
          <RefreshCw className="h-3.5 w-3.5" />
          {retryLabel}
        </Button>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center text-center py-12 px-6 animate-in fade-in zoom-in-95 duration-300",
        className
      )}
    >
      <div className="w-20 h-20 rounded-3xl bg-destructive/10 flex items-center justify-center mb-5">
        {isNetwork ? (
          <Wifi className="h-10 w-10 text-destructive" />
        ) : (
          <AlertTriangle className="h-10 w-10 text-destructive" />
        )}
      </div>
      <h3 className="text-xl font-bold font-display text-foreground mb-2">{title}</h3>
      <p className="text-sm text-muted-foreground max-w-sm leading-relaxed mb-6">
        {description}
      </p>
      {errMsg && (
        <details className="mb-6 text-xs text-muted-foreground/70 max-w-md">
          <summary className="cursor-pointer hover:text-foreground transition-colors">Chi tiết kỹ thuật</summary>
          <code className="mt-2 block p-3 bg-muted/40 rounded-xl text-left break-all font-mono">
            {errMsg}
          </code>
        </details>
      )}
      <Button onClick={onRetry} className="bg-sakura hover:bg-sakura-dark text-white font-bold rounded-2xl px-6 h-11 gap-2 shadow-md">
        <RefreshCw className="h-4 w-4" />
        {retryLabel}
      </Button>
    </div>
  );
};

export default LoadErrorRetry;
