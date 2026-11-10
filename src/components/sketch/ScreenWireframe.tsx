import { Calendar, Search, X } from "lucide-react";
import type { SketchComponent } from "@/lib/types";

/** Deterministic low-fidelity renderer for one sketch component. */
export function SketchPart({ c }: { c: SketchComponent }) {
  const items = c.items ?? [];
  switch (c.type) {
    case "header":
      return <div className="border-b border-sketch-line/60 pb-1.5 text-[13px] font-semibold">{c.label}</div>;
    case "nav":
      return <div className="flex gap-1.5">{(items.length ? items : [c.label]).map((i) => <span key={i} className="sketch-box px-1.5 py-0.5 text-[10px]">{i}</span>)}</div>;
    case "search":
      return <div className="sketch-box flex items-center gap-1.5 px-2 py-1.5 text-[11px] text-muted-foreground"><Search className="size-3" />{c.label}</div>;
    case "input":
      return <div><div className="mb-0.5 text-[10px] text-muted-foreground">{c.label}</div><div className="sketch-box h-6" /></div>;
    case "form":
      return (
        <div className="sketch-box space-y-1.5 p-2">
          <div className="text-[11px] font-medium">{c.label}</div>
          {(items.length ? items : ["Field"]).map((i) => <div key={i}><div className="text-[10px] text-muted-foreground">{i}</div><div className="h-4 rounded-sm border border-sketch-line/70" /></div>)}
        </div>
      );
    case "button":
      return <div className="inline-block rounded-md bg-foreground/85 px-2.5 py-1 text-[11px] font-medium text-background">{c.label}</div>;
    case "list":
      return (
        <div className="space-y-1">
          <div className="text-[10px] uppercase tracking-wide text-muted-foreground">{c.label}</div>
          {(items.length ? items : ["Item", "Item"]).map((i, n) => <div key={n} className="sketch-box flex items-center gap-2 px-2 py-1 text-[10px]"><span className="size-3 rounded-full bg-muted" />{i}</div>)}
        </div>
      );
    case "card":
      return <div className="sketch-box p-2"><div className="text-[11px] font-medium">{c.label}</div><div className="mt-1 h-1.5 w-3/4 rounded bg-muted" /><div className="mt-1 h-1.5 w-1/2 rounded bg-muted" /></div>;
    case "calendar":
      return (
        <div className="sketch-box p-2">
          <div className="mb-1 flex items-center gap-1 text-[10px] font-medium"><Calendar className="size-3" />{c.label}</div>
          <div className="grid grid-cols-7 gap-0.5">{Array.from({ length: 14 }).map((_, i) => <div key={i} className={`h-2.5 rounded-[2px] ${i % 5 === 2 ? "bg-primary/40" : "bg-muted"}`} />)}</div>
        </div>
      );
    case "table": {
      const cols = items.length ? items : ["Column", "Column"];
      return (
        <div className="sketch-box overflow-hidden text-[9px]">
          <div className="border-b border-sketch-line/60 bg-muted/60 px-1.5 py-0.5 text-[10px] font-medium">{c.label}</div>
          <div className="grid" style={{ gridTemplateColumns: `repeat(${cols.length}, minmax(0,1fr))` }}>
            {cols.map((h) => <div key={h} className="truncate px-1.5 py-0.5 font-medium">{h}</div>)}
            {cols.flatMap((h) => [0, 1].map((r) => <div key={h + r} className="px-1.5 py-0.5"><div className="h-1.5 rounded bg-muted" /></div>))}
          </div>
        </div>
      );
    }
    case "modal":
      return (
        <div className="relative rounded-md border border-sketch-line bg-muted/50 p-2">
          <div className="rounded-md border border-sketch-line bg-sketch p-2 shadow-soft">
            <div className="flex items-center justify-between text-[10px] font-medium">{c.label}<X className="size-3" /></div>
            <div className="mt-1 h-1.5 w-2/3 rounded bg-muted" />
          </div>
        </div>
      );
    default:
      return <p className="text-[11px] text-muted-foreground">{c.label}</p>;
  }
}

export function ScreenWireframe({ components }: { components: SketchComponent[] }) {
  return <div className="space-y-2">{components.map((c, i) => <SketchPart key={i} c={c} />)}</div>;
}
