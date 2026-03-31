import sharp from "sharp";
import path from "path";
import { promises as fs } from "fs";
import { Job } from "./types";

export async function compositeThumbnail(
  rawImagePath: string,
  outputPath: string,
  job: Job
): Promise<void> {
  const dir = path.dirname(outputPath);
  await fs.mkdir(dir, { recursive: true });

  // Resize raw image to 1920x1080
  const resized = await sharp(rawImagePath)
    .resize(1920, 1080, { fit: "cover" })
    .toBuffer();

  // Create gradient overlay SVG (bottom 400px, 0 → 85% opacity)
  const gradientSvg = `<svg width="1920" height="1080" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="grad" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="#0A0604" stop-opacity="0"/>
        <stop offset="63%" stop-color="#0A0604" stop-opacity="0"/>
        <stop offset="100%" stop-color="#0A0604" stop-opacity="0.85"/>
      </linearGradient>
    </defs>
    <rect width="1920" height="1080" fill="url(#grad)"/>
  </svg>`;

  // Create text overlay SVG
  const escapedTitle = escapeXml(job.title);
  const escapedArtists = escapeXml(job.artists);
  const escapedStyle = escapeXml(`${job.decade}s ${job.style}`);

  const textSvg = `<svg width="1920" height="1080" xmlns="http://www.w3.org/2000/svg">
    <!-- PIROS TAPE pill top-left -->
    <rect x="48" y="36" width="148" height="32" rx="2" fill="#A01C12"/>
    <text x="122" y="57" text-anchor="middle"
      font-family="monospace" font-size="16" font-weight="600"
      letter-spacing="2" fill="#EDE8E2">PIROS TAPE</text>

    <!-- Artists line bottom-left -->
    <text x="48" y="960"
      font-family="monospace" font-size="30" font-weight="400"
      letter-spacing="1" fill="#C8BDB5">${escapedArtists}</text>

    <!-- Song title bottom-left -->
    <text x="48" y="1020"
      font-family="serif" font-size="64" font-weight="700"
      fill="#EDE8E2">${escapedTitle}</text>

    <!-- Style label bottom-right -->
    <text x="1872" y="1050" text-anchor="end"
      font-family="monospace" font-size="18"
      letter-spacing="1.5" fill="#8A7E74">${escapedStyle}</text>
  </svg>`;

  await sharp(resized)
    .composite([
      { input: Buffer.from(gradientSvg), blend: "over" },
      { input: Buffer.from(textSvg), blend: "over" },
    ])
    .jpeg({ quality: 92 })
    .toFile(outputPath);
}

function escapeXml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}
