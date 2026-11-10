import { buildSpec } from "./spec";
import type { Workspace } from "./queries";

/** A live saved-data export, explicitly separate from immutable approved baselines. */
export function buildExport(data: Workspace) {
  return {
    format: "specloop.specification", schemaVersion: 1,
    state: "live_draft", demo: data.project.is_demo,
    project: { id: data.project.id, name: data.project.name, summary: data.project.summary, updatedAt: data.project.updated_at },
    specification: buildSpec(data.project, data.requirements, data.questions, data.screens, data.connections),
    requirements: data.requirements, screens: data.screens, workflows: data.connections,
    questions: data.questions, decisions: data.decisions, comments: data.comments, scopeChanges: data.scopeChanges,
    approvals: data.versions.filter((v) => v.kind === "baseline").map((v) => ({
      id: v.id, version: v.version, approvedAt: v.approved_at, approvedBy: v.approved_by,
      approver: data.people.find((p) => p.user_id === v.approved_by)?.display_name ?? null, notes: v.notes, snapshot: v.content,
    })),
  };
}
export type ExportDocument = ReturnType<typeof buildExport>;
export function exportMarkdown(doc: ExportDocument) {
  const lines: string[] = [`# ${doc.project.name}`, "", doc.demo ? "> FICTIONAL DEMO — not real client information or stakeholder approvals." : "> Live saved specification — not an approved baseline.", "", `Last saved project update: ${doc.project.updatedAt}`, "", "## Project summary", doc.project.summary || "Not recorded."];
  const section = (name: string, reqs: typeof doc.requirements) => {
    lines.push("", `## ${name}`);
    if (!reqs.length) lines.push("Not recorded.");
    for (const r of reqs) lines.push("", `### ${r.title} [${r.status}]`, r.description, ...(r.evidence ? [`Evidence: ${r.evidence}`] : []), `Requirement ID: ${r.id} · Updated: ${r.updated_at}`);
  };
  const spec = doc.specification;
  section("Goals", spec.overview.goals); section("Personas", spec.personas); section("Functional requirements", spec.features);
  section("Business rules", spec.businessRules); section("Acceptance criteria", spec.acceptance);
  lines.push("", "## User journeys and screens (proposed sketch)");
  if (!doc.screens.length) lines.push("Not recorded.");
  for (const s of doc.screens) {
    lines.push("", `### ${s.name}`, `Role: ${s.user_role || "Not recorded"}`, s.purpose);
    if (Array.isArray(s.components)) for (const c of s.components) if (c && typeof c === "object" && "label" in c) lines.push(`- ${c.label}`);
    for (const c of doc.workflows.filter((c) => c.from_screen_id === s.id)) lines.push(`- ${c.label || "Navigate"} → ${doc.screens.find((x) => x.id === c.to_screen_id)?.name ?? c.to_screen_id}`);
  }
  section("Confirmed workflow requirements", doc.requirements.filter((r) => r.status === "confirmed" && r.category === "workflow"));
  section("Proposed scope", spec.proposed); section("Unresolved requirements", spec.unresolved); section("Deferred scope", spec.deferred); section("Excluded scope", spec.excluded);
  lines.push("", "## Unresolved questions", ...(spec.openQuestions.length ? spec.openQuestions.map((q) => `- ${q}`) : ["None recorded."]));
  lines.push("", "## Decisions and evidence");
  for (const d of doc.decisions) lines.push(`- ${d.action} · ${d.note || "No note"} · ${d.created_at} · actor: ${d.decided_by || "Not recorded"} · requirement: ${d.requirement_id || "Project"}`);
  if (!doc.decisions.length) lines.push("None recorded.");
  lines.push("", "## Collaboration review");
  for (const c of doc.comments) lines.push(`- [${c.status}] ${c.kind}: ${c.body} · ${c.created_at} · author: ${c.author_id}`);
  if (!doc.comments.length) lines.push("None recorded.");
  lines.push("", "## Version and approval information", "This document describes the live saved draft. Approvals below refer only to their frozen snapshots, not subsequent edits.");
  for (const v of doc.approvals) lines.push(`- Version ${v.version} · ${v.approvedAt || "Not recorded"} · approver: ${v.approver || v.approvedBy || "Not recorded"}${v.notes ? ` · ${v.notes}` : ""}`);
  if (!doc.approvals.length) lines.push("No approved baseline.");
  return lines.join("\n");
}
export function downloadFile(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob); const a = document.createElement("a");
  a.href = url; a.download = filename; document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 30_000);
}