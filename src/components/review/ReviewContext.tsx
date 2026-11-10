import { createContext, useContext } from "react";
import type { Database } from "@/integrations/supabase/types";

export type Comment = Database["public"]["Tables"]["review_comments"]["Row"];
export interface Person { user_id: string; role: string; display_name: string | null; email: string | null; expires_at: string | null; baseline_id: string | null }
export interface ReviewCtx { projectId: string; meId: string | null; myRole: string | null; people: Person[]; comments: Comment[]; onChanged: () => void }

export const ReviewContext = createContext<ReviewCtx | null>(null);
export function useReview() { return useContext(ReviewContext); }
export function personName(people: Person[], id: string | null | undefined) {
  if (!id) return "—";
  const p = people.find((x) => x.user_id === id);
  return p?.display_name || p?.email || "Former member";
}
