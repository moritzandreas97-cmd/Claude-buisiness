import { useProject } from './projectStore';
import { useUi } from './uiStore';
import type { Tx } from './tx';

/** Führt eine Modelländerung aus und meldet Fehler verständlich. Gibt undefined bei Fehler zurück. */
export function useRun() {
  return async <R,>(label: string, fn: (tx: Tx) => R): Promise<R | undefined> => {
    try { return await useProject.getState().mutate(label, fn); }
    catch (e) { useUi.getState().toast(e instanceof Error ? e.message : String(e), 'error'); return undefined; }
  };
}

/** Datei als Text/Bytes vom Benutzer wählen lassen (funktioniert in Browser, Desktop und Android-WebView). */
export function pickFiles(accept: string, multiple = false): Promise<File[]> {
  return new Promise((resolve) => {
    const input = document.createElement('input');
    input.type = 'file'; input.accept = accept; input.multiple = multiple;
    input.onchange = () => resolve([...(input.files ?? [])]);
    input.click();
  });
}
