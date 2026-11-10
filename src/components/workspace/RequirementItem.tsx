import { useState } from "react";
import { Check, Clock, MessageSquareQuote, Pencil, Ban, Trash2, Undo2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { StatusBadge } from "@/components/StatusBadge";
import { CATEGORY_LABEL, type Requirement, type ReqStatus } from "@/lib/types";
import { decideRequirement, deleteRequirement } from "@/lib/requirements-api";

export function RequirementItem({ req, onChanged, onShowSource, compact }: {
  req: Requirement; onChanged: () => void; onShowSource?: (messageId: string) => void; compact?: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(req.title);
  const [desc, setDesc] = useState(req.description);
  const [saving, setSaving] = useState(false);

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
        <div className="flex justify-end gap-2">
          <Button size="sm" variant="ghost" onClick={() => setEditing(false)}>Cancel</Button>
          <Button size="sm" disabled={saving || !title.trim()} onClick={() => run(async () => {
            await decideRequirement(req.project_id, req.id, { title: title.trim(), description: desc.trim(), status: "confirmed" }, "edited", "Edited and confirmed by human");
            setEditing(false);
          })}>Save & confirm</Button>
        </div>
      </div>
    );
  }
  return (
    <div className="group rounded-lg border bg-card p-3 transition-shadow hover:shadow-soft">
      <div className="flex items-start gap-2">
        <div className="min-w-0 flex-1">
          <div className="mb-1 flex flex-wrap items-center gap-1.5">
            <StatusBadge status={req.status} />
            <span className="text-[11px] text-muted-foreground">{CATEGORY_LABEL[req.category] ?? req.category}</span>
            {req.origin === "human" && <span className="text-[11px] text-muted-foreground">· added by human</span>}
          </div>
          <p className="text-sm font-medium leading-snug">{req.title}</p>
          {!compact && req.description && <p className="mt-0.5 text-xs text-muted-foreground">{req.description}</p>}
          {req.evidence && (
            <button type="button" disabled={!req.source_message_id || !onShowSource} onClick={() => req.source_message_id && onShowSource?.(req.source_message_id)}
              className="mt-1.5 flex items-start gap-1 text-left text-[11px] italic text-muted-foreground enabled:hover:text-primary">
              <MessageSquareQuote className="mt-0.5 size-3 shrink-0" />“{req.evidence}”
            </button>
          )}
        </div>
      </div>
      <div className="mt-2 flex flex-wrap gap-1">
        {req.status !== "confirmed" && <Button size="sm" variant="outline" className="h-7 px-2 text-xs" disabled={saving} onClick={() => set("confirmed", "confirmed")}><Check className="size-3" />Confirm</Button>}
        <Button size="sm" variant="ghost" className="h-7 px-2 text-xs" disabled={saving} onClick={() => setEditing(true)}><Pencil className="size-3" />Edit</Button>
        {req.status !== "deferred" && <Button size="sm" variant="ghost" className="h-7 px-2 text-xs" disabled={saving} onClick={() => set("deferred", "deferred")}><Clock className="size-3" />Defer</Button>}
        {req.status !== "excluded" && <Button size="sm" variant="ghost" className="h-7 px-2 text-xs" disabled={saving} onClick={() => set("excluded", "excluded")}><Ban className="size-3" />Out of scope</Button>}
        {req.status !== "proposed" && req.status !== "unresolved" && <Button size="sm" variant="ghost" className="h-7 px-2 text-xs" disabled={saving} onClick={() => set("proposed", "reopened")}><Undo2 className="size-3" />Reopen</Button>}
        <Button size="sm" variant="ghost" className="ml-auto h-7 px-2 text-xs text-muted-foreground opacity-0 group-hover:opacity-100" disabled={saving} onClick={() => run(() => deleteRequirement(req.id))} aria-label="Delete requirement"><Trash2 className="size-3" /></Button>
      </div>
    </div>
  );
}
