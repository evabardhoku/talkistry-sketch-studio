import { createFileRoute, Link } from '@tanstack/react-router';
import { useEffect, useLayoutEffect, useState } from 'react';
import { ArrowLeft, ArrowRight, Compass, Flag, Lock, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Logo } from '@/components/Logo';
import { StatusBadge } from '@/components/StatusBadge';
import { ScreenWireframe } from '@/components/sketch/ScreenWireframe';
import { cn } from '@/lib/utils';
import { DEMO_AGENDA, DEMO_MESSAGES, DEMO_NOTES, DEMO_PROJECT, DEMO_QUESTIONS, DEMO_REQUIREMENTS, DEMO_ROLES, DEMO_SCREENS, DEMO_VERSIONS, TOUR, sectionsFor, type DemoRole, type DemoSection } from '@/lib/demo-data';

export const Route = createFileRoute('/demo')({
  head: () => ({ meta: [
    { title: 'Interactive demo — Talkistry' },
    { name: 'description', content: 'Explore a sample Talkistry project without signing up: discovery, live sketch, backlog, meetings and approvals.' },
    { property: 'og:title', content: 'Interactive demo — Talkistry' },
    { property: 'og:description', content: 'Explore a sample Talkistry project with a guided step-by-step tour.' },
    { property: 'og:type', content: 'website' }, { name: 'twitter:card', content: 'summary_large_image' },
  ] }),
  component: DemoPage,
});

function DemoPage() {
  const [role, setRole] = useState<DemoRole>('owner');
  const [section, setSection] = useState<DemoSection>('discovery');
  const [step, setStep] = useState<number | null>(0);
  const sections = sectionsFor(role);
  const changeRole = (r: DemoRole) => { setRole(r); if (!sectionsFor(r).some(s => s.id === section)) setSection('discovery'); };
  const go = (i: number) => { const s = TOUR[i]; if (!s) return; if (s.role) setRole(s.role); else if (s.section === 'devroom' && role === 'client') setRole('owner'); setSection(s.section); setStep(i); };
  return (
    <div className="flex min-h-screen flex-col">
      <header className="grid h-14 shrink-0 grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 border-b bg-card/80 px-3 sm:px-4">
        <Link to="/" className="shrink-0"><Logo /></Link>
        <p className="truncate text-xs text-muted-foreground"><span className="rounded-sm bg-primary-soft px-1.5 py-0.5 font-medium text-primary">Demo</span> <span className="hidden sm:inline">Fictional sample · read-only</span></p>
        <Button asChild size="sm" data-tour="cta"><Link to="/auth">Create account</Link></Button>
      </header>
      <div className="border-b px-4 py-4">
        <h1 className="font-display text-2xl sm:text-3xl">{DEMO_PROJECT.name}</h1>
        <div data-tour="roles" className="mt-3 flex flex-wrap items-center gap-2">
          <span className="text-xs text-muted-foreground">View as</span>
          {DEMO_ROLES.map(r => <Button key={r.id} size="sm" variant={role === r.id ? 'default' : 'outline'} aria-pressed={role === r.id} onClick={() => changeRole(r.id)}>{r.label}</Button>)}
        </div>
        <p className="mt-2 text-xs text-muted-foreground">{DEMO_ROLES.find(r => r.id === role)?.who} — {DEMO_ROLES.find(r => r.id === role)?.can}</p>
      </div>
      <nav data-tour="nav" aria-label="Demo sections" className="flex gap-1 overflow-x-auto border-b px-3 py-2">
        {sections.map(s => <Button key={s.id} size="sm" variant="ghost" className={cn('shrink-0', section === s.id && 'bg-primary-soft text-primary')} onClick={() => setSection(s.id)}>{s.label}</Button>)}
      </nav>
      <div className="mx-auto w-full max-w-6xl flex-1 p-4 pb-48">
        <SectionView section={section} role={role} />
      </div>
      {step === null
        ? <Button className="fixed bottom-4 right-4 z-40 shadow-lift" onClick={() => go(0)}><Compass className="size-4" />Guided tour</Button>
        : <Tour i={step} onGo={go} onClose={() => setStep(null)} />}
    </div>
  );
}

function SectionView({ section, role }: { section: DemoSection; role: DemoRole }) {
  const card = 'rounded-lg border bg-card p-3';
  if (section === 'discovery') return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
      <section data-tour="chat" className={cn(card, 'space-y-3')} aria-label="Conversation">
        {DEMO_MESSAGES.map((m, i) => <div key={i} className={cn('rounded-md p-2 text-sm', m.from === 'ai' ? 'bg-muted' : 'bg-primary-soft')}><p className="text-[11px] font-medium text-muted-foreground">{m.who}</p><p>{m.text}</p></div>)}
        <p className="rounded-md border border-dashed p-2 text-xs text-muted-foreground"><Lock className="mr-1 inline size-3" />Typing and voice input are turned off in the demo.</p>
      </section>
      <section data-tour="sketch" aria-label="Live Product Sketch" className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {DEMO_SCREENS.map(s => <div key={s.name} className={cn(card, s.recent && 'ring-2 ring-primary')}><p className="mb-2 text-xs font-medium">{s.name}{s.recent && <span className="ml-1 text-primary">· latest change</span>}</p><ScreenWireframe components={s.c} /></div>)}
      </section>
    </div>);
  if (section === 'requirements') return <Wrap title="Requirements">{DEMO_REQUIREMENTS.map(r => <div key={r.title} className={card}><div className="flex flex-wrap items-center justify-between gap-2"><p className="text-sm font-medium">{r.title}</p><StatusBadge status={r.status} /></div><p className="mt-1 text-xs text-muted-foreground">{r.category} · {r.source}</p>{r.status === 'proposed' && <p className="mt-2 text-xs text-muted-foreground">{role === 'owner' ? 'As owner you could confirm this.' : 'You can comment or propose a change.'}</p>}</div>)}</Wrap>;
  if (section === 'backlog') return <Wrap title="Question Backlog">{DEMO_QUESTIONS.map(q => <div key={q.q} className={card}><p className="text-sm">{q.q}</p><p className="mt-2 flex flex-wrap gap-3 text-[11px] capitalize text-muted-foreground"><span className={cn('inline-flex items-center gap-1 font-medium', q.priority === 'critical' && 'text-destructive')}><Flag className="size-3" />{q.priority}</span><span className="rounded-sm bg-muted px-1.5">{q.status}</span><span>Owner: {q.owner}</span></p></div>)}</Wrap>;
  if (section === 'meetings') return <Wrap title="Initial discovery · 60 min"><p className="text-sm text-muted-foreground">Timer 32:10 of 60:00 · stage 3 of 5</p>{DEMO_AGENDA.map(a => <div key={a.name} className={cn(card, 'flex justify-between text-sm', a.state === 'active' && 'border-primary')}><span>{a.name}</span><span className="text-xs text-muted-foreground">{a.minutes} min · {a.state === 'done' ? 'done' : a.state === 'active' ? 'in progress' : 'up next'}</span></div>)}</Wrap>;
  if (section === 'devroom') return <Wrap title="Development Room · internal">{DEMO_NOTES.map(n => <div key={n.title} className={card}><p className="text-sm font-medium">{n.title}</p><p className="mt-1 text-xs text-muted-foreground">{n.type} · {n.priority}{n.promoted && ' · shared with client backlog as one reviewed question'}</p></div>)}</Wrap>;
  if (section === 'blueprint') return <Wrap title="Product Blueprint"><p className="text-sm">{DEMO_PROJECT.summary}</p><h3 className="mt-2 text-xs font-medium uppercase text-muted-foreground">Confirmed requirements</h3>{DEMO_REQUIREMENTS.filter(r => r.status === 'confirmed').map(r => <p key={r.title} className={cn(card, 'text-sm')}>{r.title}</p>)}<p className="text-xs text-muted-foreground">Real projects can download this as Markdown, JSON or PDF.</p></Wrap>;
  return <Wrap title="Versions & approval">{DEMO_VERSIONS.map(v => <div key={v.v} className={card}><p className="text-sm font-medium">Version {v.v} · approved by {v.by} · {v.when}</p><p className="mt-1 text-xs text-muted-foreground">{v.note}</p></div>)}<p className="text-xs text-muted-foreground">{role === 'owner' ? 'Only the owner can approve a new version.' : 'Only the owner can approve versions.'}</p></Wrap>;
}

function Wrap({ title, children }: { title: string; children: React.ReactNode }) {
  return <section data-tour="section" className="mx-auto max-w-3xl space-y-2"><h2 className="font-display text-2xl">{title}</h2>{children}</section>;
}

function Tour({ i, onGo, onClose }: { i: number; onGo: (i: number) => void; onClose: () => void }) {
  const s = TOUR[i];
  const [box, setBox] = useState<DOMRect | null>(null);
  useLayoutEffect(() => {
    const el = s && document.querySelector(`[data-tour="${s.target}"]`);
    if (!el) { setBox(null); return; }
    el.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    const update = () => setBox(el.getBoundingClientRect());
    const t = setTimeout(update, 250); update();
    window.addEventListener('resize', update); window.addEventListener('scroll', update, true);
    return () => { clearTimeout(t); window.removeEventListener('resize', update); window.removeEventListener('scroll', update, true); };
  }, [i, s]);
  useEffect(() => { const k = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); }; window.addEventListener('keydown', k); return () => window.removeEventListener('keydown', k); }, [onClose]);
  if (!s) return null;
  return <>
    {box && <div aria-hidden className="pointer-events-none fixed z-30 rounded-lg ring-2 ring-primary ring-offset-2 ring-offset-background transition-all" style={{ top: box.top - 4, left: box.left - 4, width: box.width + 8, height: box.height + 8 }} />}
    <div role="dialog" aria-label="Guided tour" className="fixed inset-x-3 bottom-3 z-40 rounded-xl border bg-card p-4 shadow-lift sm:inset-x-auto sm:right-4 sm:bottom-4 sm:w-[360px]">
      <div className="flex items-start justify-between gap-2"><p className="text-[11px] font-medium text-primary">Step {i + 1} of {TOUR.length}</p><Button size="icon" variant="ghost" className="size-7" aria-label="Close tour" onClick={onClose}><X className="size-4" /></Button></div>
      <h2 className="font-display text-xl">{s.title}</h2>
      <p className="mt-1 text-sm text-muted-foreground">{s.body}</p>
      <div className="mt-3 h-1 overflow-hidden rounded bg-muted"><div className="h-full bg-primary transition-all" style={{ width: `${((i + 1) / TOUR.length) * 100}%` }} /></div>
      <div className="mt-3 flex justify-between gap-2">
        <Button size="sm" variant="outline" disabled={i === 0} onClick={() => onGo(i - 1)}><ArrowLeft className="size-4" />Back</Button>
        {i < TOUR.length - 1 ? <Button size="sm" onClick={() => onGo(i + 1)}>Next<ArrowRight className="size-4" /></Button> : <Button size="sm" asChild><Link to="/auth">Create account</Link></Button>}
      </div>
    </div>
  </>;
}
