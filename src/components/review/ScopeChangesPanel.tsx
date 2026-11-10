import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { AlertTriangle, Check, MessageSquare, X } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { can } from "@/lib/baseline";
import type { Database } from "@/integrations/supabase/types";
import type { SpecVersion } from "@/lib/types";
import { CommentThread, openCount } from "./CommentThread";
import { personName, useReview } from "./ReviewContext";

export type ScopeChange = Database["public"]["Tables"]["scope_changes"]["Row"];
const KIND: Record<string, string> = { new_functionality: "New functionality", changed_behavior: "Changed behaviour", conflict: "Conflicts with baseline", removed_assumption: "Removes an assumption" };

function ScopeCard({ c, version }: { c: ScopeChange; version: number | undefined }) {
  const ctx = useReview()!;
  const [est, setEst] = useState(c.developer_estimate ?? "");
  const [thread, setThread] = useState(false);
  const comments = ctx.comments.filter((x) => x.scope_change_id === c.id);
  async function patch(p: Partial<ScopeChange>) {
    const { error } = await supabase.from("scope_changes").update(p).eq("id", c.id);
    if (error) toast.error(error.message); else ctx.onChanged();
  }
  return (
    <div className={cn("rounded-lg border bg-card p-3 text-sm", c.status !== "open" && "opacity-75")}>
      <div className="mb-1 flex flex-wrap items-center gap-1.5 text-[11px]">
        <span className="rounded-full bg-unresolved-soft px-2 py-0.5 font-medium text-unresolved">{KIND[c.kind]}</span>
        <span className="text-muted-foreground">vs approved v{version ?? "?"}</span>
        <span className={cn("ml-auto font-medium", c.status === "accepted" ? "text-confirmed" : c.status === "rejected" ? "text-destructive" : "text-muted-foreground")}>{c.status === "open" ? "Awaiting owner review" : `${c.status} by ${personName(ctx.people, c.reviewed_by)}`}</span>
      </div>
      <p className="font-medium">{c.summary}</p>
      <div className="mt-2 grid gap-2 text-xs sm:grid-cols-2">
        <div className="rounded-md border bg-muted/40 p-2"><div className="mb-0.5 text-[10px] uppercase tracking-wide text-muted-foreground">Before (approved)</div>{c.before_text ?? <i className="text-muted-foreground">Not in the baseline</i>}</div>
        <div className="rounded-md border border-primary/30 bg-primary-soft p-2"><div className="mb-0.5 text-[10px] uppercase tracking-wide text-muted-foreground">After (new request)</div>“{c.after_text}”</div>
      </div>
      {c.explanation && <p className="mt-2 text-xs text-muted-foreground"><b className="text-foreground">Why it may affect scope:</b> {c.explanation}</p>}
      <div className="mt-2 flex flex-wrap items-center gap-1.5 text-xs">
        {can.estimate(ctx.myRole) ? (
          <form className="flex items-center gap-1" onSubmit={(e) => { e.preventDefault(); patch({ developer_estimate: est.trim() || null }); }}>
            <Input value={est} onChange={(e) => setEst(e.target.value)} placeholder="Developer estimate, e.g. ~3 days" className="h-7 w-48 text-xs" aria-label="Developer estimate" />
            <Button size="sm" variant="outline" className="h-7 text-xs" type="submit">Save</Button>
          </form>
        ) : <span className="text-muted-foreground">Estimate: {c.developer_estimate ?? "not provided"}</span>}
        {c.developer_estimate && c.estimate_by && <span className="text-muted-foreground">by {personName(ctx.people, c.estimate_by)}</span>}
        <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => setThread(!thread)}><MessageSquare className="size-3" />{comments.length || ""} {openCount(comments) ? `· ${openCount(comments)} open` : "Discuss"}</Button>
        {can.approve(ctx.myRole) && c.status === "open" && <>
          <Button size="sm" className="h-7 text-xs" onClick={() => patch({ status: "accepted" })}><Check className="size-3" />Accept into scope</Button>
          <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => patch({ status: "rejected" })}><X className="size-3" />Reject</Button>
        </>}
        {can.approve(ctx.myRole) && c.status !== "open" && <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => patch({ status: "open" })}>Reopen</Button>}
      </div>
      {thread && <div className="mt-2 border-t pt-2"><CommentThread target={{ scope_change_id: c.id }} /></div>}
    </div>
  );
}

export function ScopeChangesPanel({ changes, baselines, projectId }: { changes: ScopeChange[]; baselines: SpecVersion[]; projectId: string }) {
  const ver = (id: string) => baselines.find((b) => b.id === id)?.version;
  if (!baselines.length) {
    return <div className="p-6 text-center text-sm text-muted-foreground">Scope tracking starts once the owner approves a baseline. <Link to="/projects/$projectId/versions" params={{ projectId }} className="text-primary">Open versions</Link></div>;
  }
  const open = changes.filter((c) => c.status === "open");
  return (
    <div className="h-full space-y-2 overflow-y-auto p-4">
      <p className="flex items-start gap-1.5 text-xs text-muted-foreground"><AlertTriangle className="mt-0.5 size-3.5 shrink-0 text-unresolved" />New requests are compared with approved v{baselines[0]!.version}. {open.length} awaiting review. Cost and time are never estimated automatically.</p>
      {changes.length === 0 && <p className="py-6 text-center text-sm text-muted-foreground">No potential scope changes detected.</p>}
      {changes.map((c) => <ScopeCard key={c.id + c.updated_at} c={c} version={ver(c.baseline_id)} />)}
    </div>
  );
}
