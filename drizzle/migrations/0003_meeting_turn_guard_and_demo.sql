CREATE OR REPLACE FUNCTION public.claim_discovery_turn(_project_id uuid, _session_id uuid, _request_id uuid, _content text, _skip boolean)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE existing public.conversation_messages; result public.conversation_messages;
BEGIN
 IF NOT public.can_edit_project(_project_id,auth.uid()) THEN RAISE EXCEPTION 'You cannot answer in this project'; END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended(_project_id::text,0));
 SELECT * INTO existing FROM public.conversation_messages WHERE id=_request_id;
 IF FOUND THEN
  IF existing.project_id<>_project_id OR existing.author_id<>auth.uid() OR existing.role<>'user' THEN RAISE EXCEPTION 'Invalid request'; END IF;
  RETURN to_jsonb(existing);
 END IF;
 IF NOT EXISTS(SELECT 1 FROM public.discovery_sessions WHERE id=_session_id AND project_id=_project_id) THEN RAISE EXCEPTION 'Session not found'; END IF;
 IF EXISTS(SELECT 1 FROM public.conversation_messages WHERE project_id=_project_id AND meta->>'turn_state'='processing' AND created_at>now()-interval '10 minutes') THEN RAISE EXCEPTION 'Another answer is being processed. Wait for it to finish before sending again.'; END IF;
 INSERT INTO public.conversation_messages(id,project_id,session_id,role,content,author_id,meta) VALUES(_request_id,_project_id,_session_id,'user',_content,auth.uid(),jsonb_build_object('skip',_skip,'turn_state','processing')) RETURNING * INTO result;
 RETURN to_jsonb(result);
END $$;
REVOKE ALL ON FUNCTION public.claim_discovery_turn(uuid,uuid,uuid,text,boolean) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.claim_discovery_turn(uuid,uuid,uuid,text,boolean) TO authenticated;

CREATE OR REPLACE FUNCTION public.create_meeting_demo()
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE p uuid; s uuid; r uuid; screen uuid; message uuid;
BEGIN
 IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Sign in first'; END IF;
 p:=public.seed_demo_project(auth.uid());
 UPDATE public.projects SET name='Private tutoring booking platform',summary='Fictional meeting demo: parents discover vetted tutors and book private lessons. Sample stakeholder notes are illustrative, not real approvals.' WHERE id=p;
 SELECT id INTO s FROM public.discovery_sessions WHERE project_id=p LIMIT 1;
 SELECT id INTO r FROM public.requirements WHERE project_id=p AND category='goal' LIMIT 1;
 SELECT id INTO screen FROM public.product_screens WHERE project_id=p AND key='tutor_profile' LIMIT 1;
 INSERT INTO public.review_comments(project_id,requirement_id,author_id,kind,body) VALUES(p,r,auth.uid(),'comment','Fictional client review: finding vetted tutors is our first priority. This sample note is not a real stakeholder approval.');
 INSERT INTO public.review_comments(project_id,screen_id,author_id,kind,body) VALUES(p,screen,auth.uid(),'constraint','Fictional developer review: booking must check availability again before reserving a slot to avoid double bookings. Illustrative sample note, not a real developer account.');
 INSERT INTO public.conversation_messages(project_id,session_id,role,content,author_id,meta) VALUES(p,s,'user','Sample client change request: could parents also book a weekly recurring lesson with the same tutor?',auth.uid(),'{"demo":true,"sample_role":"client"}') RETURNING id INTO message;
 INSERT INTO public.requirements(project_id,category,title,description,status,origin,source_message_id,evidence) VALUES(p,'feature','Recurring weekly lessons','Fictional change request; recurrence, cancellation and payment rules need clarification.','proposed','human',message,'could parents also book a weekly recurring lesson with the same tutor?');
 RETURN p;
END $$;
REVOKE ALL ON FUNCTION public.create_meeting_demo() FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.create_meeting_demo() TO authenticated;