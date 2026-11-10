import { fireEvent, render, screen, waitFor, cleanup } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { VoiceInput } from "./VoiceInput";

const mocks = vi.hoisted(() => ({ transcribe: vi.fn() }));
vi.mock("@tanstack/react-start", () => ({ useServerFn: () => mocks.transcribe }));
vi.mock("@/lib/voice.functions", () => ({ transcribeRecording: {} }));
afterEach(() => { cleanup(); vi.unstubAllGlobals(); vi.clearAllMocks(); });

describe("explicit recording consent", () => {
  it("does not request microphone access before consent", async () => {
    const microphone = vi.fn();
    Object.defineProperty(navigator, "mediaDevices", { configurable: true, value: { getUserMedia: microphone } });
    render(<VoiceInput projectId="sample" disabled={false} onTranscript={vi.fn()} onActive={vi.fn()} />);
    fireEvent.click(screen.getByRole("button", { name: "Record voice answer" }));
    fireEvent.click(screen.getByRole("button", { name: "Start recording" }));
    expect(microphone).toHaveBeenCalledTimes(0);
  });
  it("stops all microphone tracks on cancellation without calling transcription", async () => {
    const stopTrack = vi.fn();
    const microphone = vi.fn().mockResolvedValue({ getTracks: () => [{ stop: stopTrack }] });
    Object.defineProperty(navigator, "mediaDevices", { configurable: true, value: { getUserMedia: microphone } });
    class Recorder {
      static isTypeSupported() { return true; }
      state = "inactive"; mimeType = "audio/webm";
      onstop: (() => void) | null = null;
      start() { this.state = "recording"; }
      stop() { this.state = "inactive"; this.onstop?.(); }
    }
    vi.stubGlobal("MediaRecorder", Recorder);
    render(<VoiceInput projectId="sample" disabled={false} onTranscript={vi.fn()} onActive={vi.fn()} />);
    fireEvent.click(screen.getByRole("button", { name: "Record voice answer" }));
    fireEvent.click(screen.getByRole("checkbox"));
    fireEvent.click(screen.getByRole("button", { name: "Start recording" }));
    await waitFor(() => expect(microphone).toHaveBeenCalledTimes(1));
    await screen.findByRole("button", { name: "Stop & transcribe" });
    fireEvent.click(screen.getByRole("button", { name: "Cancel", exact: true }));
    expect(stopTrack).toHaveBeenCalledTimes(1);
    expect(mocks.transcribe).toHaveBeenCalledTimes(0);
  });
});