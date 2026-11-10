
-- Membership: access window + which version is shared
ALTER TABLE public.project_members ADD COLUMN expires_at timestamptz;
ALTER TABLE public.project_members ADD COLUMN baseline_id uuid REFERENCES public.specification_versions(id) ON DELETE SET NULL;

-- Baselines
ALTER TABLE public.specification_versions ADD COLUMN kind text NOT NULL DEFAULT 'snapshot' CHECK (kind IN ('snapshot','baseline'));
ALTER TABLE public.specification_versions ADD COLUMN approved_by uuid;
ALTER TABLE public.specification_versions ADD COLUMN approved_at timestamptz;
ALTER TABLE public.specification_versions ADD COLUMN notes text;

ALTER TABLE public.requirements ADD COLUMN reviewer_id uuid;

-- Access helpers
CREATE OR REPLACE FUNCTION public.member_role_of(_project_id uuid, _user_id uuid)
RETURNS text LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT role::text FROM public.project_members
  WHERE project_id=_project_id AND user_id=_user_id AND (expires_at IS NULL OR expires_at > now())
$$;
-- Live access: not expired and not restricted to one baseline
CREATE OR REPLACE FUNCTION public.is_project_member(_project_id uuid, _user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS(SELECT 1 FROM public.project_members WHERE project_id=_project_id AND user_id=_user_id
    AND (expires_at IS NULL OR expires_at > now()) AND baseline_id IS NULL)
$$;
CREATE OR REPLACE FUNCTION public.has_project_access(_project_id uuid, _user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS(SELECT 1 FROM public.project_members WHERE project_id=_project_id AND user_id=_user_id
    AND (expires_at IS NULL OR expires_at > now()))
$$;
CREATE OR REPLACE FUNCTION public.can_edit_project(_project_id uuid, _user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS(SELECT 1 FROM public.project_members WHERE project_id=_project_id AND user_id=_user_id
    AND (expires_at IS NULL OR expires_at > now()) AND baseline_id IS NULL
    AND role::text IN ('owner','editor','client','developer'))
$$;
CREATE OR REPLACE FUNCTION public.is_project_owner(_project_id uuid, _user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS(SELECT 1 FROM public.project_members WHERE project_id=_project_id AND user_id=_user_id AND role::text='owner')
$$;

CREATE POLICY "baseline viewers read project" ON public.projects FOR SELECT TO authenticated USING (public.has_project_access(id, auth.uid()));
CREATE POLICY "read own membership" ON public.project_members FOR SELECT TO authenticated USING (user_id = auth.uid());
GRANT UPDATE, DELETE ON public.project_members TO authenticated;
CREATE POLICY "owner updates members" ON public.project_members FOR UPDATE TO authenticated USING (public.is_project_owner(project_id, auth.uid()) AND role::text <> 'owner');
CREATE POLICY "owner removes members" ON public.project_members FOR DELETE TO authenticated USING (public.is_project_owner(project_id, auth.uid()) AND role::text <> 'owner');

-- Prevent promoting someone to owner through update
CREATE OR REPLACE FUNCTION public.guard_member_update() RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.role::text = 'owner' AND OLD.role::text <> 'owner' THEN RAISE EXCEPTION 'Cannot assign owner role'; END IF;
  IF NEW.user_id <> OLD.user_id OR NEW.project_id <> OLD.project_id THEN RAISE EXCEPTION 'Immutable fields'; END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER project_members_guard BEFORE UPDATE ON public.project_members FOR EACH ROW EXECUTE FUNCTION public.guard_member_update();

-- Specification versions: immutable; baselines only via approve_baseline(); baseline viewers read their version
DROP POLICY IF EXISTS "editors update" ON public.specification_versions;
DROP POLICY IF EXISTS "editors delete" ON public.specification_versions;
DROP POLICY IF EXISTS "editors insert" ON public.specification_versions;
CREATE POLICY "editors insert snapshots" ON public.specification_versions FOR INSERT TO authenticated
  WITH CHECK (public.can_edit_project(project_id, auth.uid()) AND kind = 'snapshot' AND approved_by IS NULL);
CREATE POLICY "shared baseline read" ON public.specification_versions FOR SELECT TO authenticated
  USING (EXISTS(SELECT 1 FROM public.project_members m WHERE m.project_id = specification_versions.project_id AND m.user_id = auth.uid()
    AND m.baseline_id = specification_versions.id AND (m.expires_at IS NULL OR m.expires_at > now())));

-- Requirement confirmation rules (backend-enforced)
CREATE OR REPLACE FUNCTION public.guard_requirement_status() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE r text;
BEGIN
  IF auth.uid() IS NULL THEN RETURN NEW; END IF;
  r := public.member_role_of(NEW.project_id, auth.uid());
  IF NEW.status = 'confirmed' AND (TG_OP = 'INSERT' OR OLD.status IS DISTINCT FROM 'confirmed') AND coalesce(r,'') NOT IN ('owner','editor','client') THEN
    RAISE EXCEPTION 'Only the owner or client can confirm requirements';
  END IF;
  IF TG_OP = 'UPDATE' AND NEW.reviewer_id IS DISTINCT FROM OLD.reviewer_id AND coalesce(r,'') NOT IN ('owner','editor') THEN
    RAISE EXCEPTION 'Only the owner can assign reviewers';
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER requirements_status_guard BEFORE INSERT OR UPDATE ON public.requirements FOR EACH ROW EXECUTE FUNCTION public.guard_requirement_status();

-- Invitations
CREATE TABLE public.project_invitations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  email text NOT NULL,
  role public.member_role NOT NULL,
  token text NOT NULL UNIQUE DEFAULT encode(extensions.gen_random_bytes(24), 'hex'),
  link_expires_at timestamptz NOT NULL DEFAULT now() + interval '7 days',
  access_expires_at timestamptz,
  baseline_id uuid REFERENCES public.specification_versions(id) ON DELETE SET NULL,
  invited_by uuid NOT NULL,
  accepted_by uuid,
  accepted_at timestamptz,
  revoked_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK (role::text <> 'owner')
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.project_invitations TO authenticated;
GRANT ALL ON public.project_invitations TO service_role;
ALTER TABLE public.project_invitations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "owner reads invites" ON public.project_invitations FOR SELECT TO authenticated USING (public.is_project_owner(project_id, auth.uid()));
CREATE POLICY "owner creates invites" ON public.project_invitations FOR INSERT TO authenticated WITH CHECK (public.is_project_owner(project_id, auth.uid()) AND invited_by = auth.uid());
CREATE POLICY "owner updates invites" ON public.project_invitations FOR UPDATE TO authenticated USING (public.is_project_owner(project_id, auth.uid()));
CREATE POLICY "owner deletes invites" ON public.project_invitations FOR DELETE TO authenticated USING (public.is_project_owner(project_id, auth.uid()));

CREATE OR REPLACE FUNCTION public.get_invitation(_token text)
RETURNS TABLE(project_name text, role text, email text, valid boolean, reason text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT p.name, i.role::text, i.email,
    (i.revoked_at IS NULL AND i.accepted_at IS NULL AND i.link_expires_at > now()),
    CASE WHEN i.revoked_at IS NOT NULL THEN 'revoked' WHEN i.accepted_at IS NOT NULL THEN 'already used'
         WHEN i.link_expires_at <= now() THEN 'expired' ELSE NULL END
  FROM public.project_invitations i JOIN public.projects p ON p.id = i.project_id WHERE i.token = _token
$$;

CREATE OR REPLACE FUNCTION public.accept_invitation(_token text)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE i public.project_invitations; uemail text;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Sign in first'; END IF;
  SELECT * INTO i FROM public.project_invitations WHERE token = _token FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Invitation not found'; END IF;
  IF i.revoked_at IS NOT NULL OR i.accepted_at IS NOT NULL OR i.link_expires_at <= now() THEN RAISE EXCEPTION 'Invitation is no longer valid'; END IF;
  SELECT email INTO uemail FROM auth.users WHERE id = auth.uid();
  IF lower(uemail) <> lower(i.email) THEN RAISE EXCEPTION 'This invitation was sent to a different email address'; END IF;
  INSERT INTO public.project_members(project_id, user_id, role, expires_at, baseline_id)
    VALUES (i.project_id, auth.uid(), i.role, i.access_expires_at, i.baseline_id)
    ON CONFLICT (project_id, user_id) DO UPDATE SET role = EXCLUDED.role, expires_at = EXCLUDED.expires_at, baseline_id = EXCLUDED.baseline_id
    WHERE public.project_members.role::text <> 'owner';
  UPDATE public.project_invitations SET accepted_by = auth.uid(), accepted_at = now() WHERE id = i.id;
  RETURN i.project_id;
END $$;
REVOKE EXECUTE ON FUNCTION public.accept_invitation(text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_invitation(text) FROM anon;

CREATE OR REPLACE FUNCTION public.get_project_people(_project_id uuid)
RETURNS TABLE(user_id uuid, role text, display_name text, email text, expires_at timestamptz, baseline_id uuid)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT m.user_id, m.role::text, pr.display_name, u.email::text, m.expires_at, m.baseline_id
  FROM public.project_members m LEFT JOIN public.profiles pr ON pr.id = m.user_id LEFT JOIN auth.users u ON u.id = m.user_id
  WHERE m.project_id = _project_id AND public.has_project_access(_project_id, auth.uid())
$$;

-- Review comments on requirements, screens and scope changes
CREATE TABLE public.scope_changes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  baseline_id uuid NOT NULL REFERENCES public.specification_versions(id) ON DELETE CASCADE,
  source_message_id uuid REFERENCES public.conversation_messages(id) ON DELETE SET NULL,
  kind text NOT NULL CHECK (kind IN ('new_functionality','changed_behavior','conflict','removed_assumption')),
  summary text NOT NULL,
  explanation text NOT NULL DEFAULT '',
  before_text text,
  before_requirement_id uuid,
  after_text text NOT NULL,
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open','accepted','rejected')),
  developer_estimate text,
  estimate_by uuid,
  reviewed_by uuid,
  reviewed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.scope_changes TO authenticated;
GRANT ALL ON public.scope_changes TO service_role;
ALTER TABLE public.scope_changes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "members read scope" ON public.scope_changes FOR SELECT TO authenticated USING (public.is_project_member(project_id, auth.uid()));
CREATE POLICY "editors insert scope" ON public.scope_changes FOR INSERT TO authenticated WITH CHECK (public.can_edit_project(project_id, auth.uid()) AND status = 'open');
CREATE POLICY "editors update scope" ON public.scope_changes FOR UPDATE TO authenticated USING (public.can_edit_project(project_id, auth.uid()));
CREATE OR REPLACE FUNCTION public.guard_scope_change() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE r text := coalesce(public.member_role_of(NEW.project_id, auth.uid()), '');
BEGIN
  IF NEW.status IS DISTINCT FROM OLD.status THEN
    IF r <> 'owner' THEN RAISE EXCEPTION 'Only the project owner can accept or reject scope changes'; END IF;
    NEW.reviewed_by := auth.uid(); NEW.reviewed_at := now();
  END IF;
  IF NEW.developer_estimate IS DISTINCT FROM OLD.developer_estimate THEN
    IF r NOT IN ('developer','owner') THEN RAISE EXCEPTION 'Only a developer can add an estimate'; END IF;
    NEW.estimate_by := auth.uid();
  END IF;
  IF NEW.after_text <> OLD.after_text OR NEW.before_text IS DISTINCT FROM OLD.before_text OR NEW.kind <> OLD.kind OR NEW.baseline_id <> OLD.baseline_id THEN
    RAISE EXCEPTION 'Evidence is immutable';
  END IF;
  NEW.updated_at := now();
  RETURN NEW;
END $$;
CREATE TRIGGER scope_changes_guard BEFORE UPDATE ON public.scope_changes FOR EACH ROW EXECUTE FUNCTION public.guard_scope_change();

CREATE TABLE public.review_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  requirement_id uuid REFERENCES public.requirements(id) ON DELETE CASCADE,
  screen_id uuid REFERENCES public.product_screens(id) ON DELETE CASCADE,
  scope_change_id uuid REFERENCES public.scope_changes(id) ON DELETE CASCADE,
  author_id uuid NOT NULL,
  kind text NOT NULL DEFAULT 'comment' CHECK (kind IN ('comment','clarification','constraint','ambiguity')),
  body text NOT NULL CHECK (length(body) BETWEEN 1 AND 4000),
  resolved_at timestamptz,
  resolved_by uuid,
  resolution_note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK (num_nonnulls(requirement_id, screen_id, scope_change_id) = 1)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.review_comments TO authenticated;
GRANT ALL ON public.review_comments TO service_role;
ALTER TABLE public.review_comments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "members read comments" ON public.review_comments FOR SELECT TO authenticated USING (public.is_project_member(project_id, auth.uid()));
CREATE POLICY "editors add comments" ON public.review_comments FOR INSERT TO authenticated WITH CHECK (public.can_edit_project(project_id, auth.uid()) AND author_id = auth.uid() AND resolved_at IS NULL);
CREATE POLICY "author or owner resolves" ON public.review_comments FOR UPDATE TO authenticated USING (public.can_edit_project(project_id, auth.uid()) AND (author_id = auth.uid() OR public.is_project_owner(project_id, auth.uid())));
CREATE POLICY "author deletes" ON public.review_comments FOR DELETE TO authenticated USING (author_id = auth.uid());
CREATE INDEX ON public.review_comments(project_id);
CREATE INDEX ON public.scope_changes(project_id);

-- Explicit, owner-only approval: snapshot is built from the database, not the client
CREATE OR REPLACE FUNCTION public.approve_baseline(_project_id uuid, _notes text)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v int; new_id uuid; snap jsonb;
BEGIN
  IF NOT public.is_project_owner(_project_id, auth.uid()) THEN RAISE EXCEPTION 'Only the project owner can approve a baseline'; END IF;
  SELECT coalesce(max(version),0)+1 INTO v FROM public.specification_versions WHERE project_id=_project_id;
  snap := jsonb_build_object(
    'requirements', coalesce((SELECT jsonb_agg(jsonb_build_object('id',id,'category',category,'title',title,'description',description,'evidence',evidence) ORDER BY created_at) FROM public.requirements WHERE project_id=_project_id AND status='confirmed'),'[]'::jsonb),
    'unresolved', coalesce((SELECT jsonb_agg(jsonb_build_object('id',id,'title',title,'status',status)) FROM public.requirements WHERE project_id=_project_id AND status IN ('unresolved','proposed')),'[]'::jsonb),
    'excluded', coalesce((SELECT jsonb_agg(jsonb_build_object('id',id,'title',title,'status',status)) FROM public.requirements WHERE project_id=_project_id AND status IN ('deferred','excluded')),'[]'::jsonb),
    'open_questions', coalesce((SELECT jsonb_agg(question ORDER BY created_at) FROM public.clarification_questions WHERE project_id=_project_id AND status='open'),'[]'::jsonb),
    'screens', coalesce((SELECT jsonb_agg(jsonb_build_object('id',id,'key',key,'name',name,'purpose',purpose,'user_role',user_role,'components',components) ORDER BY position) FROM public.product_screens WHERE project_id=_project_id),'[]'::jsonb),
    'connections', coalesce((SELECT jsonb_agg(jsonb_build_object('from',from_screen_id,'to',to_screen_id,'label',label)) FROM public.workflow_connections WHERE project_id=_project_id),'[]'::jsonb)
  );
  INSERT INTO public.specification_versions(project_id, version, content, created_by, kind, approved_by, approved_at, notes)
    VALUES (_project_id, v, snap, auth.uid(), 'baseline', auth.uid(), now(), nullif(trim(_notes),'')) RETURNING id INTO new_id;
  INSERT INTO public.decisions(project_id, action, note, decided_by) VALUES (_project_id, 'baseline_approved', 'Approved baseline v'||v, auth.uid());
  RETURN new_id;
END $$;
REVOKE EXECUTE ON FUNCTION public.approve_baseline(uuid, text) FROM anon;
