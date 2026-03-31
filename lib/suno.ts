import { promises as fs } from "fs";
import path from "path";

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export async function generateMusic(
  prompt: string,
  apiKey: string,
  baseUrl?: string
): Promise<string> {
  const base = baseUrl || process.env.SUNO_BASE_URL || "https://studio-api.suno.ai";
  const url = `${base}/api/generate`;

  const resp = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      prompt,
      make_instrumental: true,
      wait_audio: false,
    }),
  });

  if (!resp.ok) {
    // Try alternate endpoint
    const altUrl = "https://suno.ai/api/generate";
    const altResp = await fetch(altUrl, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        prompt,
        make_instrumental: true,
        wait_audio: false,
      }),
    });
    if (!altResp.ok) {
      throw new Error(`Suno API error: ${resp.status} ${resp.statusText}`);
    }
    const altData = await altResp.json();
    return altData[0].id;
  }

  const data = await resp.json();
  return data[0].id;
}

export async function pollClipStatus(
  clipId: string,
  apiKey: string,
  onProgress: (attempt: number, status: string) => void,
  baseUrl?: string
): Promise<string> {
  const base = baseUrl || process.env.SUNO_BASE_URL || "https://studio-api.suno.ai";

  for (let i = 0; i < 36; i++) {
    await sleep(10000);
    const resp = await fetch(`${base}/api/clip/${clipId}`, {
      headers: { Authorization: `Bearer ${apiKey}` },
    });

    if (!resp.ok) {
      onProgress(i, `poll error: ${resp.status}`);
      continue;
    }

    const clip = await resp.json();
    onProgress(i, clip.status);

    if (clip.status === "complete") {
      return clip.audio_url;
    }

    if (clip.status === "error" || clip.status === "failed") {
      throw new Error(`Suno generation failed: ${clip.status}`);
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
