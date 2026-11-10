import type { Database } from '@/integrations/supabase/types';
export type Meeting = Database['public']['Tables']['meetings']['Row'];
export interface Stage { key: string; name: string; objective: string; minutes: number; actual_seconds: number; status: 'pending' | 'completed' | 'skipped'; dismissed: boolean }
export const MEETING_TYPES = ['Initial Product Discovery', 'Requirements Clarification', 'Product Review', 'Technical Alignment', 'Follow-up / Decision Meeting'];
export function defaultAgenda(duration: number, purpose = MEETING_TYPES[0]): Stage[] {
  const names = purpose === 'Initial Product Discovery' ? ['Product Vision','Core Functionality','User Journeys & Live Sketch','Critical Clarifications','Summary & Next Steps'] : ['Goals & Previous Decisions','Prioritized Questions','Product & Implementation Review','Decisions & Approvals','Summary & Next Steps'];
  const weights = [5,15,25,10,5];
  const minutes = weights.map(w => Math.max(1, Math.floor(duration*w/60)));
  minutes[2] = Math.max(1, (minutes[2] ?? 1) + duration - minutes.reduce((a,b)=>a+b,0));
  return names.map((name,i)=>({key:`stage_${i+1}`,name,objective:['Agree on the meeting goal','Define core functionality and prioritized decisions','Review main journeys and evolve the product sketch','Resolve blockers; preserve unanswered questions','Review decisions and assign next steps'][i] ?? '',minutes:minutes[i] ?? 5,actual_seconds:0,status:'pending',dismissed:false}));
}
export function parseAgenda(v: unknown): Stage[] { return Array.isArray(v) ? v.filter(s => s && typeof s === 'object' && typeof s.key === 'string' && typeof s.minutes === 'number') as Stage[] : []; }
export function elapsed(m: Pick<Meeting,'elapsed_seconds'|'running_since'|'status'>, now = Date.now()) { return m.elapsed_seconds + (m.status === 'running' && m.running_since ? Math.max(0,Math.floor((now-Date.parse(m.running_since))/1000)) : 0); }
export function stageElapsed(m: Meeting, now = Date.now()) { const s=parseAgenda(m.agenda)[m.active_stage]; return (s?.actual_seconds ?? 0) + elapsed(m,now)-m.elapsed_seconds; }
export function clock(seconds:number) { const s=Math.max(0,Math.floor(seconds)); return `${Math.floor(s/60)}:${String(s%60).padStart(2,'0')}`; }
export const unresolvedQuestion = (q: {status:string}) => ['open','deferred','needs_technical_review','skipped'].includes(q.status);
export function similarQuestion(a:string,b:string) {
  const words=(s:string)=>new Set(s.toLowerCase().replace(/[^a-z0-9 ]/g,' ').split(/\s+/).filter(w=>w.length>2 && !['the','how','what','should','does','and','for','are','you'].includes(w)));
  const x=words(a),y=words(b); if(!x.size || !y.size) return a.trim().toLowerCase()===b.trim().toLowerCase();
  const common=[...x].filter(w=>y.has(w)).length; return common / new Set([...x,...y]).size >= .7;
}