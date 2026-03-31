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
  const resp = await fetch(`${SUNO_BASE}/api/v1/generate`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${params.apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      customMode: true,
      instrumental: true,
      model: "V4_5ALL",
      prompt: params.prompt,
      style: params.style,
      title: params.title,
    }),
  });

  if (!resp.ok) {
    const text = await resp.text();
    throw new Error(`Suno API error ${resp.status}: ${text}`);
  }

  const json = await resp.json();
  // Response shape: { code: 200, data: [clip, clip] } or direct array
  const clips: SunoClip[] = Array.isArray(json)
    ? json
    : Array.isArray(json.data)
    ? json.data
    : [];

  if (clips.length === 0) throw new Error("Suno returned no clips");
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
