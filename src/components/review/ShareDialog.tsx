import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Copy, Loader2, Trash2, Users } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { ROLE_LABEL } from "@/lib/baseline";
import type { SpecVersion } from "@/lib/types";
import type { Person } from "./ReviewContext";

const DURATIONS: [string, number | null][] = [["No end date", null], ["7 days", 7], ["30 days", 30], ["90 days", 90]];
const inDays = (d: number | null) => (d ? new Date(Date.now() + d * 864e5).toISOString() : null);
const inviteUrl = (t: string) => `${window.location.origin}/invite/${t}`;

export function ShareDialog({ projectId, people, myRole, baselines, onChanged }: {
  projectId: string; people: Person[]; myRole: string | null; baselines: SpecVersion[]; onChanged: () => void;
}) {
  const isOwner = myRole === "owner";
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState(""); const [role, setRole] = useState("client");
  const [dur, setDur] = useState("0"); const [scope, setScope] = useState("live"); const [busy, setBusy] = useState(false);
  const invites = useQuery({
    queryKey: ["invites", projectId], enabled: open && isOwner,
    queryFn: async () => {
      const { data, error } = await supabase.from("project_invitations").select("*").eq("project_id", projectId).is("accepted_at", null).is("revoked_at", null).order("created_at", { ascending: false });
      if (error) throw new Error(error.message); return data;
    },
  });
  const verLabel = (id: string | null) => (id ? `v${baselines.find((b) => b.id === id)?.version ?? "?"} only` : "Live workspace");

  async function invite(e: React.FormEvent) {
    e.preventDefault(); setBusy(true);
    const { data: u } = await supabase.auth.getUser();
    const { data, error } = await supabase.from("project_invitations").insert({
      project_id: projectId, email: email.trim().toLowerCase(), role: role as "client", invited_by: u.user!.id,
      access_expires_at: inDays(DURATIONS[Number(dur)]![1]), baseline_id: scope === "live" ? null : scope,
    }).select("token").single();
    setBusy(false);
    if (error) { toast.error(error.message); return; }
    await navigator.clipboard?.writeText(inviteUrl(data.token)).catch(() => {});
    toast.success("Invitation created — link copied. Send it to them directly.");
    setEmail(""); invites.refetch();
  }
  async function updateMember(userId: string, patch: { role?: string; expires_at?: string | null; baseline_id?: string | null }) {
    const { error } = await supabase.from("project_members").update(patch as never).eq("project_id", projectId).eq("user_id", userId);
    if (error) toast.error(error.message); else onChanged();
  }
  async function removeMember(userId: string) {
    const { error } = await supabase.from("project_members").delete().eq("project_id", projectId).eq("user_id", userId);
    if (error) toast.error(error.message); else onChanged();
  }
  async function revoke(id: string) {
    const { error } = await supabase.from("project_invitations").update({ revoked_at: new Date().toISOString() }).eq("id", id);
    if (error) toast.error(error.message); else invites.refetch();
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild><Button size="sm" variant="outline"><Users className="size-4" />Share · {people.length}</Button></DialogTrigger>
      <DialogContent className="max-h-[90vh] max-w-xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-display text-2xl font-normal">People on this project</DialogTitle>
          <DialogDescription>You decide who gets access, for how long, and whether they see the live workspace or only one approved version.</DialogDescription>
        </DialogHeader>
        {isOwner && (
          <form onSubmit={invite} className="grid gap-3 rounded-lg border bg-muted/30 p-3 sm:grid-cols-2">
            <div className="space-y-1 sm:col-span-2"><Label htmlFor="inv-email">Email</Label><Input id="inv-email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="client@company.com" /></div>
            <div className="space-y-1"><Label htmlFor="inv-role">Role</Label>
              <select id="inv-role" value={role} onChange={(e) => setRole(e.target.value)} className="h-9 w-full rounded-md border bg-background px-2 text-sm">
                <option value="client">Client — answers, reviews, confirms</option><option value="developer">Developer — feasibility, constraints, estimates</option><option value="viewer">Viewer — read only</option>
              </select></div>
            <div className="space-y-1"><Label htmlFor="inv-dur">Access for</Label>
              <select id="inv-dur" value={dur} onChange={(e) => setDur(e.target.value)} className="h-9 w-full rounded-md border bg-background px-2 text-sm">
                {DURATIONS.map(([l], i) => <option key={l} value={i}>{l}</option>)}
              </select></div>
            <div className="space-y-1 sm:col-span-2"><Label htmlFor="inv-scope">What they can see</Label>
              <select id="inv-scope" value={scope} onChange={(e) => setScope(e.target.value)} className="h-9 w-full rounded-md border bg-background px-2 text-sm">
                <option value="live">Live workspace (conversation, sketch, requirements)</option>
                {baselines.map((b) => <option key={b.id} value={b.id}>Only approved version v{b.version} (read-only)</option>)}
              </select></div>
            <Button type="submit" className="sm:col-span-2" disabled={busy}>{busy && <Loader2 className="size-4 animate-spin" />}Create invitation link</Button>
            <p className="text-[11px] text-muted-foreground sm:col-span-2">Links are single-use, valid for 7 days, and only work for the invited email address.</p>
          </form>
        )}
        {isOwner && (invites.data?.length ?? 0) > 0 && (
          <div><h4 className="mb-1 text-xs font-medium text-muted-foreground">Pending invitations</h4>
            <ul className="space-y-1">{invites.data!.map((i) => (
              <li key={i.id} className="flex items-center gap-2 rounded-md border px-2 py-1.5 text-sm">
                <span className="min-w-0 flex-1 truncate">{i.email} · {ROLE_LABEL[i.role]} · {verLabel(i.baseline_id)}</span>
                <Button size="icon" variant="ghost" className="size-7" aria-label="Copy link" onClick={() => { navigator.clipboard?.writeText(inviteUrl(i.token)); toast.success("Link copied"); }}><Copy className="size-3.5" /></Button>
                <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => revoke(i.id)}>Revoke</Button>
              </li>))}</ul>
          </div>
        )}
        <div><h4 className="mb-1 text-xs font-medium text-muted-foreground">Members</h4>
          <ul className="space-y-1">{people.map((p) => {
            const expired = p.expires_at && new Date(p.expires_at) < new Date();
            return (
              <li key={p.user_id} className="flex flex-wrap items-center gap-2 rounded-md border px-2 py-1.5 text-sm">
                <span className="min-w-0 flex-1 truncate">{p.display_name || p.email} <span className="text-xs text-muted-foreground">{p.email}</span></span>
                {isOwner && p.role !== "owner" ? (
                  <>
                    <select aria-label="Role" value={p.role} onChange={(e) => updateMember(p.user_id, { role: e.target.value })} className="h-7 rounded border bg-background px-1 text-xs">
                      {["client", "developer", "viewer"].map((r) => <option key={r} value={r}>{ROLE_LABEL[r]}</option>)}
                    </select>
                    <select aria-label="Visible version" value={p.baseline_id ?? "live"} onChange={(e) => updateMember(p.user_id, { baseline_id: e.target.value === "live" ? null : e.target.value })} className="h-7 rounded border bg-background px-1 text-xs">
                      <option value="live">Live</option>{baselines.map((b) => <option key={b.id} value={b.id}>v{b.version} only</option>)}
                    </select>
                    <select aria-label="Access duration" value="" onChange={(e) => e.target.value !== "" && updateMember(p.user_id, { expires_at: inDays(DURATIONS[Number(e.target.value)]![1]) })} className="h-7 rounded border bg-background px-1 text-xs">
                      <option value="">{p.expires_at ? `${expired ? "Expired" : "Until"} ${new Date(p.expires_at).toLocaleDateString()}` : "No end date"}</option>
                      {DURATIONS.map(([l], i) => <option key={l} value={i}>{i === 0 ? "Remove end date" : `Extend ${l} from now`}</option>)}
                    </select>
                    <Button size="icon" variant="ghost" className="size-7" aria-label="Remove member" onClick={() => removeMember(p.user_id)}><Trash2 className="size-3.5" /></Button>
                  </>
                ) : <span className="text-xs text-muted-foreground">{ROLE_LABEL[p.role]} · {verLabel(p.baseline_id)}{p.expires_at ? ` · until ${new Date(p.expires_at).toLocaleDateString()}` : ""}</span>}
              </li>);
          })}</ul>
        </div>
      </DialogContent>
    </Dialog>
  );
}
