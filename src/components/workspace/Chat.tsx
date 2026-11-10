import { useEffect, useRef, useState } from "react";
import { HelpCircle, Loader2, SkipForward, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import type { Message, Question } from "@/lib/types";

export function Chat({ messages, openQuestion, busy, error, onSubmit, onSkip, highlightId }: {
  messages: Message[]; openQuestion: Question | undefined; busy: boolean; error: string | null;
  onSubmit: (text: string) => Promise<boolean>; onSkip: () => void; highlightId: string | null;
}) {
  const [text, setText] = useState("");
  const end = useRef<HTMLDivElement>(null);
  useEffect(() => { end.current?.scrollIntoView({ behavior: "smooth" }); }, [messages.length, busy]);
  useEffect(() => { if (highlightId) document.getElementById(`msg-${highlightId}`)?.scrollIntoView({ behavior: "smooth", block: "center" }); }, [highlightId]);
  const empty = messages.length === 0;
  async function send() {
    if (!text.trim() || busy) return;
    const t = text;
    if (await onSubmit(t)) setText("");
  }
  return (
    <div className="flex h-full flex-col">
      <div className="flex-1 space-y-4 overflow-y-auto p-5">
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
                <p className="whitespace-pre-wrap">{m.content}</p>
                {summary && <p className="mt-2 border-t pt-2 text-xs text-muted-foreground">What changed: {summary}</p>}
              </div>
            </div>
          );
        })}
        {busy && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="size-4 animate-spin" />Thinking through your answer and updating the sketch…</div>
        )}
        <div ref={end} />
      </div>
      <div className="border-t bg-card p-4">
        {openQuestion && !busy && (
          <div className="mb-3 flex items-start gap-2 rounded-lg bg-primary-soft p-3 text-sm">
            <HelpCircle className="mt-0.5 size-4 shrink-0 text-primary" />
            <div className="flex-1">
              <p className="font-medium text-accent-foreground">{openQuestion.question}</p>
              {openQuestion.rationale && <p className="mt-0.5 text-xs text-muted-foreground">Why it matters: {openQuestion.rationale}</p>}
            </div>
            <Button size="sm" variant="ghost" onClick={onSkip} className="shrink-0"><SkipForward className="size-3.5" />Skip</Button>
          </div>
        )}
        {error && <p className="mb-2 rounded-md bg-destructive/10 px-3 py-2 text-xs text-destructive">{error}</p>}
        <div className="flex items-end gap-2">
          <Textarea value={text} onChange={(e) => setText(e.target.value)} rows={2} disabled={busy}
            placeholder={empty ? "e.g. I want an app where parents can find and book private tutors." : "Type your answer…"}
            onKeyDown={(e) => { if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) { e.preventDefault(); send(); } }}
            className="min-h-[60px] resize-none bg-background" />
          <Button onClick={send} disabled={busy || !text.trim()} size="icon" className="size-[60px] rounded-xl" aria-label="Send answer">
            {busy ? <Loader2 className="size-5 animate-spin" /> : <Send className="size-5" />}
          </Button>
        </div>
        <p className="mt-1.5 text-[11px] text-muted-foreground">⌘/Ctrl + Enter to send</p>
      </div>
    </div>
  );
}
