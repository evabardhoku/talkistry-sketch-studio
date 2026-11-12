import { useState } from 'react';
import { ArrowLeft, ArrowRight, Loader2, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { BLUEPRINT_GUIDES, buildGuidedDiscovery, type BlueprintGuideKind } from '@/lib/blueprint-guide';

export function BlueprintGuide({ onSubmit, initialKind = 'user_role', disabled = false, compact = false }: { onSubmit: (text: string) => Promise<boolean>; initialKind?: BlueprintGuideKind; disabled?: boolean; compact?: boolean }) {
  const [open, setOpen] = useState(false);
  const [kind, setKind] = useState<BlueprintGuideKind>(initialKind);
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState(['', '', '']);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const guide = BLUEPRINT_GUIDES[kind];
  const reviewing = step === guide.questions.length;
  async function submit() {
    if (busy) return;
    setBusy(true); setError(null);
    try {
      if (await onSubmit(buildGuidedDiscovery(kind, answers))) { setOpen(false); setStep(0); setAnswers(['', '', '']); }
      else setError('Your answers are still here. Check the connection and try again.');
    } catch (e) { setError(e instanceof Error ? e.message : 'Could not submit your answers. Please try again.'); }
    finally { setBusy(false); }
  }
  return <Dialog open={open} onOpenChange={value => { if (!busy) setOpen(value); }}>
    <Button variant="outline" size="sm" disabled={disabled} className={compact ? 'h-auto w-full whitespace-normal py-2' : ''} onClick={() => setOpen(true)}><Sparkles className="size-4" />{compact ? 'Build a blueprint section' : `Define ${BLUEPRINT_GUIDES[initialKind].title.toLowerCase()}`}</Button>
    <DialogContent className="max-h-[85dvh] w-[calc(100%-2rem)] max-w-lg overflow-y-auto rounded-lg">
      <DialogHeader><DialogTitle>Shape your product blueprint</DialogTitle><DialogDescription>Draft proposals from your answers. Confirmation remains a separate decision.</DialogDescription></DialogHeader>
      <label className="grid gap-1.5 text-xs font-medium">Blueprint section<select aria-label="Blueprint section" className="h-10 w-full min-w-0 rounded-md border bg-background px-3 text-sm" value={kind} disabled={busy} onChange={e => { setKind(e.target.value as BlueprintGuideKind); setStep(0); setAnswers(['', '', '']); setError(null); }}>{Object.entries(BLUEPRINT_GUIDES).map(([key, value]) => <option key={key} value={key}>{value.title}</option>)}</select></label>
      <p className="text-xs text-muted-foreground">{guide.title} · {reviewing ? 'Review your answers' : `Question ${step + 1} of ${guide.questions.length}`}</p>
      {reviewing ? <dl className="space-y-4">{guide.questions.map((question, index) => <div key={question}><dt className="text-sm font-medium">{question}</dt><dd className="mt-1 whitespace-pre-wrap break-words text-sm text-muted-foreground">{answers[index]}</dd></div>)}</dl> : <div className="space-y-3"><label htmlFor="blueprint-answer" className="block text-lg font-medium">{guide.questions[step]}</label><Textarea key={`${kind}-${step}`} autoFocus id="blueprint-answer" aria-label="Guided answer" value={answers[step] ?? ''} onChange={e => setAnswers(previous => previous.map((answer, index) => index === step ? e.target.value : answer))} rows={5} maxLength={900} placeholder="Describe what you know. If undecided, say so." disabled={busy} /><p className="text-right text-xs text-muted-foreground">{answers[step]?.length ?? 0}/900</p></div>}
      {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
      <div className="flex items-center justify-between gap-2 border-t pt-4"><Button variant="ghost" size="sm" disabled={busy || step === 0} onClick={() => setStep(value => value - 1)}><ArrowLeft />Back</Button>{reviewing ? <Button size="sm" disabled={busy} onClick={() => void submit()}>{busy ? <Loader2 className="animate-spin" /> : <Sparkles />}Create proposals</Button> : <Button size="sm" disabled={!answers[step]?.trim()} onClick={() => setStep(value => value + 1)}>{step === guide.questions.length - 1 ? 'Review answers' : 'Next'}<ArrowRight /></Button>}</div>
    </DialogContent>
  </Dialog>;
}