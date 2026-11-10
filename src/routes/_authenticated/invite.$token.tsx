import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/Logo";
import { ROLE_LABEL } from "@/lib/baseline";

export const Route = createFileRoute("/_authenticated/invite/$token")({
  head: () => ({ meta: [
    { title: "Project invitation — SpecLoop" }, { name: "description", content: "Accept an invitation to collaborate on a SpecLoop project." },
    { property: "og:title", content: "Project invitation — SpecLoop" }, { property: "og:description", content: "Join a product discovery project." },
  ] }),
  component: InvitePage,
});

function InvitePage() {
  const { token } = Route.useParams();
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false); const [err, setErr] = useState<string | null>(null);
  const inv = useQuery({ queryKey: ["invite", token], queryFn: async () => { const { data, error } = await supabase.rpc("get_invitation", { _token: token }); if (error) throw new Error(error.message); return data[0] ?? null; } });
  async function accept() {
    setBusy(true); setErr(null);
    const { data, error } = await supabase.rpc("accept_invitation", { _token: token });
    setBusy(false);
    if (error) { setErr(error.message); return; }
    const { data: m } = await supabase.from("project_members").select("baseline_id").eq("project_id", data).maybeSingle();
    if (m?.baseline_id) navigate({ to: "/projects/$projectId/versions", params: { projectId: data } });
    else navigate({ to: "/projects/$projectId", params: { projectId: data } });
  }
  return (
    <div className="grid min-h-screen place-items-center bg-hero px-4">
      <div className="w-full max-w-sm rounded-2xl border bg-card p-6 text-center shadow-lift">
        <div className="mb-4 flex justify-center"><Logo /></div>
        {inv.isLoading ? <Loader2 className="mx-auto size-5 animate-spin" /> : !inv.data ? <p>This invitation link is not valid.</p> : (
          <>
            <h1 className="font-display text-3xl">Join “{inv.data.project_name}”</h1>
            <p className="mt-2 text-sm text-muted-foreground">You're invited as <b>{ROLE_LABEL[inv.data.role]}</b> ({inv.data.email}).</p>
            {inv.data.valid ? <Button className="mt-5 w-full" onClick={accept} disabled={busy}>{busy && <Loader2 className="size-4 animate-spin" />}Accept invitation</Button>
              : <p className="mt-4 text-sm text-destructive">This invitation is {inv.data.reason}.</p>}
            {err && <p className="mt-3 text-sm text-destructive">{err}</p>}
          </>
        )}
      </div>
    </div>
  );
}
