import { promises as fs } from "fs";
import path from "path";

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

const SUNO_BASE = "https://api.sunoapi.org";
const SUNO_PENDING_STATUSES = new Set(["PENDING", "TEXT_SUCCESS", "FIRST_SUCCESS"]);
const SUNO_ERROR_STATUSES = new Set([
  "CREATE_TASK_FAILED",
  "GENERATE_AUDIO_FAILED",
  "CALLBACK_EXCEPTION",
  "SENSITIVE_WORD_ERROR",
]);

export interface SunoClip {
  id: string;
  status: string;
  audio_url?: string;
  stream_url?: string;
  title?: string;
  duration?: number;
  image_url?: string;
  taskId?: string;
}

interface SunoTaskResponse {
  code?: number;
  msg?: string;
  data?: {
    taskId?: string;
    status?: string;
    errorCode?: string | null;
    errorMessage?: string | null;
    response?: {
      taskId?: string;
      sunoData?: unknown[];
    };
    clips?: unknown[];
    audios?: unknown[];
    list?: unknown[];
    data?: unknown[];
    id?: string;
  };
  clips?: unknown[];
  audios?: unknown[];
}

function extractTaskId(json: unknown): string | undefined {
  if (!json || typeof json !== "object") return undefined;

  const record = json as {
    taskId?: unknown;
    id?: unknown;
    data?: {
      taskId?: unknown;
      id?: unknown;
    };
  };

  const taskId = record.data?.taskId ?? record.data?.id ?? record.taskId ?? record.id;
  return typeof taskId === "string" && taskId ? taskId : undefined;
}

function normalizeTaskStatus(status?: string): string {
  if (!status) return "pending";
  if (status === "SUCCESS") return "complete";
  if (SUNO_PENDING_STATUSES.has(status)) return "pending";
  if (SUNO_ERROR_STATUSES.has(status)) return "failed";
  return "pending";
}

function normalizeClip(rawClip: unknown, fallbackStatus: string, taskId?: string): SunoClip | null {
  if (!rawClip || typeof rawClip !== "object") return null;

  const clip = rawClip as {
    id?: unknown;
    status?: unknown;
    audio_url?: unknown;
    audioUrl?: unknown;
    sourceAudioUrl?: unknown;
    stream_url?: unknown;
    streamUrl?: unknown;
    streamAudioUrl?: unknown;
    sourceStreamAudioUrl?: unknown;
    title?: unknown;
    duration?: unknown;
    image_url?: unknown;
    imageUrl?: unknown;
    sourceImageUrl?: unknown;
  };

  if (typeof clip.id !== "string" || !clip.id) return null;

  const audioUrlCandidates = [
    clip.audio_url,
    clip.audioUrl,
    clip.sourceAudioUrl,
    clip.stream_url,
    clip.streamUrl,
    clip.streamAudioUrl,
    clip.sourceStreamAudioUrl,
  ];
  const streamUrlCandidates = [
    clip.stream_url,
    clip.streamUrl,
    clip.streamAudioUrl,
    clip.sourceStreamAudioUrl,
    clip.audio_url,
    clip.audioUrl,
  ];
  const imageUrlCandidates = [clip.image_url, clip.imageUrl, clip.sourceImageUrl];

  const audio_url = audioUrlCandidates.find((value): value is string => typeof value === "string" && value.length > 0);
  const stream_url = streamUrlCandidates.find((value): value is string => typeof value === "string" && value.length > 0);
  const image_url = imageUrlCandidates.find((value): value is string => typeof value === "string" && value.length > 0);

  const status =
    typeof clip.status === "string" && clip.status
      ? clip.status.toLowerCase()
      : audio_url || stream_url
        ? fallbackStatus === "complete"
          ? "complete"
          : "running"
        : fallbackStatus;

  return {
    id: clip.id,
    status,
    audio_url,
    stream_url,
    title: typeof clip.title === "string" ? clip.title : undefined,
    duration: typeof clip.duration === "number" ? clip.duration : undefined,
    image_url,
    taskId,
  };
}

function extractClips(json: unknown): SunoClip[] {
  if (Array.isArray(json)) {
    return json
      .map((clip) => normalizeClip(clip, "pending"))
      .filter((clip): clip is SunoClip => clip !== null);
  }

  if (!json || typeof json !== "object") return [];

  const record = json as SunoTaskResponse;
  const taskId = extractTaskId(json);
  const taskStatus = normalizeTaskStatus(record.data?.status);
  const collections = [
    record.data?.response?.sunoData,
    record.data?.clips,
    record.data?.audios,
    record.data?.list,
    record.data?.data,
    record.clips,
    record.audios,
  ];

  for (const collection of collections) {
    if (!Array.isArray(collection)) continue;
    const clips = collection
      .map((clip) => normalizeClip(clip, taskStatus, taskId))
      .filter((clip): clip is SunoClip => clip !== null);
    if (clips.length > 0) {
      return clips;
    }
  }

  return [];
}

function getTaskStatus(json: unknown): string {
  if (!json || typeof json !== "object") return "pending";
  const record = json as SunoTaskResponse;
  return normalizeTaskStatus(record.data?.status);
}

/**
 * Generate 2 instrumental songs via sunoapi.org (custom mode, V4_5ALL).
 * Returns the initial clip objects (status will be "pending").
 */
export async function generateMusic(params: {
  prompt: string;
  style: string;
  title: string;
  apiKey: string;
}): Promise<SunoClip[]> {
  console.log("[Suno.generateMusic] Starting with title:", params.title);

  const requestBody = {
    customMode: true,
    prompt: params.prompt,
    style: params.style,
    title: params.title,
    instrumental: true,
    model: "V4_5ALL",
    callBackUrl: "http://example.com/callback",
  };

  try {
    const bodyStr = JSON.stringify(requestBody);
    console.log("[Suno.generateMusic] Request body:", bodyStr.slice(0, 300));
  } catch (e) {
    console.log("[Suno.generateMusic] Request body logging failed:", e);
  }

  const resp = await fetch(`${SUNO_BASE}/api/v1/generate`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${params.apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(requestBody),
  });

  console.log("[Suno.generateMusic] Response status:", resp.status);

  if (!resp.ok) {
    const text = await resp.text();
    console.error("[Suno.generateMusic] Error response:", text);
    throw new Error(`Suno API error ${resp.status}: ${text}`);
  }

  const json = (await resp.json()) as SunoTaskResponse;
  console.log("[Suno.generateMusic] Full response JSON:", JSON.stringify(json));

  if (json.code && json.code !== 200) {
    console.error(`[Suno.generateMusic] API returned error code ${json.code}: ${json.msg}`);
    throw new Error(`Suno API error: ${json.msg}`);
  }

  const clips = extractClips(json);
  console.log("[Suno.generateMusic] Extracted clips:", clips.length);
  if (clips.length > 0) {
    console.log("[Suno.generateMusic] Clip sample:", clips[0]);
    return clips;
  }

  const taskId = extractTaskId(json);
  if (taskId) {
    console.log("[Suno.generateMusic] Got task ID, will poll record-info:", taskId);
    return [
      {
        id: taskId,
        status: "pending",
        taskId,
      },
    ];
  }

  console.error("[Suno.generateMusic] ERROR: No clips in response. Full response was:", JSON.stringify(json));
  throw new Error(`Suno API error: No clips generated. Response: ${json.msg || JSON.stringify(json)}`);
}

/**
 * Poll all clips until all are complete (or one fails).
 * Returns resolved clips with audio_url populated.
 */
export async function pollClips(
  clips: SunoClip[],
  apiKey: string,
  onProgress: (attempt: number, statuses: string[]) => void
): Promise<SunoClip[]> {
  let current = [...clips];
  const taskId = clips[0]?.taskId ?? clips[0]?.id;

  if (!taskId) {
    throw new Error("Suno polling requires a task ID");
  }

  for (let i = 0; i < 36; i++) {
    await sleep(10000);

    try {
      const detailsUrl = new URL(`${SUNO_BASE}/api/v1/generate/record-info`);
      detailsUrl.searchParams.set("taskId", taskId);

      const resp = await fetch(detailsUrl, {
        headers: { Authorization: `Bearer ${apiKey}` },
      });

      if (!resp.ok) {
        throw new Error(`Suno polling error ${resp.status}`);
      }

      const json = (await resp.json()) as SunoTaskResponse;
      if (json.code && json.code !== 200) {
        throw new Error(`Suno polling error: ${json.msg}`);
      }

      const taskStatus = getTaskStatus(json);
      const extracted = extractClips(json);
      current = extracted.length > 0 ? extracted : current.map((clip) => ({ ...clip, status: taskStatus }));

      onProgress(i + 1, current.map((clip) => clip.status));

      if (taskStatus === "failed" || current.some((clip) => clip.status === "failed" || clip.status === "error")) {
        throw new Error(json.data?.errorMessage || "One or more Suno clips failed to generate");
      }

      const allDone =
        taskStatus === "complete" &&
        current.length > 0 &&
        current.every((clip) => Boolean(clip.audio_url || clip.stream_url || clip.status === "complete"));

      if (allDone) {
        return current.map((clip) => ({
          ...clip,
          status: "complete",
          taskId,
        }));
      }
    } catch (err) {
      console.error(`[Poll] Error polling task ${taskId}:`, err);
      if (i === 35) throw err;
    }
  }

  throw new Error("Suno generation timed out after 6 minutes");
}

export async function downloadAudio(url: string, outputPath: string): Promise<void> {
  const dir = path.dirname(outputPath);
  await fs.mkdir(dir, { recursive: true });

  const resp = await fetch(url);
  if (!resp.ok) throw new Error(`Failed to download audio: ${resp.status}`);

  const buffer = Buffer.from(await resp.arrayBuffer());
  await fs.writeFile(outputPath, buffer);
}

/**
 * Test whether a Suno API key is valid by listing recent generations.
 */
export async function testSunoKey(apiKey: string): Promise<boolean> {
  try {
    const resp = await fetch(`${SUNO_BASE}/api/v1/generate?page=1&pageSize=1`, {
      headers: { Authorization: `Bearer ${apiKey}` },
    });
    return resp.status !== 401 && resp.status !== 403;
  } catch {
    return false;
  }
}
