import { NextRequest, NextResponse } from "next/server";
import { fetchLyrics } from "@/lib/gemini";
import { fetchArtistImages } from "@/lib/artist-images";

export async function POST(request: NextRequest) {
  try {
    const { artist, title } = await request.json();

    if (!artist || !title) {
      return NextResponse.json({ error: "artist and title are required" }, { status: 400 });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey || apiKey === "your_gemini_key_here") {
      return NextResponse.json({ error: "GEMINI_API_KEY not configured" }, { status: 500 });
    }

    // Fetch both lyrics and artist images in parallel
    const [lyricsResult, artistImages] = await Promise.all([
      fetchLyrics(artist, title, apiKey),
      fetchArtistImages(artist, apiKey),
    ]);

    return NextResponse.json({
      ...lyricsResult,
      artistImages,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
