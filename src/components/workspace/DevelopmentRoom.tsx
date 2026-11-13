import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { ChevronDown, ChevronRight, Flag, Send } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { supabase } from '@/integrations/supabase/client';
import type { Workspace } from '@/lib/queries';

const TYPES = ['Technical Question', 'Implementation Blocker', 'Requirement Ambiguity', 'Bug or Unexpected Behavior', 'Improvement Suggestion', 'Proposed Scope Change'];
const fmt = (d: string) => new Date(d).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });

/** Developer Questions: internal notes stored in the existing Development Room tables; never shown to clients. */
export function DevelopmentRoom({ data, onChanged }: { data: Workspace; onChanged: () => Promise<unknown> }) {
  const qc = useQueryClient();
  const [title, setTitle] = useState(''), [description, setDescription] = useState(''), [type, setType] = useState(TYPES[0] ?? ''), [priority, setPriority] = useState('important'), [link, setLink] = useState('');
  const [busy, setBusy] = useState(false), [composing, setComposing] = useState(false), [expanded, setExpanded] = useState<string | null>(null), [showResolved, setShowResolved] = useState(false);
  const [replies, setReplies] = useState<Record<string, string>>({}), [promotion, setPromotion] = useState<string | null>(null), [clientQuestion, setClientQuestion] = useState('');
  const allowed = ['owner', 'editor', 'developer'].includes(data.myRole ?? '');
  const query = useQuery({ queryKey: ['development', data.project.id], enabled: allowed, queryFn: async () => {
    const r = await supabase.from('development_insights').select('*').eq('project_id', data.project.id).order('created_at', { ascending: false });
    if (r.error) throw new Error(r.error.message);
    const ids = r.data.map(i => i.id);
    const c = ids.length ? await supabase.from('development_comments').select('*').in('insight_id', ids).order('created_at') : { data: [], error: null };
    if (c.error) throw new Error(c.error.message);
    return { entries: r.data, comments: c.data ?? [] };
  } });
  const mutate = async (fn: () => Promise<unknown>) => { setBusy(true); try { await fn(); await qc.invalidateQueries({ queryKey: ['development', data.project.id] }); await onChanged(); } catch (e) { toast.error(e instanceof Error ? e.message : 'Could not save'); } finally { setBusy(false); } };
  const name = (id: string | null) => data.people.find(p => p.user_id === id)?.display_name || data.people.find(p => p.user_id === id)?.email || 'Team member';
  const related = (i: { requirement_id: string | null; screen_id: string | null }) => data.requirements.find(r => r.id === i.requirement_id)?.title ?? data.screens.find(s => s.id === i.screen_id)?.name;
  if (!allowed) return <p className="p-4 text-sm text-muted-foreground">Developer Questions are visible to the internal team only.</p>;
  const entries = (query.data?.entries ?? []).filter(i => showResolved || i.status !== 'resolved');
  const resolvedCount = (query.data?.entries ?? []).filter(i => i.status === 'resolved').length;
  return (
    <div className="h-full overflow-y-auto p-4">
      <h2 className="font-display text-xl">Developer Questions</h2>
      <p className="mt-1 text-xs text-muted-foreground">Internal · owner, editors and developers only. Clients never see these.</p>
      {!composing ? <Button className="mt-3 w-full" size="sm" variant="outline" onClick={() => setComposing(true)}>Ask a technical question</Button> :
        <form className="mt-3 space-y-2 rounded-md border bg-muted/40 p-3" onSubmit={e => { e.preventDefault(); void mutate(async () => {
          const r = await supabase.from('development_insights').insert({ project_id: data.project.id, title, description, type, priority, requirement_id: link.startsWith('r:') ? link.slice(2) : null, screen_id: link.startsWith('s:') ? link.slice(2) : null });
          if (r.error) throw new Error(r.error.message); setTitle(''); setDescription(''); setComposing(false);
        }); }}>
          <Input aria-label="Question title" placeholder="Question" required value={title} onChange={e => setTitle(e.target.value)} />
          <Textarea aria-label="Question description" rows={2} placeholder="Short description (optional)" value={description} onChange={e => setDescription(e.target.value)} />
          <div className="grid grid-cols-2 gap-2">
            <select aria-label="Question type" className="h-9 min-w-0 rounded-md border bg-background px-2 text-sm" value={type} onChange={e => setType(e.target.value)}>{TYPES.map(t => <option key={t}>{t}</option>)}</select>
            <select aria-label="Question priority" className="h-9 min-w-0 rounded-md border bg-background px-2 text-sm" value={priority} onChange={e => setPriority(e.target.value)}>{['critical', 'important', 'secondary'].map(t => <option key={t}>{t}</option>)}</select>
          </div>
          <select aria-label="Related requirement or screen" className="h-9 w-full rounded-md border bg-background px-2 text-sm" value={link} onChange={e => setLink(e.target.value)}><option value="">No related item</option>{data.screens.map(s => <option key={s.id} value={`s:${s.id}`}>Page · {s.name}</option>)}{data.requirements.map(r => <option key={r.id} value={`r:${r.id}`}>{r.title}</option>)}</select>
          <div className="flex justify-end gap-2"><Button type="button" size="sm" variant="ghost" onClick={() => setComposing(false)}>Cancel</Button><Button type="submit" size="sm" disabled={busy || !title.trim()}>Add question</Button></div>
        </form>}
      {query.isPending && <p className="mt-4 text-sm">Loading…</p>}
      {query.error && <p role="alert" className="mt-4 text-sm text-destructive">{query.error.message}</p>}
      {query.data && !entries.length && <p className="mt-4 text-sm text-muted-foreground">No open technical questions.</p>}
      <ul className="mt-3 space-y-2">
        {entries.map(i => {
          const thread = query.data!.comments.filter(c => c.insight_id === i.id), open = expanded === i.id, rel = related(i);
          return (
            <li key={i.id} className="min-w-0 rounded-md border bg-card p-3">
              <button type="button" aria-expanded={open} onClick={() => setExpanded(open ? null : i.id)} className="flex w-full items-start gap-2 text-left text-sm font-medium"><span className="min-w-0 flex-1 break-words">{i.title}</span>{open ? <ChevronDown className="size-4 shrink-0" /> : <ChevronRight className="size-4 shrink-0" />}</button>
              {i.description && <p className={`mt-1 break-words text-xs text-muted-foreground ${open ? 'whitespace-pre-wrap' : 'line-clamp-2'}`}>{i.description}</p>}
              <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-muted-foreground">
                <span className={`inline-flex items-center gap-1 font-medium capitalize ${i.priority === 'critical' ? 'text-destructive' : i.priority === 'important' ? 'text-unresolved' : ''}`}><Flag className="size-3" />{i.priority}</span>
                <span className={`rounded-sm px-1.5 capitalize ${i.status === 'resolved' ? 'bg-confirmed-soft text-confirmed' : 'bg-muted'}`}>{i.status.replaceAll('_', ' ')}</span>
                <span>{name(i.author_id)} · {new Date(i.created_at).toLocaleDateString()}</span>
                {rel && <span className="truncate">↳ {rel}</span>}
                {thread.length > 0 && <span>{thread.length} repl{thread.length > 1 ? 'ies' : 'y'}</span>}
              </div>
              {open && <div className="mt-3 space-y-2 border-t pt-3">
                {thread.map(c => <div key={c.id} className="border-l-2 pl-2 text-sm"><p className="whitespace-pre-wrap break-words">{c.body}</p><p className="text-[11px] text-muted-foreground">{name(c.author_id)} · {fmt(c.created_at)}</p></div>)}
                <form className="flex gap-1.5" onSubmit={e => { e.preventDefault(); const body = (replies[i.id] ?? '').trim(); if (!body) return; void mutate(async () => { const r = await supabase.from('development_comments').insert({ insight_id: i.id, body }); if (r.error) throw new Error(r.error.message); setReplies(p => ({ ...p, [i.id]: '' })); }); }}>
                  <Input aria-label="Reply" placeholder="Write a reply…" value={replies[i.id] ?? ''} onChange={e => setReplies(p => ({ ...p, [i.id]: e.target.value }))} className="h-9 min-w-0 text-sm" />
                  <Button type="submit" size="icon" className="size-9 shrink-0" aria-label="Send reply" disabled={busy || !(replies[i.id] ?? '').trim()}><Send className="size-4" /></Button>
                </form>
                <div className="flex flex-wrap gap-2 pt-1">
                  <Button size="sm" variant="outline" disabled={busy} onClick={() => void mutate(async () => { const r = await supabase.from('development_insights').update({ status: i.status === 'resolved' ? 'open' : 'resolved' }).eq('id', i.id); if (r.error) throw new Error(r.error.message); })}>{i.status === 'resolved' ? 'Reopen' : 'Mark resolved'}</Button>
                  {i.promoted_question_id ? <span className="self-center text-xs text-primary">Flagged for client · in Open Decisions</span> : <Button size="sm" variant="ghost" onClick={() => { setPromotion(i.id); setClientQuestion(i.title); }}>Flag for client clarification</Button>}
                </div>
                {promotion === i.id && <div className="space-y-2 rounded-md border border-unresolved/40 p-2"><p className="text-xs text-unresolved">Only this reviewed question is shared with the client. Description and replies stay internal.</p><Textarea aria-label="Client-facing question" value={clientQuestion} onChange={e => setClientQuestion(e.target.value)} /><div className="flex gap-2"><Button size="sm" disabled={busy || !clientQuestion.trim()} onClick={() => void mutate(async () => { const r = await supabase.rpc('promote_development_question', { _id: i.id, _question: clientQuestion }); if (r.error) throw new Error(r.error.message); setPromotion(null); })}>Add to Open Decisions</Button><Button size="sm" variant="ghost" onClick={() => setPromotion(null)}>Cancel</Button></div></div>}
              </div>}
            </li>
          );
        })}
      </ul>
      {resolvedCount > 0 && <Button variant="link" size="sm" className="mt-2 h-auto p-0 text-xs" onClick={() => setShowResolved(v => !v)}>{showResolved ? 'Hide resolved' : `Show ${resolvedCount} resolved`}</Button>}
    </div>
  );
}
