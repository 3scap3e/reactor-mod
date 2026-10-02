export interface GenerationLimitState {
  maxSeconds: number;
  finished: boolean;
  setMaxSeconds: (seconds: number) => void;
  setFinished: (finished: boolean) => void;
}

export const HELIOS_FPS = 24;
export const HELIOS_FRAMES_PER_CHUNK = 33;
export const MIN_SECONDS = 2;
export const MAX_SECONDS = 600;
export const DEFAULT_SECONDS = 10;
export const CONNECT_ATTEMPTS = 2;
