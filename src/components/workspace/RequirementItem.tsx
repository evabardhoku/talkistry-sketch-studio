import { useState } from "react";
import { Check, Clock, HelpCircle, MessageSquare, MessageSquareQuote, Pencil, Ban, Trash2, Undo2 } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { useReview, personName } from "@/components/review/ReviewContext";
import { CommentThread, openCount } from "@/components/review/CommentThread";
import { can } from "@/lib/baseline";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { StatusBadge } from "@/components/StatusBadge";
import { CATEGORY_LABEL, type Requirement, type ReqStatus } from "@/lib/types";
import { decideRequirement, deleteRequirement } from "@/lib/requirements-api";
import { ActionTooltip } from '@/components/ActionTooltip';

export function RequirementItem({ req, onChanged, onShowSource, compact }: {
  req: Requirement; onChanged: () => void; onShowSource?: (messageId: string) => void; compact?: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(req.title);
  const [desc, setDesc] = useState(req.description);
  const [saving, setSaving] = useState(false);
  const [thread, setThread] = useState<null | "comment" | "clarification">(null);
  const ctx = useReview();
  const role = ctx?.myRole ?? null;
  const editable = ctx ? can.edit(role) : true;
  const mayConfirm = ctx ? can.confirm(role) : true;
  const comments = ctx?.comments.filter((c) => c.requirement_id === req.id) ?? [];
  const open = openCount(comments);

  async function run(fn: () => Promise<void>) {
    setSaving(true);
    try { await fn(); onChanged(); } catch (e) { toast.error(e instanceof Error ? e.message : "Could not save"); } finally { setSaving(false); }
  }
  const set = (status: ReqStatus, action: string) => run(() => decideRequirement(req.project_id, req.id, { status }, action));

  if (editing) {
    return (
      <div className="space-y-2 rounded-lg border bg-card p-3">
        <Input value={title} onChange={(e) => setTitle(e.target.value)} aria-label="Requirement title" />
        <Textarea value={desc} onChange={(e) => setDesc(e.target.value)} rows={3} aria-label="Requirement description" />
        {(title !== req.title || desc !== req.description) && <p role="status" className="text-xs text-unresolved">Unsaved requirement changes</p>}
        <div className="flex justify-end gap-2">
          <Button size="sm" variant="ghost" onClick={() => setEditing(false)}>Cancel</Button>
          <Button size="sm" disabled={saving || !title.trim()} onClick={() => run(async () => {
            await decideRequirement(req.project_id, req.id, { title: title.trim(), description: desc.trim(), status: mayConfirm ? "confirmed" : "proposed" }, "edited", mayConfirm ? "Edited and confirmed by human" : "Edited and proposed");
            setEditing(false);
          })}>{mayConfirm ? "Save & confirm" : "Save as proposal"}</Button>
        </div>
      </div>
    );
  }
  return (
    <div className="group min-w-0 break-words rounded-lg border bg-card p-3 transition-shadow hover:shadow-soft">
      <div className="flex items-start gap-2">
        <div className="min-w-0 flex-1">
          <div className="mb-1 flex flex-wrap items-center gap-1.5">
            <StatusBadge status={req.status} />
            <span className="text-[11px] text-muted-foreground">{CATEGORY_LABEL[req.category] ?? req.category}</span>
            <span className="text-[11px] text-muted-foreground">· {req.origin === "human" ? "added by human" : "suggested by AI"}</span>
          </div>
          <p className="text-sm font-medium leading-snug">{req.title}</p>
          {!compact && req.description && <p className="mt-0.5 text-xs text-muted-foreground">{req.description}</p>}
          {req.evidence && (
            <button type="button" disabled={!req.source_message_id || !onShowSource} onClick={() => req.source_message_id && onShowSource?.(req.source_message_id)}
              className="mt-1.5 flex items-start gap-1 text-left text-[11px] italic text-muted-foreground enabled:hover:text-primary">
              <MessageSquareQuote className="mt-0.5 size-3 shrink-0" />“{req.evidence}”
            </button>
          )}
          {ctx && (
            <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-muted-foreground">
              <span>Updated {formatDistanceToNow(new Date(req.updated_at), { addSuffix: true })}</span>
              {can.assign(role) ? (
                <label className="grid w-full min-w-0 grid-cols-[auto_minmax(0,1fr)] items-center gap-2">Reviewer
                  <select className="w-full min-w-0 rounded border bg-background px-1 py-0.5" value={req.reviewer_id ?? ""} disabled={saving} aria-label="Responsible reviewer"
                    onChange={(e) => run(async () => { const { error } = await supabase.from("requirements").update({ reviewer_id: e.target.value || null }).eq("id", req.id); if (error) throw new Error(error.message); })}>
                    <option value="">Unassigned</option>
                    {ctx.people.filter((p) => !p.baseline_id).map((p) => <option key={p.user_id} value={p.user_id}>{p.display_name || p.email}</option>)}
                  </select>
                </label>
              ) : <span>Reviewer: {req.reviewer_id ? personName(ctx.people, req.reviewer_id) : "Unassigned"}</span>}
            </div>
          )}
        </div>
      </div>
      <div className="mt-2 flex flex-wrap gap-1">
        {mayConfirm && req.status !== "confirmed" && <Button size="sm" variant="outline" className="h-7 px-2 text-xs" disabled={saving} onClick={() => set("confirmed", "confirmed")}><Check className="size-3" />Confirm</Button>}
        {editable && <>
        <Button size="sm" variant="ghost" className="h-7 px-2 text-xs" disabled={saving} onClick={() => setEditing(true)}><Pencil className="size-3" />Edit</Button>
        {req.status !== "deferred" && <Button size="sm" variant="ghost" className="h-7 px-2 text-xs" disabled={saving} onClick={() => set("deferred", "deferred")}><Clock className="size-3" />Defer</Button>}
        {req.status !== "excluded" && <Button size="sm" variant="ghost" className="h-7 px-2 text-xs" disabled={saving} onClick={() => set("excluded", "excluded")}><Ban className="size-3" />Out of scope</Button>}
        {req.status !== "proposed" && req.status !== "unresolved" && <Button size="sm" variant="ghost" className="h-7 px-2 text-xs" disabled={saving} onClick={() => set("proposed", "reopened")}><Undo2 className="size-3" />Reopen</Button>}
        </>}
        {ctx && <Button size="sm" variant="ghost" className="h-7 px-2 text-xs" onClick={() => setThread(thread ? null : "comment")}><MessageSquare className="size-3" />{comments.length ? `${comments.length}${open ? ` · ${open} open` : ""}` : "Comment"}</Button>}
        {ctx && editable && <Button size="sm" variant="ghost" className="h-7 px-2 text-xs" onClick={() => setThread("clarification")}><HelpCircle className="size-3" />Ask</Button>}
        <ActionTooltip label="Delete requirement"><Button size="sm" variant="ghost" className={`ml-auto h-7 px-2 text-xs text-muted-foreground opacity-100 md:opacity-0 md:group-hover:opacity-100 focus:opacity-100 ${!ctx || role === "owner" || role === "editor" ? "" : "hidden"}`} disabled={saving} onClick={() => run(() => deleteRequirement(req.id))} aria-label="Delete requirement"><Trash2 className="size-3" /></Button></ActionTooltip>
      </div>
      {thread && <div className="mt-2 border-t pt-2"><CommentThread key={thread} target={{ requirement_id: req.id }} defaultKind={thread} /></div>}
    </div>
  );
}
