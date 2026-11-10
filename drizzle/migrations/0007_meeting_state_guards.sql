REVOKE UPDATE ON public.meetings FROM authenticated;
GRANT UPDATE(title,purpose,duration_minutes,goals,participants,agenda,summary,brief) ON public.meetings TO authenticated;
REVOKE UPDATE ON public.development_insights FROM authenticated;
GRANT UPDATE(title,description,type,priority,status,owner_id,requirement_id,screen_id) ON public.development_insights TO authenticated;
CREATE OR REPLACE FUNCTION public.validate_meeting_agenda() RETURNS trigger LANGUAGE plpgsql SET search_path=public AS $$
DECLARE s jsonb; keys text[]:=ARRAY[]::text[]; idx integer:=0; firstidx integer;
BEGIN
 IF TG_OP='UPDATE' AND (NEW.project_id<>OLD.project_id OR NEW.created_by<>OLD.created_by) THEN RAISE EXCEPTION 'Meeting identity is immutable'; END IF;
 IF length(trim(NEW.title))=0 OR jsonb_typeof(NEW.agenda)<>'array' OR jsonb_array_length(NEW.agenda) NOT BETWEEN 1 AND 20 THEN RAISE EXCEPTION 'Meeting needs a title and 1 to 20 agenda stages'; END IF;
 FOR s IN SELECT * FROM jsonb_array_elements(NEW.agenda) LOOP
 IF coalesce(s->>'key','')='' OR s->>'key'=ANY(keys) OR coalesce(s->>'name','')='' OR coalesce(s->>'objective','')='' OR coalesce((s->>'minutes')::integer,0) NOT BETWEEN 1 AND 480 OR coalesce((s->>'actual_seconds')::integer,0)<0 OR coalesce(s->>'status','') NOT IN ('pending','completed','skipped') THEN RAISE EXCEPTION 'Invalid agenda stage'; END IF;
 keys:=array_append(keys,s->>'key');
 IF s->>'status'='pending' AND firstidx IS NULL THEN firstidx:=idx; END IF;
 idx:=idx+1;
 END LOOP;
 IF NEW.status='planned' THEN
 IF firstidx IS NULL THEN RAISE EXCEPTION 'At least one stage must remain active'; END IF;
 NEW.active_stage:=firstidx;
 ELSIF NEW.active_stage<0 OR NEW.active_stage>=jsonb_array_length(NEW.agenda) THEN RAISE EXCEPTION 'Invalid active stage'; END IF;
 IF TG_OP='UPDATE' AND current_user='authenticated' AND OLD.status<>'planned' THEN
 IF jsonb_array_length(NEW.agenda)<>jsonb_array_length(OLD.agenda) THEN RAISE EXCEPTION 'Cannot remove stages after starting'; END IF;
 FOR idx IN 0..jsonb_array_length(OLD.agenda)-1 LOOP
 IF idx<=OLD.active_stage AND NEW.agenda->idx->>'key' IS DISTINCT FROM OLD.agenda->idx->>'key' THEN RAISE EXCEPTION 'Cannot reorder elapsed stages'; END IF;
 IF NEW.agenda->idx->>'actual_seconds' IS DISTINCT FROM OLD.agenda->idx->>'actual_seconds' OR NEW.agenda->idx->>'status' IS DISTINCT FROM OLD.agenda->idx->>'status' THEN RAISE EXCEPTION 'Use stage controls to change timing and completion'; END IF;
 END LOOP;
 END IF;
 NEW.updated_at:=now(); RETURN NEW;
END $$;
CREATE TRIGGER validate_meeting BEFORE INSERT OR UPDATE ON public.meetings FOR EACH ROW EXECUTE FUNCTION public.validate_meeting_agenda();
CREATE OR REPLACE FUNCTION public.validate_internal_insight() RETURNS trigger LANGUAGE plpgsql SET search_path=public AS $$
BEGIN
 IF TG_OP='UPDATE' AND (NEW.project_id<>OLD.project_id OR NEW.author_id<>OLD.author_id) THEN RAISE EXCEPTION 'Internal note identity is immutable'; END IF;
 IF NEW.owner_id IS NOT NULL AND NOT public.is_internal_member(NEW.project_id,NEW.owner_id) THEN RAISE EXCEPTION 'Responsible person must be internal'; END IF;
 IF NEW.requirement_id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.requirements WHERE id=NEW.requirement_id AND project_id=NEW.project_id) THEN RAISE EXCEPTION 'Requirement belongs to another project'; END IF;
 IF NEW.screen_id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.product_screens WHERE id=NEW.screen_id AND project_id=NEW.project_id) THEN RAISE EXCEPTION 'Screen belongs to another project'; END IF;
 NEW.updated_at:=now(); RETURN NEW;
END $$;
CREATE TRIGGER validate_internal_note BEFORE INSERT OR UPDATE ON public.development_insights FOR EACH ROW EXECUTE FUNCTION public.validate_internal_insight();
CREATE UNIQUE INDEX one_current_question_per_project ON public.clarification_questions(project_id) WHERE is_current=true;
