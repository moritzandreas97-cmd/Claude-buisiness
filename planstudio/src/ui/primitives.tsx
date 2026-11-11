import { forwardRef, useEffect, type ButtonHTMLAttributes, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes, type TextareaHTMLAttributes } from 'react';
import { X } from 'lucide-react';

export const cn = (...c: (string | false | null | undefined)[]) => c.filter(Boolean).join(' ');

type BtnVariant = 'default' | 'primary' | 'ghost' | 'danger' | 'outline';
export const Button = forwardRef<HTMLButtonElement, ButtonHTMLAttributes<HTMLButtonElement> & { variant?: BtnVariant; size?: 'sm' | 'md' | 'icon'; active?: boolean }>(
  ({ variant = 'default', size = 'md', active, className, ...p }, ref) => (
    <button
      ref={ref}
      {...p}
      className={cn(
        'inline-flex items-center justify-center gap-1.5 rounded-md font-medium transition-colors select-none touch-lg disabled:opacity-40 disabled:pointer-events-none focus-visible:outline-2 focus-visible:outline-accent',
        size === 'sm' && 'h-7 px-2 text-xs', size === 'md' && 'h-9 px-3 text-sm', size === 'icon' && 'h-9 w-9',
        variant === 'default' && 'bg-panel2 border border-line hover:bg-hover',
        variant === 'outline' && 'border border-line hover:bg-hover',
        variant === 'primary' && 'bg-accent text-accent-fg hover:brightness-110',
        variant === 'ghost' && 'hover:bg-hover',
        variant === 'danger' && 'bg-danger text-white hover:brightness-110',
        active && 'bg-accent/15 text-accent ring-1 ring-accent/50',
        className,
      )}
    />
  ),
);

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(({ className, ...p }, ref) => (
  <input ref={ref} {...p} className={cn('h-9 w-full rounded-md border border-line bg-panel px-2.5 text-sm outline-none focus:border-accent focus:ring-2 focus:ring-accent/25 touch-lg', className)} />
));
export const Textarea = (p: TextareaHTMLAttributes<HTMLTextAreaElement>) => (
  <textarea {...p} className={cn('w-full rounded-md border border-line bg-panel px-2.5 py-2 text-sm outline-none focus:border-accent focus:ring-2 focus:ring-accent/25', p.className)} />
);
export const Select = ({ className, children, ...p }: SelectHTMLAttributes<HTMLSelectElement>) => (
  <select {...p} className={cn('h-9 w-full rounded-md border border-line bg-panel px-2 text-sm outline-none focus:border-accent touch-lg', className)}>{children}</select>
);

export function Field({ label, children, hint, className }: { label: string; children: ReactNode; hint?: ReactNode; className?: string }) {
  return (
    <label className={cn('flex flex-col gap-1', className)}>
      <span className="text-[11px] font-medium uppercase tracking-wide text-muted">{label}</span>
      {children}
      {hint && <span className="text-[11px] text-muted">{hint}</span>}
    </label>
  );
}

export function Card({ title, actions, children, className }: { title?: ReactNode; actions?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={cn('rounded-xl border border-line bg-panel', className)}>
      {(title || actions) && (
        <header className="flex items-center justify-between gap-2 border-b border-line px-4 py-2.5">
          <h3 className="text-sm font-semibold">{title}</h3>
          <div className="flex items-center gap-1.5">{actions}</div>
        </header>
      )}
      <div className="p-4">{children}</div>
    </section>
  );
}

export function Badge({ children, tone = 'default' }: { children: ReactNode; tone?: 'default' | 'accent' | 'ok' | 'warn' | 'danger' }) {
  return (
    <span className={cn('inline-flex items-center rounded px-1.5 py-0.5 text-[11px] font-medium whitespace-nowrap',
      tone === 'default' && 'bg-hover text-muted', tone === 'accent' && 'bg-accent/15 text-accent', tone === 'ok' && 'bg-ok/15 text-ok',
      tone === 'warn' && 'bg-warn/15 text-warn', tone === 'danger' && 'bg-danger/15 text-danger')}>{children}</span>
  );
}

export function Dialog({ open, title, onClose, children, footer, wide }: { open: boolean; title: string; onClose(): void; children: ReactNode; footer?: ReactNode; wide?: boolean }) {
  useEffect(() => {
    if (!open) return;
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div role="dialog" aria-label={title} className={cn('flex max-h-[90vh] w-full flex-col rounded-xl border border-line bg-panel shadow-2xl', wide ? 'max-w-3xl' : 'max-w-lg')}>
        <header className="flex items-center justify-between border-b border-line px-4 py-3">
          <h2 className="text-base font-semibold">{title}</h2>
          <Button variant="ghost" size="icon" onClick={onClose} aria-label="Schließen"><X size={16} /></Button>
        </header>
        <div className="overflow-auto p-4">{children}</div>
        {footer && <footer className="flex justify-end gap-2 border-t border-line px-4 py-3">{footer}</footer>}
      </div>
    </div>
  );
}

export function Tabs<T extends string>({ value, onChange, items }: { value: T; onChange: (v: NoInfer<T>) => void; items: { v: NoInfer<T>; label: string; icon?: ReactNode }[] }) {
  return (
    <div className="flex gap-1 rounded-lg bg-panel2 p-1" role="tablist">
      {items.map((i) => (
        <button key={i.v} role="tab" aria-selected={value === i.v} onClick={() => onChange(i.v)}
          className={cn('flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium touch-lg', value === i.v ? 'bg-panel text-fg shadow-sm' : 'text-muted hover:text-fg')}>
          {i.icon}{i.label}
        </button>
      ))}
    </div>
  );
}

export function Empty({ children }: { children: ReactNode }) {
  return <div className="rounded-lg border border-dashed border-line p-6 text-center text-sm text-muted">{children}</div>;
}

export function PageHeader({ title, subtitle, actions }: { title: string; subtitle?: ReactNode; actions?: ReactNode }) {
  return (
    <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">{title}</h1>
        {subtitle && <p className="mt-0.5 text-sm text-muted">{subtitle}</p>}
      </div>
      <div className="flex flex-wrap items-center gap-2">{actions}</div>
    </div>
  );
}

/** Kompakte Tabelle */
export function Table({ head, children }: { head: ReactNode[]; children: ReactNode }) {
  return (
    <div className="overflow-auto rounded-lg border border-line">
      <table className="w-full border-collapse text-sm">
        <thead className="bg-panel2 text-left text-[11px] uppercase tracking-wide text-muted">
          <tr>{head.map((h, i) => <th key={i} className="whitespace-nowrap px-3 py-2 font-medium">{h}</th>)}</tr>
        </thead>
        <tbody className="[&>tr]:border-t [&>tr]:border-line [&>tr:hover]:bg-hover/50">{children}</tbody>
      </table>
    </div>
  );
}
export const Td = ({ children, className }: { children?: ReactNode; className?: string }) => <td className={cn('px-3 py-1.5 align-middle', className)}>{children}</td>;
