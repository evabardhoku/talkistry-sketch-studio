import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { FileText, Loader2, PanelRightClose, PanelRightOpen, X, Presentation } from "lucide-react";
import { toast } from "sonner";
import { AppHeader } from "@/components/AppHeader";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Chat } from "@/components/workspace/Chat";
import { ProjectBlueprint } from "@/components/workspace/ProjectBlueprint";
import { FlowCanvas } from "@/components/sketch/FlowCanvas";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { supabase } from "@/integrations/supabase/client";
import { CalendarClock } from "lucide-react";
import { ScreenInspector } from "@/components/sketch/ScreenInspector";
import { accessQuery, workspaceQuery } from "@/lib/queries";
import { ReviewContext } from "@/components/review/ReviewContext";
import { ShareDialog } from "@/components/review/ShareDialog";
import { can } from "@/lib/baseline";
import { History } from "lucide-react";
import { computeReadiness, sketchReadiness } from "@/lib/spec";
import { submitDiscoveryTurn } from "@/lib/discovery.functions";
import { PENDING_IDEA_KEY } from "@/lib/pending";
import { useIsMobile } from "@/hooks/use-mobile";
import { MeetingSketch } from "@/components/workspace/MeetingSketch";
import { MeetingPanel, MeetingTimer } from "@/components/workspace/MeetingPanel";
import { DevelopmentRoom } from "@/components/workspace/DevelopmentRoom";
import { parseAgenda } from "@/lib/meeting";
import { saveQuestion } from "@/lib/meeting-api";
import { ActionTooltip } from '@/components/ActionTooltip';
import { canPreviewRoles, PROJECT_VIEWS, visibleInView, type ProjectView } from '@/lib/project-views';

export const Route = createFileRoute("/_authenticated/projects/$projectId")({
  head: () => ({ meta: [
    { title: "Discovery workspace — Talkistry" }, { name: "description", content: "Guided discovery conversation with a live product sketch." },
    { property: "og:title", content: "Discovery workspace — Talkistry" }, { property: "og:description", content: "Conversation and live product sketch." },
    { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary_large_image" },
  ] }),
  loader: async ({ context, params }) => {
    const access = await context.queryClient.fetchQuery(accessQuery(params.projectId));
    // Members restricted to one approved version never see the live workspace.
    if (access.member?.baseline_id) throw redirect({ to: "/projects/$projectId/versions", params });
    return context.queryClient.ensureQueryData(workspaceQuery(params.projectId));
  },
  pendingComponent: () => <div className="grid min-h-screen place-items-center"><Loader2 className="size-5 animate-spin text-muted-foreground" /></div>,
  errorComponent: ({ error }) => <div className="grid min-h-screen place-items-center p-6 text-center"><div><p className="font-display text-2xl">Couldn't open this project</p><p className="mt-1 text-sm text-muted-foreground">{(error as Error).message}</p><Link to="/dashboard" className="mt-4 inline-block text-sm text-primary">Back to projects</Link></div></div>,
  component: Workspace,
});

function Workspace() {
  const { projectId } = Route.useParams();
  const qc = useQueryClient();
  const { data: savedData } = useSuspenseQuery(workspaceQuery(projectId));
  const [roleView, setRoleView] = useState<ProjectView>('owner');
  const previewable = canPreviewRoles(savedData.myRole);
  const view = previewable ? roleView : savedData.myRole === 'client' ? 'client' : savedData.myRole === 'developer' ? 'developer' : 'owner';
  const data = previewable ? { ...savedData, myRole: roleView } : savedData;
  const submit = useServerFn(submitDiscoveryTurn);
  const isMobile = useIsMobile();
  const [busy, setBusy] = useState(false);
  const sending = useRef(false);
  const [meeting, setMeeting] = useState(false);
  useEffect(() => { const exit = (e: KeyboardEvent) => { if (e.key === "Escape") setMeeting(false); }; window.addEventListener("keydown", exit); return () => window.removeEventListener("keydown", exit); }, []);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [panelOpen, setPanelOpen] = useState(true);
  const [meetingSheet, setMeetingSheet] = useState(false);
  const [focusSignal, setFocusSignal] = useState(0);
  const [highlight, setHighlight] = useState<string | null>(null);
  const [tab, setTab] = useState("chat");
  const [guideHidden, setGuideHidden] = useState(false);
  const [sideTab, setSideTab] = useState<"blueprint" | "development">("blueprint");
  const activeMeeting = data.meetings.find(m=>['running','paused'].includes(m.status));
  const baselines = data.versions.filter((v) => v.kind === "baseline");
  const editable = can.edit(data.myRole);

  const refresh = useCallback(() => qc.invalidateQueries({ queryKey: ["workspace", projectId] }), [qc, projectId]);
  const openQuestion = data.questions.find(q=>q.is_current&&q.status==='open') ?? data.questions.filter((q) => q.status === "open" && (!activeMeeting||q.priority==='critical')).at(-1);
  const readiness = computeReadiness(data.requirements, data.questions);
  const lastAssistant = [...data.messages].reverse().find((m) => m.role === "assistant");
  const recentIds = useMemo(() => new Set(data.screens.filter((s) => lastAssistant && s.changed_message_id === lastAssistant.id).map((s) => s.id)), [data.screens, lastAssistant]);
  const selectedScreen = data.screens.find((s) => s.id === selected) ?? null;

  const send = useCallback(async (content: string, skip = false, questionId?: string) => {
    if (sending.current) return false;
    sending.current = true;
    setBusy(true); setError(null);
    try {
      const r = await submit({ data: { projectId, content, skip, requestId: crypto.randomUUID(), questionId, focusScreenId: selected ?? undefined } });
      await refresh();
      if (r.scopeChanges) toast.warning(`${r.scopeChanges} potential scope change${r.scopeChanges > 1 ? "s" : ""} vs the approved baseline`, { action: { label: "Review", onClick: () => { setSideTab("blueprint"); setPanelOpen(true); setSelected(null); setTab("reqs"); } } });
      if (r.changedScreenKeys.length) toast.success(`Sketch updated · ${r.changedScreenKeys.length} screen${r.changedScreenKeys.length > 1 ? "s" : ""}`);
      return true;
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong. Please try again.");
      await refresh();
      return false;
    } finally { setBusy(false); sending.current = false; }
  }, [submit, projectId, refresh, selected]);

  // A project created with an idea sends it as the first message once.
  const started = useRef(false);
  useEffect(() => {
    const key = PENDING_IDEA_KEY(projectId);
    const idea = sessionStorage.getItem(key);
    if (idea && !started.current && data.messages.length === 0) { started.current = true; void send(idea).then((ok) => { if (ok) sessionStorage.removeItem(key); else sessionStorage.setItem(`specloop:draft:${projectId}`, idea); }); }
  }, [projectId, data.messages.length, send]);

  const showSource = (id: string) => { setHighlight(id); setTab("chat"); setTimeout(() => setHighlight(null), 2500); };
  const select = (id: string) => { setSelected(id); if (isMobile) setTab("inspect"); };

  const openSide=(value: typeof sideTab)=>{setSideTab(value);setPanelOpen(true);setSelected(null);setMeetingSheet(false);if(isMobile)setTab('reqs');};
  const changeView = (role: ProjectView) => { setRoleView(role); setSelected(null); if (!visibleInView(role, sideTab)) setSideTab('blueprint'); };
  /** Makes an existing backlog question the current chat topic; no new record, no AI call. */
  const answerInChat = async (id: string) => { try { const c = await supabase.from('clarification_questions').update({ is_current: false }).eq('project_id', projectId).eq('is_current', true).neq('id', id); if (c.error) throw new Error(c.error.message); await saveQuestion(id, { is_current: true, status: 'open' }); await refresh(); setTab('chat'); setFocusSignal(n => n + 1); } catch (e) { toast.error(e instanceof Error ? e.message : 'Could not open question'); } };
  const deferCurrent=async()=>{if(!openQuestion)return;try{await saveQuestion(openQuestion.id,{status:'deferred',is_current:false});await refresh();}catch(e){toast.error(e instanceof Error?e.message:'Could not defer question');}};
  const chat = <Chat key={projectId} projectId={projectId} meeting={meeting} messages={data.messages} openQuestion={openQuestion} busy={busy} error={error} readOnly={!editable} onSubmit={(t) => send(t,false,openQuestion?.id)} onSkip={() => void deferCurrent()} onBacklog={()=>openSide('blueprint')} focusSignal={focusSignal} onDifferent={async()=>{await deferCurrent();const next=data.questions.find(q=>q.id!==openQuestion?.id&&q.status==='open');if(next){await saveQuestion(next.id,{is_current:true});await refresh();}else openSide('blueprint');}} highlightId={highlight} />;
  const canvas = <FlowCanvas screens={data.screens} connections={data.connections} selectedId={selected} onSelect={select} recentIds={recentIds} editable={editable} onLayoutSaved={refresh} />;
  const internal = ['owner','editor','developer'].includes(data.myRole??'');
  const reqPanel = (
    <div className="flex h-full min-h-0 min-w-0 flex-col">
      <div role="tablist" aria-label="Project panel" className="grid shrink-0 grid-cols-2 gap-1 border-b p-1.5">
        <Button role="tab" aria-selected={sideTab==='blueprint'} size="sm" variant={sideTab==='blueprint'?'secondary':'ghost'} onClick={()=>setSideTab('blueprint')}>Blueprint</Button>
        {internal ? <Button role="tab" aria-selected={sideTab==='development'} size="sm" variant={sideTab==='development'?'secondary':'ghost'} onClick={()=>setSideTab('development')}>Developer Questions</Button> : <span />}
      </div>
      <div className="min-h-0 flex-1">
        {sideTab === "development" && internal ? <DevelopmentRoom data={data} onChanged={refresh}/>
          : <ProjectBlueprint data={data} onChanged={refresh} onShowSource={showSource} onAnswerInChat={id=>void answerInChat(id)} onSelectScreen={select} />}
      </div>
    </div>
  );
  const inspector = selectedScreen && <ScreenInspector screen={selectedScreen} screens={data.screens} connections={data.connections} busy={busy}
    onClose={() => setSelected(null)} onSelect={setSelected} onRequestChange={async (t) => { if (isMobile) setTab("chat"); return send(t); }} />;

  return (
    <ReviewContext.Provider value={{ projectId, meId: data.meId, myRole: data.myRole, people: data.people, comments: data.comments, onChanged: refresh }}>
    <div className="flex h-dvh flex-col">
      <AppHeader>
        <span className="text-muted-foreground">/</span>
        <h1 className="truncate text-sm font-medium">{data.project.name}</h1>
        {meeting && data.project.is_demo && <span className="shrink-0 text-xs text-primary">Demo</span>}
        <ActionTooltip label={meeting ? 'Exit presentation mode' : 'Enter presentation mode'}><Button size="icon" variant="ghost" className="min-h-11 min-w-11 shrink-0" aria-label={meeting ? "Exit presentation mode" : "Enter presentation mode"} aria-pressed={meeting} onClick={() => { setMeeting((v) => !v); setSelected(null); }}><Presentation className="size-4" /></Button></ActionTooltip>
        <div className={`${meeting ? "hidden" : "ml-auto hidden items-center gap-2 2xl:flex"}`}>
          <span className="text-xs text-muted-foreground">Development: {readiness.label} · {readiness.confirmed}/{readiness.total} confirmed</span>
          <ShareDialog projectId={projectId} people={data.people} myRole={data.myRole} baselines={baselines} onChanged={refresh} />
          <Button asChild size="sm" variant="outline"><Link to="/projects/$projectId/versions" params={{ projectId }}><History className="size-4" />Versions{baselines[0] ? ` · v${baselines[0].version}` : ""}</Link></Button>
          <Button asChild size="sm" variant="outline"><Link to="/projects/$projectId/specification" params={{ projectId }}><FileText className="size-4" />Product Blueprint</Link></Button>
          <ActionTooltip label={panelOpen ? 'Hide context panel' : 'Show context panel'}><Button size="icon" variant="ghost" onClick={() => setPanelOpen((v) => !v)} aria-label="Toggle blueprint panel">{panelOpen ? <PanelRightClose className="size-4" /> : <PanelRightOpen className="size-4" />}</Button></ActionTooltip>
        </div>
        <ActionTooltip label="Generate Spec · Product Blueprint"><Button asChild size="icon" variant="ghost" className={`${meeting ? "hidden" : "ml-auto shrink-0 2xl:hidden"}`}><Link to="/projects/$projectId/specification" params={{ projectId }} aria-label="Open product blueprint"><FileText className="size-4" /></Link></Button></ActionTooltip>
      </AppHeader>
      <div className="flex shrink-0 flex-wrap items-center gap-2 border-b bg-card px-3 py-2">
        {previewable ? <div className="flex flex-wrap items-center gap-1" aria-label="Project role preview"><span className="mr-1 text-xs text-muted-foreground">View as</span>{PROJECT_VIEWS.map(role => <Button key={role} size="sm" variant={view === role ? 'default' : 'ghost'} aria-pressed={view === role} onClick={() => changeView(role)}>{role === 'owner' ? 'Owner' : role === 'client' ? 'Client' : 'Developer'}</Button>)}</div> : null}
        <Button size="sm" variant="outline" className="ml-auto" onClick={()=>setMeetingSheet(true)}><CalendarClock className="size-4" />Meeting{activeMeeting ? ' · live' : ''}</Button>
        {activeMeeting&&<div className="flex flex-wrap items-center gap-2 text-xs"><span>{parseAgenda(activeMeeting.agenda)[activeMeeting.active_stage]?.name}</span><MeetingTimer meeting={activeMeeting}/></div>}
      </div>
      {previewable && roleView !== 'owner' && <p role="status" className="shrink-0 border-b bg-primary-soft px-4 py-2 text-xs text-accent-foreground">{roleView === 'client' ? 'Client' : 'Developer'} preview of your project · you remain its owner. Switch to Owner to invite people or approve a version.</p>}
      {!meeting && <div className="flex shrink-0 items-center gap-2 overflow-x-auto border-b bg-card px-3 py-2 2xl:hidden">
        <ShareDialog projectId={projectId} people={data.people} myRole={data.myRole} baselines={baselines} onChanged={refresh} />
        <Button asChild size="sm" variant="outline"><Link to="/projects/$projectId/versions" params={{ projectId }}><History className="size-4" />Versions</Link></Button>
        {!isMobile && <ActionTooltip label={panelOpen ? 'Hide context panel' : 'Show context panel'}><Button size="icon" variant="ghost" onClick={() => setPanelOpen((v) => !v)} aria-label="Toggle blueprint panel">{panelOpen ? <PanelRightClose className="size-4" /> : <PanelRightOpen className="size-4" />}</Button></ActionTooltip>}
      </div>}

      {data.project.is_demo && !guideHidden && !meeting && (
        <div className="flex items-start gap-3 border-b bg-primary-soft px-4 py-2 text-xs text-accent-foreground">
          <p className="flex-1"><b>Sample project:</b> Prepared fictional conversations and sketches, not real client data.</p>
          <ActionTooltip label="Dismiss demo notice"><Button variant="ghost" size="icon" className="min-h-11 min-w-11 shrink-0" onClick={() => setGuideHidden(true)} aria-label="Hide guide"><X className="size-3.5" /></Button></ActionTooltip>
        </div>
      )}

      {meeting && !isMobile ? <div className="relative flex min-h-0 flex-1"><section className="min-h-0 min-w-0 w-[38%] border-r">{chat}</section><div className="min-w-0 flex-1"><MeetingSketch data={data} selected={selected} onSelect={setSelected} recentIds={recentIds} /></div>{panelOpen&&<aside className="absolute inset-y-0 right-0 z-20 w-[320px] max-w-full border-l bg-card shadow-lift xl:static xl:shrink-0">{reqPanel}</aside>}</div> : isMobile ? (
        <Tabs value={tab} onValueChange={setTab} className="flex min-h-0 flex-1 flex-col gap-0">
          <TabsList className="mx-3 mt-2 grid grid-cols-4">
            <TabsTrigger value="chat">Chat</TabsTrigger><TabsTrigger value="sketch">Sketch</TabsTrigger>
            <TabsTrigger value="reqs">Blueprint</TabsTrigger><TabsTrigger value="inspect" disabled={!selectedScreen}>Screen</TabsTrigger>
          </TabsList>
          <TabsContent value="chat" className="min-h-0 flex-1">{chat}</TabsContent>
          <TabsContent value="sketch" className="min-h-0 flex-1">{meeting ? <MeetingSketch data={data} selected={selected} onSelect={setSelected} recentIds={recentIds} /> : canvas}</TabsContent>
          <TabsContent value="reqs" className="min-h-0 flex-1">{reqPanel}</TabsContent>
          <TabsContent value="inspect" className="min-h-0 flex-1">{inspector}</TabsContent>
        </Tabs>
      ) : (
        <div className="relative flex min-h-0 flex-1">
          <section className="flex min-w-0 w-[320px] shrink-0 flex-col border-r bg-background xl:w-[340px] 2xl:w-[440px]">{chat}</section>
          <section className="relative min-w-0 flex-1">
            <div className="absolute left-4 top-3 z-10 max-w-[calc(100%-2rem)] rounded-md border bg-card/90 px-3 py-1 text-xs text-muted-foreground shadow-soft backdrop-blur">Sketch: {sketchReadiness(data.screens,data.connections)} · {data.screens.length} proposed screens</div>
            {canvas}
          </section>
          {inspector ? <div className="absolute inset-y-0 right-0 z-20 w-[320px] max-w-full border-l bg-card shadow-lift xl:static xl:w-[340px] xl:shrink-0">{inspector}</div>
            : panelOpen && <aside className="absolute inset-y-0 right-0 z-20 w-[320px] max-w-full border-l bg-card shadow-lift xl:static xl:w-[340px] xl:shrink-0">{reqPanel}</aside>}
        </div>
      )}
      <Sheet open={meetingSheet} onOpenChange={setMeetingSheet}><SheetContent className="w-[380px] max-w-full overflow-y-auto p-0 sm:max-w-[380px]"><SheetTitle className="sr-only">Meeting agenda and timer</SheetTitle><MeetingPanel data={data} onChanged={refresh} onReview={()=>openSide('blueprint')}/></SheetContent></Sheet>
    </div>
    </ReviewContext.Provider>
  );
}
