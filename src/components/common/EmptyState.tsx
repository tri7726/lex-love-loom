import React from "react";
import { Button } from "@/components/ui/button";
import { LucideIcon, Inbox } from "lucide-react";
import { cn } from "@/lib/utils";

interface EmptyStateProps {
  icon?: LucideIcon;
  emoji?: string;
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
  secondaryActionLabel?: string;
  onSecondaryAction?: () => void;
  className?: string;
  size?: "sm" | "md" | "lg";
}

/**
 * Empty state UI dùng chung khi không có dữ liệu.
 * Có hỗ trợ icon hoặc emoji + 2 CTA.
 */
export const EmptyState: React.FC<EmptyStateProps> = ({
  icon: Icon = Inbox,
  emoji,
  title,
  description,
  actionLabel,
  onAction,
  secondaryActionLabel,
  onSecondaryAction,
  className,
  size = "md",
}) => {
  const sizes = {
    sm: { wrap: "py-8 px-4", icon: "w-14 h-14", iconInner: "h-7 w-7", emoji: "text-4xl", title: "text-base", desc: "text-xs" },
    md: { wrap: "py-12 px-6", icon: "w-20 h-20", iconInner: "h-10 w-10", emoji: "text-6xl", title: "text-xl", desc: "text-sm" },
    lg: { wrap: "py-16 px-8", icon: "w-24 h-24", iconInner: "h-12 w-12", emoji: "text-7xl", title: "text-2xl", desc: "text-base" },
  };
  const s = sizes[size];

  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center text-center animate-in fade-in zoom-in-95 duration-500",
        s.wrap,
        className
      )}
    >
      {emoji ? (
        <div className={cn("mb-5 select-none", s.emoji)} aria-hidden>
          {emoji}
        </div>
      ) : (
        <div
          className={cn(
            "mb-5 rounded-3xl bg-sakura/10 flex items-center justify-center",
            s.icon
          )}
        >
          <Icon className={cn("text-sakura", s.iconInner)} />
        </div>
      )}

      <h3 className={cn("font-bold font-display text-foreground mb-2", s.title)}>
        {title}
      </h3>
      {description && (
        <p className={cn("text-muted-foreground max-w-sm leading-relaxed", s.desc)}>
          {description}
        </p>
      )}

      {(actionLabel || secondaryActionLabel) && (
        <div className="flex flex-col sm:flex-row gap-3 mt-6 w-full sm:w-auto">
          {actionLabel && (
            <Button
              onClick={onAction}
              className="bg-sakura hover:bg-sakura-dark text-white font-bold rounded-2xl px-6 h-11 shadow-md"
            >
              {actionLabel}
            </Button>
          )}
          {secondaryActionLabel && (
            <Button
              variant="ghost"
              onClick={onSecondaryAction}
              className="font-bold rounded-2xl px-6 h-11 hover:bg-sakura/5"
            >
              {secondaryActionLabel}
            </Button>
          )}
        </div>
      )}
    </div>
  );
};

export default EmptyState;
