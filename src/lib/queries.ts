import { queryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Project } from "./types";

async function must<T>(p: PromiseLike<{ data: T | null; error: { message: string } | null }>): Promise<NonNullable<T>> {
  const { data, error } = await p;
  if (error) throw new Error(error.message);
  return data as NonNullable<T>;
}

export const projectsQuery = () => queryOptions({
  queryKey: ["projects"],
  queryFn: async () => {
    const [projects, reqs, qs] = await Promise.all([
      must(supabase.from("projects").select("*").order("updated_at", { ascending: false })),
      must(supabase.from("requirements").select("project_id,status")),
      must(supabase.from("clarification_questions").select("project_id,status,question")),
    ]);
    return { projects, reqs, qs };
  },
});

export const workspaceQuery = (projectId: string) => queryOptions({
  queryKey: ["workspace", projectId],
  queryFn: async () => {
    const [project, messages, requirements, questions, screens, connections, decisions, versions] = await Promise.all([
      must(supabase.from("projects").select("*").eq("id", projectId).single()) as Promise<Project>,
      must(supabase.from("conversation_messages").select("*").eq("project_id", projectId).order("created_at")),
      must(supabase.from("requirements").select("*").eq("project_id", projectId).order("created_at")),
      must(supabase.from("clarification_questions").select("*").eq("project_id", projectId).order("created_at")),
      must(supabase.from("product_screens").select("*").eq("project_id", projectId).order("position")),
      must(supabase.from("workflow_connections").select("*").eq("project_id", projectId)),
      must(supabase.from("decisions").select("*").eq("project_id", projectId).order("created_at", { ascending: false })),
      must(supabase.from("specification_versions").select("*").eq("project_id", projectId).order("version", { ascending: false })),
    ]);
    const [comments, scopeChanges, people, session] = await Promise.all([
      must(supabase.from("review_comments").select("*").eq("project_id", projectId).order("created_at")),
      must(supabase.from("scope_changes").select("*").eq("project_id", projectId).order("created_at", { ascending: false })),
      must(supabase.rpc("get_project_people", { _project_id: projectId })),
      supabase.auth.getSession(),
    ]);
    const meId = session.data.session?.user.id ?? null;
    const myRole = people.find((p) => p.user_id === meId)?.role ?? null;
    return { project, messages, requirements, questions, screens, connections, decisions, versions, comments, scopeChanges, people, meId, myRole };
  },
});
export type Workspace = Awaited<ReturnType<NonNullable<ReturnType<typeof workspaceQuery>["queryFn"]>>>;

/** Minimal access info: works for live members and baseline-only viewers. */
export const accessQuery = (projectId: string) => queryOptions({
  queryKey: ["access", projectId],
  queryFn: async () => {
    const { data: s } = await supabase.auth.getSession();
    const uid = s.session?.user.id ?? "";
    const [project, member] = await Promise.all([
      must(supabase.from("projects").select("*").eq("id", projectId).single()) as Promise<Project>,
      must(supabase.from("project_members").select("*").eq("project_id", projectId).eq("user_id", uid).maybeSingle()),
    ]);
    return { project, member };
  },
});

export const baselinesQuery = (projectId: string) => queryOptions({
  queryKey: ["baselines", projectId],
  queryFn: () => must(supabase.from("specification_versions").select("*").eq("project_id", projectId).eq("kind", "baseline").order("version", { ascending: false })),
});
