export type StepStatus = "pending" | "running" | "done" | "error";

export type JobStatus = "pending" | "running" | "complete" | "error" | "legacy";

export type StyleName =
  | "Funk Soul"
  | "Funk Noir"
  | "Cold War Funk Noir"
  | "Political Soul"
  | "Cinematic Soul Funk"
  | "Upbeat Cinematic Soul Funk";

export interface Job {
  id: string;
  title: string;
  artists: string;
  style: StyleName;
  decade: string;
  bpm: number;
  budapestYear: number;
  moodLine: string;
  releaseYear?: string;
  status: JobStatus;
  currentStep: number;
  stepStatuses: StepStatus[];
  createdAt: string;
  completedAt?: string;
  outputDir?: string;
  waitingFor?: AwaitingInputType | null;
  waitingPayload?: unknown;
  lyrics?: string;
}

export interface StyleOption {
  name: StyleName;
  decade: string;
  energy: string;
  defaultYear: number;
  defaultBpm: number;
}

export interface PipelineStepEvent {
  step: number;
  status: StepStatus;
  progress: number;
  message: string;
}

export interface PipelineLogEvent {
  timestamp: string;
  message: string;
  level: "info" | "success" | "error";
}

export interface PipelineCompleteEvent {
  videoPath: string;
  thumbnailPath: string;
  metadataPath: string;
}

export interface SongSelectionPayload {
  clips: Array<{
    id: string;
    streamUrl?: string;
    audioUrl?: string;
    title?: string;
    duration?: number;
  }>;
}

export interface ThumbnailReviewPayload {
  thumbnailUrl: string; // served via /api/jobs/[id]/download?file=thumbnail_raw
}

export interface VideoReviewPayload {
  videoUrl: string;
  thumbnailUrl: string;
  duration?: number;
}

export type AwaitingInputType = "song_selection" | "thumbnail_review" | "video_review";

export interface AwaitingInputEvent {
  type: AwaitingInputType;
  payload: SongSelectionPayload | ThumbnailReviewPayload | VideoReviewPayload;
}

export interface ResearchCandidate {
  artists: string;
  title: string;
  style: StyleName;
  decade: string;
  bpm: number;
  reasoning: string;
}

export const STYLE_OPTIONS: StyleOption[] = [
  { name: "Funk Soul", decade: "1970s", energy: "Warm, soulful, melodic", defaultYear: 1974, defaultBpm: 90 },
  { name: "Funk Noir", decade: "1960s", energy: "Dark, gritty, street level", defaultYear: 1968, defaultBpm: 88 },
  { name: "Cold War Funk Noir", decade: "1960s", energy: "Political, apocalyptic", defaultYear: 1968, defaultBpm: 88 },
  { name: "Political Soul", decade: "1970s", energy: "Bittersweet, isolated", defaultYear: 1975, defaultBpm: 90 },
  { name: "Upbeat Cinematic Soul Funk", decade: "1970s", energy: "Energetic, danceable", defaultYear: 1974, defaultBpm: 96 },
  { name: "Cinematic Soul Funk", decade: "1970s", energy: "Cinematic fatalism", defaultYear: 1974, defaultBpm: 90 },
];

export const PIPELINE_STEPS = [
  { number: 1, name: "SUNO GENERATION" },
  { number: 2, name: "THUMBNAIL — GEMINI" },
  { number: 3, name: "BRANDING COMPOSITE" },
  { number: 4, name: "VIDEO ASSEMBLY" },
  { number: 5, name: "VIDEO REVIEW" },
  { number: 6, name: "METADATA PACKAGE" },
];

// ── Asset System ──────────────────────────────────────────────────────────────

export type AssetType = "song" | "thumbnail" | "video";

export interface Asset {
  id: string;
  type: AssetType;
  title: string;
  artists: string;
  style?: StyleName;
  filePath: string;
  fileName: string;
  fileSize?: number;
  duration?: number;
  jobId?: string;
  sunoClipId?: string;
  createdAt: string;
  meta?: Record<string, unknown>;
}
