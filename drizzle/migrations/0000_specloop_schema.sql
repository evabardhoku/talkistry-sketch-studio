
create type public.member_role as enum ('owner','editor','viewer');
create type public.req_status as enum ('confirmed','proposed','unresolved','deferred','excluded');
create type public.question_status as enum ('open','answered','skipped');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
grant select, insert, update on public.profiles to authenticated;
grant all on public.profiles to service_role;
alter table public.profiles enable row level security;
create policy "own profile read" on public.profiles for select to authenticated using (id = auth.uid());
create policy "own profile update" on public.profiles for update to authenticated using (id = auth.uid());
create policy "own profile insert" on public.profiles for insert to authenticated with check (id = auth.uid());

create table public.projects (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null,
  name text not null,
  summary text,
  is_demo boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table public.project_members (
  project_id uuid not null references public.projects(id) on delete cascade,
  user_id uuid not null,
  role public.member_role not null default 'editor',
  created_at timestamptz not null default now(),
  primary key (project_id, user_id)
);

create or replace function public.is_project_member(_project_id uuid, _user_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists(select 1 from public.project_members where project_id=_project_id and user_id=_user_id)
$$;
create or replace function public.can_edit_project(_project_id uuid, _user_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists(select 1 from public.project_members where project_id=_project_id and user_id=_user_id and role in ('owner','editor'))
$$;

grant select, insert, update, delete on public.projects to authenticated;
grant all on public.projects to service_role;
alter table public.projects enable row level security;
create policy "members read projects" on public.projects for select to authenticated using (owner_id = auth.uid() or public.is_project_member(id, auth.uid()));
create policy "create own projects" on public.projects for insert to authenticated with check (owner_id = auth.uid());
create policy "editors update projects" on public.projects for update to authenticated using (public.can_edit_project(id, auth.uid()));
create policy "owner deletes projects" on public.projects for delete to authenticated using (owner_id = auth.uid());

grant select on public.project_members to authenticated;
grant all on public.project_members to service_role;
alter table public.project_members enable row level security;
create policy "members read membership" on public.project_members for select to authenticated using (public.is_project_member(project_id, auth.uid()));

create or replace function public.add_owner_membership() returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.project_members(project_id,user_id,role) values (new.id,new.owner_id,'owner') on conflict do nothing;
  return new;
end $$;
create trigger projects_owner_member after insert on public.projects for each row execute function public.add_owner_membership();

create table public.discovery_sessions (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  title text not null default 'Discovery session',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table public.conversation_messages (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  session_id uuid not null references public.discovery_sessions(id) on delete cascade,
  role text not null check (role in ('user','assistant')),
  content text not null,
  meta jsonb not null default '{}'::jsonb,
  author_id uuid,
  created_at timestamptz not null default now()
);
create table public.decisions (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  requirement_id uuid,
  action text not null,
  note text,
  decided_by uuid,
  created_at timestamptz not null default now()
);
create table public.requirements (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  category text not null,
  title text not null,
  description text not null default '',
  status public.req_status not null default 'proposed',
  source_message_id uuid references public.conversation_messages(id) on delete set null,
  evidence text,
  last_decision_id uuid references public.decisions(id) on delete set null,
  origin text not null default 'ai' check (origin in ('ai','human')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.decisions add constraint decisions_req_fk foreign key (requirement_id) references public.requirements(id) on delete cascade;
create table public.clarification_questions (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  session_id uuid not null references public.discovery_sessions(id) on delete cascade,
  question text not null,
  topic text not null default 'general',
  rationale text,
  status public.question_status not null default 'open',
  asked_message_id uuid references public.conversation_messages(id) on delete set null,
  answer_message_id uuid references public.conversation_messages(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table public.product_screens (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  key text not null,
  name text not null,
  purpose text not null default '',
  user_role text,
  components jsonb not null default '[]'::jsonb,
  unresolved jsonb not null default '[]'::jsonb,
  position int not null default 0,
  change_note text,
  changed_message_id uuid references public.conversation_messages(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (project_id, key)
);
create table public.workflow_connections (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  from_screen_id uuid not null references public.product_screens(id) on delete cascade,
  to_screen_id uuid not null references public.product_screens(id) on delete cascade,
  label text not null default '',
  created_at timestamptz not null default now(),
  unique (from_screen_id, to_screen_id)
);
create table public.specification_versions (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  version int not null,
  content jsonb not null,
  created_by uuid,
  created_at timestamptz not null default now(),
  unique (project_id, version)
);

do $$
declare t text;
begin
  foreach t in array array['discovery_sessions','conversation_messages','decisions','requirements','clarification_questions','product_screens','workflow_connections','specification_versions'] loop
    execute format('grant select, insert, update, delete on public.%I to authenticated', t);
    execute format('grant all on public.%I to service_role', t);
    execute format('alter table public.%I enable row level security', t);
    execute format('create policy "members read" on public.%I for select to authenticated using (public.is_project_member(project_id, auth.uid()))', t);
    execute format('create policy "editors insert" on public.%I for insert to authenticated with check (public.can_edit_project(project_id, auth.uid()))', t);
    execute format('create policy "editors update" on public.%I for update to authenticated using (public.can_edit_project(project_id, auth.uid()))', t);
    execute format('create policy "editors delete" on public.%I for delete to authenticated using (public.can_edit_project(project_id, auth.uid()))', t);
  end loop;
end $$;

create index on public.conversation_messages(session_id, created_at);
create index on public.requirements(project_id);
create index on public.clarification_questions(project_id, status);
create index on public.product_screens(project_id);

-- Demo seed (fictional)
create or replace function public.seed_demo_project(_user uuid) returns uuid language plpgsql security definer set search_path = public as $$
declare p uuid; s uuid; m1 uuid; m2 uuid; m3 uuid; m4 uuid; m5 uuid; sc1 uuid; sc2 uuid; sc3 uuid; sc4 uuid; r1 uuid; d1 uuid;
begin
  insert into projects(owner_id,name,summary,is_demo) values (_user,'TutorNest (sample)','A marketplace where parents find, compare and book vetted private tutors for their children.',true) returning id into p;
  insert into discovery_sessions(project_id,title) values (p,'Kick-off with Maple Learning (fictional client)') returning id into s;
  insert into conversation_messages(project_id,session_id,role,content,created_at) values
   (p,s,'assistant','Hi! Tell me about the product you have in mind — who it''s for and what problem it solves. Plain language is perfect.', now()-interval '30 minutes') returning id into m1;
  insert into conversation_messages(project_id,session_id,role,content,author_id,created_at) values
   (p,s,'user','I want an app where parents can find and book private tutors for their kids, mostly maths and languages.',_user, now()-interval '29 minutes') returning id into m2;
  insert into conversation_messages(project_id,session_id,role,content,created_at) values
   (p,s,'assistant','Got it — a tutor booking marketplace for parents. I sketched a search screen and a tutor profile. Next: do tutors sign up themselves, or does your team add and vet them?', now()-interval '28 minutes') returning id into m3;
  insert into conversation_messages(project_id,session_id,role,content,author_id,created_at) values
   (p,s,'user','Tutors apply themselves, but our team must approve them before they appear in search.',_user, now()-interval '20 minutes') returning id into m4;
  insert into conversation_messages(project_id,session_id,role,content,created_at) values
   (p,s,'assistant','Thanks — I added a tutor application flow and an admin review queue. Next question: how should parents pay for a lesson?', now()-interval '19 minutes') returning id into m5;

  insert into clarification_questions(project_id,session_id,question,topic,rationale,status,asked_message_id,answer_message_id) values
   (p,s,'Do tutors sign up themselves, or does your team add and vet them?','roles','Determines onboarding and admin workflows.','answered',m3,m4);
  insert into clarification_questions(project_id,session_id,question,topic,rationale,status,asked_message_id) values
   (p,s,'How should parents pay for a lesson — in the app when booking, or directly with the tutor?','payments','Payment timing changes the booking flow and cancellation rules.','open',m5);

  insert into requirements(project_id,category,title,description,status,source_message_id,evidence) values
   (p,'goal','Parents can find and book private tutors','Core value: parents discover tutors and book lessons for their children.','confirmed',m2,'I want an app where parents can find and book private tutors for their kids') returning id into r1;
  insert into decisions(project_id,requirement_id,action,note,decided_by) values (p,r1,'confirmed','Confirmed in kick-off',_user) returning id into d1;
  update requirements set last_decision_id=d1 where id=r1;
  insert into requirements(project_id,category,title,description,status,source_message_id,evidence) values
   (p,'user_role','Parent','Searches tutors and books lessons for their child.','proposed',m2,'parents can find and book'),
   (p,'user_role','Tutor','Applies to teach, manages profile and availability.','proposed',m4,'Tutors apply themselves'),
   (p,'user_role','Admin (platform team)','Reviews and approves tutor applications.','proposed',m4,'our team must approve them'),
   (p,'feature','Search tutors by subject','Subjects initially include maths and languages.','proposed',m2,'mostly maths and languages'),
   (p,'business_rule','Tutors visible only after approval','A tutor profile appears in search only once an admin approves it.','proposed',m4,'our team must approve them before they appear in search'),
   (p,'payment','Payment method and timing','Not yet decided how or when parents pay.','unresolved',m5,null),
   (p,'feature','Tutor ratings and reviews','Postponed to a later phase.','deferred',null,null);

  insert into product_screens(project_id,key,name,purpose,user_role,position,components,unresolved,change_note,changed_message_id) values
   (p,'search','Find a tutor','Parents search and filter tutors by subject.','Parent',0,
    '[{"type":"header","label":"Find a tutor"},{"type":"search","label":"Subject, e.g. Maths"},{"type":"list","label":"Matching tutors","items":["Tutor card · subject · price","Tutor card · subject · price"]},{"type":"button","label":"View profile"}]',
    '[]',null,m3) returning id into sc1;
  insert into product_screens(project_id,key,name,purpose,user_role,position,components,unresolved,change_note,changed_message_id) values
   (p,'tutor_profile','Tutor profile','Shows a tutor''s subjects, bio and availability.','Parent',1,
    '[{"type":"header","label":"Tutor profile"},{"type":"card","label":"Bio & subjects"},{"type":"calendar","label":"Availability"},{"type":"button","label":"Book a lesson"}]',
    '["How the parent pays is still open"]',null,m3) returning id into sc2;
  insert into product_screens(project_id,key,name,purpose,user_role,position,components,unresolved,change_note,changed_message_id) values
   (p,'tutor_apply','Tutor application','Tutors apply with their details and subjects.','Tutor',2,
    '[{"type":"header","label":"Become a tutor"},{"type":"form","label":"Application","items":["Full name","Subjects","Experience"]},{"type":"button","label":"Submit application"}]',
    '[]','Added after: tutors apply themselves',m5) returning id into sc3;
  insert into product_screens(project_id,key,name,purpose,user_role,position,components,unresolved,change_note,changed_message_id) values
   (p,'admin_review','Application review','Admins approve or reject tutor applications.','Admin',3,
    '[{"type":"header","label":"Pending applications"},{"type":"table","label":"Applications","items":["Name","Subjects","Submitted","Status"]},{"type":"modal","label":"Approve / reject application"}]',
    '[]','Added after: team approves tutors',m5) returning id into sc4;
  insert into workflow_connections(project_id,from_screen_id,to_screen_id,label) values
   (p,sc1,sc2,'Select tutor'),(p,sc3,sc4,'Application submitted');
  return p;
end $$;
revoke execute on function public.seed_demo_project(uuid) from public, anon, authenticated;

create or replace function public.handle_new_user() returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles(id, display_name) values (new.id, coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', split_part(new.email,'@',1)));
  perform public.seed_demo_project(new.id);
  return new;
end $$;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();
