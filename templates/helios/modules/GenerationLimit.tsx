"use client";

import { useEffect, useState } from "react";
import {
  useHelios,
  useHeliosState,
  type HeliosStateMessage,
} from "@reactor-models/helios";
import {
  ClipDownloadButton,
  ClipPlayer,
  RecordingError,
  useReactor,
  type Clip,
} from "@reactor-team/js-sdk";
import { useGenerationLimit } from "../hooks/useGenerationLimit";
import { HELIOS_FPS, HELIOS_FRAMES_PER_CHUNK } from "../types/generation";

export function GenerationLimit() {
  const { status, pause, reset, disconnect } = useHelios();
  const requestRecording = useReactor((s) => s.requestRecording);
  const maxSeconds = useGenerationLimit((s) => s.maxSeconds);
  const finished = useGenerationLimit((s) => s.finished);
  const setFinished = useGenerationLimit((s) => s.setFinished);
  const [snapshot, setSnapshot] = useState<HeliosStateMessage | null>(null);
  const [clip, setClip] = useState<Clip | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useHeliosState((msg) => {
    setSnapshot(msg);
    const limit = useGenerationLimit.getState();
    if (!msg.started) {
      if (limit.finished) limit.setFinished(false);
      return;
    }
    if (limit.finished) return;
    const limitFrames = limit.maxSeconds * HELIOS_FPS;
    if (Number(msg.current_frame) + HELIOS_FRAMES_PER_CHUNK > limitFrames) {
      limit.setFinished(true);
      if (msg.running) pause();
    }
  });

  useEffect(() => {
    if (status !== "ready") {
      setSnapshot(null);
      setFinished(false);
      setClip(null);
      setError(null);
    }
  }, [status, setFinished]);

  if (status !== "ready" || !snapshot?.started) return null;

  const generatedSeconds = Number(snapshot.current_frame) / HELIOS_FPS;
  const progress = Math.min(1, generatedSeconds / maxSeconds);

  async function downloadFullVideo() {
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      setClip(await requestRecording());
    } catch (e) {
      setError(
        e instanceof RecordingError
          ? `${e.code}: ${e.reason}`
          : e instanceof Error
            ? e.message
            : String(e),
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="relative flex flex-col gap-3 rounded-lg border border-zinc-800 bg-zinc-900/40 p-3">
      <div className="relative flex flex-row items-center justify-between">
        <span className="text-[10px] uppercase tracking-wider text-zinc-500">
          {finished ? "Generation finished" : "Generating"}
        </span>
        <span className="font-mono text-[11px] text-zinc-400">
          {generatedSeconds.toFixed(1)}s / {maxSeconds}s
        </span>
      </div>

      <div className="relative flex h-1.5 w-full flex-row overflow-hidden rounded-full bg-zinc-800">
        <div
          className="relative flex h-full flex-row bg-brand transition-[width] duration-300"
          style={{ width: `${progress * 100}%` }}
        />
      </div>

      {finished && (
        <div className="relative flex flex-col gap-2">
          <button
            onClick={downloadFullVideo}
            disabled={busy}
            className="w-full rounded-md bg-brand px-3 py-2 text-sm font-medium text-brand-fg hover:opacity-90 disabled:opacity-40"
          >
            {busy ? "Preparing video…" : "Watch / download video"}
          </button>
          <div className="relative flex flex-row gap-2">
            <button
              onClick={() => reset()}
              className="flex-1 rounded-md border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm font-medium text-zinc-200 hover:bg-zinc-800"
            >
              New generation
            </button>
            <button
              onClick={() => disconnect()}
              className="flex-1 rounded-md border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm font-medium text-zinc-400 hover:border-zinc-700 hover:text-zinc-200"
            >
              Disconnect
            </button>
          </div>
          <p className="text-[11px] leading-snug text-zinc-500">
            Reactor bills per connected second. Disconnect when you are done.
          </p>
        </div>
      )}

      {error && <p className="text-xs text-red-400">{error}</p>}

      {clip && (
        <div
          onClick={() => setClip(null)}
          className="fixed inset-0 z-50 flex flex-row items-center justify-center bg-black/80 p-4"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="relative flex w-full max-w-2xl flex-col gap-3 rounded-xl border border-zinc-800 bg-zinc-950 p-4 shadow-xl"
          >
            <div className="relative flex flex-row items-center justify-between gap-3">
              <span className="text-[10px] uppercase tracking-wider text-zinc-500">
                Full generation · {clip.kind}
              </span>
              <button
                onClick={() => setClip(null)}
                className="rounded-md border border-zinc-800 px-2 py-1 text-xs text-zinc-400 hover:bg-zinc-900 hover:text-zinc-200"
              >
                Close
              </button>
            </div>
            <ClipPlayer
              clip={clip}
              onError={(e) => setError(e.message)}
              className="w-full overflow-hidden rounded-lg border border-zinc-800"
            />
            <div className="relative flex flex-row justify-end">
              <ClipDownloadButton
                clip={clip}
                filename={`helios-${Math.floor(Date.now() / 1000)}.mp4`}
                onSuccess={() => setError(null)}
                onError={(e) => setError(e.message)}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
