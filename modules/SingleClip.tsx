"use client";

import { useEffect, useState } from "react";
import { ClipDownloadButton, ClipPlayer } from "@reactor-team/js-sdk";
import { useSingleClip } from "../hooks/useSingleClip";
import {
  CANVAS_ASPECT,
  CANVAS_HEIGHT,
  CANVAS_WIDTH,
  CLIP_SECONDS_DEFAULT,
  CLIP_SECONDS_MAX,
  CLIP_SECONDS_MIN,
  FAST_H3_PRICE_PER_SECOND,
  MAX_PROMPT_CHARS,
  type ClipPhase,
  type ImageRole,
} from "../types/clip";

const PHASE_LABEL: Record<ClipPhase, string> = {
  idle: "",
  connecting: "Connecting and waiting for a GPU…",
  uploading: "Uploading the image…",
  queueing: "Queueing the clip…",
  building: "Generating the clip…",
  playing: "Playing",
  saving: "Saving the clip…",
  done: "Done · disconnected",
};

export function SingleClip() {
  const {
    phase,
    error,
    result,
    savedPath,
    clipSeconds,
    playStartedAt,
    connectedAt,
    billedSeconds,
    busy,
    generate,
    cancel,
    clearResult,
  } = useSingleClip();

  const [prompt, setPrompt] = useState("");
  const [seconds, setSeconds] = useState(CLIP_SECONDS_DEFAULT);
  const [imageRole, setImageRole] = useState<ImageRole>("first");
  const [frame, setFrame] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (!frame) {
      setPreview(null);
      return;
    }
    const url = URL.createObjectURL(frame);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [frame]);

  useEffect(() => {
    if (!busy) return;
    const id = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(id);
  }, [busy]);

  const tooLong = prompt.length > MAX_PROMPT_CHARS;
  const canGenerate = !busy && prompt.trim().length > 0 && !tooLong;
  const playProgress =
    playStartedAt && clipSeconds
      ? Math.min(1, (now - playStartedAt) / 1000 / clipSeconds)
      : 0;
  const liveSeconds = connectedAt ? (now - connectedAt) / 1000 : 0;

  return (
    <div className="relative flex flex-col gap-3 rounded-xl border border-zinc-800 bg-zinc-900/40 p-3">
      <h2 className="text-xs font-medium uppercase tracking-wide text-zinc-500">
        One clip
      </h2>

      <div className="relative flex flex-col gap-1">
        <div className="relative flex flex-row items-baseline justify-between">
          <label className="text-[11px] text-zinc-500">Prompt</label>
          <span
            className={`font-mono text-[10px] ${tooLong ? "text-red-400" : "text-zinc-600"}`}
          >
            {prompt.length}/{MAX_PROMPT_CHARS}
          </span>
        </div>
        <textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          disabled={busy}
          rows={5}
          placeholder="Describe the whole shot: style, subjects, action, camera, light and sound…"
          className="w-full resize-y rounded-md border border-zinc-800 bg-zinc-950 p-2 text-xs leading-5 outline-none focus:border-zinc-600 disabled:opacity-50"
        />
      </div>

      <div className="relative flex flex-col gap-1">
        <label className="text-[11px] text-zinc-500">
          Image (optional)
        </label>
        {preview ? (
          <div className="relative flex flex-col gap-1.5">
            <div className="relative flex aspect-[4/3] w-full flex-row overflow-hidden rounded-md border border-zinc-800 bg-zinc-950">
              <img
                src={preview}
                alt="Selected frame image"
                className="h-full w-full object-cover"
              />
            </div>
            <button
              onClick={() => setFrame(null)}
              disabled={busy}
              className="self-start text-[11px] text-zinc-500 underline hover:text-zinc-300 disabled:opacity-40"
            >
              Remove image
            </button>
          </div>
        ) : (
          <label
            className={`relative flex cursor-pointer flex-row items-center justify-center rounded-md border border-dashed border-zinc-700 bg-zinc-950 px-3 py-3 text-xs text-zinc-400 hover:border-zinc-500 hover:text-zinc-200 ${
              busy ? "pointer-events-none opacity-40" : ""
            }`}
          >
            Upload an image
            <input
              type="file"
              accept="image/*"
              className="hidden"
              disabled={busy}
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) setFrame(file);
                e.target.value = "";
              }}
            />
          </label>
        )}
        <fieldset disabled={busy} className="flex flex-col gap-2">
          <legend className="mb-2 text-xs font-medium text-zinc-200">
            Use image as
          </legend>
          {([
            ["first", "First frame only"],
            ["last", "Last frame only"],
            ["both", "First and last frame · same image"],
          ] as const).map(([role, label]) => (
            <label
              key={role}
              className={`flex cursor-pointer items-center gap-2 rounded-md border px-3 py-2 text-xs ${
                imageRole === role
                  ? "border-brand bg-brand/10 text-zinc-100"
                  : "border-zinc-700 bg-zinc-950 text-zinc-400"
              } ${busy ? "cursor-default opacity-40" : ""}`}
            >
              <input
                type="radio"
                name="image-role"
                value={role}
                checked={imageRole === role}
                onChange={() => setImageRole(role)}
                className="accent-[var(--color-brand)]"
              />
              {label}
            </label>
          ))}
        </fieldset>
        <p className="text-[11px] leading-4 text-zinc-500">
          {imageRole === "first"
            ? "The clip starts from your image; its ending is free to change."
            : imageRole === "last"
              ? "The clip ends on your image; its beginning comes from the prompt."
              : "The clip starts and ends on the same uploaded image."}
          {" "}FastH3 supports frame targets, rather than a whole-scene reference.
        </p>
        <p className="text-[11px] leading-4 text-zinc-600">
          Output is always {CANVAS_ASPECT} ({CANVAS_WIDTH}×{CANVAS_HEIGHT}). Your
          image is fitted to it, so a 4:3 image comes through unchanged.
        </p>
      </div>

      <div className="relative flex flex-col gap-1">
        <div className="relative flex flex-row items-baseline justify-between">
          <label htmlFor="clip-duration" className="text-xs text-zinc-300">
            Duration
          </label>
          <output
            htmlFor="clip-duration"
            className="min-w-24 rounded-md border border-zinc-600 bg-zinc-950 px-3 py-1.5 text-center font-mono text-lg font-semibold tabular-nums text-zinc-100"
          >
            {seconds.toFixed(1)} sec
          </output>
        </div>
        <input
          id="clip-duration"
          type="range"
          aria-valuetext={`${seconds.toFixed(1)} seconds`}
          min={CLIP_SECONDS_MIN}
          max={CLIP_SECONDS_MAX}
          step={0.1}
          value={seconds}
          disabled={busy}
          onChange={(e) => setSeconds(Number(e.target.value))}
          className="h-8 w-full cursor-pointer accent-[var(--color-brand)] disabled:opacity-40"
        />
        <div className="relative flex flex-row justify-between font-mono text-[10px] text-zinc-600">
          <span>{CLIP_SECONDS_MIN.toFixed(1)}s</span>
          <span>
            from ≈ ${(seconds * FAST_H3_PRICE_PER_SECOND * 2).toFixed(3)}
          </span>
          <span>{CLIP_SECONDS_MAX.toFixed(1)}s</span>
        </div>
      </div>

      <div className="relative flex flex-row gap-2">
        <button
          onClick={() =>
            void generate({ prompt, seconds, startingFrame: frame, imageRole })
          }
          disabled={!canGenerate}
          className="flex-1 rounded-md bg-brand px-3 py-2 text-sm font-medium text-brand-fg hover:opacity-90 disabled:opacity-40"
        >
          {busy ? PHASE_LABEL[phase] : "Generate clip"}
        </button>
        {busy && phase !== "saving" && (
          <button
            onClick={() => void cancel()}
            className="rounded-md border border-zinc-700 px-3 py-2 text-sm text-zinc-300 hover:bg-zinc-800"
          >
            Cancel
          </button>
        )}
      </div>

      {busy && (
        <div className="relative flex flex-col gap-1.5">
          <div className="relative flex h-1.5 w-full flex-row overflow-hidden rounded-full bg-zinc-800">
            <div
              className="relative flex h-full flex-row bg-brand transition-[width] duration-200"
              style={{ width: `${playProgress * 100}%` }}
            />
          </div>
          <p className="font-mono text-[10px] text-zinc-500">
            connected {liveSeconds.toFixed(0)}s · disconnects automatically when
            the clip ends
          </p>
        </div>
      )}

      <p className="text-[11px] leading-4 text-zinc-400">
        Every completed clip is automatically saved to generated-videos on the
        computer running this app.
      </p>
      {savedPath && (
        <p className="break-all text-xs text-green-400">Saved: {savedPath}</p>
      )}

      {error && <p className="text-xs text-red-400">{error}</p>}

      {billedSeconds !== null && !busy && (
        <p className="font-mono text-[10px] text-zinc-500">
          Session was open ≈{billedSeconds.toFixed(0)}s (≈ $
          {(billedSeconds * FAST_H3_PRICE_PER_SECOND).toFixed(3)} at $
          {FAST_H3_PRICE_PER_SECOND}/s) · now disconnected
        </p>
      )}

      {result && (
        <div className="relative flex flex-col gap-2">
          <ClipPlayer
            clip={result}
            className="w-full overflow-hidden rounded-lg border border-zinc-800"
          />
          <div className="relative flex flex-row items-center justify-between gap-2">
            <button
              onClick={clearResult}
              className="rounded-md border border-zinc-700 px-3 py-1.5 text-xs text-zinc-300 hover:bg-zinc-800"
            >
              Close
            </button>
            <ClipDownloadButton
              clip={result}
              filename={`fast-h3-${Math.floor(Date.now() / 1000)}.mp4`}
            />
          </div>
          <p className="text-[11px] leading-4 text-zinc-600">
            Download now — the preview link expires after a few minutes.
          </p>
        </div>
      )}
    </div>
  );
}
