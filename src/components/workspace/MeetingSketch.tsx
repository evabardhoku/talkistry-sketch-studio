import { ChevronLeft, ChevronRight, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScreenWireframe } from "@/components/sketch/ScreenWireframe";
import { StatusBadge } from "@/components/StatusBadge";
import { parseComponents, parseStrings } from "@/lib/types";
import type { Workspace } from "@/lib/queries";
import { ActionTooltip } from '@/components/ActionTooltip';

export function MeetingSketch({ data, selected, onSelect, recentIds }: { data: Workspace; selected: string | null; onSelect: (id: string) => void; recentIds: Set<string> }) {
  const screen = data.screens.find((s) => s.id === selected) ?? data.screens.find((s) => recentIds.has(s.id)) ?? data.screens[0];
  const index = screen ? data.screens.indexOf(screen) : 0;
  const move = (offset: number) => { const s = data.screens[(index + offset + data.screens.length) % data.screens.length]; if (s) onSelect(s.id); };
  return <section aria-label="Meeting product sketch" className="flex h-full min-h-0 flex-col bg-dotgrid">
    <div className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-1 border-b bg-card px-3 py-3">
      <ActionTooltip label="Previous screen"><Button size="icon" variant="ghost" className="min-h-11 min-w-11 shrink-0" aria-label="Previous screen" disabled={!screen} onClick={() => move(-1)}><ChevronLeft className="size-4" /></Button></ActionTooltip>
      <select aria-label="Presentation screen" value={screen?.id ?? ""} onChange={(e) => onSelect(e.target.value)} className="h-11 min-w-0 flex-1 rounded-md border bg-background px-2 text-sm">
        {!screen && <option value="">No screens yet</option>}{data.screens.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
      </select>
      <ActionTooltip label="Next screen"><Button size="icon" variant="ghost" className="min-h-11 min-w-11 shrink-0" aria-label="Next screen" disabled={!screen} onClick={() => move(1)}><ChevronRight className="size-4" /></Button></ActionTooltip>
    </div>
    <div className="min-h-0 min-w-0 flex-1 overflow-y-auto break-words p-5 md:p-8">
      {screen ? <>
        <div className="mx-auto max-w-lg"><div className="mb-4"><p className="text-xs text-muted-foreground">{screen.user_role || "General"} · Proposed screen {index + 1}/{data.screens.length}</p><h2 className="font-display text-3xl">{screen.name}</h2><p className="mt-1 text-sm text-muted-foreground">{screen.purpose}</p></div>
          {recentIds.has(screen.id) && <p role="status" className="mb-3 flex gap-2 rounded-md bg-primary-soft p-3 text-sm text-primary"><Sparkles className="size-4 shrink-0" />Latest sketch change: {screen.change_note || "Updated after the latest answer"}</p>}
          <div className="rounded-lg border bg-sketch p-6 shadow-soft"><ScreenWireframe components={parseComponents(screen.components)} /></div>
          {parseStrings(screen.unresolved).map((q, i) => <p key={i} className="mt-2 text-sm text-unresolved">Unresolved: {q}</p>)}
          <h3 className="mt-6 text-sm font-medium">Requirement review</h3>
          <ul className="mt-2 space-y-2">{data.requirements.filter((r) => r.status === "confirmed" || r.status === "proposed").map((r) => <li key={r.id} className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3 border-b py-2 text-sm"><span className="min-w-0 break-words">{r.title}</span><StatusBadge className="shrink-0" status={r.status} /></li>)}</ul>
        </div>
      </> : <p className="mx-auto max-w-sm text-center text-muted-foreground">No sketch yet. Describe the product idea to begin.</p>}
    </div>
  </section>;
}