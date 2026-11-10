import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const input = z.object({
  projectId: z.string().uuid(),
  content: z.string().trim().max(4000),
  skip: z.boolean().default(false),
  requestId: z.string().uuid(),
});

/**
 * One discovery turn: persist the user's answer, ask the AI for a structured update,
 * validate it, then persist proposed requirements, the next question and sketch changes.
 * AI output is never stored as "confirmed".
 */
export const submitDiscoveryTurn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => input.parse(d))
  .handler(async ({ data, context }) => {
    const { runDiscoveryTurn } = await import("./discovery.server");
    try { return await runDiscoveryTurn(context.supabase, context.userId, data); }
    catch (e) {
      await context.supabase.from("conversation_messages").update({ meta: { skip: data.skip, turn_state: "failed" } }).eq("id", data.requestId).eq("author_id", context.userId).eq("meta->>turn_state", "processing");
      throw e;
    }
  });
