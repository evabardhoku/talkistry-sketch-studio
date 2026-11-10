import type { Project, Question, Requirement, ScreenRow, Connection } from "./types";

export interface Readiness { confirmed: number; total: number; openQuestions: number; unresolved: number; score: number }

/** Readiness = share of active requirements a human has confirmed, reduced 2% per open item (max 50%). */
export function computeReadiness(reqs: Pick<Requirement, "status">[], questions: Pick<Question, "status">[]): Readiness {
  const active = reqs.filter((r) => r.status !== "excluded" && r.status !== "deferred");
  const confirmed = active.filter((r) => r.status === "confirmed").length;
  const unresolved = active.filter((r) => r.status === "unresolved").length;
  const openQuestions = questions.filter((q) => q.status === "open").length;
  const base = active.length ? confirmed / active.length : 0;
  const penalty = Math.min(0.5, (unresolved + openQuestions) * 0.02);
  const score = Math.round(base * 100 * (1 - penalty));
  return { confirmed, total: active.length, openQuestions, unresolved, score };
}

export interface SpecDocument {
  generatedAt: string;
  overview: { name: string; summary: string; goals: Requirement[] };
  personas: Requirement[];
  journeys: { screen: string; role: string | null; purpose: string; next: string[] }[];
  features: Requirement[];
  businessRules: Requirement[];
  acceptance: Requirement[];
  other: Requirement[];
  openQuestions: string[];
  unresolved: Requirement[];
  confirmedDecisions: Requirement[];
  proposed: Requirement[];
  deferred: Requirement[];
  excluded: Requirement[];
}

/** Spec sections draw only from confirmed requirements; proposed items are listed separately as pending scope. */
export function buildSpec(project: Project, reqs: Requirement[], questions: Question[], screens: ScreenRow[], conns: Connection[]): SpecDocument {
  const confirmed = reqs.filter((r) => r.status === "confirmed");
  const by = (c: string[]) => confirmed.filter((r) => c.includes(r.category));
  const name = (id: string) => screens.find((s) => s.id === id)?.name ?? "?";
  return {
    generatedAt: new Date().toISOString(),
    overview: { name: project.name, summary: project.summary ?? "", goals: by(["goal"]) },
    personas: by(["user_role"]),
    journeys: [...screens].sort((a, b) => a.position - b.position).map((s) => ({
      screen: s.name, role: s.user_role, purpose: s.purpose,
      next: conns.filter((c) => c.from_screen_id === s.id).map((c) => `${c.label ? c.label + " → " : ""}${name(c.to_screen_id)}`),
    })),
    features: by(["feature", "workflow", "data", "notification", "payment", "permission"]),
    businessRules: by(["business_rule", "constraint"]),
    acceptance: by(["acceptance"]),
    other: [],
    openQuestions: questions.filter((q) => q.status === "open").map((q) => q.question),
    unresolved: reqs.filter((r) => r.status === "unresolved"),
    confirmedDecisions: confirmed,
    proposed: reqs.filter((r) => r.status === "proposed"),
    deferred: reqs.filter((r) => r.status === "deferred"),
    excluded: reqs.filter((r) => r.status === "excluded"),
  };
}
