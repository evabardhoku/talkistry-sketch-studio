import { queryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

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
      must(supabase.from("projects").select("*").eq("id", projectId).single()),
      must(supabase.from("conversation_messages").select("*").eq("project_id", projectId).order("created_at")),
      must(supabase.from("requirements").select("*").eq("project_id", projectId).order("created_at")),
      must(supabase.from("clarification_questions").select("*").eq("project_id", projectId).order("created_at")),
      must(supabase.from("product_screens").select("*").eq("project_id", projectId).order("position")),
      must(supabase.from("workflow_connections").select("*").eq("project_id", projectId)),
      must(supabase.from("decisions").select("*").eq("project_id", projectId).order("created_at", { ascending: false })),
      must(supabase.from("specification_versions").select("*").eq("project_id", projectId).order("version", { ascending: false })),
    ]);
    return { project, messages, requirements, questions, screens, connections, decisions, versions };
  },
});
export type Workspace = Awaited<ReturnType<NonNullable<ReturnType<typeof workspaceQuery>["queryFn"]>>>;
