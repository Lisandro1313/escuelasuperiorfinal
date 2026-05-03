import React, { createContext, useCallback, useContext, useState } from 'react';

type ToastType = 'success' | 'error' | 'info';
interface Toast {
  id: number;
  type: ToastType;
  message: string;
}

interface ToastContextValue {
  show: (message: string, type?: ToastType) => void;
  success: (message: string) => void;
  error: (message: string) => void;
  info: (message: string) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export const useToast = (): ToastContextValue => {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    // Fallback si se usa fuera del provider: console.log y window.alert.
    return {
      show: (m) => { console.log('[toast]', m); },
      success: (m) => { console.log('[toast:ok]', m); },
      error: (m) => { console.error('[toast:err]', m); window.alert(m); },
      info: (m) => { console.log('[toast:info]', m); },
    };
  }
  return ctx;
};

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const remove = useCallback((id: number) => {
    setToasts((curr) => curr.filter((t) => t.id !== id));
  }, []);

  const show = useCallback((message: string, type: ToastType = 'info') => {
    const id = Date.now() + Math.random();
    setToasts((curr) => [...curr, { id, type, message }]);
    setTimeout(() => remove(id), 4000);
  }, [remove]);

  const value: ToastContextValue = {
    show,
    success: (m) => show(m, 'success'),
    error: (m) => show(m, 'error'),
    info: (m) => show(m, 'info'),
  };

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="fixed bottom-4 right-4 z-[100] flex flex-col gap-2 pointer-events-none">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`pointer-events-auto px-4 py-3 rounded-lg shadow-lg text-sm font-medium max-w-sm border animate-[slideIn_0.2s_ease-out] ${
              t.type === 'success'
                ? 'bg-green-50 border-green-200 text-green-800'
                : t.type === 'error'
                ? 'bg-red-50 border-red-200 text-red-800'
                : 'bg-blue-50 border-blue-200 text-blue-800'
            }`}
            onClick={() => remove(t.id)}
            role="alert"
          >
            <div className="flex items-start gap-2">
              <span>
                {t.type === 'success' ? '✓' : t.type === 'error' ? '✕' : 'ℹ'}
              </span>
              <span className="flex-1">{t.message}</span>
              <button
                onClick={(e) => { e.stopPropagation(); remove(t.id); }}
                className="text-current opacity-50 hover:opacity-100 leading-none text-lg"
                aria-label="Cerrar"
              >
                &times;
              </button>
            </div>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
};
