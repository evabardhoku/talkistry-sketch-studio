import { useState } from "react";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { CATEGORY_LABEL, REQ_CATEGORIES, STATUS_LABEL, type Project, type Requirement, type ReqStatus } from "@/lib/types";
import { addHumanRequirement } from "@/lib/requirements-api";
import { RequirementItem } from "./RequirementItem";

const FILTERS: (ReqStatus | "all")[] = ["all", "proposed", "unresolved", "confirmed", "deferred", "excluded"];

export function RequirementsPanel({ project, requirements, onChanged, onShowSource }: {
  project: Project; requirements: Requirement[]; onChanged: () => void; onShowSource: (id: string) => void;
}) {
  const [filter, setFilter] = useState<ReqStatus | "all">("all");
  const [adding, setAdding] = useState(false);
  const [title, setTitle] = useState("");
  const [cat, setCat] = useState("feature");
  const list = requirements.filter((r) => filter === "all" || r.status === filter);
  const count = (s: ReqStatus) => requirements.filter((r) => r.status === s).length;
  return (
    <div className="flex h-full flex-col">
      <div className="space-y-3 border-b p-4">
        <div>
          <div className="text-[11px] uppercase tracking-wider text-muted-foreground">Project context</div>
          <p className="mt-1 text-sm">{project.summary || "No summary yet — it is taken from your first description."}</p>
        </div>
        <div className="flex flex-wrap gap-1">
          {FILTERS.map((f) => (
            <button key={f} onClick={() => setFilter(f)} className={cn("rounded-full border px-2.5 py-0.5 text-xs", filter === f ? "border-primary bg-primary-soft text-primary" : "text-muted-foreground hover:bg-muted")}>
              {f === "all" ? `All ${requirements.length}` : `${STATUS_LABEL[f]} ${count(f)}`}
            </button>
          ))}
        </div>
      </div>
      <div className="flex-1 space-y-2 overflow-y-auto p-4">
        {list.length === 0 && <p className="py-6 text-center text-sm text-muted-foreground">Nothing here yet.</p>}
        {list.map((r) => <RequirementItem key={r.id + r.updated_at} req={r} onChanged={onChanged} onShowSource={onShowSource} />)}
      </div>
      <div className="border-t p-3">
        {adding ? (
          <form className="space-y-2" onSubmit={async (e) => {
            e.preventDefault();
            if (!title.trim()) return;
            try { await addHumanRequirement(project.id, { category: cat, title: title.trim(), description: "" }); setTitle(""); setAdding(false); onChanged(); }
            catch (err) { toast.error(err instanceof Error ? err.message : "Could not add"); }
          }}>
            <select value={cat} onChange={(e) => setCat(e.target.value)} className="h-9 w-full rounded-md border bg-background px-2 text-sm">
              {REQ_CATEGORIES.map((c) => <option key={c} value={c}>{CATEGORY_LABEL[c]}</option>)}
            </select>
            <Input autoFocus value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Requirement in plain words" />
            <div className="flex justify-end gap-2"><Button type="button" size="sm" variant="ghost" onClick={() => setAdding(false)}>Cancel</Button><Button size="sm" type="submit">Add as confirmed</Button></div>
          </form>
        ) : (
          <Button variant="outline" size="sm" className="w-full" onClick={() => setAdding(true)}><Plus className="size-4" />Add requirement manually</Button>
        )}
      </div>
    </div>
  );
}
