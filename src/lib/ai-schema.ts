import { z } from "zod";
import { COMPONENT_TYPES, REQ_CATEGORIES } from "./types";

// Structured result of one discovery turn. Validated server-side before anything is persisted.
export const discoveryTurnSchema = z.object({
  reply: z.string().min(1).max(1200),
  change_summary: z.string().max(400),
  current_question_answered: z.boolean(),
  requirement_suggestions: z.array(z.object({
    category: z.enum(REQ_CATEGORIES),
    title: z.string().min(2).max(140),
    description: z.string().max(600),
    status: z.enum(["proposed", "unresolved"]),
    evidence_quote: z.string().max(400),
  })).max(10),
  ambiguities: z.array(z.string().max(300)).max(5),
  next_question: z.object({
    question: z.string().min(5).max(300),
    topic: z.string().max(40),
    rationale: z.string().max(300),
  }).nullable(),
  screens: z.array(z.object({
    key: z.string().regex(/^[a-z0-9_]{2,40}$/),
    name: z.string().max(60),
    purpose: z.string().max(240),
    user_role: z.string().max(40),
    components: z.array(z.object({
      type: z.enum(COMPONENT_TYPES),
      label: z.string().max(80),
      items: z.array(z.string().max(60)).max(6),
    })).min(1).max(8),
    unresolved: z.array(z.string().max(160)).max(4),
    change_note: z.string().max(160),
  })).max(6),
  connections: z.array(z.object({
    from: z.string(), to: z.string(), label: z.string().max(40),
  })).max(12),
  scope_changes: z.array(z.object({
    kind: z.enum(["new_functionality", "changed_behavior", "conflict", "removed_assumption"]),
    baseline_ref: z.number().int(),
    after_quote: z.string().max(600),
    summary: z.string().max(200),
    explanation: z.string().max(500),
  })).max(5),
});
export type DiscoveryTurn = z.infer<typeof discoveryTurnSchema>;

const str = (max: number) => ({ type: "string", maxLength: max });
// Hand-written JSON schema mirroring the zod schema (strict mode: all keys required).
export const discoveryTurnJsonSchema = {
  type: "object", additionalProperties: false,
  required: ["reply", "change_summary", "current_question_answered", "requirement_suggestions", "ambiguities", "next_question", "screens", "connections", "scope_changes"],
  properties: {
    reply: str(1200),
    change_summary: str(400),
    current_question_answered: { type: "boolean" },
    requirement_suggestions: { type: "array", items: { type: "object", additionalProperties: false,
      required: ["category", "title", "description", "status", "evidence_quote"],
      properties: { category: { type: "string", enum: [...REQ_CATEGORIES] }, title: str(140), description: str(600),
        status: { type: "string", enum: ["proposed", "unresolved"] }, evidence_quote: str(400) } } },
    ambiguities: { type: "array", items: str(300) },
    next_question: { anyOf: [{ type: "null" }, { type: "object", additionalProperties: false, required: ["question", "topic", "rationale"],
      properties: { question: str(300), topic: str(40), rationale: str(300) } }] },
    screens: { type: "array", items: { type: "object", additionalProperties: false,
      required: ["key", "name", "purpose", "user_role", "components", "unresolved", "change_note"],
      properties: { key: { type: "string", pattern: "^[a-z0-9_]{2,40}$" }, name: str(60), purpose: str(240), user_role: str(40),
        components: { type: "array", items: { type: "object", additionalProperties: false, required: ["type", "label", "items"],
          properties: { type: { type: "string", enum: [...COMPONENT_TYPES] }, label: str(80), items: { type: "array", items: str(60) } } } },
        unresolved: { type: "array", items: str(160) }, change_note: str(160) } } },
    connections: { type: "array", items: { type: "object", additionalProperties: false, required: ["from", "to", "label"],
      properties: { from: { type: "string" }, to: { type: "string" }, label: str(40) } } },
    scope_changes: { type: "array", items: { type: "object", additionalProperties: false,
      required: ["kind", "baseline_ref", "after_quote", "summary", "explanation"],
      properties: { kind: { type: "string", enum: ["new_functionality", "changed_behavior", "conflict", "removed_assumption"] },
        baseline_ref: { type: "integer" }, after_quote: str(600), summary: str(200), explanation: str(500) } } },
  },
} as const;
