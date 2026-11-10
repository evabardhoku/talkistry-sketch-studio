CREATE OR REPLACE FUNCTION public.approve_baseline(_project_id uuid, _notes text)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $function$
DECLARE v int; new_id uuid; snap jsonb;
BEGIN
IF NOT public.is_project_owner(_project_id, auth.uid()) THEN RAISE EXCEPTION 'Only the project owner can approve a baseline'; END IF;
SELECT coalesce(max(version),0)+1 INTO v FROM public.specification_versions WHERE project_id=_project_id;
snap := jsonb_build_object(
'requirements', coalesce((SELECT jsonb_agg(jsonb_build_object('id',id,'category',category,'title',title,'description',description,'evidence',evidence) ORDER BY created_at) FROM public.requirements WHERE project_id=_project_id AND status='confirmed'),'[]'::jsonb),
'unresolved', coalesce((SELECT jsonb_agg(jsonb_build_object('id',id,'title',title,'status',status)) FROM public.requirements WHERE project_id=_project_id AND status IN ('unresolved','proposed')),'[]'::jsonb),
'excluded', coalesce((SELECT jsonb_agg(jsonb_build_object('id',id,'title',title,'status',status)) FROM public.requirements WHERE project_id=_project_id AND status IN ('deferred','excluded')),'[]'::jsonb),
'open_questions', coalesce((SELECT jsonb_agg(question ORDER BY created_at) FROM public.clarification_questions WHERE project_id=_project_id AND status IN ('open','deferred','needs_technical_review','skipped')),'[]'::jsonb),
'screens', coalesce((SELECT jsonb_agg(jsonb_build_object('id',id,'key',key,'name',name,'purpose',purpose,'user_role',user_role,'components',components) ORDER BY position) FROM public.product_screens WHERE project_id=_project_id),'[]'::jsonb),
'connections', coalesce((SELECT jsonb_agg(jsonb_build_object('from',from_screen_id,'to',to_screen_id,'label',label)) FROM public.workflow_connections WHERE project_id=_project_id),'[]'::jsonb));
INSERT INTO public.specification_versions(project_id,version,content,created_by,kind,approved_by,approved_at,notes) VALUES (_project_id,v,snap,auth.uid(),'baseline',auth.uid(),now(),nullif(trim(_notes),'')) RETURNING id INTO new_id;
INSERT INTO public.decisions(project_id,action,note,decided_by) VALUES (_project_id,'baseline_approved','Approved baseline v'||v,auth.uid());
RETURN new_id;
END $function$;