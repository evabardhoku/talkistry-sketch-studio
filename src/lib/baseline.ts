export interface BaselineReq { id: string; category: string; title: string; description: string; evidence?: string | null }
export interface BaselineContent {
  requirements: BaselineReq[];
  unresolved: { id: string; title: string; status: string }[];
  excluded: { id: string; title: string; status: string }[];
  open_questions: string[];
  screens: { id: string; key: string; name: string; purpose: string; user_role: string | null }[];
  connections: { from: string; to: string; label: string }[];
}

export function parseBaseline(v: unknown): BaselineContent {
  const o = (v && typeof v === "object" ? v : {}) as Partial<BaselineContent>;
  const arr = <T,>(x: unknown) => (Array.isArray(x) ? (x as T[]) : []);
  return {
    requirements: arr<BaselineReq>(o.requirements), unresolved: arr(o.unresolved), excluded: arr(o.excluded),
    open_questions: arr<string>(o.open_questions), screens: arr(o.screens), connections: arr(o.connections),
  };
}

const RULE_CATS = new Set(["business_rule", "constraint", "permission", "payment"]);
const FEATURE_CATS = new Set(["feature", "workflow", "data", "notification", "goal", "user_role", "acceptance"]);

export interface Modified { before: BaselineReq; after: BaselineReq }
export interface BaselineDiff {
  addedFeatures: BaselineReq[]; removedFeatures: BaselineReq[];
  addedRules: BaselineReq[]; removedRules: BaselineReq[];
  modified: Modified[]; changedRules: Modified[];
  addedScreens: string[]; removedScreens: string[];
}

/** Compares confirmed requirements between two baselines by stable requirement id. */
export function diffBaselines(older: BaselineContent, newer: BaselineContent): BaselineDiff {
  const a = new Map(older.requirements.map((r) => [r.id, r]));
  const b = new Map(newer.requirements.map((r) => [r.id, r]));
  const added = newer.requirements.filter((r) => !a.has(r.id));
  const removed = older.requirements.filter((r) => !b.has(r.id));
  const changed: Modified[] = [];
  for (const r of newer.requirements) {
    const o = a.get(r.id);
    if (o && (o.title !== r.title || o.description !== r.description || o.category !== r.category)) changed.push({ before: o, after: r });
  }
  const isRule = (r: BaselineReq) => RULE_CATS.has(r.category);
  const isFeature = (r: BaselineReq) => FEATURE_CATS.has(r.category) || !RULE_CATS.has(r.category);
  const sa = new Set(older.screens.map((s) => s.key)), sb = new Set(newer.screens.map((s) => s.key));
  return {
    addedFeatures: added.filter(isFeature), removedFeatures: removed.filter(isFeature),
    addedRules: added.filter(isRule), removedRules: removed.filter(isRule),
    modified: changed.filter((m) => !isRule(m.after) && !isRule(m.before)),
    changedRules: changed.filter((m) => isRule(m.after) || isRule(m.before)),
    addedScreens: newer.screens.filter((s) => !sa.has(s.key)).map((s) => s.name),
    removedScreens: older.screens.filter((s) => !sb.has(s.key)).map((s) => s.name),
  };
}

export const ROLE_LABEL: Record<string, string> = { owner: "Owner", client: "Client", developer: "Developer", editor: "Editor", viewer: "Viewer" };
/** Mirrors backend rules (enforced by database triggers/policies); used only to hide controls. */
export const can = {
  edit: (r?: string | null) => !!r && ["owner", "editor", "client", "developer"].includes(r),
  confirm: (r?: string | null) => !!r && ["owner", "editor", "client"].includes(r),
  approve: (r?: string | null) => r === "owner",
  assign: (r?: string | null) => r === "owner" || r === "editor",
  estimate: (r?: string | null) => r === "owner" || r === "developer",
};
