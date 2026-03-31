import { NextRequest, NextResponse } from "next/server";
import { fetchLyrics } from "@/lib/gemini";

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

    const result = await fetchLyrics(artist, title, apiKey);
    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
