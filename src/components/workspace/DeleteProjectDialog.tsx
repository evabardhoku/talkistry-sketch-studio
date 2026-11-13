import { useState } from 'react';
import { Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { ActionTooltip } from '@/components/ActionTooltip';

export function DeleteProjectDialog({ id, name, onDeleted }: { id: string; name: string; onDeleted: () => Promise<unknown> }) {
  const [open, setOpen] = useState(false);
  const [confirmation, setConfirmation] = useState('');
  const [busy, setBusy] = useState(false);
  async function remove() {
    if (confirmation !== name || busy) return;
    setBusy(true);
    try {
      const { error } = await supabase.rpc('delete_owned_project', { _project_id: id });
      if (error) throw new Error(error.message);
      await onDeleted(); setOpen(false); toast.success('Project deleted');
    } catch (e) { toast.error(e instanceof Error ? e.message : 'Could not delete project'); }
    finally { setBusy(false); }
  }
  return <Dialog open={open} onOpenChange={value => { if (!busy) { setOpen(value); setConfirmation(''); } }}>
    <ActionTooltip label="Delete project"><DialogTrigger asChild><Button size="icon" variant="ghost" aria-label={`Delete ${name}`}><Trash2 className="size-4" /></Button></DialogTrigger></ActionTooltip>
    <DialogContent><DialogHeader><DialogTitle>Delete this project?</DialogTitle><DialogDescription>This permanently removes its conversations, sketches, meetings, invitations, and saved versions for everyone. This cannot be undone.</DialogDescription></DialogHeader>
      <label className="grid gap-2 text-sm">Type the project name to confirm: <strong className="break-words">{name}</strong><Input aria-label="Project name confirmation" value={confirmation} onChange={e => setConfirmation(e.target.value)} /></label>
      <div className="flex justify-end gap-2"><Button variant="outline" disabled={busy} onClick={() => setOpen(false)}>Cancel</Button><Button variant="destructive" disabled={busy || confirmation !== name} onClick={() => void remove()}>{busy ? 'Deleting…' : 'Delete project'}</Button></div>
    </DialogContent>
  </Dialog>;
}