import type { Project, Question, Requirement, ScreenRow, Connection } from "./types";
import { unresolvedQuestion } from './meeting';

export interface Readiness { confirmed: number; total: number; openQuestions: number; unresolved: number; score: number; label: string; decisionBacklog: number }

/** Percentage is only the share of active requirements explicitly confirmed by humans; optional questions never reduce it. */
export function computeReadiness(reqs: Pick<Requirement, "status">[], questions: (Pick<Question, "status"> & {priority?: string})[]): Readiness {
  const active = reqs.filter((r) => r.status !== "excluded" && r.status !== "deferred");
  const confirmed = active.filter((r) => r.status === "confirmed").length;
  const unresolved = active.filter((r) => r.status === "unresolved").length;
  const openQuestions = questions.filter(unresolvedQuestion).length;
  const base = active.length ? confirmed / active.length : 0;
  const score = Math.round(base * 100);
  const decisionBacklog=questions.filter(q=>unresolvedQuestion(q)&&q.priority!=='secondary').length;
  const critical=questions.some(q=>unresolvedQuestion(q)&&q.priority==='critical');
  const label=!active.length?'Not started':critical||unresolved?'Needs clarification':confirmed===active.length?'Confirmed':'In progress';
  return { confirmed, total: active.length, openQuestions, unresolved, score, label, decisionBacklog };
}
export function sketchReadiness(screens: Pick<ScreenRow,'purpose'|'unresolved'>[], connections: Pick<Connection,'from_screen_id'>[]) {
 if(!screens.length)return 'Not started';
 if(screens.some(s=>!s.purpose))return 'In progress';
 if(screens.some(s=>Array.isArray(s.unresolved)&&s.unresolved.length>0))return 'Needs clarification';
 return screens.length===1||connections.length>0?'Ready for review':'In progress';
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
    openQuestions: questions.filter(unresolvedQuestion).map((q) => q.question),
    unresolved: reqs.filter((r) => r.status === "unresolved"),
    confirmedDecisions: confirmed,
    proposed: reqs.filter((r) => r.status === "proposed"),
    deferred: reqs.filter((r) => r.status === "deferred"),
    excluded: reqs.filter((r) => r.status === "excluded"),
  };
}
