import { supabase } from "@/integrations/supabase/client";
import type { ReqStatus } from "./types";

/** Every human change to a requirement is logged as a decision for traceability. */
export async function decideRequirement(projectId: string, reqId: string, patch: { status?: ReqStatus; title?: string; description?: string; category?: string }, action: string, note?: string) {
  const { data: u } = await supabase.auth.getUser();
  const dec = await supabase.from("decisions").insert({ project_id: projectId, requirement_id: reqId, action, note: note ?? null, decided_by: u.user?.id ?? null }).select("id").single();
  if (dec.error) throw new Error(dec.error.message);
  const { error } = await supabase.from("requirements").update({ ...patch, last_decision_id: dec.data.id, updated_at: new Date().toISOString() }).eq("id", reqId);
  if (error) throw new Error(error.message);
}

export async function addHumanRequirement(projectId: string, r: { category: string; title: string; description: string }, status: "confirmed" | "proposed" = "confirmed") {
  const { data: u } = await supabase.auth.getUser();
  const ins = await supabase.from("requirements").insert({ project_id: projectId, ...r, status, origin: "human" }).select("id").single();
  if (ins.error) throw new Error(ins.error.message);
  const dec = await supabase.from("decisions").insert({ project_id: projectId, requirement_id: ins.data.id, action: status === "confirmed" ? "added" : "proposed", note: status === "confirmed" ? "Added and confirmed manually" : "Proposed by human", decided_by: u.user?.id ?? null }).select("id").single();
  if (dec.data) await supabase.from("requirements").update({ last_decision_id: dec.data.id }).eq("id", ins.data.id);
}

export async function deleteRequirement(id: string) {
  const { error } = await supabase.from("requirements").delete().eq("id", id);
  if (error) throw new Error(error.message);
}
