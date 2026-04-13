import { GoogleGenAI } from "@google/genai";
import { promises as fs } from "fs";
import path from "path";

// Nano Banana 2 = gemini-3.1-flash-image-preview (see Gemini API image-generation docs)
const DEFAULT_IMAGE_MODEL = process.env.GEMINI_IMAGE_MODEL || "gemini-3.1-flash-image-preview";
const IMAGE_FALLBACK_MODELS = (
  process.env.GEMINI_IMAGE_MODEL_FALLBACKS || "gemini-2.5-flash-image"
)
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

const TEXT_MODEL = "gemini-2.5-flash";
const IMAGE_TIMEOUT_MS = Number(process.env.GEMINI_IMAGE_TIMEOUT_MS || 45_000);
const TEXT_TIMEOUT_MS = Number(process.env.GEMINI_TEXT_TIMEOUT_MS || 30_000);
const IMAGE_ASPECT_RATIO = process.env.GEMINI_IMAGE_ASPECT_RATIO || "16:9";
const IMAGE_SIZE = process.env.GEMINI_IMAGE_SIZE || "1K";
const IMAGE_RETRY_MAX = Math.min(5, Math.max(1, Number(process.env.GEMINI_IMAGE_RETRIES || 3)));

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** True when the API is overloaded or the request may succeed on retry / fallback model. */
function isTransientImageError(err: unknown): boolean {
  const s = err instanceof Error ? err.message : String(err);
  return (
    /"code":(500|503|429|408)/.test(s) ||
    /\b(INTERNAL|UNAVAILABLE|RESOURCE_EXHAUSTED|DEADLINE_EXCEEDED)\b/i.test(s)
  );
}

/**
 * Image models use different config shapes in the official docs:
 * - gemini-3.x image preview: responseModalities TEXT then IMAGE, plus imageConfig
 * - gemini-2.5-flash-image: imageConfig (aspect ratio) only
 */
function buildImageGenerateConfig(
  model: string,
  signal: AbortSignal
): {
  abortSignal: AbortSignal;
  responseModalities?: string[];
  imageConfig: { aspectRatio: string; imageSize?: string };
} {
  const baseAspect = IMAGE_ASPECT_RATIO;
  if (model.includes("gemini-2.5-flash-image")) {
    return {
      abortSignal: signal,
      imageConfig: { aspectRatio: baseAspect },
    };
  }
  return {
    abortSignal: signal,
    // Order matters: docs use TEXT before IMAGE (not IMAGE, TEXT)
    responseModalities: ["TEXT", "IMAGE"],
    imageConfig: {
      aspectRatio: baseAspect,
      imageSize: IMAGE_SIZE,
    },
  };
}

async function writeFirstImagePartToFile(
  response: Awaited<ReturnType<GoogleGenAI["models"]["generateContent"]>>,
  outputPath: string
): Promise<void> {
  const candidates = response.candidates;
  if (!candidates || candidates.length === 0) {
    throw new Error("Gemini returned no candidates");
  }

  const parts = candidates[0].content?.parts || [];
  const textParts: string[] = [];

  for (const part of parts) {
    if (part.inlineData && part.inlineData.mimeType?.startsWith("image/")) {
      const dir = path.dirname(outputPath);
      await fs.mkdir(dir, { recursive: true });
      const buffer = Buffer.from(part.inlineData.data!, "base64");
      await fs.writeFile(outputPath, buffer);
      return;
    }
    if (part.text) {
      textParts.push(part.text);
    }
  }

  const filteredReason = candidates[0].finishMessage || candidates[0].finishReason;
  const textReason = textParts.join(" ").trim();
  throw new Error(
    textReason ||
      (typeof filteredReason === "string" ? filteredReason : "") ||
      "Gemini response did not contain image data"
  );
}

async function generateThumbnailWithModel(
  imagePrompt: string,
  apiKey: string,
  outputPath: string,
  model: string
): Promise<void> {
  const ai = new GoogleGenAI({ apiKey });
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), IMAGE_TIMEOUT_MS);

  try {
    const response = await ai.models.generateContent({
      model,
      contents: imagePrompt,
      config: buildImageGenerateConfig(model, controller.signal),
    });
    await writeFirstImagePartToFile(response, outputPath);
  } catch (error) {
    if (controller.signal.aborted) {
      throw new Error(`Thumbnail generation timed out after ${Math.round(IMAGE_TIMEOUT_MS / 1000)}s`);
    }
    throw error;
  } finally {
    clearTimeout(timer);
  }
}

export async function generateThumbnail(
  imagePrompt: string,
  apiKey: string,
  outputPath: string
): Promise<void> {
  const primary = DEFAULT_IMAGE_MODEL;
  const fallbacks = IMAGE_FALLBACK_MODELS.filter((m) => m !== primary);
  const modelsToTry = [primary, ...fallbacks];
  let lastError: unknown;

  for (const model of modelsToTry) {
    for (let attempt = 0; attempt < IMAGE_RETRY_MAX; attempt++) {
      try {
        await generateThumbnailWithModel(imagePrompt, apiKey, outputPath, model);
        return;
      } catch (err) {
        lastError = err;
        if (!isTransientImageError(err)) {
          throw err instanceof Error ? err : new Error(String(err));
        }
        if (attempt < IMAGE_RETRY_MAX - 1) {
          await sleep(800 * (attempt + 1));
          continue;
        }
        break;
      }
    }
  }

  throw lastError instanceof Error
    ? lastError
    : new Error(String(lastError));
}

export async function generateSceneDescription(
  prompt: string,
  apiKey: string
): Promise<string> {
  const ai = new GoogleGenAI({ apiKey });
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TEXT_TIMEOUT_MS);
  try {
    const response = await ai.models.generateContent({
      model: TEXT_MODEL,
      contents: prompt,
      config: {
        abortSignal: controller.signal,
      },
    });
    return response.text || "";
  } finally {
    clearTimeout(timer);
  }
}

export async function researchSongs(
  query: string,
  systemPrompt: string,
  apiKey: string
): Promise<string> {
  const ai = new GoogleGenAI({ apiKey });
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TEXT_TIMEOUT_MS);
  try {
    const response = await ai.models.generateContent({
      model: TEXT_MODEL,
      contents: query,
      config: {
        abortSignal: controller.signal,
        systemInstruction: systemPrompt,
      },
    });
    return response.text || "";
  } finally {
    clearTimeout(timer);
  }
}

export async function fetchLyrics(
  artist: string,
  title: string,
  apiKey: string
): Promise<{ lyrics: string | null; found: boolean }> {
  const ai = new GoogleGenAI({ apiKey });
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TEXT_TIMEOUT_MS);
  const prompt = `Find the complete lyrics for the song "${title}" by ${artist}. Return ONLY the lyrics text, no commentary, no translations, no headings. If you cannot find the lyrics or are not confident they are accurate, respond with exactly the word: NOT_FOUND`;
  try {
    const response = await ai.models.generateContent({
      model: TEXT_MODEL,
      contents: prompt,
      config: {
        abortSignal: controller.signal,
      },
    });
    const text = (response.text || "").trim();
    if (text === "NOT_FOUND" || text.length < 50) {
      return { lyrics: null, found: false };
    }
    return { lyrics: text, found: true };
  } catch {
    return { lyrics: null, found: false };
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Test whether a Gemini API key is valid with a tiny text generation.
 */
export async function testGeminiKey(apiKey: string): Promise<boolean> {
  try {
    const ai = new GoogleGenAI({ apiKey });
    const response = await ai.models.generateContent({
      model: TEXT_MODEL,
      contents: "Say ok",
    });
    return !!(response.text);
  } catch {
    return false;
  }
}
