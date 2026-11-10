import { Link, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Logo } from "./Logo";

export function AppHeader({ children }: { children?: ReactNode }) {
  const qc = useQueryClient();
  const navigate = useNavigate();
  async function signOut() {
    await qc.cancelQueries();
    qc.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }
  return (
    <header className="flex h-14 shrink-0 items-center gap-3 border-b bg-card/80 px-4 backdrop-blur">
      <Link to="/dashboard" className="flex items-center gap-2"><Logo /></Link>
      <div className="flex min-w-0 flex-1 items-center gap-2">{children}</div>
      <Button variant="ghost" size="sm" onClick={signOut}>Sign out</Button>
    </header>
  );
}
