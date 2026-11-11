import type { ReactNode } from 'react';
import { symbolDef } from '../../model/catalog';

/**
 * Zeichnet ein Installationssymbol in lokalen Koordinaten (mm, y nach unten, Ursprung = Einfügepunkt).
 * `sw` = Strichstärke in lokalen Einheiten. Eigene, vereinfachte Grafiken.
 */
export function SymbolShape({ type, sw, color, fill, props }: { type: string; sw: number; color: string; fill: string; props?: Record<string, unknown> | null }): ReactNode {
  const s = { stroke: color, strokeWidth: sw, fill: 'none', strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const };
  const def = symbolDef(type);
  switch (type) {
    case 'socket':
    case 'socket_multi': {
      const n = type === 'socket_multi' ? Math.max(1, Number(props?.count) || 2) : 1;
      return (
        <g>
          <path d="M -110 0 A 110 110 0 0 0 110 0" {...s} />
          <line x1={-110} y1={0} x2={110} y2={0} {...s} />
          <line x1={0} y1={-110} x2={0} y2={0} {...s} />
          <line x1={-60} y1={-110} x2={60} y2={-110} {...s} />
          {n > 1 && <text x={0} y={90} fontSize={110} textAnchor="middle" fill={color} stroke="none" fontFamily="Helvetica, Arial, sans-serif" fontWeight={700}>{n}</text>}
        </g>
      );
    }
    case 'switch':
    case 'switch_twoway':
    case 'switch_cross':
    case 'pushbutton':
      return (
        <g>
          <circle cx={0} cy={0} r={70} {...s} fill={fill} />
          {type === 'pushbutton' && <circle cx={0} cy={0} r={22} fill={color} />}
          {type !== 'pushbutton' && <line x1={50} y1={-50} x2={150} y2={-150} {...s} />}
          {type !== 'pushbutton' && <line x1={150} y1={-150} x2={185} y2={-115} {...s} />}
          {(type === 'switch_twoway' || type === 'switch_cross') && <><line x1={-50} y1={50} x2={-150} y2={150} {...s} /><line x1={-150} y1={150} x2={-185} y2={115} {...s} /></>}
          {type === 'switch_cross' && <><line x1={-50} y1={-50} x2={-150} y2={-150} {...s} /><line x1={50} y1={50} x2={150} y2={150} {...s} /></>}
        </g>
      );
    case 'light':
      return (
        <g>
          <circle cx={0} cy={0} r={130} {...s} fill={fill} />
          <line x1={-92} y1={-92} x2={92} y2={92} {...s} />
          <line x1={-92} y1={92} x2={92} y2={-92} {...s} />
        </g>
      );
    case 'junction_box':
      return <g><rect x={-90} y={-90} width={180} height={180} {...s} fill={fill} /><circle r={25} fill={color} /></g>;
    case 'branch_box':
      return <g><circle r={90} {...s} fill={fill} /><circle r={40} fill={color} /></g>;
    case 'distribution':
      return <g><rect x={-250} y={-90} width={500} height={180} {...s} fill={fill} /><path d="M -250 90 L 250 -90 L 250 90 Z" fill={color} /></g>;
    case 'fixed':
      return <g><rect x={-90} y={-90} width={180} height={180} {...s} fill={fill} /><line x1={-90} y1={90} x2={90} y2={-90} {...s} /><line x1={0} y1={-90} x2={0} y2={-170} {...s} /></g>;
    case 'data':
      return <g><path d="M -110 80 L 110 80 L 0 -110 Z" {...s} fill={fill} /><text y={60} fontSize={90} textAnchor="middle" fill={color} stroke="none" fontFamily="Helvetica, Arial, sans-serif" fontWeight={700}>D</text></g>;
  }
  // Sanitär: maßstäbliche Objekte
  const w = def?.size?.w ?? 220, d = def?.size?.d ?? 220;
  const hw = w / 2, hd = d / 2;
  switch (type) {
    case 'washbasin':
      return <g><rect x={-hw} y={-hd} width={w} height={d} rx={60} {...s} fill={fill} /><ellipse cx={0} cy={30} rx={hw - 80} ry={hd - 90} {...s} /><circle cx={0} cy={-hd + 60} r={22} fill={color} /></g>;
    case 'wc':
      return <g><rect x={-hw} y={-hd} width={w} height={160} rx={30} {...s} fill={fill} /><ellipse cx={0} cy={60} rx={hw - 20} ry={hd - 110} {...s} fill={fill} /></g>;
    case 'shower':
      return <g><rect x={-hw} y={-hd} width={w} height={d} {...s} fill={fill} /><line x1={-hw} y1={-hd} x2={hw} y2={hd} {...s} /><line x1={-hw} y1={hd} x2={hw} y2={-hd} {...s} /><circle r={45} {...s} fill={fill} /></g>;
    case 'bathtub':
      return <g><rect x={-hw} y={-hd} width={w} height={d} rx={40} {...s} fill={fill} /><rect x={-hw + 70} y={-hd + 70} width={w - 140} height={d - 140} rx={180} {...s} /><circle cx={hw - 180} cy={0} r={30} {...s} /></g>;
    case 'sink':
      return <g><rect x={-hw} y={-hd} width={w} height={d} {...s} fill={fill} /><rect x={-hw + 50} y={-hd + 60} width={w * 0.55} height={d - 120} rx={40} {...s} /><circle cx={-hw + 50 + w * 0.275} cy={0} r={22} fill={color} /></g>;
    case 'washing_machine':
      return <g><rect x={-hw} y={-hd} width={w} height={d} {...s} fill={fill} /><circle r={Math.min(hw, hd) - 80} {...s} /><circle r={Math.min(hw, hd) - 160} {...s} /></g>;
    case 'water_heater':
      return <g><circle r={hw} {...s} fill={fill} /><text y={50} fontSize={150} textAnchor="middle" fill={color} stroke="none" fontFamily="Helvetica, Arial, sans-serif" fontWeight={700}>WW</text></g>;
    case 'valve':
      return <g><path d="M -110 -70 L -110 70 L 110 -70 L 110 70 Z" {...s} fill={fill} /><line x1={0} y1={0} x2={0} y2={-120} {...s} /><line x1={-50} y1={-120} x2={50} y2={-120} {...s} /></g>;
    case 'cold_conn':
    case 'hot_conn':
    case 'waste_conn': {
      const c = type === 'cold_conn' ? '#2563eb' : type === 'hot_conn' ? '#dc2626' : '#78716c';
      const t = type === 'cold_conn' ? 'KW' : type === 'hot_conn' ? 'WW' : 'AW';
      return <g><circle r={100} {...s} stroke={c} fill={fill} /><text y={40} fontSize={100} textAnchor="middle" fill={c} stroke="none" fontFamily="Helvetica, Arial, sans-serif" fontWeight={700}>{t}</text></g>;
    }
  }
  return <circle r={100} {...s} fill={fill} />;
}

/** Kleine Vorschaugrafik für Paletten. */
export function SymbolIcon({ type, size = 28, color = 'currentColor' }: { type: string; size?: number; color?: string }) {
  const def = symbolDef(type);
  const ext = def?.size ? Math.max(def.size.w, def.size.d) / 2 + 40 : 280;
  return (
    <svg width={size} height={size} viewBox={`${-ext} ${-ext} ${ext * 2} ${ext * 2}`} aria-hidden>
      <SymbolShape type={type} sw={ext / 9} color={color} fill="none" />
    </svg>
  );
}
