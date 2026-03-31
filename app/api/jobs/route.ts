import { NextRequest, NextResponse } from "next/server";
import { readJobs, createJob } from "@/lib/jobs";
import { StyleName } from "@/lib/types";

export async function GET() {
  try {
    const jobs = await readJobs();
    return NextResponse.json({ jobs });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { artists, title, style, decade, bpm, budapestYear, moodLine, releaseYear } = body;

    if (!artists || !title || !style || !decade || !bpm || !budapestYear) {
      return NextResponse.json(
        { error: "Missing required fields: artists, title, style, decade, bpm, budapestYear" },
        { status: 400 }
      );
    }

    const job = await createJob({
      artists,
      title: title.toUpperCase(),
      style: style as StyleName,
      decade,
      bpm: Number(bpm),
      budapestYear: Number(budapestYear),
      moodLine: moodLine || "",
      releaseYear: releaseYear || undefined,
    });

    return NextResponse.json({ jobId: job.id });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
