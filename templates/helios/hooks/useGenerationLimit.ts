import { create } from "zustand";
import {
  DEFAULT_SECONDS,
  MAX_SECONDS,
  MIN_SECONDS,
  type GenerationLimitState,
} from "../types/generation";

export const useGenerationLimit = create<GenerationLimitState>((set) => ({
  maxSeconds: DEFAULT_SECONDS,
  finished: false,
  setMaxSeconds: (seconds) =>
    set({
      maxSeconds: Math.min(
        MAX_SECONDS,
        Math.max(MIN_SECONDS, Math.round(seconds) || MIN_SECONDS),
      ),
    }),
  setFinished: (finished) => set({ finished }),
}));
