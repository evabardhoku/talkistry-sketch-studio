CREATE OR REPLACE FUNCTION public.delete_owned_project(_project_id uuid) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Sign in first'; END IF;
  PERFORM 1 FROM public.projects WHERE id=_project_id AND owner_id=auth.uid() FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Only the project owner can delete this project'; END IF;
  DELETE FROM public.development_insights WHERE project_id=_project_id;
  DELETE FROM public.projects WHERE id=_project_id AND owner_id=auth.uid();
END;
$$;
REVOKE ALL ON FUNCTION public.delete_owned_project(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.delete_owned_project(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.add_sample_projects() RETURNS uuid[] LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE u uuid:=auth.uid(); p uuid; s uuid; m uuid; a uuid; b uuid; ids uuid[]:='{}'; template text;
BEGIN
 IF u IS NULL THEN RAISE EXCEPTION 'Sign in first'; END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended(u::text||':sample-projects',0));
 IF NOT EXISTS(SELECT 1 FROM public.projects WHERE owner_id=u AND is_demo AND (name ILIKE '%tutor%' OR name ILIKE '%tutoring%')) THEN
  ids:=array_append(ids,public.create_meeting_demo());
 END IF;
 FOREACH template IN ARRAY ARRAY['PageTurn (sample)','RepairCircle (sample)'] LOOP
  SELECT id INTO p FROM public.projects WHERE owner_id=u AND is_demo AND name=template LIMIT 1;
  IF p IS NOT NULL THEN ids:=array_append(ids,p); CONTINUE; END IF;
  IF template='PageTurn (sample)' THEN
   INSERT INTO public.projects(owner_id,name,summary,is_demo) VALUES(u,template,'Fictional online bookstore: readers find books, save favourites and place orders. Prepared draft for exploration; suggestions are not approvals.',true) RETURNING id INTO p;
  ELSE
   INSERT INTO public.projects(owner_id,name,summary,is_demo) VALUES(u,template,'Fictional neighbourhood repair service: residents request repairs and choose available appointments. Prepared draft for exploration; suggestions are not approvals.',true) RETURNING id INTO p;
  END IF;
  INSERT INTO public.discovery_sessions(project_id,title) VALUES(p,'Prepared sample conversation') RETURNING id INTO s;
  INSERT INTO public.conversation_messages(project_id,session_id,role,content,author_id,meta) VALUES(p,s,'user',CASE WHEN template='PageTurn (sample)' THEN 'Fictional example: readers should browse books by category, save favourites and order physical books for delivery.' ELSE 'Fictional example: residents describe a broken item, choose an available repair appointment and track their request.' END,u,'{"demo":true}') RETURNING id INTO m;
  INSERT INTO public.conversation_messages(project_id,session_id,role,content,meta) VALUES(p,s,'assistant','I prepared a starting sketch and a set of suggestions for review. The remaining question is saved in the backlog. These are fictional examples, not approved decisions.','{"demo":true}');
  IF template='PageTurn (sample)' THEN
   INSERT INTO public.requirements(project_id,category,title,description,status,origin,source_message_id,evidence) VALUES
    (p,'user_role','Readers finding their next book','Readers browse categories and compare books before ordering.','proposed','human',m,'Prepared fictional bookstore example'),
    (p,'feature','Browse books by category','Show book titles, authors and available formats in a searchable catalogue.','proposed','human',m,'browse books by category'),
    (p,'workflow','Place a physical book order','Review the basket, enter a delivery address and submit an order.','proposed','human',m,'order physical books for delivery'),
    (p,'business_rule','Delivery destinations','Decide which destinations can receive physical orders.','unresolved','human',m,'Delivery policy still needs review');
   INSERT INTO public.product_screens(project_id,key,name,purpose,user_role,position,components,unresolved) VALUES
    (p,'catalogue','Book catalogue','Find and compare books','reader',0,'[{"type":"header","label":"PageTurn"},{"type":"search","label":"Title or author"},{"type":"list","label":"Books","items":["The Secret Garden","Little Women","A Room of One’s Own"]},{"type":"button","label":"View book"}]','[]') RETURNING id INTO a;
   INSERT INTO public.product_screens(project_id,key,name,purpose,user_role,position,components,unresolved) VALUES
    (p,'basket','Your basket','Review books and delivery details','reader',1,'[{"type":"header","label":"Your basket"},{"type":"list","label":"Selected books","items":["The Secret Garden"]},{"type":"form","label":"Delivery address"},{"type":"button","label":"Place order"}]','["Delivery destinations"]') RETURNING id INTO b;
   INSERT INTO public.clarification_questions(project_id,session_id,question,topic,priority,status,is_current,rationale) VALUES(p,s,'Which countries should receive physical book deliveries?','Delivery','important','open',true,'Choose the delivery policy before confirming checkout.');
  ELSE
   INSERT INTO public.requirements(project_id,category,title,description,status,origin,source_message_id,evidence) VALUES
    (p,'user_role','Residents arranging a repair','Residents need a simple way to describe a problem and choose a visit.','proposed','human',m,'Prepared fictional repair example'),
    (p,'feature','Request a repair','Describe the item, the problem and the preferred appointment.','proposed','human',m,'describe a broken item'),
    (p,'workflow','Choose an available appointment','Show available visits and record the selected slot.','proposed','human',m,'choose an available repair appointment'),
    (p,'business_rule','Appointment cancellation','Choose how late a resident may cancel a visit.','unresolved','human',m,'Cancellation policy still needs review');
   INSERT INTO public.product_screens(project_id,key,name,purpose,user_role,position,components,unresolved) VALUES
    (p,'request','Request a repair','Describe an item needing repair','resident',0,'[{"type":"header","label":"RepairCircle"},{"type":"input","label":"Item"},{"type":"form","label":"What needs fixing?"},{"type":"button","label":"Choose appointment"}]','[]') RETURNING id INTO a;
   INSERT INTO public.product_screens(project_id,key,name,purpose,user_role,position,components,unresolved) VALUES
    (p,'appointments','Choose an appointment','Pick a visit and review the request','resident',1,'[{"type":"header","label":"Available appointments"},{"type":"calendar","label":"Visit date"},{"type":"list","label":"Available visits","items":["Tuesday · morning","Thursday · afternoon"]},{"type":"button","label":"Send request"}]','["Cancellation policy"]') RETURNING id INTO b;
   INSERT INTO public.clarification_questions(project_id,session_id,question,topic,priority,status,is_current,rationale) VALUES(p,s,'How late can a resident cancel an appointment?','Appointments','important','open',true,'Agree on cancellation before confirming the appointment flow.');
  END IF;
  INSERT INTO public.workflow_connections(project_id,from_screen_id,to_screen_id,label) VALUES(p,a,b,'Continue');
  INSERT INTO public.development_insights(project_id,title,description,type,priority,author_id) VALUES(p,'Review availability before final submission','Fictional internal note: recheck availability when a request is submitted. Share a reviewed question with the client only if needed.','Technical Question','important',u);
  ids:=array_append(ids,p);
 END LOOP;
 RETURN ids;
END;
$$;
REVOKE ALL ON FUNCTION public.add_sample_projects() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.add_sample_projects() TO authenticated;