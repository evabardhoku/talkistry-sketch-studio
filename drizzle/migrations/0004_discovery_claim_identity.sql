CREATE OR REPLACE FUNCTION public.claim_discovery_turn(_project_id uuid, _session_id uuid, _request_id uuid, _content text, _skip boolean)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE existing public.conversation_messages; result public.conversation_messages;
BEGIN
 IF NOT public.can_edit_project(_project_id,auth.uid()) THEN RAISE EXCEPTION 'You cannot answer in this project'; END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended(_project_id::text,0));
 SELECT * INTO existing FROM public.conversation_messages WHERE id=_request_id;
 IF FOUND THEN
  IF existing.project_id<>_project_id OR existing.author_id<>auth.uid() OR existing.role<>'user' THEN RAISE EXCEPTION 'Invalid request'; END IF;
  RETURN jsonb_build_object('claimed',false);
 END IF;
 IF NOT EXISTS(SELECT 1 FROM public.discovery_sessions WHERE id=_session_id AND project_id=_project_id) THEN RAISE EXCEPTION 'Session not found'; END IF;
 IF EXISTS(SELECT 1 FROM public.conversation_messages WHERE project_id=_project_id AND meta->>'turn_state'='processing' AND created_at>now()-interval '10 minutes') THEN RAISE EXCEPTION 'Another answer is being processed. Wait for it to finish before sending again.'; END IF;
 INSERT INTO public.conversation_messages(id,project_id,session_id,role,content,author_id,meta) VALUES(_request_id,_project_id,_session_id,'user',_content,auth.uid(),jsonb_build_object('skip',_skip,'turn_state','processing')) RETURNING * INTO result;
 RETURN jsonb_build_object('claimed',true);
END $$;