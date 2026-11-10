import type { SupabaseClient } from "@supabase/supabase-js";
import { generateResponse, GatewayError } from "@lovable.dev/ai-gateway";
import type { Database } from "@/integrations/supabase/types";
import { parseBaseline } from "./baseline";
import { discoveryTurnJsonSchema, discoveryTurnSchema, type DiscoveryTurn } from "./ai-schema";

type DB = SupabaseClient<Database>;

const SYSTEM = `You are SpecLoop, an AI product discovery facilitator ("product sketch artist") helping a non-technical client and a developer agree on what software should do.
Rules:
- Be friendly, concise, professional; plain language, no jargon. "reply" is 1-3 short sentences then the next question (if any).
- Ask exactly ONE high-value clarification question at a time. Adapt to earlier answers. Skip topics that are irrelevant to this product.
- Explore when relevant: target users & roles, permissions, core workflows, business rules, exceptions/edge cases, payments, notifications, data to store.
- NEVER invent business requirements. Only suggest requirements directly supported by what the human said; put the exact supporting words in evidence_quote. If something is implied but not stated, put it in "ambiguities" or as status "unresolved" — not "proposed".
- Do not repeat requirements that already exist in the current list (by meaning).
- Screens: a low-fidelity sketch. Return ONLY screens that are new or should change this turn (full definition for each). Reuse existing keys to update. Use component types: header, nav, card, form, input, button, list, search, calendar, table, modal, text. Mark functionality whose behaviour is undecided in "unresolved". change_note explains why the screen changed (or "").
- connections: navigation between screens by key (existing or new); return only new links.
- If the user skipped the question, don't push; move to another valuable topic.
- If the user requests a change to a screen, update that screen accordingly.
- next_question null only if discovery feels complete.
- scope_changes: ONLY when APPROVED_BASELINE is present. Compare the client's latest message against the approved baseline requirements. Flag new functionality not in the baseline, changed behavior of a baseline item, a conflict with a baseline item, or a removed assumption. baseline_ref = index of the affected baseline requirement, or -1 for brand-new functionality. after_quote = exact words from the client's latest message. explanation = plain-language reason it may affect scope. Never estimate cost or time. Empty array if nothing differs.`;

function extractText(res: unknown): string {
  const r = res as { output_text?: string; output?: { type: string; content?: { type: string; text?: string }[] }[] };
  if (typeof r.output_text === "string" && r.output_text) return r.output_text;
  for (const item of r.output ?? []) {
    if (item.type !== "message") continue;
    for (const c of item.content ?? []) if (c.type === "output_text" && c.text) return c.text;
  }
  throw new Error("AI returned no text");
}

export async function runDiscoveryTurn(sb: DB, userId: string, d: { projectId: string; content: string; skip: boolean; requestId: string }) {
  const { projectId } = d;
  const { data: project, error: pe } = await sb.from("projects").select("*").eq("id", projectId).single();
  if (pe || !project) throw new Error("Project not found");

  let { data: session } = await sb.from("discovery_sessions").select("*").eq("project_id", projectId).order("created_at").limit(1).maybeSingle();
  if (!session) {
    const ins = await sb.from("discovery_sessions").insert({ project_id: projectId }).select().single();
    if (ins.error) throw new Error(ins.error.message);
    session = ins.data;
  }
  const content = d.skip ? "(Skipped this question for now)" : d.content;
  if (!content) throw new Error("Please write an answer first");

  const claim = await sb.rpc("claim_discovery_turn", { _project_id: projectId, _session_id: session.id, _request_id: d.requestId, _content: content, _skip: d.skip });
  if (claim.error) throw new Error(claim.error.message);
  const claimed = await sb.from("conversation_messages").select("*").eq("id", d.requestId).single();
  if (claimed.error || !claimed.data) throw new Error("Could not save this answer.");
  const userMsg = { data: claimed.data };
  const state = (userMsg.data.meta as { turn_state?: string } | null)?.turn_state;
  if (state === "complete") return { scopeChanges: 0, changeSummary: "Already saved", changedScreenKeys: [] as string[], newRequirements: 0 };
  // Only the claimant runs inference. Duplicates read state, never replay an uncertain call.
  if (userMsg.data.created_at !== (claim.data as { created_at?: string } | null)?.created_at) throw new Error("This answer is already being processed.");
  if (state === "failed") throw new Error("This attempt did not finish. Review your saved answer before sending a new attempt.");

  const [msgs, reqs, qs, screens] = await Promise.all([
    sb.from("conversation_messages").select("role,content").eq("session_id", session.id).order("created_at", { ascending: false }).limit(24),
    sb.from("requirements").select("category,title,description,status,evidence").eq("project_id", projectId),
    sb.from("clarification_questions").select("id,question,status,topic").eq("project_id", projectId).order("created_at"),
    sb.from("product_screens").select("id,key,name,purpose,user_role,components,unresolved").eq("project_id", projectId).order("position"),
  ]);
  const { data: baselineRow } = await sb.from("specification_versions").select("id,version,content").eq("project_id", projectId).eq("kind", "baseline").order("version", { ascending: false }).limit(1).maybeSingle();
  const baseline = baselineRow ? parseBaseline(baselineRow.content) : null;
  const openQ = (qs.data ?? []).filter((q) => q.status === "open").at(-1);
  const contextBlock = JSON.stringify({
    product: { name: project.name, summary: project.summary },
    requirements: reqs.data ?? [],
    asked_questions: (qs.data ?? []).map((q) => ({ q: q.question, status: q.status, topic: q.topic })),
    current_open_question: openQ?.question ?? null,
    screens: (screens.data ?? []).map(({ id: _id, ...s }) => s),
    user_skipped: d.skip,
    APPROVED_BASELINE: baseline && baselineRow ? { version: baselineRow.version, requirements: baseline.requirements.map((r, i) => ({ index: i, category: r.category, title: r.title, description: r.description })) } : null,
  });
  const history = [...(msgs.data ?? [])].reverse().map((m) => `${m.role === "user" ? "CLIENT" : "SPECLOOP"}: ${m.content}`).join("\n");

  let turn: DiscoveryTurn;
  try {
    const res = await generateResponse({
      model: "openai/gpt-6-astra",
      instructions: SYSTEM,
      input: `PROJECT STATE (JSON):\n${contextBlock}\n\nCONVERSATION:\n${history}\n\nProduce the structured update for the client's latest message.`,
      text: { format: { type: "json_schema", name: "discovery_turn", schema: discoveryTurnJsonSchema as unknown as Record<string, unknown>, strict: true } },
    });
    const parsed = discoveryTurnSchema.safeParse(JSON.parse(extractText(res)));
    if (!parsed.success) { console.error("AI validation issues", JSON.stringify(parsed.error.issues.slice(0, 5))); throw new Error("AI response failed validation"); }
    turn = parsed.data;
  } catch (e) {
    await sb.from("conversation_messages").update({ meta: { skip: d.skip, turn_state: "failed" } }).eq("id", userMsg.data.id);
    if (e instanceof GatewayError) {
      if (e.httpStatus === 429) throw new Error("The AI is busy right now. Please try again in a moment.");
      if (e.httpStatus === 402) throw new Error("AI credits are exhausted for this workspace.");
    }
    console.error("discovery turn failed", e);
    throw new Error(e instanceof Error && e.message.includes("validation") ? "The AI returned an unexpected answer. Please try again." : "The AI could not process this answer. Please try again.");
  }

  const reply = turn.next_question && !turn.reply.includes(turn.next_question.question) ? `${turn.reply}\n\n${turn.next_question.question}` : turn.reply;
  const aMsg = await sb.from("conversation_messages").insert({
    project_id: projectId, session_id: session.id, role: "assistant", content: reply,
    meta: { change_summary: turn.change_summary, ambiguities: turn.ambiguities },
  }).select().single();
  if (aMsg.error) throw new Error(aMsg.error.message);

  if (openQ) {
    await sb.from("clarification_questions").update({
      status: d.skip ? "skipped" : turn.current_question_answered ? "answered" : "open",
      answer_message_id: d.skip ? null : userMsg.data.id, updated_at: new Date().toISOString(),
    }).eq("id", openQ.id);
  }
  if (turn.next_question && (d.skip || turn.current_question_answered || !openQ)) {
    await sb.from("clarification_questions").insert({
      project_id: projectId, session_id: session.id, question: turn.next_question.question,
      topic: turn.next_question.topic || "general", rationale: turn.next_question.rationale, asked_message_id: aMsg.data.id,
    });
  }

  const existingTitles = new Set((reqs.data ?? []).map((r) => r.title.toLowerCase()));
  const newReqs = [
    ...turn.requirement_suggestions.filter((r) => !existingTitles.has(r.title.toLowerCase())).map((r) => ({
      project_id: projectId, category: r.category, title: r.title, description: r.description, status: r.status,
      evidence: r.evidence_quote || null, source_message_id: userMsg.data.id, origin: "ai",
    })),
    ...turn.ambiguities.filter((a) => !existingTitles.has(a.toLowerCase())).map((a) => ({
      project_id: projectId, category: "constraint", title: a.slice(0, 140), description: "Detected ambiguity — needs a decision.",
      status: "unresolved" as const, evidence: null, source_message_id: userMsg.data.id, origin: "ai",
    })),
  ];
  if (newReqs.length) { const saved = await sb.from("requirements").insert(newReqs); if (saved.error) throw new Error("Your answer was saved, but requirements could not be saved. Refresh before sending again."); }

  const existingScreens = screens.data ?? [];
  const keyToId = new Map(existingScreens.map((s) => [s.key, s.id]));
  let pos = existingScreens.length;
  for (const s of turn.screens) {
    const row = {
      project_id: projectId, key: s.key, name: s.name, purpose: s.purpose, user_role: s.user_role || null,
      components: s.components.map((c) => ({ type: c.type, label: c.label, ...(c.items.length ? { items: c.items } : {}) })),
      unresolved: s.unresolved, change_note: s.change_note || null, changed_message_id: aMsg.data.id, updated_at: new Date().toISOString(),
    };
    const existingId = keyToId.get(s.key);
    if (existingId) {
      const saved = await sb.from("product_screens").update(row).eq("id", existingId);
      if (saved.error) throw new Error("Your answer was saved, but the sketch update failed. Refresh to review saved changes.");
    } else {
      const ins = await sb.from("product_screens").insert({ ...row, position: pos++ }).select("id").single();
      if (ins.error) throw new Error("Could not save the new screen. Refresh before sending again.");
      if (ins.data) keyToId.set(s.key, ins.data.id);
    }
  }
  const links = turn.connections.flatMap((c) => {
    const from = keyToId.get(c.from), to = keyToId.get(c.to);
    return from && to && from !== to ? [{ project_id: projectId, from_screen_id: from, to_screen_id: to, label: c.label }] : [];
  });
  if (links.length) { const saved = await sb.from("workflow_connections").upsert(links, { onConflict: "from_screen_id,to_screen_id", ignoreDuplicates: true }); if (saved.error) throw new Error("Some workflow links were not saved. Refresh to review the sketch."); }

  if (baseline && baselineRow && !d.skip && turn.scope_changes.length) {
    const rows = turn.scope_changes.map((c) => {
      const before = c.baseline_ref >= 0 ? baseline.requirements[c.baseline_ref] : undefined;
      // Keep evidence exact: use the AI quote only if it really appears in the user's message.
      const after = c.after_quote && content.includes(c.after_quote) ? c.after_quote : content;
      return {
        project_id: projectId, baseline_id: baselineRow.id, source_message_id: userMsg.data.id, kind: c.kind,
        summary: c.summary, explanation: c.explanation, after_text: after,
        before_text: before ? `${before.title}${before.description ? " — " + before.description : ""}` : null,
        before_requirement_id: before?.id ?? null,
      };
    });
    const sc = await sb.from("scope_changes").insert(rows);
    if (sc.error) throw new Error("The answer was saved, but scope changes could not be saved. Refresh before continuing.");
  }

  await sb.from("projects").update({ updated_at: new Date().toISOString() }).eq("id", projectId);
  await sb.from("conversation_messages").update({ meta: { skip: d.skip, turn_state: "complete" } }).eq("id", userMsg.data.id);
  return { scopeChanges: baseline ? turn.scope_changes.length : 0, changeSummary: turn.change_summary, changedScreenKeys: turn.screens.map((s) => s.key), newRequirements: newReqs.length };
}
