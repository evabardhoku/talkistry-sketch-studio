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
    <header className="grid h-14 shrink-0 grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-2 border-b bg-card/80 px-3 backdrop-blur sm:gap-3 sm:px-4">
      <Link to="/dashboard" className="flex shrink-0 items-center gap-2"><Logo /></Link>
      <div className="flex min-w-0 flex-1 items-center gap-2">{children}</div>
      <Button variant="ghost" size="sm" className="shrink-0 px-2 sm:px-3" onClick={signOut}>Sign out</Button>
    </header>
  );
}
