import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { ArrowRight, CheckCircle2, MessagesSquare, PenTool } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/Logo";
import { ScreenWireframe } from "@/components/sketch/ScreenWireframe";
import { StatusBadge } from "@/components/StatusBadge";
import type { SketchComponent, ReqStatus } from "@/lib/types";

export const Route = createFileRoute("/")({
  head: () => ({ meta: [
    { title: "Talkistry | Where Conversations Take Shape" },
    { name: "description", content: "Talkistry helps teams transform product discovery conversations into visual sketches, structured requirements, and shared decisions." },
    { property: "og:title", content: "Talkistry | Where Conversations Take Shape" },
    { property: "og:description", content: "Talkistry helps teams transform product discovery conversations into visual sketches, structured requirements, and shared decisions." },
    { name: "application-name", content: "Talkistry" },
    { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary_large_image" },
  ] }),
  component: Landing,
});

const STEPS: { q: string; a: string; screens: { name: string; c: SketchComponent[]; isNew?: boolean }[]; reqs: [string, ReqStatus][] }[] = [
  { q: "What would you like to build?", a: "An app where parents can find and book private tutors.",
    screens: [{ name: "Find a tutor", isNew: true, c: [{ type: "header", label: "Find a tutor" }, { type: "search", label: "Subject" }, { type: "list", label: "Tutors", items: ["Tutor · Maths", "Tutor · Spanish"] }] }],
    reqs: [["Parents can search tutors", "proposed"]] },
  { q: "Do tutors sign up themselves, or does your team vet them?", a: "They apply, and we approve them first.",
    screens: [{ name: "Find a tutor", c: [{ type: "header", label: "Find a tutor" }, { type: "search", label: "Subject" }, { type: "list", label: "Approved tutors", items: ["Tutor · Maths", "Tutor · Spanish"] }] },
      { name: "Review queue", isNew: true, c: [{ type: "header", label: "Applications" }, { type: "table", label: "Pending", items: ["Name", "Subject", "Status"] }] }],
    reqs: [["Parents can search tutors", "confirmed"], ["Only approved tutors are visible", "proposed"]] },
  { q: "How should parents pay for a lesson?", a: "Not sure yet — let's decide later.",
    screens: [{ name: "Find a tutor", c: [{ type: "header", label: "Find a tutor" }, { type: "search", label: "Subject" }, { type: "list", label: "Approved tutors", items: ["Tutor · Maths"] }] },
      { name: "Tutor profile", isNew: true, c: [{ type: "header", label: "Tutor profile" }, { type: "calendar", label: "Availability" }, { type: "button", label: "Book lesson" }] }],
    reqs: [["Parents can search tutors", "confirmed"], ["Only approved tutors are visible", "confirmed"], ["Payment method", "deferred"]] },
];

function Preview() {
  const [i, setI] = useState(0);
  const s = STEPS[i];
  if (!s) return null;
  return (
    <div className="overflow-hidden rounded-2xl border bg-card shadow-lift">
      <div className="flex items-center gap-2 border-b px-4 py-2.5 text-xs text-muted-foreground">
        <span className="size-2 rounded-full bg-border" /><span className="size-2 rounded-full bg-border" /><span className="size-2 rounded-full bg-border" />
        <span className="ml-2">Interactive preview · fictional example</span>
        <div className="ml-auto flex gap-1">{STEPS.map((_, n) => <Button variant="ghost" size="icon" key={n} onClick={() => setI(n)} className="size-7" aria-label={`Step ${n + 1}`} aria-pressed={n === i}><span className={`h-1.5 w-5 rounded-full ${n <= i ? "bg-primary" : "bg-border"}`} /></Button>)}</div>
      </div>
      <div className="grid md:grid-cols-[1fr_1.4fr]">
        <div className="space-y-3 border-b p-4 md:border-b-0 md:border-r">
          <div className="rounded-xl border bg-background p-3 text-sm">{s.q}</div>
          <div className="ml-auto max-w-[85%] rounded-xl bg-foreground p-3 text-sm text-background">{s.a}</div>
          <div className="space-y-1.5 pt-2">{s.reqs.map(([t, st]) => <div key={t} className="flex items-center justify-between gap-2 text-xs"><span>{t}</span><StatusBadge status={st} /></div>)}</div>
          <Button size="sm" variant="outline" className="w-full" onClick={() => setI((i + 1) % STEPS.length)}>{i < STEPS.length - 1 ? "Answer & continue" : "Start over"}<ArrowRight className="size-3.5" /></Button>
        </div>
        <div className="flex min-h-[300px] items-start gap-4 overflow-x-auto bg-dotgrid p-5">
          {s.screens.map((sc) => (
            <div key={sc.name} className={`w-48 shrink-0 rounded-xl border bg-sketch shadow-soft ${sc.isNew ? "changed-pulse border-primary/60" : ""}`}>
              <div className="border-b bg-muted/50 px-2.5 py-1.5 text-[11px] font-medium">{sc.name}{sc.isNew && <span className="ml-1 text-[9px] font-semibold text-primary">NEW</span>}</div>
              <div className="p-2.5"><ScreenWireframe components={sc.c} /></div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function Landing() {
  return (
    <div className="min-h-screen bg-hero">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-5 py-5">
        <Logo />
        <Button asChild variant="ghost" size="sm"><Link to="/auth">Sign in</Link></Button>
      </header>
      <div className="mx-auto max-w-6xl px-5 pb-20">
        <section className="mx-auto max-w-3xl pt-8 text-center md:pt-12">
          <p className="mb-4 text-sm font-medium text-primary">Talkistry · Where conversations take shape.</p>
          <h1 className="font-display text-4xl leading-[1.1] md:text-6xl">Great products begin with a conversation.</h1>
          <p className="mx-auto mt-5 max-w-xl text-base text-muted-foreground md:text-lg">Turn client conversations into interactive product sketches, clear requirements, and shared decisions — all in one workspace.</p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <Button asChild size="lg"><Link to="/auth">Start shaping your idea<ArrowRight className="size-4" /></Link></Button>
            <Button asChild size="lg" variant="ghost"><a href="#how-it-works">Explore how it works</a></Button>
          </div>
        </section>
        <section id="how-it-works" className="mt-10 scroll-mt-6"><Preview /></section>
        <section className="mt-16 grid gap-8 md:grid-cols-3">
          {[
            [MessagesSquare, "Guided Discovery", "AI helps uncover important requirements without turning meetings into endless interviews."],
            [PenTool, "Live Product Sketching", "Watch ideas evolve into visual workflows and screens as decisions are made."],
            [CheckCircle2, "Shared Understanding", "Keep clients, product teams, and developers aligned through decisions, approvals, and follow-up meetings."],
          ].map(([Icon, t, d]) => {
            const I = Icon as typeof MessagesSquare;
            return <div key={t as string}><I className="mb-3 size-5 text-primary" /><h3 className="font-medium">{t as string}</h3><p className="mt-1 text-sm text-muted-foreground">{d as string}</p></div>;
          })}
        </section>
      </div>
    </div>
  );
}
