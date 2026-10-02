"use client";

import { useEffect, useState } from "react";
import {
  useHelios,
  useHeliosState,
  type HeliosStateMessage,
} from "@reactor-models/helios";
import { useGenerationLimit } from "../hooks/useGenerationLimit";
import { MAX_SECONDS, MIN_SECONDS } from "../types/generation";

const PRESETS = [5, 10, 20, 30, 60];

export function DurationPicker() {
  const { status } = useHelios();
  const maxSeconds = useGenerationLimit((s) => s.maxSeconds);
  const setMaxSeconds = useGenerationLimit((s) => s.setMaxSeconds);
  const [draft, setDraft] = useState(String(maxSeconds));
  const [snapshot, setSnapshot] = useState<HeliosStateMessage | null>(null);

  useHeliosState((msg) => setSnapshot(msg));

  useEffect(() => {
    if (status !== "ready") setSnapshot(null);
  }, [status]);

  useEffect(() => {
    setDraft(String(maxSeconds));
  }, [maxSeconds]);

  if (status === "ready" && snapshot?.started) return null;

  const ready = status === "ready";

  function commit(value: string) {
    const parsed = Number(value);
    if (Number.isFinite(parsed) && parsed > 0) {
      setMaxSeconds(parsed);
    } else {
      setDraft(String(maxSeconds));
    }
  }

  return (
    <div className="relative flex flex-col gap-2 rounded-lg border border-zinc-800 bg-zinc-900/40 p-3">
      <div className="relative flex flex-row items-center justify-between">
        <label className="text-[10px] uppercase tracking-wider text-zinc-500">
          Max duration
        </label>
        <span className="text-[11px] text-zinc-500">
          {MIN_SECONDS}–{MAX_SECONDS}s
        </span>
      </div>

      <div className="relative flex flex-row flex-wrap gap-1.5">
        {PRESETS.map((seconds) => (
          <button
            key={seconds}
            disabled={!ready}
            onClick={() => setMaxSeconds(seconds)}
            className={`rounded-md border px-2.5 py-1 text-xs font-medium transition-colors disabled:opacity-40 ${
              maxSeconds === seconds
                ? "border-brand text-brand"
                : "border-zinc-800 bg-zinc-950 text-zinc-300 hover:border-brand"
            }`}
          >
            {seconds}s
          </button>
        ))}
      </div>

      <div className="relative flex flex-row items-center gap-2">
        <input
          type="number"
          inputMode="numeric"
          min={MIN_SECONDS}
          max={MAX_SECONDS}
          value={draft}
          disabled={!ready}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={(e) => commit(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") commit(e.currentTarget.value);
          }}
          className="w-24 rounded-md border border-zinc-800 bg-zinc-950 px-2 py-1 text-sm text-zinc-100 focus:border-brand focus:outline-none disabled:opacity-40"
        />
        <span className="text-xs text-zinc-500">seconds, then generation stops</span>
      </div>
    </div>
  );
}
