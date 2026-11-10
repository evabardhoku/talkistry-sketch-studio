import { useMemo } from "react";
import { AlertCircle, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { parseComponents, parseStrings, type Connection, type ScreenRow } from "@/lib/types";
import { ScreenWireframe } from "./ScreenWireframe";

const W = 232, H = 290, GX = 72, GY = 70, PAD = 40, LANE_LABEL = 28;

/** Deterministic swimlane layout: one row per user role, screens ordered by position. */
export function layoutScreens(screens: ScreenRow[]) {
  const lanes: string[] = [];
  for (const s of screens) { const r = s.user_role || "General"; if (!lanes.includes(r)) lanes.push(r); }
  const counters = new Map<string, number>();
  const pos = new Map<string, { x: number; y: number }>();
  for (const s of [...screens].sort((a, b) => a.position - b.position)) {
    const lane = s.user_role || "General";
    const col = counters.get(lane) ?? 0; counters.set(lane, col + 1);
    pos.set(s.id, { x: PAD + col * (W + GX), y: PAD + lanes.indexOf(lane) * (H + GY + LANE_LABEL) + LANE_LABEL });
  }
  const cols = Math.max(1, ...counters.values());
  return { lanes, pos, width: PAD * 2 + cols * W + (cols - 1) * GX, height: PAD * 2 + lanes.length * (H + GY + LANE_LABEL) - GY };
}

export function SketchCanvas({ screens, connections, selectedId, onSelect, recentIds }: {
  screens: ScreenRow[]; connections: Connection[]; selectedId: string | null; onSelect: (id: string) => void; recentIds: Set<string>;
}) {
  const { lanes, pos, width, height } = useMemo(() => layoutScreens(screens), [screens]);
  if (!screens.length) {
    return (
      <div className="grid h-full place-items-center bg-dotgrid p-8 text-center">
        <div className="max-w-xs">
          <Sparkles className="mx-auto mb-3 size-6 text-primary" />
          <p className="font-display text-2xl">Your sketch will appear here</p>
          <p className="mt-2 text-sm text-muted-foreground">Describe your idea in the conversation. Screens and flows are drawn from what you say.</p>
        </div>
      </div>
    );
  }
  return (
    <div className="h-full overflow-auto bg-dotgrid">
      <div className="relative" style={{ width, height, minWidth: "100%" }}>
        {lanes.map((l, i) => (
          <div key={l} className="absolute left-10 text-[11px] font-medium uppercase tracking-wider text-muted-foreground" style={{ top: PAD + i * (H + GY + LANE_LABEL) }}>{l}</div>
        ))}
        <svg className="pointer-events-none absolute inset-0" width={width} height={height}>
          <defs>
            <marker id="arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
              <path d="M0 0 L10 5 L0 10 z" className="fill-primary" />
            </marker>
          </defs>
          {connections.map((c) => {
            const a = pos.get(c.from_screen_id), b = pos.get(c.to_screen_id);
            if (!a || !b) return null;
            const sameRow = a.y === b.y;
            const x1 = b.x > a.x ? a.x + W : sameRow ? a.x : a.x + W / 2;
            const y1 = sameRow ? a.y + H / 2 : b.y > a.y ? a.y + H : a.y;
            const x2 = b.x > a.x ? b.x : sameRow ? b.x + W : b.x + W / 2;
            const y2 = sameRow ? b.y + H / 2 : b.y > a.y ? b.y : b.y + H;
            const mx = (x1 + x2) / 2;
            const d = sameRow ? `M${x1},${y1} C${mx},${y1} ${mx},${y2} ${x2},${y2}` : `M${x1},${y1} C${x1},${(y1 + y2) / 2} ${x2},${(y1 + y2) / 2} ${x2},${y2}`;
            return (
              <g key={c.id}>
                <path d={d} fill="none" className="stroke-primary/60" strokeWidth={1.5} strokeDasharray="4 3" markerEnd="url(#arrow)" />
                {c.label && <text x={(x1 + x2) / 2} y={(y1 + y2) / 2 - 6} textAnchor="middle" className="fill-muted-foreground text-[10px]">{c.label}</text>}
              </g>
            );
          })}
        </svg>
        {screens.map((s) => {
          const p = pos.get(s.id)!;
          const unresolved = parseStrings(s.unresolved);
          const recent = recentIds.has(s.id);
          return (
            <button key={s.id} type="button" onClick={() => onSelect(s.id)}
              className={cn("absolute flex flex-col overflow-hidden rounded-xl border bg-sketch text-left shadow-soft transition-all hover:shadow-lift",
                selectedId === s.id && "ring-2 ring-primary", recent && "changed-pulse border-primary/60")}
              style={{ left: p.x, top: p.y, width: W, height: H }}>
              <div className="flex items-center gap-1.5 border-b bg-muted/50 px-2.5 py-1.5">
                <span className="size-1.5 rounded-full bg-sketch-line" /><span className="size-1.5 rounded-full bg-sketch-line" />
                <span className="ml-1 truncate text-[11px] font-medium">{s.name}</span>
                {recent && <span className="ml-auto rounded bg-primary-soft px-1.5 text-[9px] font-semibold text-primary">UPDATED</span>}
              </div>
              <div className="flex-1 overflow-hidden p-2.5"><ScreenWireframe components={parseComponents(s.components)} /></div>
              {unresolved.length > 0 && (
                <div className="flex items-center gap-1 border-t bg-unresolved-soft px-2.5 py-1 text-[10px] text-unresolved">
                  <AlertCircle className="size-3 shrink-0" /><span className="truncate">{unresolved.length} unresolved · {unresolved[0]}</span>
                </div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
