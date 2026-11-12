import { useEffect, useRef, useState } from "react";
import { HelpCircle, Loader2, SkipForward, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import type { Message, Question } from "@/lib/types";
import { VoiceInput } from "./VoiceInput";
import { ActionTooltip } from '@/components/ActionTooltip';

export function Chat({ messages, openQuestion, busy, error, onSubmit, onSkip, onBacklog, onDifferent, highlightId, projectId, meeting = false, readOnly = false }: {
  messages: Message[]; openQuestion: Question | undefined; busy: boolean; error: string | null;
  onSubmit: (text: string) => Promise<boolean>; onSkip: () => void; highlightId: string | null;
  projectId: string; meeting?: boolean; readOnly?: boolean;
  onBacklog?:()=>void; onDifferent?:()=>void;
}) {
  const [text, setText] = useState("");
  const [voiceActive, setVoiceActive] = useState(false);
  const [transcript, setTranscript] = useState(false);
  const [draftReady, setDraftReady] = useState(false);
  const draftKey = `specloop:draft:${projectId}`;
  useEffect(() => { setText(sessionStorage.getItem(draftKey) ?? ""); setDraftReady(true); }, [draftKey]);
  useEffect(() => { if (draftReady) { if (text) sessionStorage.setItem(draftKey, text); else sessionStorage.removeItem(draftKey); } }, [text, draftKey, draftReady]);
  useEffect(() => {
    if (!text.trim() && !voiceActive) return;
    const warn = (e: BeforeUnloadEvent) => { e.preventDefault(); };
    window.addEventListener("beforeunload", warn); return () => window.removeEventListener("beforeunload", warn);
  }, [text, voiceActive]);
  const end = useRef<HTMLDivElement>(null);
  useEffect(() => { end.current?.scrollIntoView({ behavior: "smooth" }); }, [messages.length, busy]);
  useEffect(() => { if (highlightId) document.getElementById(`msg-${highlightId}`)?.scrollIntoView({ behavior: "smooth", block: "center" }); }, [highlightId]);
  const empty = messages.length === 0;
  async function send() {
    if (!text.trim() || busy || voiceActive || text.length > 4000) return;
    const t = text;
    if (await onSubmit(t)) { setText(""); setTranscript(false); }
  }
  return (
    <div className="flex h-full min-h-0 min-w-0 flex-col">
      {meeting && openQuestion && <div className="shrink-0 border-b bg-primary-soft p-5"><p className="text-xs font-medium text-primary">Current clarification question</p><p className="mt-2 font-display text-2xl">{openQuestion.question}</p></div>}
      <div className="min-h-0 min-w-0 flex-1 space-y-4 overflow-y-auto p-5">
        {empty && (
          <div className="rounded-xl border border-dashed bg-card p-5">
            <p className="font-display text-2xl">What would you like to build?</p>
            <p className="mt-1 text-sm text-muted-foreground">Describe the idea in your own words — who it's for and what it should help them do. I'll ask one question at a time.</p>
          </div>
        )}
        {messages.map((m) => {
          const summary = (m.meta as { change_summary?: string } | null)?.change_summary;
          return (
            <div key={m.id} id={`msg-${m.id}`} className={cn("flex", m.role === "user" ? "justify-end" : "justify-start")}>
              <div className={cn("max-w-[88%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed transition-shadow",
                m.role === "user" ? "bg-foreground text-background" : "border bg-card shadow-soft",
                highlightId === m.id && "ring-2 ring-primary")}>
                <p className="whitespace-pre-wrap break-words">{m.content}</p>
                {summary && <p className="mt-2 border-t pt-2 text-xs text-muted-foreground">What changed: {summary}</p>}
                {(m.meta as { turn_state?: string } | null)?.turn_state === "failed" && <p className="mt-2 text-xs text-destructive">Saved answer · AI processing failed. Review before trying again.</p>}
              </div>
            </div>
          );
        })}
        {busy && (
          <div role="status" className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="size-4 animate-spin" />Thinking through your answer and updating the sketch…</div>
        )}
        <div ref={end} />
      </div>
      {readOnly ? <p className="border-t p-4 text-sm text-muted-foreground">Read-only project access</p> : <div className="shrink-0 border-t bg-card p-4">
        {openQuestion && !busy && (
          <div className="mb-3 flex items-start gap-2 rounded-lg bg-primary-soft p-3 text-sm">
            <HelpCircle className="mt-0.5 size-4 shrink-0 text-primary" />
            <div className="min-w-0 flex-1 break-words">
              <p className="font-medium text-accent-foreground">{meeting ? "Question still open" : openQuestion.question}</p>
              {!meeting && openQuestion.rationale && <p className="mt-0.5 text-xs text-muted-foreground">Why it matters: {openQuestion.rationale}</p>}
            </div>
            <ActionTooltip label="Defer question to backlog"><Button size="icon" variant="ghost" onClick={onSkip} disabled={voiceActive} className="shrink-0" aria-label="Add current question to backlog"><SkipForward className="size-3.5" /></Button></ActionTooltip>
          </div>
        )}
        {onBacklog && <div className="mb-2 flex flex-wrap gap-1"><Button size="sm" variant="ghost" className="h-auto max-w-full whitespace-normal py-1.5" disabled={busy} onClick={onBacklog}>Review unanswered questions</Button>{onDifferent&&<Button size="sm" variant="ghost" className="h-auto max-w-full whitespace-normal py-1.5" disabled={busy||voiceActive} onClick={onDifferent}>Ask a different question</Button>}</div>}
        {error && <p role="alert" className="mb-2 rounded-md bg-destructive/10 px-3 py-2 text-xs text-destructive">{error}</p>}
        {transcript && <p role="status" className="mb-2 text-xs text-primary">Transcription preview · edit your answer below before sending.</p>}
        <div className="flex items-end gap-2">
          <Textarea value={text} onChange={(e) => setText(e.target.value)} rows={2} disabled={busy}
            aria-label={transcript ? "Editable transcription" : "Discovery answer"}
            placeholder={empty ? "e.g. I want an app where parents can find and book private tutors." : "Type your answer…"}
            onKeyDown={(e) => { if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) { e.preventDefault(); send(); } }}
            className="min-h-[60px] min-w-0 resize-none bg-background" />
          <ActionTooltip label="Send answer"><Button onClick={send} disabled={busy || voiceActive || !text.trim() || text.length > 4000} size="icon" className="size-11 shrink-0 rounded-md" aria-label="Send answer">
            {busy ? <Loader2 className="size-5 animate-spin" /> : <Send className="size-5" />}
          </Button></ActionTooltip>
        </div>
        <div className="mt-2 flex flex-wrap items-center gap-2"><VoiceInput projectId={projectId} disabled={busy} onActive={setVoiceActive} onTranscript={(t) => { setText((v) => v ? `${v}\n${t}` : t); setTranscript(true); }} /><p className="text-xs text-muted-foreground" role="status">{text.trim() ? `Unsent draft · ${text.length}/4000` : "No unsent changes"}</p></div>
      </div>}
    </div>
  );
}
