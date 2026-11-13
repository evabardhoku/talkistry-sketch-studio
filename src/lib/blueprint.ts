import type { Question, Requirement, ScreenRow } from './types';
import { unresolvedQuestion } from './meeting';

export const BLUEPRINT_STAGES = [
  { key: 'vision', name: 'Product vision & scope', hint: 'Objective, problem, audience, value, in/out of scope', categories: ['goal', 'constraint'] },
  { key: 'users', name: 'Users & roles', hint: 'User types, stakeholders, permissions, needs', categories: ['user_role', 'permission'] },
  { key: 'pages', name: 'Pages & navigation', hint: 'Required pages, main components, navigation, links', categories: [] as string[] },
  { key: 'workflows', name: 'Core user workflows', hint: 'Journeys, key actions, steps, screen dependencies', categories: ['workflow', 'feature', 'notification'] },
  { key: 'rules', name: 'Business rules & data', hint: 'Constraints, validation, data, exceptions, integrations', categories: ['business_rule', 'data', 'payment'] },
  { key: 'review', name: 'Review & approval', hint: 'Confirmed scope, open decisions, readiness, approval', categories: ['acceptance'] },
] as const;
export type StageKey = (typeof BLUEPRINT_STAGES)[number]['key'];
export const STAGE_NAME = Object.fromEntries(BLUEPRINT_STAGES.map(s => [s.key, s.name])) as Record<StageKey, string>;

export function stageForCategory(category: string): StageKey {
  return BLUEPRINT_STAGES.find(s => (s.categories as readonly string[]).includes(category))?.key ?? 'workflows';
}

const KEYWORDS: [StageKey, RegExp][] = [
  ['users', /\b(role|user type|persona|permission|admin|stakeholder|who can|access)\b/i],
  ['rules', /\b(rule|price|pricing|payment|pay|subscription|data|validat|integration|tax|refund|limit|policy|offline|licen[cs]e)\b/i],
  ['pages', /\b(page|screen|navigation|menu|layout|dashboard)\b/i],
  ['workflows', /\b(flow|journey|step|checkout|book|purchase|notify|process|device)\b/i],
  ['vision', /\b(goal|objective|problem|audience|scope|vision|value|mvp)\b/i],
  ['review', /\b(approv|sign[- ]off|acceptance)\b/i],
];
/** Deterministic stage for a question: explicit choice, linked requirement/screen, then topic/text keywords. */
export function stageForQuestion(q: Pick<Question, 'blueprint_stage' | 'requirement_id' | 'screen_id' | 'topic' | 'question'>, reqs: Pick<Requirement, 'id' | 'category'>[] = []): StageKey {
  if (q.blueprint_stage && q.blueprint_stage in STAGE_NAME) return q.blueprint_stage as StageKey;
  const req = q.requirement_id ? reqs.find(r => r.id === q.requirement_id) : undefined;
  if (req) return stageForCategory(req.category);
  if (q.screen_id) return 'pages';
  const text = `${q.topic} ${q.question}`;
  return KEYWORDS.find(([, re]) => re.test(text))?.[0] ?? 'vision';
}

export type StageState = 'not_started' | 'in_progress' | 'needs_decision' | 'complete';
export interface StageSummary { key: StageKey; state: StageState; confirmed: number; total: number; openQuestions: number }

/** Completion reflects saved data only: confirmed requirements (or saved screens for pages) with nothing unresolved and no open questions. */
export function stageSummary(key: StageKey, reqs: Pick<Requirement, 'category' | 'status'>[], questions: Parameters<typeof stageForQuestion>[0][] & Pick<Question, 'status'>[], screens: Pick<ScreenRow, 'unresolved'>[] = [], hasBaseline = false, allReqs: Pick<Requirement, 'id' | 'category'>[] = []): StageSummary {
  const stage = BLUEPRINT_STAGES.find(s => s.key === key)!;
  const inStage = key === 'review' ? reqs : reqs.filter(r => (stage.categories as readonly string[]).includes(r.category));
  const active = inStage.filter(r => r.status !== 'excluded' && r.status !== 'deferred');
  const confirmed = active.filter(r => r.status === 'confirmed').length;
  const openQuestions = questions.filter(q => unresolvedQuestion(q as Question) && (key === 'review' || stageForQuestion(q, allReqs) === key)).length;
  let state: StageState;
  if (key === 'pages') {
    const pending = screens.some(s => Array.isArray(s.unresolved) && s.unresolved.length > 0);
    state = !screens.length ? 'not_started' : openQuestions || pending ? 'needs_decision' : 'complete';
    return { key, state, confirmed: screens.length, total: screens.length, openQuestions };
  }
  if (key === 'review') {
    state = !active.length ? 'not_started' : openQuestions || confirmed < active.length ? 'needs_decision' : hasBaseline ? 'complete' : 'in_progress';
    return { key, state, confirmed, total: active.length, openQuestions };
  }
  const unresolved = active.some(r => r.status === 'unresolved');
  state = !active.length && !openQuestions ? 'not_started' : unresolved || openQuestions ? 'needs_decision' : confirmed === active.length && confirmed > 0 ? 'complete' : 'in_progress';
  return { key, state, confirmed, total: active.length, openQuestions };
}
