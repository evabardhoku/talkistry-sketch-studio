import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { useState } from "react";
import { ArrowLeft, BadgeCheck, Loader2, Minus, Plus, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { AppHeader } from "@/components/AppHeader";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { accessQuery, baselinesQuery } from "@/lib/queries";
import { diffBaselines, parseBaseline, type BaselineReq } from "@/lib/baseline";
import { CATEGORY_LABEL } from "@/lib/types";

export const Route = createFileRoute("/_authenticated/projects/$projectId_/versions")({
  head: () => ({ meta: [
    { title: "Approved versions — SpecLoop" }, { name: "description", content: "Approved specification baselines and the differences between them." },
    { property: "og:title", content: "Approved versions — SpecLoop" }, { property: "og:description", content: "Specification baselines and version history." },
  ] }),
  loader: async ({ context, params }) => {
    await Promise.all([context.queryClient.ensureQueryData(accessQuery(params.projectId)), context.queryClient.ensureQueryData(baselinesQuery(params.projectId))]);
  },
  pendingComponent: () => <div className="grid min-h-screen place-items-center"><Loader2 className="size-5 animate-spin text-muted-foreground" /></div>,
  component: VersionsPage,
});

function ReqList({ items, tone }: { items: BaselineReq[]; tone?: "add" | "remove" }) {
  return <ul className="space-y-1">{items.map((r) => (
    <li key={r.id} className={`flex gap-1.5 rounded-md border px-2 py-1 text-sm ${tone === "add" ? "border-confirmed/30 bg-confirmed-soft" : tone === "remove" ? "border-destructive/30 bg-destructive/5 line-through decoration-destructive/40" : "bg-card"}`}>
      {tone === "add" ? <Plus className="mt-0.5 size-3.5 shrink-0 text-confirmed" /> : tone === "remove" ? <Minus className="mt-0.5 size-3.5 shrink-0 text-destructive" /> : null}
      <span><b className="font-medium">{r.title}</b>{r.description && <span className="text-muted-foreground"> — {r.description}</span>} <span className="text-[11px] text-muted-foreground">({CATEGORY_LABEL[r.category] ?? r.category})</span></span>
    </li>))}</ul>;
}

function VersionsPage() {
  const { projectId } = Route.useParams();
  const qc = useQueryClient();
  const { data: access } = useSuspenseQuery(accessQuery(projectId));
  const { data: baselines } = useSuspenseQuery(baselinesQuery(projectId));
  const people = useQuery({ queryKey: ["people", projectId], queryFn: async () => (await supabase.rpc("get_project_people", { _project_id: projectId })).data ?? [] });
  const role = access.member?.role ?? null;
  const restricted = !!access.member?.baseline_id;
  const [selId, setSelId] = useState<string | null>(baselines[0]?.id ?? null);
  const [cmpId, setCmpId] = useState<string | null>(baselines[1]?.id ?? null);
  const [notes, setNotes] = useState(""); const [busy, setBusy] = useState(false);
  const sel = baselines.find((b) => b.id === selId) ?? baselines[0];
  const cmp = baselines.find((b) => b.id === cmpId);
  const name = (id: string | null) => { const p = people.data?.find((x) => x.user_id === id); return p?.display_name || p?.email || "—"; };

  async function approve() {
    setBusy(true);
    const { data, error } = await supabase.rpc("approve_baseline", { _project_id: projectId, _notes: notes });
    setBusy(false);
    if (error) { toast.error(error.message); return; }
    setNotes(""); await qc.invalidateQueries({ queryKey: ["baselines", projectId] }); await qc.invalidateQueries({ queryKey: ["workspace", projectId] });
    const fresh = await qc.fetchQuery(baselinesQuery(projectId));
    setSelId(data); setCmpId(fresh[1]?.id ?? null);
    toast.success("Baseline approved");
  }

  const content = sel ? parseBaseline(sel.content) : null;
  const diff = content && cmp ? diffBaselines(parseBaseline(cmp.content), content) : null;
  const screenName = (id: string) => content?.screens.find((s) => s.id === id)?.name ?? "?";

  return (
    <div className="min-h-screen">
      <AppHeader>
        {!restricted && <Link to="/projects/$projectId" params={{ projectId }} className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"><ArrowLeft className="size-4" />Workspace</Link>}
        <span className="truncate text-sm font-medium">{access.project.name}</span>
      </AppHeader>
      <main className="mx-auto max-w-5xl px-5 py-10">
        <h1 className="font-display text-5xl">Approved versions</h1>
        <p className="mt-2 max-w-2xl text-muted-foreground">{restricted ? "You've been given read-only access to this approved version." : "Each approval freezes confirmed requirements, open questions and the screen flow. Approved versions are never overwritten; new changes are compared against the latest one."}</p>

        {role === "owner" && (
          <div className="mt-6 rounded-xl border bg-card p-4 shadow-soft">
            <h2 className="font-medium">Approve a new baseline (v{(baselines[0]?.version ?? 0) + 1})</h2>
            <p className="text-sm text-muted-foreground">Captures what is confirmed right now. AI suggestions that nobody confirmed are recorded as unresolved, never as approved.</p>
            <Textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Approval note (optional), e.g. Agreed in client meeting" className="mt-3" />
            <AlertDialog>
              <AlertDialogTrigger asChild><Button className="mt-2" disabled={busy}>{busy ? <Loader2 className="size-4 animate-spin" /> : <BadgeCheck className="size-4" />}Approve baseline</Button></AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader><AlertDialogTitle>Approve this specification?</AlertDialogTitle>
                  <AlertDialogDescription>You're approving it as the project owner. It will be stored permanently with your name and the current time.</AlertDialogDescription></AlertDialogHeader>
                <AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={approve}>I approve</AlertDialogAction></AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        )}

        {baselines.length === 0 ? <p className="mt-10 text-sm text-muted-foreground">No approved versions yet.</p> : (
          <div className="mt-8 grid gap-6 md:grid-cols-[200px_1fr]">
            <ul className="space-y-1">{baselines.map((b) => (
              <li key={b.id}><button onClick={() => { setSelId(b.id); setCmpId(baselines.find((x) => x.version < b.version)?.id ?? null); }}
                className={`w-full rounded-lg border px-3 py-2 text-left text-sm ${b.id === sel?.id ? "border-primary bg-primary-soft" : "bg-card hover:bg-muted"}`}>
                <div className="font-medium">Version {b.version}</div>
                <div className="text-xs text-muted-foreground">{new Date(b.approved_at ?? b.created_at).toLocaleString()}</div>
              </button></li>))}</ul>
            {sel && content && (
              <div className="space-y-8">
                <div className="rounded-xl border bg-card p-4">
                  <div className="flex items-center gap-2 text-sm"><BadgeCheck className="size-4 text-confirmed" />Approved by <b>{name(sel.approved_by)}</b> · {new Date(sel.approved_at ?? sel.created_at).toLocaleString()}</div>
                  {sel.notes && <p className="mt-1 text-sm text-muted-foreground">“{sel.notes}”</p>}
                  <p className="mt-1 text-xs text-muted-foreground">{content.requirements.length} confirmed requirements · {content.open_questions.length} open questions · {content.screens.length} screens</p>
                </div>

                {!restricted && baselines.length > 1 && (
                  <section>
                    <div className="mb-3 flex flex-wrap items-center gap-2">
                      <h2 className="font-display text-3xl">Changes</h2>
                      <span className="text-sm text-muted-foreground">compared with</span>
                      <select value={cmpId ?? ""} onChange={(e) => setCmpId(e.target.value || null)} className="h-8 rounded-md border bg-background px-2 text-sm" aria-label="Compare with">
                        <option value="">—</option>{baselines.filter((b) => b.id !== sel.id).map((b) => <option key={b.id} value={b.id}>v{b.version}</option>)}
                      </select>
                    </div>
                    {diff && cmp && (() => {
                      const empty = !diff.addedFeatures.length && !diff.removedFeatures.length && !diff.modified.length && !diff.changedRules.length && !diff.addedRules.length && !diff.removedRules.length && !diff.addedScreens.length && !diff.removedScreens.length;
                      if (empty) return <p className="text-sm text-muted-foreground">No differences between v{cmp.version} and v{sel.version}.</p>;
                      return (
                        <div className="space-y-5">
                          {diff.addedFeatures.length > 0 && <div><h3 className="mb-1 text-sm font-medium">Added features</h3><ReqList items={diff.addedFeatures} tone="add" /></div>}
                          {diff.removedFeatures.length > 0 && <div><h3 className="mb-1 text-sm font-medium">Removed features</h3><ReqList items={diff.removedFeatures} tone="remove" /></div>}
                          {diff.modified.length > 0 && <div><h3 className="mb-1 text-sm font-medium">Modified requirements</h3>{diff.modified.map((m) => (
                            <div key={m.after.id} className="mb-1 grid gap-1 text-sm sm:grid-cols-2"><ReqList items={[m.before]} tone="remove" /><ReqList items={[m.after]} tone="add" /></div>))}</div>}
                          {(diff.changedRules.length > 0 || diff.addedRules.length > 0 || diff.removedRules.length > 0) && <div><h3 className="mb-1 text-sm font-medium">Changed business rules</h3>
                            {diff.changedRules.map((m) => <div key={m.after.id} className="mb-1 grid gap-1 sm:grid-cols-2"><ReqList items={[m.before]} tone="remove" /><ReqList items={[m.after]} tone="add" /></div>)}
                            <ReqList items={diff.addedRules} tone="add" /><div className="h-1" /><ReqList items={diff.removedRules} tone="remove" /></div>}
                          {(diff.addedScreens.length > 0 || diff.removedScreens.length > 0) && <p className="text-sm"><b>Screens:</b> {diff.addedScreens.map((s) => `+ ${s}`).concat(diff.removedScreens.map((s) => `− ${s}`)).join(" · ")}</p>}
                        </div>
                      );
                    })()}
                  </section>
                )}

                <section><h2 className="mb-2 font-display text-3xl">Confirmed requirements</h2>{content.requirements.length ? <ReqList items={content.requirements} /> : <p className="text-sm text-muted-foreground">None.</p>}</section>
                <section><h2 className="mb-2 font-display text-3xl">Unresolved at approval</h2>
                  <ul className="list-disc space-y-1 pl-5 text-sm">{content.open_questions.map((q) => <li key={q}>{q}</li>)}{content.unresolved.map((u) => <li key={u.id}>{u.title} <span className="text-xs text-muted-foreground">({u.status})</span></li>)}</ul>
                  {!content.open_questions.length && !content.unresolved.length && <p className="text-sm text-muted-foreground">Nothing unresolved.</p>}
                </section>
                <section><h2 className="mb-2 font-display text-3xl">Screens & flow</h2>
                  <ul className="grid gap-2 sm:grid-cols-2">{content.screens.map((s) => (
                    <li key={s.id} className="rounded-lg border bg-card p-3 text-sm"><div className="font-medium">{s.name} <span className="font-normal text-muted-foreground">· {s.user_role ?? "General"}</span></div><p className="text-muted-foreground">{s.purpose}</p>
                      {content.connections.filter((c) => c.from === s.id).map((c, i) => <p key={i} className="text-xs text-primary">→ {screenName(c.to)}{c.label ? ` (${c.label})` : ""}</p>)}</li>))}</ul>
                </section>
              </div>
            )}
          </div>
        )}
        {!restricted && <p className="mt-10 text-xs text-muted-foreground"><RefreshCw className="mr-1 inline size-3" />Requests made after approval are flagged as potential scope changes in the workspace.</p>}
      </main>
    </div>
  );
}
