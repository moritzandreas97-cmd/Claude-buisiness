import { useRef, type ReactNode } from 'react';
import { Button } from './primitives';

/**
 * Schaltfläche mit dauerhaft im DOM vorhandenem Dateifeld. Funktioniert mit dem
 * System-Dateiauswahldialog (Desktop, Android-WebView) und ist automatisiert testbar
 * (WebDriver/CDP können das Feld über `data-testid` direkt befüllen).
 */
export function FilePickButton({ accept, onFiles, children, testId, variant, size }: {
  accept: string; onFiles(files: File[]): void | Promise<void>; children: ReactNode; testId: string;
  variant?: 'default' | 'primary'; size?: 'sm' | 'md';
}) {
  const ref = useRef<HTMLInputElement>(null);
  return (
    <>
      <input ref={ref} type="file" accept={accept} data-testid={testId} className="hidden" aria-hidden tabIndex={-1}
        onChange={async (e) => { const files = [...(e.target.files ?? [])]; e.target.value = ''; if (files.length) await onFiles(files); }} />
      <Button variant={variant} size={size} onClick={() => ref.current?.click()}>{children}</Button>
    </>
  );
}
