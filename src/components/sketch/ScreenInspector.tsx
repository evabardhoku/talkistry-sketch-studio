import { useState } from "react";
import { AlertCircle, ArrowRight, Loader2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { parseComponents, parseStrings, type Connection, type ScreenRow } from "@/lib/types";
import { ScreenWireframe } from "./ScreenWireframe";
import { CommentThread } from "@/components/review/CommentThread";
import { useReview } from "@/components/review/ReviewContext";
import { can } from "@/lib/baseline";
import { ActionTooltip } from '@/components/ActionTooltip';

export function ScreenInspector({ screen, screens, connections, onClose, onRequestChange, onSelect, busy }: {
  screen: ScreenRow; screens: ScreenRow[]; connections: Connection[]; onClose: () => void;
  onRequestChange: (text: string) => Promise<boolean>; onSelect: (id: string) => void; busy: boolean;
}) {
  const [text, setText] = useState("");
  const ctx = useReview();
  const name = (id: string) => screens.find((s) => s.id === id)?.name ?? "?";
  const out = connections.filter((c) => c.from_screen_id === screen.id);
  const inc = connections.filter((c) => c.to_screen_id === screen.id);
  const unresolved = parseStrings(screen.unresolved);
  return (
    <aside className="flex h-full min-h-0 w-full min-w-0 flex-col bg-card">
      <div className="flex items-start justify-between gap-2 border-b p-4">
        <div className="min-w-0 break-words">
          <div className="text-[11px] uppercase tracking-wider text-muted-foreground">{screen.user_role || "General"} screen</div>
          <h3 className="font-display text-2xl leading-tight">{screen.name}</h3>
        </div>
        <ActionTooltip label="Close screen details"><Button variant="ghost" size="icon" className="shrink-0" onClick={onClose} aria-label="Close inspector"><X className="size-4" /></Button></ActionTooltip>
      </div>
      <div className="min-h-0 min-w-0 flex-1 space-y-5 overflow-y-auto break-words p-4 text-sm">
        <section><h4 className="mb-1 text-xs font-medium text-muted-foreground">Purpose</h4><p>{screen.purpose || "—"}</p></section>
        {screen.change_note && <section className="rounded-lg bg-primary-soft p-2.5 text-xs text-accent-foreground">Last change: {screen.change_note}</section>}
        {unresolved.length > 0 && (
          <section><h4 className="mb-1 text-xs font-medium text-muted-foreground">Unresolved functionality</h4>
            <ul className="space-y-1">{unresolved.map((u) => <li key={u} className="flex gap-1.5 text-unresolved"><AlertCircle className="mt-0.5 size-3.5 shrink-0" />{u}</li>)}</ul>
          </section>
        )}
        <section><h4 className="mb-1 text-xs font-medium text-muted-foreground">Navigation</h4>
          {!out.length && !inc.length && <p className="text-muted-foreground">No links yet.</p>}
          <ul className="space-y-1">
            {inc.map((c) => <li key={c.id}><button className="text-left hover:text-primary" onClick={() => onSelect(c.from_screen_id)}>{name(c.from_screen_id)} <ArrowRight className="inline size-3" /> here {c.label && <span className="text-muted-foreground">· {c.label}</span>}</button></li>)}
            {out.map((c) => <li key={c.id}><button className="text-left hover:text-primary" onClick={() => onSelect(c.to_screen_id)}>here <ArrowRight className="inline size-3" /> {name(c.to_screen_id)} {c.label && <span className="text-muted-foreground">· {c.label}</span>}</button></li>)}
          </ul>
        </section>
        <section><h4 className="mb-2 text-xs font-medium text-muted-foreground">Layout</h4>
          <div className="rounded-lg border bg-sketch p-3"><ScreenWireframe components={parseComponents(screen.components)} /></div>
        </section>
        <section><h4 className="mb-2 text-xs font-medium text-muted-foreground">Review comments</h4><CommentThread key={screen.id} target={{ screen_id: screen.id }} /></section>
      </div>
      {(!ctx || can.edit(ctx.myRole)) && <form className="space-y-2 border-t p-4" onSubmit={async (e) => {
        e.preventDefault();
        if (!text.trim()) return;
        if (await onRequestChange(`Change request for the "${screen.name}" screen: ${text.trim()}`)) setText("");
      }}>
        <label className="text-xs font-medium text-muted-foreground" htmlFor="change">Request a change to this screen</label>
        <Textarea id="change" rows={2} value={text} onChange={(e) => setText(e.target.value)} placeholder="e.g. Parents should also filter by price" />
        <Button type="submit" size="sm" className="w-full" disabled={busy || !text.trim()}>{busy ? <Loader2 className="size-4 animate-spin" /> : null}Send to discovery</Button>
      </form>}
    </aside>
  );
}
