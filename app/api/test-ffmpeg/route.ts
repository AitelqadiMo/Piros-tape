import { NextRequest, NextResponse } from "next/server";
import { diagnoseFFmpeg } from "@/lib/ffmpeg";

export async function GET() {
  const diagnosis = diagnoseFFmpeg();
  
  return NextResponse.json({
    ffmpeg: diagnosis,
    environment: {
      FFMPEG_PATH: process.env.FFMPEG_PATH || "not set",
      OUTPUT_DIR: process.env.OUTPUT_DIR || "not set",
      NODE_ENV: process.env.NODE_ENV,
    },
  });
}
