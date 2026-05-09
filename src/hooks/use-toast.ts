/**
 * Lightweight wrapper: delegates to sonner so all existing shadcn `useToast()`
 * calls keep working without changing every import site.
 */
import { toast as sonnerToast } from "sonner";

interface ToastArgs {
  title?: string;
  description?: string;
  variant?: "default" | "destructive";
  duration?: number;
}

function toast(args: ToastArgs | string) {
  if (typeof args === "string") return sonnerToast(args);

  const { title, description, variant, duration } = args;

  // If there's no title, promote description to the main message
  const message = title || description || "";
  const extra = title && description ? { description, duration } : duration ? { duration } : undefined;

  if (variant === "destructive") {
    return sonnerToast.error(message, extra);
  }
  return sonnerToast(message, extra);
}

function useToast() {
  return { toast, toasts: [] as never[], dismiss: (id?: string) => sonnerToast.dismiss(id) };
}

export { useToast, toast };
