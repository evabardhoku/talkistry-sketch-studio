import { useState } from 'react';
import { Link } from '@tanstack/react-router';
import { CheckCircle2, ChevronDown, ChevronRight, Circle, CircleDashed, AlertCircle, Plus } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { RequirementItem } from './RequirementItem';
import { OpenDecisions } from './OpenDecisions';
import { ScopeChangesPanel } from '@/components/review/ScopeChangesPanel';
import { BLUEPRINT_STAGES, stageSummary, type StageKey, type StageState } from '@/lib/blueprint';
import { CATEGORY_LABEL } from '@/lib/types';
import { addHumanRequirement } from '@/lib/requirements-api';
import { can } from '@/lib/baseline';
import { computeReadiness } from '@/lib/spec';
import type { Workspace } from '@/lib/queries';
import { cn } from '@/lib/utils';

const STATE: Record<StageState, { label: string; icon: typeof Circle; cls: string }> = {
  not_started: { label: 'Not started', icon: CircleDashed, cls: 'text-muted-foreground' },
  in_progress: { label: 'In progress', icon: Circle, cls: 'text-primary' },
  needs_decision: { label: 'Needs decision', icon: AlertCircle, cls: 'text-unresolved' },
  complete: { label: 'Complete', icon: CheckCircle2, cls: 'text-confirmed' },
};

export function ProjectBlueprint({ data, onChanged, onShowSource, onAnswerInChat, onSelectScreen }: {
  data: Workspace; onChanged: () => Promise<unknown>; onShowSource: (id: string) => void; onAnswerInChat: (id: string) => void; onSelectScreen: (id: string) => void;
}) {
  const [open, setOpen] = useState<StageKey | null>(null);
  const baselines = data.versions.filter(v => v.kind === 'baseline');
  const readiness = computeReadiness(data.requirements, data.questions);
  return (
    <div className="h-full min-h-0 overflow-y-auto">
      <div className="border-b p-4">
        <h2 className="font-display text-xl">Project Blueprint</h2>
        <p className="mt-1 text-xs text-muted-foreground">{readiness.confirmed}/{readiness.total} requirements confirmed · stages can be filled in any order</p>
      </div>
      <ol className="divide-y">
        {BLUEPRINT_STAGES.map((stage, i) => {
          const sum = stageSummary(stage.key, data.requirements, data.questions, data.screens, baselines.length > 0, data.requirements);
          const st = STATE[sum.state]; const Icon = st.icon; const expanded = open === stage.key;
          return (
            <li key={stage.key}>
              <button type="button" aria-expanded={expanded} onClick={() => setOpen(expanded ? null : stage.key)} className="flex w-full items-start gap-3 px-4 py-3 text-left hover:bg-muted/50">
                <Icon className={cn('mt-0.5 size-4 shrink-0', st.cls)} aria-hidden />
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-medium">{i + 1}. {stage.name}</span>
                  <span className="mt-0.5 block text-[11px] text-muted-foreground">{st.label} · {stage.key === 'pages' ? `${sum.total} pages` : `${sum.confirmed}/${sum.total} confirmed`}{sum.openQuestions ? ` · ${sum.openQuestions} open question${sum.openQuestions > 1 ? 's' : ''}` : ''}</span>
                </span>
                {expanded ? <ChevronDown className="mt-0.5 size-4 shrink-0" /> : <ChevronRight className="mt-0.5 size-4 shrink-0" />}
              </button>
              {expanded && <StageDetail stage={stage.key} data={data} onChanged={onChanged} onShowSource={onShowSource} onSelectScreen={onSelectScreen} />}
            </li>
          );
        })}
      </ol>
      <OpenDecisions data={data} onChanged={onChanged} onAnswerInChat={onAnswerInChat} />
    </div>
  );
}

function StageDetail({ stage, data, onChanged, onShowSource, onSelectScreen }: { stage: StageKey; data: Workspace; onChanged: () => Promise<unknown>; onShowSource: (id: string) => void; onSelectScreen: (id: string) => void }) {
  const def = BLUEPRINT_STAGES.find(s => s.key === stage)!;
  const mayEdit = can.edit(data.myRole), mayConfirm = can.confirm(data.myRole);
  const [title, setTitle] = useState(''), [cat, setCat] = useState<string>(def.categories[0] ?? 'feature');
  const reqs = stage === 'review' ? data.requirements.filter(r => r.category === 'acceptance') : data.requirements.filter(r => (def.categories as readonly string[]).includes(r.category));
  const baselines = data.versions.filter(v => v.kind === 'baseline');
  const add = async (e: React.FormEvent) => {
    e.preventDefault(); if (!title.trim()) return;
    try { await addHumanRequirement(data.project.id, { category: cat, title: title.trim(), description: '' }, mayConfirm ? 'confirmed' : 'proposed'); setTitle(''); await onChanged(); }
    catch (err) { toast.error(err instanceof Error ? err.message : 'Could not add'); }
  };
  return (
    <div className="space-y-2 bg-muted/30 px-4 pb-4 pt-1">
      <p className="text-[11px] text-muted-foreground">{def.hint}</p>
      {stage === 'vision' && data.project.summary && <p className="rounded-md border bg-card p-2 text-xs break-words">{data.project.summary}</p>}
      {stage === 'pages' && (data.screens.length ? <ul className="space-y-1">{data.screens.map(s => <li key={s.id}><Button variant="ghost" size="sm" className="h-auto w-full justify-start whitespace-normal py-1.5 text-left" onClick={() => onSelectScreen(s.id)}><span className="font-medium">{s.name}</span><span className="ml-2 text-xs text-muted-foreground">{s.user_role || 'General'}</span></Button></li>)}</ul> : <p className="text-xs text-muted-foreground">Pages appear on the canvas as you describe the product.</p>)}
      {stage === 'review' && <div className="space-y-2 text-xs">
        <p>{data.requirements.filter(r => r.status === 'confirmed').length} confirmed · {data.requirements.filter(r => r.status === 'proposed').length} awaiting review · {data.requirements.filter(r => r.status === 'unresolved').length} unresolved</p>
        <p>{baselines[0] ? `Latest approved version: v${baselines[0].version}` : 'No approved version yet.'}</p>
        <div className="flex flex-wrap gap-2"><Button asChild size="sm" variant="outline"><Link to="/projects/$projectId/versions" params={{ projectId: data.project.id }}>{can.approve(data.myRole) ? 'Review & approve' : 'Versions'}</Link></Button><Button asChild size="sm" variant="outline"><Link to="/projects/$projectId/specification" params={{ projectId: data.project.id }}>Full blueprint document</Link></Button></div>
        {baselines.length > 0 && <details><summary className="cursor-pointer text-muted-foreground">Requested changes since approval · {data.scopeChanges.filter(c => c.status === 'open').length}</summary><div className="mt-2 max-h-96 overflow-y-auto rounded-md border bg-card"><ScopeChangesPanel changes={data.scopeChanges} baselines={baselines} projectId={data.project.id} /></div></details>}
      </div>}
      {reqs.map(r => <RequirementItem key={r.id + r.updated_at} req={r} onChanged={() => void onChanged()} onShowSource={onShowSource} />)}
      {stage !== 'pages' && !reqs.length && stage !== 'review' && <p className="text-xs text-muted-foreground">Nothing captured yet — talk about it in the conversation or add it here.</p>}
      {mayEdit && def.categories.length > 0 && <form onSubmit={add} className="flex gap-1.5 pt-1">
        {def.categories.length > 1 && <select aria-label="Requirement type" value={cat} onChange={e => setCat(e.target.value)} className="h-9 w-28 shrink-0 rounded-md border bg-background px-1 text-xs">{def.categories.map(c => <option key={c} value={c}>{CATEGORY_LABEL[c]}</option>)}</select>}
        <Input aria-label={`Add to ${def.name}`} value={title} onChange={e => setTitle(e.target.value)} placeholder={mayConfirm ? 'Add confirmed item…' : 'Propose an item…'} className="h-9 min-w-0 text-sm" />
        <Button type="submit" size="icon" className="size-9 shrink-0" aria-label="Add item" disabled={!title.trim()}><Plus className="size-4" /></Button>
      </form>}
    </div>
  );
}
