import React, { useEffect } from 'react';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';

export interface ToastMessage {
  id: string;
  type: 'success' | 'error' | 'info';
  message: string;
}

interface ToastProps {
  toasts: ToastMessage[];
  onDismiss: (id: string) => void;
}

export const ToastContainer: React.FC<ToastProps> = ({ toasts, onDismiss }) => {
  return (
    <div className="no-print fixed bottom-6 right-6 z-50 flex flex-col gap-2 max-w-sm w-full pointer-events-none">
      {toasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} onDismiss={onDismiss} />
      ))}
    </div>
  );
};

const ToastItem: React.FC<{ toast: ToastMessage; onDismiss: (id: string) => void }> = ({
  toast,
  onDismiss,
}) => {
  useEffect(() => {
    const timer = setTimeout(() => {
      onDismiss(toast.id);
    }, 3200);
    return () => clearTimeout(timer);
  }, [toast.id, onDismiss]);

  const icons = {
    success: <CheckCircle2 className="w-4 h-4 text-[#34C759] shrink-0" />,
    error: <AlertCircle className="w-4 h-4 text-[#FF3B30] shrink-0" />,
    info: <Info className="w-4 h-4 text-[var(--ui-accent)] shrink-0" />,
  };

  return (
    <div className="pointer-events-auto flex items-center justify-between gap-3 p-3.5 rounded-2xl bg-[var(--ui-surface)]/95 backdrop-blur-xl border border-[var(--ui-border)] ios-elevated-shadow transition-all animate-in fade-in slide-in-from-bottom-2 duration-200">
      <div className="flex items-center gap-2.5 text-xs text-[var(--ui-text)] font-semibold">
        {icons[toast.type]}
        <span>{toast.message}</span>
      </div>
      <button
        onClick={() => onDismiss(toast.id)}
        className="text-[var(--ui-tertiary)] hover:text-[var(--ui-text)] transition-colors p-1 rounded-lg"
      >
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  );
};
