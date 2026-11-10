import { createFileRoute, Link } from "@tanstack/react-router";
import { useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { ArrowLeft, Loader2, Save } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { AppHeader } from "@/components/AppHeader";
import { Button } from "@/components/ui/button";
import { RequirementItem } from "@/components/workspace/RequirementItem";
import { workspaceQuery } from "@/lib/queries";
import { buildSpec, computeReadiness } from "@/lib/spec";
import { ReviewContext } from "@/components/review/ReviewContext";
import type { Requirement } from "@/lib/types";
import { ExportControls } from "@/components/workspace/ExportControls";
import { PrintSpecification } from "@/components/workspace/PrintSpecification";

export const Route = createFileRoute("/_authenticated/projects/$projectId_/specification")({
  head: () => ({ meta: [
    { title: "Product specification — SpecLoop" }, { name: "description", content: "Structured product specification generated from confirmed discovery decisions." },
    { property: "og:title", content: "Product specification — SpecLoop" }, { property: "og:description", content: "Structured product brief." },
    { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary_large_image" },
  ] }),
  loader: ({ context, params }) => context.queryClient.ensureQueryData(workspaceQuery(params.projectId)),
  pendingComponent: () => <div className="grid min-h-screen place-items-center"><Loader2 className="size-5 animate-spin text-muted-foreground" /></div>,
  component: SpecPage,
});

function Section({ n, title, children, empty }: { n: number; title: string; children: ReactNode; empty?: boolean }) {
  return (
    <section className="border-t py-8">
      <h2 className="mb-4 flex items-baseline gap-3"><span className="font-mono text-xs text-muted-foreground">{String(n).padStart(2, "0")}</span><span className="font-display text-3xl">{title}</span></h2>
      {empty ? <p className="text-sm text-muted-foreground">Nothing confirmed yet.</p> : children}
    </section>
  );
}

function SpecPage() {
  const { projectId } = Route.useParams();
  const qc = useQueryClient();
  const { data } = useSuspenseQuery(workspaceQuery(projectId));
  const refresh = () => qc.invalidateQueries({ queryKey: ["workspace", projectId] });
  const spec = buildSpec(data.project, data.requirements, data.questions, data.screens, data.connections);
  const rd = computeReadiness(data.requirements, data.questions);
  const msgById = new Map(data.messages.map((m) => [m.id, m]));
  const list = (rs: Requirement[]) => <div className="grid gap-2 md:grid-cols-2">{rs.map((r) => <RequirementItem key={r.id + r.updated_at} req={r} onChanged={refresh} />)}</div>;


  const baselines = data.versions.filter((v) => v.kind === "baseline");
  return (
    <ReviewContext.Provider value={{ projectId, meId: data.meId, myRole: data.myRole, people: data.people, comments: data.comments, onChanged: refresh }}>
    <div className="no-print min-h-screen">
      <AppHeader>
        <Link to="/projects/$projectId" params={{ projectId }} className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"><ArrowLeft className="size-4" />Workspace</Link>
        <Button asChild size="sm" className="ml-auto"><Link to="/projects/$projectId/versions" params={{ projectId }}><Save className="size-4" />Versions & approval</Link></Button>
      </AppHeader>
      <div className="mx-auto max-w-4xl px-5 py-10">
        <p className="text-xs uppercase tracking-wider text-muted-foreground">Product specification · {rd.label} · {rd.confirmed}/{rd.total} requirements confirmed{baselines[0] && ` · v${baselines[0].version} approved ${formatDistanceToNow(new Date(baselines[0].created_at), { addSuffix: true })}`}</p>
        <h1 className="mt-2 break-words font-display text-4xl md:text-5xl">{spec.overview.name}</h1>
        <div className="mt-5"><ExportControls data={data} /></div>
        {data.project.is_demo && <p className="mt-3 text-xs font-medium text-primary">Fictional demo · not real client data or stakeholder approvals.</p>}
        <p className="mt-3 max-w-2xl text-muted-foreground">Built only from human-confirmed requirements. Proposed and unresolved items are listed separately until someone confirms them. Edits here update the workspace too.</p>

        <Section n={1} title="Product overview">
          <p className="mb-3">{spec.overview.summary || "—"}</p>
          {spec.overview.goals.length > 0 && list(spec.overview.goals)}
        </Section>
        <Section n={2} title="User personas" empty={!spec.personas.length}>{list(spec.personas)}</Section>
        <Section n={3} title="Main user journeys" empty={!spec.journeys.length}>
          <ol className="space-y-2">{spec.journeys.map((j) => (
            <li key={j.screen} className="rounded-lg border bg-card p-3 text-sm">
              <div className="font-medium">{j.screen} <span className="font-normal text-muted-foreground">· {j.role ?? "General"} · sketch status: proposed</span></div>
              <p className="text-muted-foreground">{j.purpose}</p>
              {j.next.length > 0 && <p className="mt-1 text-xs text-primary">Next: {j.next.join(" · ")}</p>}
            </li>))}</ol>
        </Section>
        <Section n={4} title="Feature requirements" empty={!spec.features.length}>{list(spec.features)}</Section>
        <Section n={5} title="Business rules" empty={!spec.businessRules.length}>{list(spec.businessRules)}</Section>
        <Section n={6} title="Acceptance criteria" empty={!spec.acceptance.length}>{list(spec.acceptance)}</Section>
        <Section n={7} title="Open questions" empty={!spec.openQuestions.length && !spec.unresolved.length}>
          <ul className="mb-3 list-disc space-y-1 pl-5 text-sm">{spec.openQuestions.map((q) => <li key={q}>{q}</li>)}</ul>
          {list(spec.unresolved)}
        </Section>
        <Section n={8} title="Confirmed decisions & evidence" empty={!data.decisions.length}>
          <ul className="space-y-2 text-sm">{data.decisions.slice(0, 40).map((d) => {
            const r = data.requirements.find((x) => x.id === d.requirement_id);
            const src = r?.source_message_id ? msgById.get(r.source_message_id) : undefined;
            return (
              <li key={d.id} className="rounded-lg border bg-card p-3">
                <div><span className="font-medium capitalize">{d.action}</span> · {r?.title ?? "Removed requirement"} <span className="text-xs text-muted-foreground">· {formatDistanceToNow(new Date(d.created_at), { addSuffix: true })}</span></div>
                {src && <p className="mt-1 text-xs italic text-muted-foreground">Source message: “{src.content.slice(0, 200)}”</p>}
                {!src && r?.origin === "human" && <p className="mt-1 text-xs text-muted-foreground">Source: explicit human decision</p>}
              </li>);
          })}</ul>
        </Section>
        <Section n={9} title="Proposed scope (pending approval)" empty={!spec.proposed.length}>{list(spec.proposed)}</Section>
        <Section n={10} title="Deferred & excluded scope" empty={!spec.deferred.length && !spec.excluded.length}>{list([...spec.deferred, ...spec.excluded])}</Section>

      </div>
    </div>
    <PrintSpecification data={data} />
    </ReviewContext.Provider>
  );
}
