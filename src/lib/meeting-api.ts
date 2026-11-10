import { supabase } from '@/integrations/supabase/client';
import type { Database } from '@/integrations/supabase/types';
export async function saveQuestion(id:string, patch:Database['public']['Tables']['clarification_questions']['Update']) { const r=await supabase.from('clarification_questions').update(patch).eq('id',id); if(r.error) throw new Error(r.error.message); }
export async function controlMeeting(id:string, action:string, minutes=0) { const r=await supabase.rpc('control_meeting',{_id:id,_action:action,_minutes:minutes}); if(r.error) throw new Error(r.error.message); return r.data; }