import { NextRequest, NextResponse } from "next/server";
import { generateThumbnail } from "@/lib/gemini";
import { buildImagePrompt } from "@/lib/prompts";
import { createAsset } from "@/lib/assets";
import { getArtistImagePath } from "@/lib/artist-images";
import { promises as fs } from "fs";
import path from "path";
import { Job, StyleName } from "@/lib/types";

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { title, artists, style, decade, budapestYear, moodLine, customPrompt } = body as {
    title: string;
    artists: string;
    style?: StyleName;
    decade?: string;
    budapestYear?: number;
    moodLine?: string;
    customPrompt?: string;
  };

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "GEMINI_API_KEY not configured" }, { status: 500 });
  }

  if (!title || !artists) {
    return NextResponse.json({ error: "title and artists are required" }, { status: 400 });
  }

  try {
    // Try to get artist images for reference
    const artistNames = artists.split(" × ").map((a) => a.trim());
    const artistImages: (string | null)[] = [];
    
    for (const artistName of artistNames) {
      const imagePath = await getArtistImagePath(artistName);
      artistImages.push(imagePath);
    }

    const imagePrompt = customPrompt || buildImagePrompt({
      title,
      artists,
      style: style || "Funk Soul",
      decade: decade || "1970",
      budapestYear: budapestYear || 1974,
      moodLine: moodLine || "",
    } as Job, artistImages.filter((img) => img !== null) as string[]);

    const outputDir = path.resolve(process.env.OUTPUT_DIR || "./output", "standalone");
    await fs.mkdir(outputDir, { recursive: true });

    const fileName = `${title.replace(/[^a-zA-Z0-9]/g, "_")}_thumb_${Date.now()}.jpg`;
    const filePath = path.join(outputDir, fileName);

    await generateThumbnail(imagePrompt, apiKey, filePath);
    const stat = await fs.stat(filePath);

    const asset = await createAsset({
      type: "thumbnail",
      title,
      artists,
      style: style || "Funk Soul",
      filePath,
      fileName,
      fileSize: stat.size,
    });

    return NextResponse.json({ asset });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }
}
