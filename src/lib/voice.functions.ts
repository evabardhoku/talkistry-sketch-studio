import { createServerFn } from "@tanstack/react-start";
import { transcribeAudio, GatewayError } from "@lovable.dev/ai-gateway";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

export const transcribeRecording = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => {
    if (!(input instanceof FormData)) throw new Error("Recording upload missing.");
    const projectId = z.string().uuid().parse(input.get("projectId"));
    const file = input.get("audio");
    if (!(file instanceof File) || !file.size || file.size > 10 * 1024 * 1024) throw new Error("Record a shorter answer (up to 10 MB).");
    if (!["audio/webm", "audio/mp4", "audio/ogg", "audio/wav"].includes(file.type.split(";")[0] ?? "")) throw new Error("This recording format is not supported. Please use text.");
    return { projectId, file };
  })
  .handler(async ({ data, context }) => {
    const { data: allowed, error } = await context.supabase.rpc("can_edit_project", { _project: data.projectId, _user: context.userId });
    if (error || !allowed) throw new Error("You don't have permission to answer in this project.");
    try {
      const result = await transcribeAudio({ model: "openai/gpt-transcribe", file: data.file });
      const text = (typeof result === "string" ? result : result.text).trim();
      if (!text) return { text: "", error: "No speech was detected. Record again or type your answer." };
      return { text, error: null };
    } catch (e) {
      console.error("transcription failed", e);
      if (e instanceof GatewayError) {
        if (e.httpStatus === 402) return { text: "", error: "Workspace AI credits are exhausted. You can still type your answer." };
        if (e.httpStatus === 429) return { text: "", error: "Transcription is busy. Wait a moment or type your answer." };
        if (e.httpStatus === 403) return { text: "", error: "Transcription isn't available under this workspace's AI permissions. Use text for now." };
      }
      return { text: "", error: "Transcription didn't finish. Your recording is kept for a manual retry; text is always available." };
    }
  });