import type { Database } from "@/integrations/supabase/types";

type T = Database["public"]["Tables"];
export type Project = T["projects"]["Row"];
export type Message = T["conversation_messages"]["Row"];
export type Requirement = T["requirements"]["Row"];
export type Question = T["clarification_questions"]["Row"];
export type ScreenRow = T["product_screens"]["Row"];
export type Connection = T["workflow_connections"]["Row"];
export type Decision = T["decisions"]["Row"];
export type SpecVersion = T["specification_versions"]["Row"];
export type ReqStatus = Database["public"]["Enums"]["req_status"];

export const COMPONENT_TYPES = [
  "header", "nav", "card", "form", "input", "button", "list", "search", "calendar", "table", "modal", "text",
] as const;
export type SketchComponentType = (typeof COMPONENT_TYPES)[number];
export interface SketchComponent { type: SketchComponentType; label: string; items?: string[] }

export const REQ_CATEGORIES = [
  "goal", "user_role", "feature", "workflow", "business_rule", "permission", "payment", "notification", "data", "acceptance", "constraint",
] as const;
export type ReqCategory = (typeof REQ_CATEGORIES)[number];

export const CATEGORY_LABEL: Record<string, string> = {
  goal: "Goal", user_role: "User role", feature: "Feature", workflow: "Workflow", business_rule: "Business rule",
  permission: "Permission", payment: "Payment", notification: "Notification", data: "Data", acceptance: "Acceptance criterion", constraint: "Constraint",
};
export const STATUS_LABEL: Record<ReqStatus, string> = {
  confirmed: "Confirmed", proposed: "Proposed", unresolved: "Unresolved", deferred: "Deferred", excluded: "Out of scope",
};

export function parseComponents(v: unknown): SketchComponent[] {
  if (!Array.isArray(v)) return [];
  return v.filter((c): c is SketchComponent => !!c && typeof c === "object" && typeof (c as SketchComponent).type === "string")
    .map((c) => ({ type: (COMPONENT_TYPES as readonly string[]).includes(c.type) ? c.type : "text", label: String(c.label ?? ""), items: Array.isArray(c.items) ? c.items.map(String) : undefined }));
}
export function parseStrings(v: unknown): string[] { return Array.isArray(v) ? v.map(String) : []; }
