import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { useState } from "react";
import { ArrowRight, HelpCircle, Loader2, Plus, Sparkles } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { AppHeader } from "@/components/AppHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { projectsQuery } from "@/lib/queries";
import { computeReadiness } from "@/lib/spec";
import { PENDING_IDEA_KEY } from "@/lib/pending";
import { DeleteProjectDialog } from '@/components/workspace/DeleteProjectDialog';
import { canDeleteProject } from '@/lib/project-views';

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({ meta: [
    { title: "Projects — Talkistry" }, { name: "description", content: "Your discovery projects and specification readiness." },
    { property: "og:title", content: "Projects — Talkistry" }, { property: "og:description", content: "Your discovery projects." },
    { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary_large_image" },
  ] }),
  loader: ({ context }) => context.queryClient.ensureQueryData(projectsQuery()),
  pendingComponent: () => <div className="grid min-h-screen place-items-center"><Loader2 className="size-5 animate-spin text-muted-foreground" /></div>,
  component: Dashboard,
});


function NewProjectDialog() {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(""); const [idea, setIdea] = useState(""); const [busy, setBusy] = useState(false);
  const navigate = useNavigate(); const qc = useQueryClient();
  async function create(e: React.FormEvent) {
    e.preventDefault(); setBusy(true);
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) { toast.error("Please sign in again."); setBusy(false); return; }
    const { data, error } = await supabase.from("projects").insert({ name: name.trim(), summary: idea.trim() || null, owner_id: u.user.id }).select("id").single();
    if (error || !data) { toast.error(error?.message ?? "Could not create project"); setBusy(false); return; }
    await supabase.from("discovery_sessions").insert({ project_id: data.id });
    if (idea.trim()) sessionStorage.setItem(PENDING_IDEA_KEY(data.id), idea.trim());
    await qc.invalidateQueries({ queryKey: ["projects"] });
    navigate({ to: "/projects/$projectId", params: { projectId: data.id } });
  }
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild><Button><Plus className="size-4" />New project</Button></DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle className="font-display text-2xl font-normal">Start a discovery meeting</DialogTitle>
          <DialogDescription>Describe the idea in plain words. Talkistry will ask follow-up questions one at a time.</DialogDescription></DialogHeader>
        <form onSubmit={create} className="space-y-4">
          <div className="space-y-1"><Label htmlFor="pname">Project name</Label><Input id="pname" required value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Neighbourhood bike repair" /></div>
          <div className="space-y-1"><Label htmlFor="idea">The idea (optional)</Label><Textarea id="idea" rows={4} value={idea} onChange={(e) => setIdea(e.target.value)} placeholder="I want an app where…" /></div>
          <Button type="submit" className="w-full" disabled={busy || !name.trim()}>{busy && <Loader2 className="size-4 animate-spin" />}Create and open workspace</Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function Dashboard() {
  const { data } = useSuspenseQuery(projectsQuery());
  const [demoBusy, setDemoBusy] = useState(false);
  const [view, setView] = useState('all');
  const navigate = useNavigate(); const qc = useQueryClient();
  async function createDemo() {
    if (demoBusy) return;
    setDemoBusy(true);
    try {
      const { error } = await supabase.rpc("add_sample_projects");
      if (error) throw new Error(error.message);
      await qc.invalidateQueries({ queryKey: ["projects"] });
      toast.success('Sample projects are ready');
    } catch (e) { toast.error(e instanceof Error ? e.message : "Could not create demo."); } finally { setDemoBusy(false); }
  }
  return (
    <div className="min-h-screen">
      <AppHeader />
      <div className="mx-auto max-w-5xl px-5 py-10">
        <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
          <div><h1 className="font-display text-4xl">Projects</h1><p className="mt-1 text-sm text-muted-foreground">Resume a discovery meeting or start a new one.</p></div>
          <div className="flex flex-wrap gap-2"><Button asChild variant="ghost"><Link to="/demo">Explore all roles</Link></Button><Button variant="outline" disabled={demoBusy} onClick={createDemo}>{demoBusy ? <Loader2 className="size-4 animate-spin" /> : <Sparkles className="size-4" />}Add sample projects</Button><NewProjectDialog /></div>
        </div>
        <nav aria-label="Project roles" className="mb-5 flex flex-wrap gap-2">{['all','owner','client','developer'].map(role => <Button key={role} size="sm" variant={view === role ? 'default' : 'outline'} aria-pressed={view === role} onClick={() => setView(role)}>{role === 'all' ? 'All projects' : role === 'owner' ? 'My projects' : role === 'client' ? 'As client' : 'As developer'}</Button>)}</nav>
        {view !== 'all' && view !== 'owner' && !data.memberships.some(m => m.user_id === data.meId && m.role === view) && <div className="mb-5 flex flex-wrap items-center justify-between gap-3 border-b pb-4 text-sm"><p className="text-muted-foreground">No projects shared with you as a {view} yet.</p><Button asChild size="sm" variant="outline"><Link to="/demo" search={{ role: view as 'client' | 'developer' }}>Explore {view} sample</Link></Button></div>}
        {data.projects.length === 0 ? (
          <div className="rounded-2xl border border-dashed bg-card p-10 text-center"><Sparkles className="mx-auto mb-2 size-6 text-primary" /><p className="font-display text-2xl">No projects yet</p><p className="text-sm text-muted-foreground">Create one to begin a discovery conversation.</p></div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {data.projects.filter(p => view === 'all' || (view === 'owner' ? p.owner_id === data.meId : data.memberships.some(m => m.project_id === p.id && m.user_id === data.meId && m.role === view))).map((p) => {
              const reqs = data.reqs.filter((r) => r.project_id === p.id);
              const qs = data.qs.filter((q) => q.project_id === p.id);
              const rd = computeReadiness(reqs, qs);
              const open = qs.filter((q) => q.status === "open");
              return (
                <div key={p.id} className="group relative rounded-lg border bg-card p-5 shadow-soft transition-shadow hover:shadow-lift">
                <Link to="/projects/$projectId" params={{ projectId: p.id }} className="block pr-8">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2"><h2 className="truncate font-semibold">{p.name}</h2>{p.is_demo && <span className="rounded bg-primary-soft px-1.5 py-0.5 text-[10px] font-semibold text-primary">SAMPLE</span>}</div>
                      <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{p.summary || "No description yet"}</p>
                    </div>
                    <ArrowRight className="size-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
                  </div>
                  <div className="mt-4 space-y-1.5">
                    <div className="flex justify-between text-xs"><span className="text-muted-foreground">Development · {rd.label}</span><span className="font-medium" title="Share of active requirements confirmed by humans">{rd.confirmed}/{rd.total} confirmed</span></div>
                    <Progress value={rd.score} className="h-1.5" />
                    <div className="flex flex-wrap gap-x-4 gap-y-1 pt-1 text-xs text-muted-foreground">
                      <span>{rd.confirmed}/{rd.total} confirmed</span><span>{rd.unresolved} unresolved</span>
                      <span>Updated {formatDistanceToNow(new Date(p.updated_at), { addSuffix: true })}</span>
                    </div>
                  </div>
                  {open[0] && <div className="mt-3 flex items-start gap-1.5 rounded-lg bg-primary-soft px-3 py-2 text-xs text-accent-foreground"><HelpCircle className="mt-0.5 size-3.5 shrink-0" /><span className="line-clamp-2">{open[0].question}</span></div>}
                </Link>
                {canDeleteProject(p.owner_id, data.meId) && <div className="absolute right-2 top-2"><DeleteProjectDialog id={p.id} name={p.name} onDeleted={async () => { qc.removeQueries({ queryKey: ['workspace', p.id] }); qc.removeQueries({ queryKey: ['access', p.id] }); qc.removeQueries({ queryKey: ['development', p.id] }); await qc.invalidateQueries({ queryKey: ['projects'] }); }} /></div>}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
