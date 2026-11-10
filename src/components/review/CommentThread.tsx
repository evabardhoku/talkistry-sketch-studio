import { useState } from "react";
import { CheckCircle2, Loader2, RotateCcw } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { can, ROLE_LABEL } from "@/lib/baseline";
import { personName, useReview } from "./ReviewContext";

const KIND_LABEL: Record<string, string> = { comment: "Comment", clarification: "Clarification request", constraint: "Technical constraint", ambiguity: "Ambiguity flag" };
type Target = { requirement_id: string } | { screen_id: string } | { scope_change_id: string };

export function CommentThread({ target, defaultKind = "comment" }: { target: Target; defaultKind?: string }) {
  const ctx = useReview();
  const [body, setBody] = useState("");
  const [kind, setKind] = useState(defaultKind);
  const [busy, setBusy] = useState(false);
  if (!ctx) return null;
  const key = Object.keys(target)[0] as keyof Target;
  const val = (target as Record<string, string>)[key];
  const list = ctx.comments.filter((c) => (c as Record<string, unknown>)[key] === val);
  const roleOf = (id: string) => ctx.people.find((p) => p.user_id === id)?.role;

  async function add(e: React.FormEvent) {
    e.preventDefault(); if (!body.trim() || !ctx) return; setBusy(true);
    const { error } = await supabase.from("review_comments").insert({ project_id: ctx.projectId, author_id: ctx.meId!, kind, body: body.trim(), ...target });
    setBusy(false);
    if (error) toast.error(error.message); else { setBody(""); ctx.onChanged(); }
  }
  async function resolve(id: string, resolved: boolean) {
    const note = resolved ? window.prompt("Resolution note (optional)") ?? "" : null;
    const { error } = await supabase.from("review_comments").update(resolved
      ? { resolved_at: new Date().toISOString(), resolved_by: ctx!.meId, resolution_note: note || null }
      : { resolved_at: null, resolved_by: null, resolution_note: null }).eq("id", id);
    if (error) toast.error(error.message); else ctx!.onChanged();
  }
  return (
    <div className="space-y-2">
      {list.length === 0 && <p className="text-xs text-muted-foreground">No comments yet.</p>}
      {list.map((c) => {
        const canResolve = can.edit(ctx.myRole) && (c.author_id === ctx.meId || ctx.myRole === "owner");
        return (
          <div key={c.id} className={cn("rounded-md border p-2 text-xs", c.resolved_at ? "bg-muted/40 text-muted-foreground" : "bg-background")}>
            <div className="mb-0.5 flex flex-wrap items-center gap-1">
              <b className="text-foreground">{personName(ctx.people, c.author_id)}</b>
              <span className="text-muted-foreground">{ROLE_LABEL[roleOf(c.author_id) ?? ""] ?? ""}</span>
              {c.kind !== "comment" && <span className="rounded bg-unresolved-soft px-1 text-[10px] text-unresolved">{KIND_LABEL[c.kind]}</span>}
              <span className="ml-auto text-muted-foreground">{formatDistanceToNow(new Date(c.created_at), { addSuffix: true })}</span>
            </div>
            <p className="whitespace-pre-wrap">{c.body}</p>
            {c.resolved_at && <p className="mt-1 text-confirmed">Resolved by {personName(ctx.people, c.resolved_by)}{c.resolution_note ? `: ${c.resolution_note}` : ""}</p>}
            {canResolve && (
              <button className="mt-1 inline-flex items-center gap-1 text-[11px] text-primary" onClick={() => resolve(c.id, !c.resolved_at)}>
                {c.resolved_at ? <><RotateCcw className="size-3" />Reopen</> : <><CheckCircle2 className="size-3" />Resolve</>}
              </button>
            )}
          </div>
        );
      })}
      {can.edit(ctx.myRole) && (
        <form onSubmit={add} className="space-y-1.5">
          <Textarea rows={2} value={body} onChange={(e) => setBody(e.target.value)} placeholder="Add a comment…" className="text-xs" />
          <div className="flex gap-1.5">
            <select value={kind} onChange={(e) => setKind(e.target.value)} className="h-8 flex-1 rounded-md border bg-background px-2 text-xs" aria-label="Comment type">
              {Object.entries(KIND_LABEL).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
            </select>
            <Button size="sm" type="submit" className="h-8" disabled={busy || !body.trim()}>{busy && <Loader2 className="size-3 animate-spin" />}Post</Button>
          </div>
        </form>
      )}
    </div>
  );
}

export function openCount(comments: { resolved_at: string | null }[]) { return comments.filter((c) => !c.resolved_at).length; }
