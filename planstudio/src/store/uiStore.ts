import { create } from 'zustand';
import type { Pt } from '../model/types';
import { ALL_LAYERS, type Layers } from '../features/plan/PlanRenderer';

export type ModuleId = 'dashboard' | 'building' | 'bestand' | 'plan' | 'room' | 'electrical' | 'sanitary' | 'phases' | 'tasks' | 'materials' | 'costs' | 'docs' | 'reports' | 'settings';
export type PlanMode = 'architecture' | 'electrical' | 'sanitary' | 'interior';
export type Tool =
  | 'select' | 'pan' | 'wall' | 'room' | 'room_rect' | 'door' | 'window' | 'dimension' | 'measure'
  | 'symbol' | 'line' | 'furniture' | 'podest' | 'beam' | 'plate';
export interface Selection { table: 'components' | 'plan_objects' | 'lines' | 'rooms'; id: string }
export interface Toast { id: number; kind: 'info' | 'success' | 'error'; text: string }

interface UiState {
  module: ModuleId;
  floorId: string | null;
  mode: PlanMode;
  tool: Tool;
  symbolType: string;
  lineType: 'cable' | 'cold' | 'hot' | 'waste';
  furnitureType: string;
  selection: Selection[];
  layers: Layers;
  grid: number;
  gridVisible: boolean;
  snap: boolean;
  ortho: boolean;
  cursor: Pt | null;
  scaleInfo: string;
  hint: string;
  theme: 'dark' | 'light';
  navCollapsed: boolean;
  propsCollapsed: boolean;
  wallThickness: number;
  roomFilter: string | null;
  activeCircuitId: string | null;
  placeRoomId: string | null;
  cableType: string;
  toasts: Toast[];
  set(patch: Partial<UiState>): void;
  setTool(t: Tool): void;
  setMode(m: PlanMode): void;
  select(sel: Selection[]): void;
  toast(text: string, kind?: Toast['kind']): void;
}

const pref = <T,>(k: string, d: T): T => { try { const v = localStorage.getItem('planstudio.ui.' + k); return v == null ? d : (JSON.parse(v) as T); } catch { return d; } };
const savePref = (k: string, v: unknown) => { try { localStorage.setItem('planstudio.ui.' + k, JSON.stringify(v)); } catch { /* ignore */ } };
const PERSIST: (keyof UiState)[] = ['theme', 'grid', 'gridVisible', 'snap', 'ortho', 'navCollapsed', 'propsCollapsed', 'wallThickness', 'layers'];

let toastId = 1;
export const useUi = create<UiState>((set, get) => ({
  module: 'dashboard',
  floorId: null,
  mode: 'architecture',
  tool: 'select',
  symbolType: 'socket',
  lineType: 'cable',
  furnitureType: 'bed',
  selection: [],
  layers: pref('layers', ALL_LAYERS),
  grid: pref('grid', 100),
  gridVisible: pref('gridVisible', true),
  snap: pref('snap', true),
  ortho: pref('ortho', true),
  cursor: null,
  scaleInfo: '',
  hint: '',
  theme: pref('theme', 'dark'),
  navCollapsed: pref('navCollapsed', false),
  propsCollapsed: pref('propsCollapsed', false),
  wallThickness: pref('wallThickness', 240),
  roomFilter: null,
  activeCircuitId: null,
  placeRoomId: null,
  cableType: 'NYM-J 3x1,5',
  toasts: [],
  set(patch) {
    set(patch);
    for (const k of PERSIST) if (k in patch) savePref(k, (patch as Record<string, unknown>)[k]);
  },
  setTool(t) { set({ tool: t, hint: '' }); },
  setMode(m) {
    const tool = get().tool;
    const keep = tool === 'select' || tool === 'pan' || tool === 'measure';
    set({ mode: m, tool: keep ? tool : 'select', selection: [] });
  },
  select(selection) { set({ selection }); },
  toast(text, kind = 'info') {
    const id = toastId++;
    set((s) => ({ toasts: [...s.toasts, { id, kind, text }] }));
    setTimeout(() => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })), kind === 'error' ? 7000 : 3500);
  },
}));
