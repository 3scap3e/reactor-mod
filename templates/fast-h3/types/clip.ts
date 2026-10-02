export type ClipPhase =
  | "idle"
  | "connecting"
  | "uploading"
  | "queueing"
  | "building"
  | "playing"
  | "saving"
  | "done";

export interface SingleClipInput {
  prompt: string;
  seconds: number;
  startingFrame: File | null;
}

export const CLIP_SECONDS_MIN = 5.167;
export const CLIP_SECONDS_MAX = 14.375;
export const CLIP_SECONDS_DEFAULT = 8;
export const MAX_PROMPT_CHARS = 800;
export const CONNECT_ATTEMPTS = 2;
export const SAFETY_TIMEOUT_MS = 6 * 60 * 1000;
export const FAST_H3_PRICE_PER_SECOND = 0.0125;
