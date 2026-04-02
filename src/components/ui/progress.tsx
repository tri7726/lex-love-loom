import * as React from "react";
import * as ProgressPrimitive from "@radix-ui/react-progress";

import { cn } from "@/lib/utils";

const Progress = React.forwardRef<
  React.ElementRef<typeof ProgressPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof ProgressPrimitive.Root> & { indicatorClassName?: string; showShimmer?: boolean }
>(({ className, value, indicatorClassName, showShimmer, ...props }, ref) => (
  <ProgressPrimitive.Root
    ref={ref}
    className={cn("relative h-4 w-full overflow-hidden rounded-full bg-secondary", className)}
    {...props}
  >
    <ProgressPrimitive.Indicator
      className={cn("h-full w-full flex-1 bg-primary transition-all relative overflow-hidden", indicatorClassName)}
      style={{ transform: `translateX(-${100 - (value || 0)}%)` }}
    >
      {showShimmer && (
        <div className="absolute inset-0 -translate-x-full animate-progress-shimmer bg-gradient-to-r from-transparent via-white/40 to-transparent" />
      )}
    </ProgressPrimitive.Indicator>
  </ProgressPrimitive.Root>
));
Progress.displayName = ProgressPrimitive.Root.displayName;

export { Progress };
