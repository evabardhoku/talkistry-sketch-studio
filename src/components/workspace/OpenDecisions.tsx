import { useState } from 'react';
import { toast } from 'sonner';
import { ChevronDown, ChevronRight, Flag, MessageSquare, UserRound } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { BLUEPRINT_STAGES, STAGE_NAME, stageForQuestion } from '@/lib/blueprint';
import { saveQuestion } from '@/lib/meeting-api';
import { unresolvedQuestion } from '@/lib/meeting';
import { can } from '@/lib/baseline';
import type { Workspace } from '@/lib/queries';
import type { Question } from '@/lib/types';

const RANK: Record<string, number> = { critical: 0, important: 1, secondary: 2 };

export function OpenDecisions({ data, onChanged, onAnswerInChat }: { data: Workspace; onChanged: () => Promise<unknown>; onAnswerInChat: (id: string) => void }) {
  const [showAll, setShowAll] = useState(false), [expanded, setExpanded] = useState<string | null>(null), [busy, setBusy] = useState(false);
  const editable = can.edit(data.myRole);
  const open = data.questions.filter(unresolvedQuestion);
  const list = (showAll ? data.questions : open).slice().sort((a, b) => (RANK[a.priority] ?? 3) - (RANK[b.priority] ?? 3) || b.created_at.localeCompare(a.created_at));
  const mutate = async (fn: () => Promise<unknown>) => { setBusy(true); try { await fn(); await onChanged(); } catch (e) { toast.error(e instanceof Error ? e.message : 'Could not save'); } finally { setBusy(false); } };
  return (
    <section aria-labelledby="open-decisions" className="border-t-4 border-muted p-4">
      <div className="flex items-center justify-between gap-2">
        <h3 id="open-decisions" className="font-display text-lg">Open Decisions <span className="text-sm text-muted-foreground">· {open.length}</span></h3>
        <Button variant="link" size="sm" className="h-auto p-0 text-xs" onClick={() => setShowAll(v => !v)}>{showAll ? 'Only open' : 'Show answered too'}</Button>
      </div>
      {!list.length && <p className="mt-2 text-xs text-muted-foreground">No open decisions. New questions from the conversation appear here.</p>}
      <ul className="mt-2 space-y-2">
        {list.map(q => <DecisionItem key={q.id} q={q} data={data} expanded={expanded === q.id} onToggle={() => setExpanded(expanded === q.id ? null : q.id)} editable={editable} busy={busy} mutate={mutate} onAnswerInChat={onAnswerInChat} />)}
      </ul>
    </section>
  );
}

function DecisionItem({ q, data, expanded, onToggle, editable, busy, mutate, onAnswerInChat }: { q: Question; data: Workspace; expanded: boolean; onToggle: () => void; editable: boolean; busy: boolean; mutate: (fn: () => Promise<unknown>) => Promise<void>; onAnswerInChat: (id: string) => void }) {
  const stage = stageForQuestion(q, data.requirements);
  const owner = data.people.find(p => p.user_id === q.owner_id);
  const pr = q.priority === 'critical' ? 'text-destructive' : q.priority === 'important' ? 'text-unresolved' : 'text-muted-foreground';
  return (
    <li className="min-w-0 rounded-md border bg-card p-3">
      <button type="button" aria-expanded={expanded} onClick={onToggle} className="flex w-full items-start gap-2 text-left text-sm">
        <span className="min-w-0 flex-1 break-words">{q.question}</span>
        {expanded ? <ChevronDown className="mt-0.5 size-4 shrink-0" /> : <ChevronRight className="mt-0.5 size-4 shrink-0" />}
      </button>
      <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px]">
        <span className={`inline-flex items-center gap-1 font-medium capitalize ${pr}`}><Flag className="size-3" />{q.priority}</span>
        <span className="rounded-sm bg-muted px-1.5 py-0.5 capitalize text-muted-foreground">{q.status.replaceAll('_', ' ')}</span>
        <span className="text-muted-foreground">{STAGE_NAME[stage]}</span>
        {owner && <span className="inline-flex items-center gap-1 text-muted-foreground"><UserRound className="size-3" />{owner.display_name || owner.email}</span>}
      </div>
      {expanded && <div className="mt-3 space-y-3 border-t pt-3 text-xs">
        {q.rationale && <p><span className="font-medium">Why it matters: </span>{q.rationale}</p>}
        {q.answer && <p className="text-muted-foreground">Last answer: {q.answer}</p>}
        {editable && <>
          <div className="flex flex-wrap gap-2">
            <Button size="sm" disabled={busy} onClick={() => onAnswerInChat(q.id)}><MessageSquare className="size-3.5" />Answer in Chat</Button>
            {q.status !== 'deferred' && unresolvedQuestion(q) && <Button size="sm" variant="outline" disabled={busy} onClick={() => void mutate(() => saveQuestion(q.id, { status: 'deferred', is_current: false }))}>Defer</Button>}
            {q.status !== 'resolved' && <Button size="sm" variant="ghost" disabled={busy} onClick={() => void mutate(() => saveQuestion(q.id, { status: 'resolved', is_current: false }))}>Mark resolved</Button>}
          </div>
          <div className="grid grid-cols-3 gap-1.5">
            <select aria-label="Blueprint stage" disabled={busy} value={stage} onChange={e => void mutate(() => saveQuestion(q.id, { blueprint_stage: e.target.value }))} className="h-8 min-w-0 rounded-md border bg-background px-1 text-xs">{BLUEPRINT_STAGES.map(s => <option key={s.key} value={s.key}>{s.name}</option>)}</select>
            <select aria-label="Question priority" disabled={busy} value={q.priority} onChange={e => void mutate(() => saveQuestion(q.id, { priority: e.target.value }))} className="h-8 min-w-0 rounded-md border bg-background px-1 text-xs">{['critical', 'important', 'secondary'].map(s => <option key={s}>{s}</option>)}</select>
            <select aria-label="Responsible stakeholder" disabled={busy} value={q.owner_id ?? ''} onChange={e => void mutate(() => saveQuestion(q.id, { owner_id: e.target.value || null }))} className="h-8 min-w-0 rounded-md border bg-background px-1 text-xs"><option value="">Unassigned</option>{data.people.filter(p => !p.baseline_id).map(p => <option key={p.user_id} value={p.user_id}>{p.display_name || p.email}</option>)}</select>
          </div>
        </>}
      </div>}
    </li>
  );
}
