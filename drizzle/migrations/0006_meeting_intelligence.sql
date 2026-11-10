CREATE TABLE public.meetings (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
 title text NOT NULL, purpose text NOT NULL DEFAULT 'Initial Product Discovery', duration_minutes integer NOT NULL DEFAULT 60 CHECK(duration_minutes BETWEEN 1 AND 480),
 goals text NOT NULL DEFAULT '', participants jsonb NOT NULL DEFAULT '[]', agenda jsonb NOT NULL DEFAULT '[]',
 status text NOT NULL DEFAULT 'planned' CHECK(status IN ('planned','running','paused','ended')),
 active_stage integer NOT NULL DEFAULT 0, elapsed_seconds integer NOT NULL DEFAULT 0, running_since timestamptz,
 started_at timestamptz, ended_at timestamptz, summary text NOT NULL DEFAULT '', brief text NOT NULL DEFAULT '',
 created_by uuid NOT NULL DEFAULT auth.uid(), created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.meetings TO authenticated;
GRANT ALL ON public.meetings TO service_role;
ALTER TABLE public.meetings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "members read meetings" ON public.meetings FOR SELECT TO authenticated USING(public.is_project_member(project_id,auth.uid()));
CREATE POLICY "facilitators create meetings" ON public.meetings FOR INSERT TO authenticated WITH CHECK(public.is_project_member(project_id,auth.uid()) AND public.member_role_of(project_id,auth.uid()) IN ('owner','editor','developer') AND created_by=auth.uid() AND status='planned');
CREATE POLICY "facilitators update meetings" ON public.meetings FOR UPDATE TO authenticated USING(public.is_project_member(project_id,auth.uid()) AND public.member_role_of(project_id,auth.uid()) IN ('owner','editor','developer')) WITH CHECK(public.is_project_member(project_id,auth.uid()) AND public.member_role_of(project_id,auth.uid()) IN ('owner','editor','developer'));
CREATE UNIQUE INDEX one_active_meeting_per_project ON public.meetings(project_id) WHERE status IN ('running','paused');
ALTER TABLE public.clarification_questions ADD COLUMN priority text NOT NULL DEFAULT 'important' CHECK(priority IN ('critical','important','secondary'));
ALTER TABLE public.clarification_questions ADD COLUMN owner_id uuid;
ALTER TABLE public.clarification_questions ADD COLUMN requirement_id uuid REFERENCES public.requirements(id) ON DELETE SET NULL;
ALTER TABLE public.clarification_questions ADD COLUMN screen_id uuid REFERENCES public.product_screens(id) ON DELETE SET NULL;
ALTER TABLE public.clarification_questions ADD COLUMN meeting_id uuid REFERENCES public.meetings(id) ON DELETE SET NULL;
ALTER TABLE public.clarification_questions ADD COLUMN stage_key text;
ALTER TABLE public.clarification_questions ADD COLUMN answer text NOT NULL DEFAULT '';
ALTER TABLE public.clarification_questions ADD COLUMN history jsonb NOT NULL DEFAULT '[]';
ALTER TABLE public.clarification_questions ADD COLUMN suggested_answers jsonb NOT NULL DEFAULT '[]';
ALTER TABLE public.clarification_questions ADD COLUMN is_current boolean NOT NULL DEFAULT false;
UPDATE public.clarification_questions SET status='deferred' WHERE status='skipped';
UPDATE public.clarification_questions q SET answer=m.content FROM public.conversation_messages m WHERE q.answer_message_id=m.id;
CREATE OR REPLACE FUNCTION public.guard_question_backlog() RETURNS trigger LANGUAGE plpgsql SET search_path=public AS $$
BEGIN
 IF TG_OP='UPDATE' AND (NEW.project_id<>OLD.project_id OR NEW.session_id<>OLD.session_id) THEN RAISE EXCEPTION 'Question identity is immutable'; END IF;
 IF NEW.owner_id IS NOT NULL AND NOT public.is_project_member(NEW.project_id,NEW.owner_id) THEN RAISE EXCEPTION 'Reviewer must have live project access'; END IF;
 IF NEW.meeting_id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.meetings WHERE id=NEW.meeting_id AND project_id=NEW.project_id) THEN RAISE EXCEPTION 'Meeting belongs to another project'; END IF;
 IF NEW.requirement_id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.requirements WHERE id=NEW.requirement_id AND project_id=NEW.project_id) THEN RAISE EXCEPTION 'Requirement belongs to another project'; END IF;
 IF NEW.screen_id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.product_screens WHERE id=NEW.screen_id AND project_id=NEW.project_id) THEN RAISE EXCEPTION 'Screen belongs to another project'; END IF;
 IF TG_OP='UPDATE' THEN
 NEW.history:=OLD.history;
 IF NEW.answer IS DISTINCT FROM OLD.answer OR NEW.status IS DISTINCT FROM OLD.status OR NEW.owner_id IS DISTINCT FROM OLD.owner_id OR NEW.priority IS DISTINCT FROM OLD.priority THEN
 NEW.history:=OLD.history || jsonb_build_array(jsonb_build_object('at',now(),'by',auth.uid(),'answer',NEW.answer,'status',NEW.status,'priority',NEW.priority,'owner_id',NEW.owner_id)); END IF;
 END IF;
 NEW.updated_at:=now(); RETURN NEW;
END $$;
CREATE TRIGGER question_backlog_guard BEFORE INSERT OR UPDATE ON public.clarification_questions FOR EACH ROW EXECUTE FUNCTION public.guard_question_backlog();
CREATE TABLE public.development_insights (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
 title text NOT NULL, description text NOT NULL DEFAULT '', type text NOT NULL DEFAULT 'Technical Question' CHECK(type IN ('Technical Question','Implementation Blocker','Requirement Ambiguity','Bug or Unexpected Behavior','Improvement Suggestion','Proposed Scope Change')),
 priority text NOT NULL DEFAULT 'important' CHECK(priority IN ('critical','important','secondary')), status text NOT NULL DEFAULT 'open' CHECK(status IN ('open','in_review','resolved')),
 author_id uuid NOT NULL DEFAULT auth.uid(), owner_id uuid, requirement_id uuid REFERENCES public.requirements(id), screen_id uuid REFERENCES public.product_screens(id),
 promoted_question_id uuid REFERENCES public.clarification_questions(id), created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.development_insights TO authenticated;
GRANT ALL ON public.development_insights TO service_role;
ALTER TABLE public.development_insights ENABLE ROW LEVEL SECURITY;
CREATE OR REPLACE FUNCTION public.is_internal_member(_project_id uuid,_user_id uuid) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$ SELECT public.is_project_member(_project_id,_user_id) AND public.member_role_of(_project_id,_user_id) IN ('owner','editor','developer') $$;
CREATE POLICY "internal read insights" ON public.development_insights FOR SELECT TO authenticated USING(public.is_internal_member(project_id,auth.uid()));
CREATE POLICY "internal create insights" ON public.development_insights FOR INSERT TO authenticated WITH CHECK(public.is_internal_member(project_id,auth.uid()) AND author_id=auth.uid() AND promoted_question_id IS NULL);
CREATE POLICY "internal update insights" ON public.development_insights FOR UPDATE TO authenticated USING(public.is_internal_member(project_id,auth.uid())) WITH CHECK(public.is_internal_member(project_id,auth.uid()));
CREATE TABLE public.development_comments (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), insight_id uuid NOT NULL REFERENCES public.development_insights(id) ON DELETE CASCADE, body text NOT NULL CHECK(length(body) BETWEEN 1 AND 4000), author_id uuid NOT NULL DEFAULT auth.uid(), created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.development_comments TO authenticated;
GRANT ALL ON public.development_comments TO service_role;
ALTER TABLE public.development_comments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "internal read discussion" ON public.development_comments FOR SELECT TO authenticated USING(EXISTS(SELECT 1 FROM public.development_insights i WHERE i.id=insight_id AND public.is_internal_member(i.project_id,auth.uid())));
CREATE POLICY "internal add discussion" ON public.development_comments FOR INSERT TO authenticated WITH CHECK(author_id=auth.uid() AND EXISTS(SELECT 1 FROM public.development_insights i WHERE i.id=insight_id AND public.is_internal_member(i.project_id,auth.uid())));
CREATE OR REPLACE FUNCTION public.promote_development_question(_id uuid,_question text) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE i public.development_insights; s uuid; q uuid;
BEGIN
 SELECT * INTO i FROM public.development_insights WHERE id=_id FOR UPDATE;
 IF NOT FOUND OR NOT public.is_internal_member(i.project_id,auth.uid()) THEN RAISE EXCEPTION 'Internal access required'; END IF;
 IF i.promoted_question_id IS NOT NULL THEN RETURN i.promoted_question_id; END IF;
 IF length(trim(_question)) NOT BETWEEN 1 AND 1000 THEN RAISE EXCEPTION 'Write the client-facing question'; END IF;
 SELECT id INTO s FROM public.discovery_sessions WHERE project_id=i.project_id ORDER BY created_at LIMIT 1;
 IF s IS NULL THEN INSERT INTO public.discovery_sessions(project_id) VALUES(i.project_id) RETURNING id INTO s; END IF;
 INSERT INTO public.clarification_questions(project_id,session_id,question,topic,priority,status,owner_id,requirement_id,screen_id) VALUES(i.project_id,s,trim(_question),'technical',i.priority,'deferred',i.owner_id,i.requirement_id,i.screen_id) RETURNING id INTO q;
 UPDATE public.development_insights SET promoted_question_id=q,updated_at=now() WHERE id=i.id;
 RETURN q;
END $$;
REVOKE ALL ON FUNCTION public.promote_development_question(uuid,text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.promote_development_question(uuid,text) TO authenticated;
CREATE OR REPLACE FUNCTION public.control_meeting(_id uuid,_action text,_minutes integer DEFAULT 0) RETURNS public.meetings LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE m public.meetings; a jsonb; stage jsonb; delta integer:=0; nextidx integer;
BEGIN
 SELECT * INTO m FROM public.meetings WHERE id=_id FOR UPDATE;
 IF NOT FOUND OR NOT public.is_internal_member(m.project_id,auth.uid()) THEN RAISE EXCEPTION 'Facilitator access required'; END IF;
 IF _action NOT IN ('start','pause','resume','extend','next','skip','end','dismiss') THEN RAISE EXCEPTION 'Invalid meeting action'; END IF;
 IF m.status='ended' THEN RAISE EXCEPTION 'Meeting already ended'; END IF;
 IF jsonb_array_length(m.agenda)=0 THEN RAISE EXCEPTION 'Add agenda stages first'; END IF;
 IF m.status='running' THEN delta:=greatest(0,floor(extract(epoch FROM now()-m.running_since))::integer); END IF;
 m.elapsed_seconds:=m.elapsed_seconds+delta;
 stage:=m.agenda->m.active_stage;
 stage:=jsonb_set(stage,'{actual_seconds}',to_jsonb(coalesce((stage->>'actual_seconds')::integer,0)+delta));
 m.agenda:=jsonb_set(m.agenda,ARRAY[m.active_stage::text],stage);
 IF _action='start' THEN
 IF m.status<>'planned' THEN RAISE EXCEPTION 'Meeting has already started'; END IF;
 m.status:='running'; m.started_at:=now();
 ELSIF _action='pause' THEN IF m.status<>'running' THEN RAISE EXCEPTION 'Meeting is not running'; END IF; m.status:='paused';
 ELSIF _action='resume' THEN IF m.status<>'paused' THEN RAISE EXCEPTION 'Meeting is not paused'; END IF; m.status:='running';
 ELSIF _action='extend' THEN
 IF _minutes NOT IN (2,5,10) THEN RAISE EXCEPTION 'Choose 2, 5 or 10 minutes'; END IF;
 stage:=jsonb_set(stage,'{minutes}',to_jsonb((stage->>'minutes')::integer+_minutes));
 stage:=jsonb_set(stage,'{dismissed}', 'false');
 m.agenda:=jsonb_set(m.agenda,ARRAY[m.active_stage::text],stage);
 ELSIF _action IN ('next','skip') THEN
 UPDATE public.clarification_questions SET status='deferred',is_current=false WHERE project_id=m.project_id AND meeting_id=m.id AND stage_key=stage->>'key' AND status='open';
 stage:=jsonb_set(stage,'{status}',to_jsonb(CASE WHEN _action='skip' THEN 'skipped' ELSE 'completed' END));
 m.agenda:=jsonb_set(m.agenda,ARRAY[m.active_stage::text],stage);
 SELECT min(n::integer-1) INTO nextidx FROM jsonb_array_elements(m.agenda) WITH ORDINALITY AS x(v,n) WHERE n::integer-1>m.active_stage AND coalesce(v->>'status','pending')='pending';
 IF nextidx IS NULL THEN m.status:='paused'; ELSE m.active_stage:=nextidx; END IF;
 ELSIF _action='dismiss' THEN m.agenda:=jsonb_set(m.agenda,ARRAY[m.active_stage::text,'dismissed'],'true');
 ELSIF _action='end' THEN m.status:='ended'; m.ended_at:=now(); END IF;
 m.running_since:=CASE WHEN m.status='running' THEN now() ELSE NULL END;
 UPDATE public.meetings SET status=m.status,active_stage=m.active_stage,elapsed_seconds=m.elapsed_seconds,running_since=m.running_since,started_at=m.started_at,ended_at=m.ended_at,agenda=m.agenda,updated_at=now() WHERE id=m.id RETURNING * INTO m;
 RETURN m;
END $$;
REVOKE ALL ON FUNCTION public.control_meeting(uuid,text,integer) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.control_meeting(uuid,text,integer) TO authenticated;
CREATE INDEX ON public.meetings(project_id,created_at);
CREATE INDEX ON public.development_insights(project_id);
CREATE INDEX ON public.clarification_questions(project_id,priority);
