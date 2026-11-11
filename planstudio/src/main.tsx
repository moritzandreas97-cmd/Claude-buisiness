import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import { App } from './App';

createRoot(document.getElementById('root')!).render(<StrictMode><App /></StrictMode>);

// Testzugriff im Entwicklungsmodus (E2E-Tests prüfen damit den gespeicherten Datenbestand)
if (import.meta.env.DEV) {
  void Promise.all([import('./store/projectStore'), import('./store/uiStore')]).then(([p, u]) => {
    (window as unknown as Record<string, unknown>).__planstudio = { useProject: p.useProject, useUi: u.useUi };
  });
}
