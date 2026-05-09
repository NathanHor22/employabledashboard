'use client';

import { createContext, useContext, useState, useCallback } from 'react';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';
import { cn } from '@/lib/utils';

type ToastType = 'success' | 'error' | 'info';

interface ToastItem {
  id: string;
  type: ToastType;
  title: string;
  message?: string;
}

interface ToastContextValue {
  toast: (type: ToastType, title: string, message?: string) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const addToast = useCallback((type: ToastType, title: string, message?: string) => {
    const id = Math.random().toString(36).slice(2);
    setToasts((prev) => [...prev, { id, type, title, message }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4500);
  }, []);

  const remove = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ toast: addToast }}>
      {children}
      <div className="fixed top-4 right-4 z-50 flex flex-col gap-2 pointer-events-none w-80">
        {toasts.map((t) => (
          <ToastCard key={t.id} item={t} onRemove={remove} />
        ))}
      </div>
    </ToastContext.Provider>
  );
}

const icons: Record<ToastType, React.ReactNode> = {
  success: <CheckCircle2 className="w-5 h-5 text-green-500 shrink-0" />,
  error: <AlertCircle className="w-5 h-5 text-red-500 shrink-0" />,
  info: <Info className="w-5 h-5 text-sky-500 shrink-0" />,
};

const styles: Record<ToastType, string> = {
  success: 'border-green-100 bg-white',
  error: 'border-red-100 bg-white',
  info: 'border-sky-100 bg-white',
};

function ToastCard({ item, onRemove }: { item: ToastItem; onRemove: (id: string) => void }) {
  return (
    <div
      className={cn(
        'toast-enter pointer-events-auto flex items-start gap-3 p-4 rounded-2xl border shadow-lg shadow-slate-200/60',
        styles[item.type]
      )}
    >
      {icons[item.type]}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-slate-900">{item.title}</p>
        {item.message && (
          <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">{item.message}</p>
        )}
      </div>
      <button
        onClick={() => onRemove(item.id)}
        className="text-slate-300 hover:text-slate-500 transition-colors shrink-0 mt-0.5"
        aria-label="Dismiss"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used inside ToastProvider');
  return ctx.toast;
}
