import { promises as fs } from "fs";
import path from "path";
import { createAsset, getAssetsByType } from "./assets";
import { Asset } from "./types";
import { GoogleGenAI } from "@google/genai";

const TEXT_MODEL = "gemini-2.5-flash";
const TEXT_TIMEOUT_MS = Number(process.env.GEMINI_TEXT_TIMEOUT_MS || 30_000);

/**
 * Download an image from a URL and save it locally
 */
async function downloadImage(url: string, outputPath: string): Promise<void> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to download image from ${url}: ${response.statusText}`);
  }
  
  const buffer = await response.arrayBuffer();
  const dir = path.dirname(outputPath);
  await fs.mkdir(dir, { recursive: true });
  await fs.writeFile(outputPath, Buffer.from(buffer));
}

/**
 * Use Gemini to search for a public image URL of an artist
 */
async function findArtistImageUrl(artistName: string, apiKey: string): Promise<string | null> {
  try {
    const ai = new GoogleGenAI({ apiKey });
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TEXT_TIMEOUT_MS);

    const prompt = `Find a high-quality, publicly available image URL of the musician or band "${artistName}". 
The image should be a professional photo suitable for music promotion (headshot, band photo, or publicity photo).
Return ONLY the direct image URL, nothing else. If you cannot find a suitable public image URL, respond with: NOT_FOUND`;

    try {
      const response = await ai.models.generateContent({
        model: TEXT_MODEL,
        contents: prompt,
        config: {
          abortSignal: controller.signal,
        },
      });

      const url = (response.text || "").trim();
      
      // Validate it looks like a URL
      if (url === "NOT_FOUND" || !url.startsWith("http")) {
        return null;
      }

      return url;
    } finally {
      clearTimeout(timer);
    }
  } catch (err) {
    console.error(`Error finding artist image URL for ${artistName}:`, err);
    return null;
  }
}

/**
 * Get or fetch artist image from cache or web
 * Returns the local file path if successful, null otherwise
 */
export async function getArtistImagePath(
  artistName: string,
  apiKey?: string
): Promise<string | null> {
  // First, check if we have a cached artist image
  const cachedAssets = await getAssetsByType("artist_image");
  const cached = cachedAssets.find(
    (a: Asset) => a.artistName?.toLowerCase() === artistName.toLowerCase()
  );
  
  if (cached) {
    try {
      await fs.access(cached.filePath);
      return cached.filePath;
    } catch {
      // Cached file doesn't exist, we'll fetch a new one
    }
  }

  // If we have an API key, try to fetch a new image
  if (apiKey) {
    try {
      const imageUrl = await findArtistImageUrl(artistName, apiKey);
      if (imageUrl) {
        return await cacheArtistImage(artistName, imageUrl);
      }
    } catch (err) {
      console.error(`Error fetching artist image for ${artistName}:`, err);
    }
  }

  return null;
}

/**
 * Cache an artist image from a URL
 */
export async function cacheArtistImage(
  artistName: string,
  imageUrl: string
): Promise<string> {
  const outputDir = path.resolve(process.env.OUTPUT_DIR || "./output", "artist_images");
  const fileName = `${artistName.replace(/[^a-zA-Z0-9]/g, "_")}_${Date.now()}.jpg`;
  const filePath = path.join(outputDir, fileName);

  await downloadImage(imageUrl, filePath);
  const stat = await fs.stat(filePath);

  await createAsset({
    type: "artist_image",
    title: `${artistName} Artist Photo`,
    artists: artistName,
    filePath,
    fileName,
    fileSize: stat.size,
    artistName,
    sourceUrl: imageUrl,
  });

  return filePath;
}

/**
 * Build a prompt segment that references actual artist images
 * Can be used in the image generation prompt to guide Gemini
 */
export function buildArtistReferencePrompt(
  artistNames: string[],
  imagePaths: (string | null)[]
): string {
  const validImages = imagePaths.filter((img) => img !== null) as string[];
  
  if (validImages.length === 0) {
    return "";
  }

  return `Reference the aesthetic and appearance from the provided artist reference images. Maintain realism and authenticity when depicting the featured performers.`;
}

/**
 * Fetch artist images for a song's artists
 * Useful to call when fetching lyrics so images are ready at the same time
 */
export async function fetchArtistImages(
  artistsString: string,
  apiKey: string
): Promise<{ [artistName: string]: string | null }> {
  const artistNames = artistsString
    .split(" × ")
    .map((a) => a.trim())
    .filter(Boolean);

  const results: { [artistName: string]: string | null } = {};

  // Fetch images in parallel
  await Promise.all(
    artistNames.map(async (artistName) => {
      results[artistName] = await getArtistImagePath(artistName, apiKey);
    })
  );

  return results;
}
