import { z } from "zod";
import { COMPONENT_TYPES, REQ_CATEGORIES } from "./types";

// Lenient on length (truncate) but strict on structure and enums.
const S = (max: number) => z.string().transform((v) => v.slice(0, max));

// Structured result of one discovery turn. Validated server-side before anything is persisted.
export const discoveryTurnSchema = z.object({
  reply: S(1200),
  change_summary: S(400),
  current_question_answered: z.boolean(),
  requirement_suggestions: z.array(z.object({
    category: z.enum(REQ_CATEGORIES),
    title: S(140),
    description: S(600),
    status: z.enum(["proposed", "unresolved"]),
    evidence_quote: S(400),
  })).transform((a) => a.slice(0, 10)),
  ambiguities: z.array(S(300)).transform((a) => a.slice(0, 5)),
  next_question: z.object({
    question: S(300),
    topic: S(40),
    rationale: S(300),
    priority: z.enum(["critical", "important", "secondary"]).default("important"),
  }).nullable(),
  backlog_questions: z.array(z.object({ question: S(300), topic: S(40), rationale: S(300), priority: z.enum(["critical", "important", "secondary"]), stage_key: S(40), screen_key: S(40), requirement_title: S(140), suggested_answers: z.array(S(120)).max(5) })).max(8).default([]),
  screens: z.array(z.object({
    key: z.string().transform((k) => k.toLowerCase().replace(/[^a-z0-9_]+/g, "_").slice(0, 40) || "screen"),
    name: S(60),
    purpose: S(240),
    user_role: S(40),
    components: z.array(z.object({
      type: z.enum(COMPONENT_TYPES),
      label: S(80),
      items: z.array(S(60)).transform((a) => a.slice(0, 6)),
    })).transform((a) => a.slice(0, 8)),
    unresolved: z.array(S(160)).transform((a) => a.slice(0, 4)),
    change_note: S(160),
  })).transform((a) => a.slice(0, 6)),
  connections: z.array(z.object({
    from: z.string(), to: z.string(), label: S(40),
  })).transform((a) => a.slice(0, 12)),
  scope_changes: z.array(z.object({
    kind: z.enum(["new_functionality", "changed_behavior", "conflict", "removed_assumption"]),
    baseline_ref: z.number().int(),
    after_quote: S(600),
    summary: S(200),
    explanation: S(500),
  })).transform((a) => a.slice(0, 5)),
});
export type DiscoveryTurn = z.infer<typeof discoveryTurnSchema>;

const str = (max: number) => ({ type: "string", maxLength: max });
// Hand-written JSON schema mirroring the zod schema (strict mode: all keys required).
export const discoveryTurnJsonSchema = {
  type: "object", additionalProperties: false,
  required: ["reply", "change_summary", "current_question_answered", "requirement_suggestions", "ambiguities", "next_question", "backlog_questions", "screens", "connections", "scope_changes"],
  properties: {
    reply: str(1200),
    change_summary: str(400),
    current_question_answered: { type: "boolean" },
    requirement_suggestions: { type: "array", items: { type: "object", additionalProperties: false,
      required: ["category", "title", "description", "status", "evidence_quote"],
      properties: { category: { type: "string", enum: [...REQ_CATEGORIES] }, title: str(140), description: str(600),
        status: { type: "string", enum: ["proposed", "unresolved"] }, evidence_quote: str(400) } } },
    ambiguities: { type: "array", items: str(300) },
    next_question: { anyOf: [{ type: "null" }, { type: "object", additionalProperties: false, required: ["question", "topic", "rationale", "priority"],
      properties: { question: str(300), topic: str(40), rationale: str(300), priority: { type: "string", enum: ["critical", "important", "secondary"] } } }] },
    backlog_questions: { type: "array", items: { type: "object", additionalProperties: false, required: ["question","topic","rationale","priority","stage_key","screen_key","requirement_title","suggested_answers"], properties: {question:str(300),topic:str(40),rationale:str(300),priority:{type:"string",enum:["critical","important","secondary"]},stage_key:str(40),screen_key:str(40),requirement_title:str(140),suggested_answers:{type:"array",items:str(120)}} } },
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
