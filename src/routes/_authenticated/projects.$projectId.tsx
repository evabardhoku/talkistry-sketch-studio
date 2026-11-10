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
import { RequirementsPanel } from "@/components/workspace/RequirementsPanel";
import { SketchCanvas } from "@/components/sketch/SketchCanvas";
import { ScreenInspector } from "@/components/sketch/ScreenInspector";
import { accessQuery, workspaceQuery } from "@/lib/queries";
import { ReviewContext } from "@/components/review/ReviewContext";
import { ShareDialog } from "@/components/review/ShareDialog";
import { ScopeChangesPanel } from "@/components/review/ScopeChangesPanel";
import { can } from "@/lib/baseline";
import { History } from "lucide-react";
import { computeReadiness } from "@/lib/spec";
import { submitDiscoveryTurn } from "@/lib/discovery.functions";
import { PENDING_IDEA_KEY } from "@/lib/pending";
import { useIsMobile } from "@/hooks/use-mobile";
import { MeetingSketch } from "@/components/workspace/MeetingSketch";

export const Route = createFileRoute("/_authenticated/projects/$projectId")({
  head: () => ({ meta: [
    { title: "Discovery workspace — SpecLoop" }, { name: "description", content: "Guided discovery conversation with a live product sketch." },
    { property: "og:title", content: "Discovery workspace — SpecLoop" }, { property: "og:description", content: "Conversation and live product sketch." },
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
  const { data } = useSuspenseQuery(workspaceQuery(projectId));
  const submit = useServerFn(submitDiscoveryTurn);
  const isMobile = useIsMobile();
  const [busy, setBusy] = useState(false);
  const sending = useRef(false);
  const [meeting, setMeeting] = useState(false);
  useEffect(() => { const exit = (e: KeyboardEvent) => { if (e.key === "Escape") setMeeting(false); }; window.addEventListener("keydown", exit); return () => window.removeEventListener("keydown", exit); }, []);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [panelOpen, setPanelOpen] = useState(true);
  const [highlight, setHighlight] = useState<string | null>(null);
  const [tab, setTab] = useState("chat");
  const [guideHidden, setGuideHidden] = useState(false);
  const [sideTab, setSideTab] = useState<"reqs" | "scope">("reqs");
  const baselines = data.versions.filter((v) => v.kind === "baseline");
  const openScope = data.scopeChanges.filter((c) => c.status === "open").length;
  const editable = can.edit(data.myRole);

  const refresh = useCallback(() => qc.invalidateQueries({ queryKey: ["workspace", projectId] }), [qc, projectId]);
  const openQuestion = data.questions.filter((q) => q.status === "open").at(-1);
  const readiness = computeReadiness(data.requirements, data.questions);
  const lastAssistant = [...data.messages].reverse().find((m) => m.role === "assistant");
  const recentIds = useMemo(() => new Set(data.screens.filter((s) => lastAssistant && s.changed_message_id === lastAssistant.id).map((s) => s.id)), [data.screens, lastAssistant]);
  const selectedScreen = data.screens.find((s) => s.id === selected) ?? null;

  const send = useCallback(async (content: string, skip = false) => {
    if (sending.current) return false;
    sending.current = true;
    setBusy(true); setError(null);
    try {
      const r = await submit({ data: { projectId, content, skip, requestId: crypto.randomUUID() } });
      await refresh();
      if (r.scopeChanges) toast.warning(`${r.scopeChanges} potential scope change${r.scopeChanges > 1 ? "s" : ""} vs the approved baseline`, { action: { label: "Review", onClick: () => { setSideTab("scope"); setPanelOpen(true); setSelected(null); setTab("reqs"); } } });
      if (r.changedScreenKeys.length) toast.success(`Sketch updated · ${r.changedScreenKeys.length} screen${r.changedScreenKeys.length > 1 ? "s" : ""}`);
      return true;
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong. Please try again.");
      await refresh();
      return false;
    } finally { setBusy(false); sending.current = false; }
  }, [submit, projectId, refresh]);

  // A project created with an idea sends it as the first message once.
  const started = useRef(false);
  useEffect(() => {
    const key = PENDING_IDEA_KEY(projectId);
    const idea = sessionStorage.getItem(key);
    if (idea && !started.current && data.messages.length === 0) { started.current = true; void send(idea).then((ok) => { if (ok) sessionStorage.removeItem(key); else sessionStorage.setItem(`specloop:draft:${projectId}`, idea); }); }
  }, [projectId, data.messages.length, send]);

  const showSource = (id: string) => { setHighlight(id); setTab("chat"); setTimeout(() => setHighlight(null), 2500); };
  const select = (id: string) => { setSelected(id); if (isMobile) setTab("inspect"); };

  const chat = <Chat projectId={projectId} meeting={meeting} messages={data.messages} openQuestion={openQuestion} busy={busy} error={error} readOnly={!editable} onSubmit={(t) => send(t)} onSkip={() => void send("", true)} highlightId={highlight} />;
  const canvas = <SketchCanvas screens={data.screens} connections={data.connections} selectedId={selected} onSelect={select} recentIds={recentIds} />;
  const reqPanel = (
    <div className="flex h-full flex-col">
      <div className="flex border-b text-sm">
        {(["reqs", "scope"] as const).map((t) => (
          <Button variant="ghost" key={t} onClick={() => setSideTab(t)} aria-pressed={sideTab === t} className={`h-11 flex-1 rounded-none px-3 py-2 ${sideTab === t ? "border-b-2 border-primary font-medium" : "text-muted-foreground"}`}>
            {t === "reqs" ? "Requirements" : `Scope changes${openScope ? ` · ${openScope}` : ""}`}
          </Button>
        ))}
      </div>
      <div className="min-h-0 flex-1">
        {sideTab === "reqs" ? <RequirementsPanel project={data.project} requirements={data.requirements} onChanged={refresh} onShowSource={showSource} />
          : <ScopeChangesPanel changes={data.scopeChanges} baselines={baselines} projectId={projectId} />}
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
        <Button size="icon" variant="ghost" className="min-h-11 min-w-11 shrink-0" aria-label={meeting ? "Exit presentation mode" : "Enter presentation mode"} title={meeting ? "Exit presentation mode" : "Enter presentation mode"} aria-pressed={meeting} onClick={() => { setMeeting((v) => !v); setSelected(null); }}><Presentation className="size-4" /></Button>
        <div className={`${meeting ? "hidden" : "ml-auto hidden items-center gap-2 2xl:flex"}`}>
          <span className="text-xs text-muted-foreground">Readiness <b className="text-foreground">{readiness.score}%</b> · {readiness.confirmed}/{readiness.total} confirmed · {readiness.openQuestions} open question{readiness.openQuestions === 1 ? "" : "s"}</span>
          <ShareDialog projectId={projectId} people={data.people} myRole={data.myRole} baselines={baselines} onChanged={refresh} />
          <Button asChild size="sm" variant="outline"><Link to="/projects/$projectId/versions" params={{ projectId }}><History className="size-4" />Versions{baselines[0] ? ` · v${baselines[0].version}` : ""}</Link></Button>
          <Button asChild size="sm" variant="outline"><Link to="/projects/$projectId/specification" params={{ projectId }}><FileText className="size-4" />Specification</Link></Button>
          <Button size="icon" variant="ghost" onClick={() => setPanelOpen((v) => !v)} aria-label="Toggle requirements panel">{panelOpen ? <PanelRightClose className="size-4" /> : <PanelRightOpen className="size-4" />}</Button>
        </div>
        <Button asChild size="sm" variant="ghost" className={`${meeting ? "hidden" : "ml-auto 2xl:hidden"}`}><Link to="/projects/$projectId/specification" params={{ projectId }} aria-label="Open specification"><FileText className="size-4" /></Link></Button>
      </AppHeader>

      {data.project.is_demo && !guideHidden && !meeting && (
        <div className="flex items-start gap-3 border-b bg-primary-soft px-4 py-2 text-xs text-accent-foreground">
          <p className="flex-1"><b>Fictional demo:</b> Private tutoring booking platform · sample conversations and stakeholder notes are not real client data.</p>
          <Button variant="ghost" size="icon" className="min-h-11 min-w-11" onClick={() => setGuideHidden(true)} aria-label="Hide guide"><X className="size-3.5" /></Button>
        </div>
      )}

      {meeting && !isMobile ? <div className="grid min-h-0 flex-1 grid-cols-[minmax(320px,0.85fr)_minmax(0,1.15fr)]"><section className="min-h-0 border-r">{chat}</section><MeetingSketch data={data} selected={selected} onSelect={setSelected} recentIds={recentIds} /></div> : isMobile ? (
        <Tabs value={tab} onValueChange={setTab} className="flex min-h-0 flex-1 flex-col gap-0">
          <TabsList className="mx-3 mt-2 grid grid-cols-4">
            <TabsTrigger value="chat">Chat</TabsTrigger><TabsTrigger value="sketch">Sketch</TabsTrigger>
            <TabsTrigger value="reqs">Needs</TabsTrigger><TabsTrigger value="inspect" disabled={!selectedScreen}>Screen</TabsTrigger>
          </TabsList>
          <TabsContent value="chat" className="min-h-0 flex-1">{chat}</TabsContent>
          <TabsContent value="sketch" className="min-h-0 flex-1">{meeting ? <MeetingSketch data={data} selected={selected} onSelect={setSelected} recentIds={recentIds} /> : canvas}</TabsContent>
          <TabsContent value="reqs" className="min-h-0 flex-1">{reqPanel}</TabsContent>
          <TabsContent value="inspect" className="min-h-0 flex-1">{inspector}</TabsContent>
        </Tabs>
      ) : (
        <div className="flex min-h-0 flex-1">
          <section className="flex w-[340px] shrink-0 flex-col border-r bg-background 2xl:w-[440px]">{chat}</section>
          <section className="relative min-w-0 flex-1">
            <div className="absolute left-4 top-3 z-10 rounded-full border bg-card/90 px-3 py-1 text-xs text-muted-foreground shadow-soft backdrop-blur">Live product sketch · {data.screens.length} screens · click a screen to inspect</div>
            {canvas}
          </section>
          {inspector ? <div className="w-[300px] shrink-0 border-l xl:w-[340px]">{inspector}</div>
            : panelOpen && <aside className="w-[280px] shrink-0 border-l bg-card xl:w-[340px]">{reqPanel}</aside>}
        </div>
      )}
    </div>
    </ReviewContext.Provider>
  );
}
