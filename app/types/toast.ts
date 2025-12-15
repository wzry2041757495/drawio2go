export type ToastVariant = "success" | "info" | "warning" | "danger";

export interface ToastAction {
  label: string;
  onPress: () => void | Promise<void>;
  ariaLabel?: string;
}

export interface Toast {
  id: string;
  title?: string;
  description: string;
  variant: ToastVariant;
  duration?: number; // 毫秒,默认 3200
  action?: ToastAction;
  // 所有通知默认支持复制功能，无需额外标记
}

export interface ToastContextValue {
  push(toast: Omit<Toast, "id">): string;
  dismiss(id: string): void;
  clear(): void;
}
