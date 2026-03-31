import { promises as fs } from "fs";
import path from "path";

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

const SUNO_BASE = "https://api.sunoapi.org";

export interface SunoClip {
  id: string;
  status: string;
  audio_url?: string;
  stream_url?: string;
  title?: string;
  duration?: number;
  image_url?: string;
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
  
  // Build the request - some Suno API versions require specific fields
  const requestBody = {
    customMode: true,
    instrumental: true,
    model: "V4_5ALL",
    prompt: params.prompt,
    style: params.style,
    title: params.title,
    callBackUrl: "https://localhost:3000",  // Required by some Suno API versions
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

  const json = await resp.json();
  console.log("[Suno.generateMusic] Full response JSON:", JSON.stringify(json));
  
  // Handle error responses from API (code != 200)
  if (json.code && json.code !== 200) {
    console.error(`[Suno.generateMusic] API returned error code ${json.code}: ${json.msg}`);
    throw new Error(`Suno API error: ${json.msg}`);
  }
  
  // Response shape varies - try multiple paths to find clips
  let clips: SunoClip[] = [];
  
  if (Array.isArray(json)) {
    // Direct array response
    clips = json;
  } else if (json.data) {
    if (Array.isArray(json.data)) {
      // Array in data field
      clips = json.data;
    } else if (json.data.clips && Array.isArray(json.data.clips)) {
      // Nested in data.clips
      clips = json.data.clips;
    } else if (json.data.audios && Array.isArray(json.data.audios)) {
      // Some Suno versions use 'audios'
      clips = json.data.audios;
    } else if (json.data.list && Array.isArray(json.data.list)) {
      // Some versions use 'list'
      clips = json.data.list;
    } else if (typeof json.data === 'object' && !Array.isArray(json.data) && json.data.id) {
      // Single clip as object
      clips = [json.data];
    }
  } else if (json.audios && Array.isArray(json.audios)) {
    // Top-level audios field
    clips = json.audios;
  } else if (json.clips && Array.isArray(json.clips)) {
    // Top-level clips field
    clips = json.clips;
  }

  console.log("[Suno.generateMusic] Extracted clips:", clips.length);
  if (clips.length > 0) {
    console.log("[Suno.generateMusic] Clip sample:", clips[0]);
  }

  if (clips.length === 0) {
    console.error("[Suno.generateMusic] ERROR: No clips in response. Full response was:", JSON.stringify(json));
    // Don't fail yet - maybe Suno only returns task ID and we need to poll
    // Extract task ID or other identifier for polling
    const taskId = json.data?.id || json.id || json.taskId;
    if (taskId) {
      console.log("[Suno.generateMusic] Got task ID, will need to poll:", taskId);
      // Return a placeholder clip object with just the ID
      return [{
        id: String(taskId),
        status: "pending",
      } as SunoClip];
    }
    throw new Error(`Suno API error: No clips generated. Response: ${json.msg || JSON.stringify(json)}`);
  }
  return clips;
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

  for (let i = 0; i < 36; i++) {
    await sleep(10000);

    const polled = await Promise.all(
      current.map(async (clip) => {
        if (clip.status === "complete") return clip; // already done
        try {
          const resp = await fetch(`${SUNO_BASE}/api/v1/generate/${clip.id}`, {
            headers: { Authorization: `Bearer ${apiKey}` },
          });
          if (!resp.ok) return clip;
          const json = await resp.json();
          return (json.data ?? json) as SunoClip;
        } catch {
          return clip;
        }
      })
    );

    current = polled;
    onProgress(i + 1, polled.map((c) => c.status));

    const anyFailed = polled.some(
      (c) => c.status === "error" || c.status === "failed"
    );
    if (anyFailed) throw new Error("One or more Suno clips failed to generate");

    const allDone = polled.every((c) => c.status === "complete");
    if (allDone) return polled;
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
