import { useState, useCallback } from 'react';

interface Toast {
  id: string;
  title: string;
  description?: string;
  variant?: 'default' | 'destructive';
}

let toastCount = 0;
const listeners: Array<(toasts: Toast[]) => void> = [];
let toasts: Toast[] = [];

function notifyListeners() {
  listeners.forEach(l => l([...toasts]));
}

export function toast(opts: Omit<Toast, 'id'>) {
  const id = String(++toastCount);
  toasts = [...toasts, { ...opts, id }];
  notifyListeners();
  setTimeout(() => {
    toasts = toasts.filter(t => t.id !== id);
    notifyListeners();
  }, 4000);
}

export function useToastState() {
  const [state, setState] = useState<Toast[]>([]);
  const subscribe = useCallback(() => {
    listeners.push(setState);
    return () => {
      const idx = listeners.indexOf(setState);
      if (idx > -1) listeners.splice(idx, 1);
    };
  }, []);
  return { toasts: state, subscribe };
}
