"use client";

import { useEffect, useRef, useState } from "react";
import { Waveform } from "./Waveform";
import { Spinner } from "@/components/ui/Spinner";
import { formatDuration } from "@/lib/utils";

type RecorderState = "idle" | "recording" | "paused" | "stopping" | "uploading" | "transcribing" | "extracting" | "done" | "error";

export type RecorderResult = {
  blob: Blob;
  durationSeconds: number;
  mimeType: string;
};

export function Recorder({
  maxMinutes,
  onComplete,
  onCancel,
  externalState,
  externalMessage,
}: {
  maxMinutes: number;
  onComplete: (r: RecorderResult) => void;
  onCancel: () => void;
  externalState?: Exclude<RecorderState, "idle" | "recording" | "paused">;
  externalMessage?: string;
}) {
  const [state, setState] = useState<RecorderState>("idle");
  const [seconds, setSeconds] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const mediaRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const startedAtRef = useRef<number>(0);
  const pausedAccumRef = useRef<number>(0);
  const pauseStartRef = useRef<number>(0);
  const tickRef = useRef<number | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);

  const phase = externalState ?? state;

  useEffect(() => {
    return () => {
      cleanup();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (state !== "recording") return;
    const interval = window.setInterval(() => {
      const elapsed = Math.floor((Date.now() - startedAtRef.current - pausedAccumRef.current) / 1000);
      setSeconds(elapsed);
      if (elapsed >= maxMinutes * 60) {
        void stop();
      }
    }, 250);
    tickRef.current = interval;
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state, maxMinutes]);

  function cleanup() {
    if (mediaRef.current && mediaRef.current.state !== "inactive") {
      try {
        mediaRef.current.stop();
      } catch {}
    }
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    if (audioCtxRef.current) {
      audioCtxRef.current.close().catch(() => {});
      audioCtxRef.current = null;
    }
    analyserRef.current = null;
  }

  function pickMimeType(): string {
    const candidates = [
      "audio/webm;codecs=opus",
      "audio/webm",
      "audio/ogg;codecs=opus",
      "audio/mp4",
    ];
    for (const c of candidates) {
      if (typeof MediaRecorder !== "undefined" && MediaRecorder.isTypeSupported(c)) {
        return c;
      }
    }
    return "audio/webm";
  }

  async function start() {
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          channelCount: 1,
        },
      });
      streamRef.current = stream;

      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const source = audioCtx.createMediaStreamSource(stream);
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 256;
      source.connect(analyser);
      audioCtxRef.current = audioCtx;
      analyserRef.current = analyser;

      const mimeType = pickMimeType();
      const rec = new MediaRecorder(stream, { mimeType, audioBitsPerSecond: 64000 });
      chunksRef.current = [];
      rec.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) chunksRef.current.push(e.data);
      };
      rec.start(1000);
      mediaRef.current = rec;
      startedAtRef.current = Date.now();
      pausedAccumRef.current = 0;
      setSeconds(0);
      setState("recording");
    } catch (err: unknown) {
      setError(
        err instanceof Error
          ? err.message
          : "Microphone permission denied or unavailable.",
      );
      setState("error");
    }
  }

  function pause() {
    if (!mediaRef.current || mediaRef.current.state !== "recording") return;
    mediaRef.current.pause();
    pauseStartRef.current = Date.now();
    setState("paused");
  }

  function resume() {
    if (!mediaRef.current || mediaRef.current.state !== "paused") return;
    pausedAccumRef.current += Date.now() - pauseStartRef.current;
    mediaRef.current.resume();
    setState("recording");
  }

  async function stop(): Promise<void> {
    return new Promise((resolve) => {
      if (!mediaRef.current) {
        resolve();
        return;
      }
      const rec = mediaRef.current;
      const mimeType = rec.mimeType || "audio/webm";
      setState("stopping");
      rec.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: mimeType });
        const elapsed = Math.floor((Date.now() - startedAtRef.current - pausedAccumRef.current) / 1000);
        cleanup();
        onComplete({ blob, durationSeconds: elapsed, mimeType });
        resolve();
      };
      try {
        rec.stop();
      } catch {
        resolve();
      }
    });
  }

  function cancel() {
    cleanup();
    setState("idle");
    setSeconds(0);
    onCancel();
  }

  const externalLabels: Record<string, string> = {
    uploading: "Uploading audio…",
    transcribing: "Transcribing…",
    extracting: "Drafting EMR fields…",
    done: "Done",
    error: externalMessage || "Something went wrong",
    stopping: "Finalizing recording…",
  };

  const isExternalBusy = phase === "uploading" || phase === "transcribing" || phase === "extracting" || phase === "stopping";

  return (
    <div className="card flex flex-col items-center gap-6 p-8 sm:p-12">
      <Waveform analyser={analyserRef.current} active={state === "recording"} />

      <div className="font-mono text-4xl font-bold text-slate-900 dark:text-ink-100">
        {formatDuration(seconds)}
        <span className="ml-2 text-base font-medium text-slate-400 dark:text-ink-600">
          / {maxMinutes}:00
        </span>
      </div>

      {phase === "idle" || phase === "error" ? (
        <div className="flex flex-col items-center gap-3">
          <button
            onClick={start}
            className="group relative flex h-20 w-20 items-center justify-center rounded-full bg-brand-600 text-white shadow-lg shadow-brand-600/30 transition hover:scale-105 hover:bg-brand-700 active:scale-95"
            aria-label="Start recording"
          >
            <svg viewBox="0 0 24 24" className="h-9 w-9">
              <path
                d="M12 3a4 4 0 00-4 4v5a4 4 0 008 0V7a4 4 0 00-4-4zm-7 9a7 7 0 0014 0h-2a5 5 0 01-10 0H5zm6 9v-2.07a7 7 0 002 0V21h-2z"
                fill="currentColor"
              />
            </svg>
          </button>
          <span className="text-xs text-slate-500 dark:text-ink-500">Tap to start recording</span>
          {error ? (
            <p className="rounded-lg bg-rose-50 px-3 py-2 text-xs text-rose-700">
              {error}
            </p>
          ) : null}
        </div>
      ) : null}

      {state === "recording" ? (
        <div className="flex items-center gap-3">
          <button onClick={pause} className="btn-secondary">
            <PauseIcon /> Pause
          </button>
          <button
            onClick={() => void stop()}
            className="relative flex h-16 w-16 items-center justify-center rounded-full bg-rose-600 text-white shadow-lg shadow-rose-600/30 animate-pulseRing"
            aria-label="Stop & process"
          >
            <svg viewBox="0 0 24 24" className="h-6 w-6">
              <rect x="6" y="6" width="12" height="12" rx="2" fill="currentColor" />
            </svg>
          </button>
          <button onClick={cancel} className="btn-ghost">
            Cancel
          </button>
        </div>
      ) : null}

      {state === "paused" ? (
        <div className="flex items-center gap-3">
          <button onClick={resume} className="btn-primary">
            <PlayIcon /> Resume
          </button>
          <button onClick={() => void stop()} className="btn-secondary">
            Stop & process
          </button>
          <button onClick={cancel} className="btn-ghost">
            Cancel
          </button>
        </div>
      ) : null}

      {isExternalBusy ? (
        <div className="flex flex-col items-center gap-3">
          <div className="flex items-center gap-2 text-sm font-medium text-slate-700 dark:text-ink-300">
            <Spinner /> {externalLabels[phase]}
          </div>
          <div className="grid w-full max-w-md grid-cols-3 gap-2 text-center text-[11px]">
            <Stage
              active={phase === "stopping" || phase === "uploading"}
              done={phase === "transcribing" || phase === "extracting"}
            >
              🎙️ Captured
            </Stage>
            <Stage
              active={phase === "transcribing"}
              done={phase === "extracting"}
            >
              🌐 Translating
            </Stage>
            <Stage active={phase === "extracting"} done={false}>
              🤖 Extracting
            </Stage>
          </div>
        </div>
      ) : null}

      {phase === "error" && externalMessage ? (
        <p className="rounded-lg bg-rose-50 px-3 py-2 text-xs text-rose-700">
          {externalMessage}
        </p>
      ) : null}
    </div>
  );
}

function Stage({
  active,
  done,
  children,
}: {
  active: boolean;
  done: boolean;
  children: React.ReactNode;
}) {
  return (
    <div
      className={`rounded-xl border px-2 py-2 ${
        done
          ? "border-brand-200 bg-brand-50 text-brand-800 dark:border-brand-800 dark:bg-brand-900/30 dark:text-brand-200"
          : active
            ? "border-brand-300 bg-white text-brand-700 dark:border-brand-700 dark:bg-ink-900 dark:text-brand-300"
            : "border-slate-200 bg-white text-slate-400 dark:border-ink-800 dark:bg-ink-900 dark:text-ink-600"
      }`}
    >
      {children}
    </div>
  );
}

function PauseIcon() {
  return (
    <svg viewBox="0 0 20 20" className="h-4 w-4">
      <rect x="5" y="4" width="3.5" height="12" rx="1" fill="currentColor" />
      <rect x="11.5" y="4" width="3.5" height="12" rx="1" fill="currentColor" />
    </svg>
  );
}

function PlayIcon() {
  return (
    <svg viewBox="0 0 20 20" className="h-4 w-4">
      <path d="M6 4l10 6-10 6V4z" fill="currentColor" />
    </svg>
  );
}
