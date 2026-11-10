import { useEffect, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Mic, Square, X, Loader2, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { transcribeRecording } from "@/lib/voice.functions";

export function VoiceInput({ projectId, disabled, onTranscript, onActive }: { projectId: string; disabled: boolean; onTranscript: (text: string) => void; onActive: (active: boolean) => void }) {
  const transcribe = useServerFn(transcribeRecording);
  const [open, setOpen] = useState(false);
  const [consent, setConsent] = useState(false);
  const [state, setState] = useState<"idle" | "permission" | "recording" | "processing" | "error">("idle");
  const [error, setError] = useState<string | null>(null);
  const [seconds, setSeconds] = useState(0);
  const recorder = useRef<MediaRecorder | null>(null);
  const stream = useRef<MediaStream | null>(null);
  const audio = useRef<Blob | null>(null);
  const generation = useRef(0);
  const stopTracks = () => { stream.current?.getTracks().forEach((t) => t.stop()); stream.current = null; };
  const cancel = () => {
    generation.current += 1;
    if (recorder.current && recorder.current.state !== "inactive") { recorder.current.onstop = null; recorder.current.stop(); }
    stopTracks(); audio.current = null; setState("idle"); setError(null); onActive(false);
  };
  useEffect(() => () => {
    generation.current += 1;
    if (recorder.current && recorder.current.state !== "inactive") { recorder.current.onstop = null; recorder.current.stop(); }
    stream.current?.getTracks().forEach((t) => t.stop());
  }, []);
  useEffect(() => {
    if (state !== "recording") return;
    const timer = setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => clearInterval(timer);
  }, [state]);
  // A bounded, explicitly started recording; never background listening.
  useEffect(() => { if (state === "recording" && seconds >= 180) recorder.current?.stop(); }, [seconds, state]);

  async function process(blob: Blob, token: number) {
    audio.current = blob; setState("processing"); onActive(true);
    try {
      const form = new FormData(); form.set("projectId", projectId);
      const extension = blob.type.includes("mp4") ? "m4a" : blob.type.includes("ogg") ? "ogg" : "webm";
      form.set("audio", new File([blob], `answer.${extension}`, { type: blob.type }));
      const result = await transcribe({ data: form });
      if (token !== generation.current) return;
      if (result.error) throw new Error(result.error);
      onTranscript(result.text); audio.current = null; setState("idle"); setOpen(false); onActive(false);
    } catch (e) {
      if (token !== generation.current) return;
      setError(e instanceof Error ? e.message : "Transcription failed. Please type your answer."); setState("error"); onActive(false);
    }
  }
  async function start() {
    if (!consent || disabled || state === "permission" || state === "recording" || state === "processing") return;
    const token = ++generation.current; setError(null); setState("permission"); onActive(true);
    try {
      if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") throw new Error("Recording isn't supported in this browser. Please type your answer.");
      const media = await navigator.mediaDevices.getUserMedia({ audio: true });
      if (token !== generation.current) { media.getTracks().forEach((t) => t.stop()); return; }
      stream.current = media;
      const mime = ["audio/webm;codecs=opus", "audio/mp4", "audio/ogg;codecs=opus"].find((m) => MediaRecorder.isTypeSupported(m));
      const rec = new MediaRecorder(media, mime ? { mimeType: mime } : undefined); recorder.current = rec;
      const chunks: Blob[] = []; let bytes = 0;
      rec.ondataavailable = (e) => { if (e.data.size) { chunks.push(e.data); bytes += e.data.size; if (bytes >= 9 * 1024 * 1024 && rec.state !== "inactive") rec.stop(); } };
      rec.onerror = () => { cancel(); setState("error"); setError("Recording stopped unexpectedly. Please try again or use text."); };
      rec.onstop = () => { stopTracks(); if (token === generation.current) void process(new Blob(chunks, { type: rec.mimeType }), token); };
      rec.start(1000); setSeconds(0); setState("recording");
    } catch (e) {
      if (token !== generation.current) return;
      stopTracks(); onActive(false); setState("error");
      setError(e instanceof DOMException && e.name === "NotAllowedError" ? "Microphone permission was denied. Allow it in your browser or type your answer." : e instanceof Error ? e.message : "Could not access your microphone.");
    }
  }
  return <Dialog open={open} onOpenChange={(v) => { if (!v) cancel(); setOpen(v); }}>
    <DialogTrigger asChild><Button variant="outline" size="icon" className="min-h-11 min-w-11" disabled={disabled} aria-label="Record voice answer" title="Record voice answer"><Mic className="size-4" /></Button></DialogTrigger>
    <DialogContent className="max-h-[90dvh] w-[calc(100%-2rem)] overflow-y-auto">
      <DialogHeader><DialogTitle>Record an answer</DialogTitle><DialogDescription>Only record with everyone's consent. Audio is sent to Lovable AI for transcription when you stop. SpecLoop does not save the recording. Review and edit the transcript before sending it to discovery.</DialogDescription></DialogHeader>
      <label className="flex items-start gap-3 text-sm"><Checkbox checked={consent} onCheckedChange={(v) => setConsent(v === true)} disabled={state === "recording" || state === "processing"} />I have consent to record and process this audio.</label>
      <div role="status" aria-live="polite" className="flex min-h-14 items-center gap-2 rounded-lg border p-3 text-sm">
        {state === "recording" ? <><span className="size-2 rounded-full bg-destructive motion-safe:animate-pulse" /><b>Recording · {Math.floor(seconds / 60)}:{String(seconds % 60).padStart(2, "0")}</b></> : state === "processing" || state === "permission" ? <><Loader2 className="size-4 animate-spin" />{state === "permission" ? "Waiting for microphone permission…" : "Transcribing…"}</> : "Microphone off · up to 3 minutes"}
      </div>
      {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
      {state === "processing" && <p className="text-xs text-muted-foreground">Cancel discards the transcript here; processing already sent to Lovable AI may still finish.</p>}
      <div className="flex flex-wrap gap-2">
        {state === "recording" ? <Button onClick={() => recorder.current?.stop()}><Square className="size-4" />Stop & transcribe</Button> : <Button disabled={!consent || disabled || state === "processing" || state === "permission"} onClick={start}><Mic className="size-4" />Start recording</Button>}
        {state === "error" && audio.current && <Button variant="outline" onClick={() => { const blob = audio.current; if (blob) void process(blob, ++generation.current); }}><RotateCcw className="size-4" />Retry transcription</Button>}
        <Button variant="ghost" onClick={() => { cancel(); setOpen(false); }}><X className="size-4" />Cancel</Button>
      </div>
    </DialogContent>
  </Dialog>;
}