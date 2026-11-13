import type { ScreenRow } from './types';
export const NODE_W = 232, NODE_H = 290;
const GX = 72, GY = 98, PAD = 40;
type Box = { x: number; y: number; w: number; h: number };
export type LayoutScreen = Pick<ScreenRow, 'id' | 'position' | 'user_role' | 'layout_x' | 'layout_y' | 'layout_w' | 'layout_h'>;

export const isManual = (s: LayoutScreen) => s.layout_x !== null && s.layout_y !== null;
const overlaps = (a: Box, b: Box) => a.x < b.x + b.w + 16 && b.x < a.x + a.w + 16 && a.y < b.y + b.h + 16 && b.y < a.y + a.h + 16;

/** Automatic swimlane positions (one row per role), used when no manual layout exists. */
export function autoLayout(screens: LayoutScreen[]) {
  const lanes: string[] = [];
  for (const s of screens) { const r = s.user_role || 'General'; if (!lanes.includes(r)) lanes.push(r); }
  const counters = new Map<string, number>();
  const pos = new Map<string, { x: number; y: number }>();
  for (const s of [...screens].sort((a, b) => a.position - b.position)) {
    const lane = s.user_role || 'General';
    const col = counters.get(lane) ?? 0; counters.set(lane, col + 1);
    pos.set(s.id, { x: PAD + col * (NODE_W + GX), y: PAD + lanes.indexOf(lane) * (NODE_H + GY) });
  }
  return pos;
}

/** Manual positions/sizes always win; new automatic nodes are moved right until they no longer overlap any placed node. */
export function resolveLayout(screens: LayoutScreen[]): Map<string, Box> {
  const auto = autoLayout(screens);
  const out = new Map<string, Box>();
  for (const s of screens) if (isManual(s)) out.set(s.id, { x: s.layout_x!, y: s.layout_y!, w: s.layout_w ?? NODE_W, h: s.layout_h ?? NODE_H });
  for (const s of [...screens].sort((a, b) => a.position - b.position)) {
    if (out.has(s.id)) continue;
    const p = auto.get(s.id)!;
    const box = { x: p.x, y: p.y, w: s.layout_w ?? NODE_W, h: s.layout_h ?? NODE_H };
    let guard = 0;
    while ([...out.values()].some(b => overlaps(b, box)) && guard++ < 200) box.x += NODE_W / 2;
    out.set(s.id, box);
  }
  return out;
}
