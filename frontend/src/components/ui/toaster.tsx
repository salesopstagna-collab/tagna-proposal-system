import { useEffect, useState } from 'react';
import { useToastState } from '@/hooks/useToast';
import { cn } from '@/lib/utils';
import { X } from 'lucide-react';

export function Toaster() {
  const { toasts, subscribe } = useToastState();

  useEffect(() => {
    const unsub = subscribe();
    return unsub;
  }, [subscribe]);

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2">
      {toasts.map(t => (
        <div key={t.id} className={cn('min-w-[300px] rounded-lg border p-4 shadow-lg bg-background', t.variant === 'destructive' && 'border-destructive bg-destructive text-destructive-foreground')}>
          <p className="font-semibold text-sm">{t.title}</p>
          {t.description && <p className="text-sm mt-1 opacity-80">{t.description}</p>}
        </div>
      ))}
    </div>
  );
}
