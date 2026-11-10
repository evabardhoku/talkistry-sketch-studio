import { buildExport } from "@/lib/export";
import { parseComponents, parseStrings, type Requirement } from "@/lib/types";
import type { Workspace } from "@/lib/queries";
import { ScreenWireframe } from "@/components/sketch/ScreenWireframe";

export function PrintSpecification({ data }: { data: Workspace }) {
  const doc = buildExport(data); const spec = doc.specification;
  const section = (name: string, reqs: Requirement[]) => <section><h2>{name}</h2>{reqs.length ? reqs.map((r) => <article key={r.id}><h3>{r.title} · {r.status}</h3><p>{r.description}</p>{r.evidence && <blockquote>Evidence: {r.evidence}</blockquote>}<small>Updated {r.updated_at}</small></article>) : <p>Not recorded.</p>}</section>;
  return <div className="print-specification">
    <header><p>SpecLoop · {doc.demo ? "FICTIONAL DEMO" : "Live saved specification"}</p><h1>{doc.project.name}</h1><p>{doc.project.summary || "Summary not recorded."}</p><p>Last saved update: {doc.project.updatedAt}</p>{doc.demo && <p>Sample content, not real client data or stakeholder approvals.</p>}</header>
    {section("Product goals", spec.overview.goals)}{section("Personas", spec.personas)}
    {section("Confirmed user journeys", data.requirements.filter((r) => r.category === "workflow" && r.status === "confirmed"))}
    <section><h2>Screens and workflow (proposed sketch)</h2>{data.screens.map((s) => <article key={s.id}><h3>{s.name} · {s.user_role || "General"}</h3><p>{s.purpose}</p><div className="print-wireframe"><ScreenWireframe components={parseComponents(s.components)} /></div>{data.connections.filter((c) => c.from_screen_id === s.id).map((c) => <p key={c.id}>{c.label || "Navigate"} → {data.screens.find((x) => x.id === c.to_screen_id)?.name || c.to_screen_id}</p>)}{parseStrings(s.unresolved).map((q, i) => <p key={i}>Unresolved: {q}</p>)}</article>)}{!data.screens.length && <p>Not recorded.</p>}</section>
    {section("Functional requirements", spec.features)}{section("Business rules", spec.businessRules)}{section("Acceptance criteria", spec.acceptance)}
    {section("Proposed scope", spec.proposed)}{section("Unresolved requirements", spec.unresolved)}{section("Deferred and excluded scope", [...spec.deferred, ...spec.excluded])}
    <section><h2>Unresolved questions</h2>{spec.openQuestions.length ? <ul>{spec.openQuestions.map((q, i) => <li key={i}>{q}</li>)}</ul> : <p>None recorded.</p>}</section>
    <section><h2>Decisions</h2>{data.decisions.map((d) => <article key={d.id}><h3>{d.action} · {d.created_at}</h3><p>{d.note || "No note recorded."}</p><p>Actor: {data.people.find((p) => p.user_id === d.decided_by)?.display_name || d.decided_by || "Not recorded"}</p></article>)}{!data.decisions.length && <p>None recorded.</p>}</section>
    <section><h2>Stakeholder review</h2>{data.comments.map((c) => <article key={c.id}><h3>{c.kind} · {c.resolved_at ? "resolved" : "open"}</h3><p>{c.body}</p></article>)}{!data.comments.length && <p>None recorded.</p>}</section>
    <section><h2>Version and approval information</h2><p>This printout describes the live draft. Baseline approvals apply only to frozen versions, not later edits.</p>{doc.approvals.map((v) => <article key={v.id}><h3>Version {v.version}</h3><p>Approved: {v.approvedAt || "Not recorded"} · By: {v.approver || v.approvedBy || "Not recorded"}</p><p>{v.notes}</p></article>)}{!doc.approvals.length && <p>No approved baseline.</p>}</section>
  </div>;
}