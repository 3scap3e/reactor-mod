"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  useFastH3,
  useFastH3ClipFailed,
  useFastH3ClipFinished,
  useFastH3ClipStarted,
  useFastH3ClipStopped,
} from "@reactor-models/fast-h3";
import {
  RecordingError,
  type Clip,
  type FileRef,
} from "@reactor-team/js-sdk";
import {
  CANVAS_ASPECT,
  CONNECT_ATTEMPTS,
  SAFETY_TIMEOUT_MS,
  SAVE_TIMEOUT_MS,
  type ClipPhase,
  type SingleClipInput,
} from "../types/clip";

function describe(e: unknown): string {
  if (e instanceof RecordingError) return `${e.code}: ${e.reason}`;
  if (e instanceof Error) return e.message;
  return String(e);
}

export function useSingleClip() {
  const {
    status,
    connect,
    disconnect,
    uploadFile,
    enqueue,
    setAutoplay,
    setCanvas,
    requestClip,
    downloadClipAsFile,
  } = useFastH3();

  const [phase, setPhase] = useState<ClipPhase>("idle");
  const [error, setError] = useState<string | null>(null);
  const [savedPath, setSavedPath] = useState<string | null>(null);
  const [result, setResult] = useState<Clip | null>(null);
  const [clipSeconds, setClipSeconds] = useState(0);
  const [playStartedAt, setPlayStartedAt] = useState<number | null>(null);
  const [connectedAt, setConnectedAt] = useState<number | null>(null);
  const [billedSeconds, setBilledSeconds] = useState<number | null>(null);

  const activeRef = useRef(false);
  const finishingRef = useRef(false);
  const clipIdRef = useRef<string | null>(null);
  const secondsRef = useRef(0);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const connectedAtRef = useRef<number | null>(null);

  const clearSafety = useCallback(() => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = null;
  }, []);

  const closeSession = useCallback(async () => {
    try {
      await disconnect();
    } finally {
      if (connectedAtRef.current !== null) {
        setBilledSeconds((Date.now() - connectedAtRef.current) / 1000);
      }
      connectedAtRef.current = null;
      setConnectedAt(null);
    }
  }, [disconnect]);

  const finish = useCallback(
    async (failure?: string) => {
      if (finishingRef.current || !activeRef.current) return;
      finishingRef.current = true;
      clearSafety();
      clipIdRef.current = null;
      setPlayStartedAt(null);
      let captured: Clip | null = null;
      try {
        if (failure) {
          setError(failure);
        } else {
          setPhase("saving");
          let saveTimer: ReturnType<typeof setTimeout> | null = null;
          try {
            const clip = await Promise.race([
              requestClip(Math.ceil(secondsRef.current)),
              new Promise<never>((_, reject) => {
                saveTimer = setTimeout(
                  () => reject(new Error("saving took too long")),
                  SAVE_TIMEOUT_MS,
                );
              }),
            ]);
            captured = clip;
            setResult(clip);
          } catch (e) {
            setError(`The clip played but could not be saved: ${describe(e)}`);
          } finally {
            if (saveTimer) clearTimeout(saveTimer);
          }
        }
      } finally {
        try {
          await closeSession();
        } catch (e) {
          console.log("reactor disconnect failed", e);
          setError(
            "Disconnect failed. Close this tab to make sure the session ends.",
          );
        }
        if (captured) {
          try {
            const blob = await downloadClipAsFile(captured, null);
            const response = await fetch("/api/clips/save", {
              method: "POST",
              headers: { "Content-Type": "video/mp4" },
              body: blob,
            });
            const saved = await response.json();
            if (!response.ok) throw new Error(saved.error || "Automatic saving failed");
            setSavedPath(saved.path);
          } catch (e) {
            setError(`Automatic saving failed. Use Download to save this clip: ${describe(e)}`);
          }
        }
        activeRef.current = false;
        finishingRef.current = false;
        setPhase(failure ? "idle" : "done");
      }
    },
    [clearSafety, closeSession, requestClip, downloadClipAsFile],
  );

  useFastH3ClipStarted((m) => {
    if (m.clip.clip_id !== clipIdRef.current) return;
    setPhase("playing");
    setPlayStartedAt(Date.now());
  });

  useFastH3ClipFinished((m) => {
    if (m.clip.clip_id === clipIdRef.current) void finish();
  });

  useFastH3ClipStopped((m) => {
    if (m.clip.clip_id === clipIdRef.current) void finish();
  });

  useFastH3ClipFailed((m) => {
    if (m.clip.clip_id === clipIdRef.current) {
      void finish(`The clip failed to build: ${m.reason}`);
    }
  });

  useEffect(() => {
    if (
      status === "disconnected" &&
      activeRef.current &&
      !finishingRef.current &&
      phase !== "connecting"
    ) {
      clearSafety();
      activeRef.current = false;
      clipIdRef.current = null;
      setPlayStartedAt(null);
      if (connectedAtRef.current !== null) {
        setBilledSeconds((Date.now() - connectedAtRef.current) / 1000);
      }
      connectedAtRef.current = null;
      setConnectedAt(null);
      setError("The session ended before the clip finished.");
      setPhase("idle");
    }
  }, [status, phase, clearSafety]);

  useEffect(() => clearSafety, [clearSafety]);

  const generate = useCallback(
    async ({ prompt, seconds, startingFrame, imageRole }: SingleClipInput) => {
      if (activeRef.current) return;
      activeRef.current = true;
      setError(null);
      setResult(null);
      setSavedPath(null);
      setBilledSeconds(null);
      try {
        if (status !== "ready") {
          setPhase("connecting");
          connectedAtRef.current = Date.now();
          setConnectedAt(connectedAtRef.current);
          for (let i = 1; i <= CONNECT_ATTEMPTS; i++) {
            try {
              await connect();
              break;
            } catch (e) {
              console.log("reactor connect failed", i, e);
              await disconnect().catch((closeError: unknown) =>
                console.log("reactor disconnect after failure failed", closeError),
              );
              if (i === CONNECT_ATTEMPTS || !activeRef.current) throw e;
            }
          }
          if (!activeRef.current) {
            await disconnect();
            return;
          }
        }
        await setAutoplay({ enabled: true });
        if (!activeRef.current) return;

        const canvas = await setCanvas({ aspect: CANVAS_ASPECT });
        if (!activeRef.current) return;
        if (!canvas) {
          await finish(
            `The model refused the ${CANVAS_ASPECT} canvas. The reason is shown above.`,
          );
          return;
        }

        let frame: FileRef | null = null;
        if (startingFrame) {
          setPhase("uploading");
          frame = await uploadFile(startingFrame, { name: startingFrame.name });
          if (!activeRef.current) return;
        }

        setPhase("queueing");
        const reply = await enqueue({
          prompt: prompt.trim(),
          seconds,
          ...(frame && imageRole !== "last" ? { starting_frame: frame } : {}),
          ...(frame && imageRole !== "first" ? { ending_frame: frame } : {}),
        });
        if (!reply) {
          await finish("The model refused the clip. The reason is shown above.");
          return;
        }
        clipIdRef.current = reply.clip.clip_id;
        secondsRef.current = reply.clip.seconds;
        setClipSeconds(reply.clip.seconds);
        setPhase("building");
        timeoutRef.current = setTimeout(() => {
          void finish(
            "Stopped after 6 minutes without a finished clip, to protect your credits.",
          );
        }, SAFETY_TIMEOUT_MS);
      } catch (e) {
        await finish(describe(e));
      }
    },
    [
      connect,
      disconnect,
      enqueue,
      finish,
      setAutoplay,
      setCanvas,
      status,
      uploadFile,
    ],
  );

  const cancel = useCallback(async () => {
    if (!activeRef.current) {
      await closeSession();
      return;
    }
    await finish("Cancelled.");
  }, [closeSession, finish]);

  const clearResult = useCallback(() => {
    setResult(null);
    setSavedPath(null);
    setError(null);
    setBilledSeconds(null);
    setPhase("idle");
  }, []);

  return {
    status,
    phase,
    error,
    result,
    savedPath,
    clipSeconds,
    playStartedAt,
    connectedAt,
    billedSeconds,
    busy: phase !== "idle" && phase !== "done",
    generate,
    cancel,
    clearResult,
  };
}
