"use client";

import { useState } from "react";

export default function SettingsPage() {
  const [sunoKey, setSunoKey] = useState("");
  const [geminiKey, setGeminiKey] = useState("");
  const [showSuno, setShowSuno] = useState(false);
  const [showGemini, setShowGemini] = useState(false);
  const [sunoStatus, setSunoStatus] = useState<"idle" | "testing" | "valid" | "invalid">("idle");
  const [geminiStatus, setGeminiStatus] = useState<"idle" | "testing" | "valid" | "invalid">("idle");

  // Pipeline defaults
  const [outputDir, setOutputDir] = useState("./output");
  const [crf, setCrf] = useState(18);
  const [audioBitrate, setAudioBitrate] = useState("320k");
  const [ffmpegPath, setFfmpegPath] = useState("/usr/bin/ffmpeg");

  const testSunoKey = async () => {
    setSunoStatus("testing");
    try {
      const resp = await fetch(
        `${process.env.NEXT_PUBLIC_SUNO_BASE_URL || "https://studio-api.suno.ai"}/api/clip/test`,
        { headers: { Authorization: `Bearer ${sunoKey}` } }
      );
      setSunoStatus(resp.status !== 403 ? "valid" : "invalid");
    } catch {
      setSunoStatus("invalid");
    }
  };

  const testGeminiKey = async () => {
    setGeminiStatus("testing");
    try {
      const resp = await fetch("/api/research", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: "test connection" }),
      });
      setGeminiStatus(resp.ok ? "valid" : "invalid");
    } catch {
      setGeminiStatus("invalid");
    }
  };

  const statusIcon = (status: string) => {
    switch (status) {
      case "valid":
        return <span className="text-tape">✓ Valid</span>;
      case "invalid":
        return <span className="text-crimson">✗ Invalid</span>;
      case "testing":
        return <span className="text-dust animate-pulse-opacity">Testing...</span>;
      default:
        return null;
    }
  };

  return (
    <div className="space-y-8 max-w-2xl">
      <h1 className="font-display text-2xl text-paper animate-fade-in">
        Settings
      </h1>

      {/* API Keys */}
      <section className="animate-fade-in animate-delay-1">
        <h2 className="font-mono text-[11px] uppercase tracking-wider text-dust mb-4">
          API Keys
        </h2>
        <div className="h-[1px] bg-noir-3 mb-4" />

        <div className="space-y-6">
          <div>
            <label className="font-mono text-[11px] uppercase tracking-wider text-dust block mb-2">
              Suno API Key
            </label>
            <div className="flex gap-2">
              <input
                type={showSuno ? "text" : "password"}
                value={sunoKey}
                onChange={(e) => setSunoKey(e.target.value)}
                placeholder="Enter Suno API key"
                className="flex-1"
              />
              <button
                onClick={() => setShowSuno(!showSuno)}
                className="btn-secondary text-[10px] px-3"
              >
                {showSuno ? "Hide" : "Show"}
              </button>
              <button
                onClick={testSunoKey}
                disabled={!sunoKey || sunoStatus === "testing"}
                className="btn-secondary text-[10px] px-3"
              >
                Test
              </button>
            </div>
            <div className="font-mono text-[11px] mt-1">
              {statusIcon(sunoStatus)}
            </div>
          </div>

          <div>
            <label className="font-mono text-[11px] uppercase tracking-wider text-dust block mb-2">
              Gemini API Key
            </label>
            <div className="flex gap-2">
              <input
                type={showGemini ? "text" : "password"}
                value={geminiKey}
                onChange={(e) => setGeminiKey(e.target.value)}
                placeholder="Enter Gemini API key"
                className="flex-1"
              />
              <button
                onClick={() => setShowGemini(!showGemini)}
                className="btn-secondary text-[10px] px-3"
              >
                {showGemini ? "Hide" : "Show"}
              </button>
              <button
                onClick={testGeminiKey}
                disabled={!geminiKey || geminiStatus === "testing"}
                className="btn-secondary text-[10px] px-3"
              >
                Test
              </button>
            </div>
            <div className="font-mono text-[11px] mt-1">
              {statusIcon(geminiStatus)}
            </div>
          </div>

          <p className="font-body text-sm text-dust">
            API keys are read from <code className="font-mono text-xs text-ash">.env.local</code> at
            server startup. Edit the file directly and restart the server to update keys.
          </p>
        </div>
      </section>

      {/* Pipeline Defaults */}
      <section className="animate-fade-in animate-delay-2">
        <h2 className="font-mono text-[11px] uppercase tracking-wider text-dust mb-4">
          Pipeline Defaults
        </h2>
        <div className="h-[1px] bg-noir-3 mb-4" />

        <div className="space-y-4">
          <div>
            <label className="font-mono text-[11px] uppercase tracking-wider text-dust block mb-2">
              Default Output Directory
            </label>
            <input
              type="text"
              value={outputDir}
              onChange={(e) => setOutputDir(e.target.value)}
              className="w-full"
            />
          </div>

          <div>
            <label className="font-mono text-[11px] uppercase tracking-wider text-dust block mb-2">
              Default Video Quality (CRF) — {crf}
            </label>
            <input
              type="range"
              min="15"
              max="28"
              value={crf}
              onChange={(e) => setCrf(Number(e.target.value))}
              className="w-full accent-tape"
            />
            <div className="flex justify-between font-mono text-[10px] text-dust">
              <span>15 (highest)</span>
              <span>28 (lowest)</span>
            </div>
          </div>

          <div>
            <label className="font-mono text-[11px] uppercase tracking-wider text-dust block mb-2">
              Default Audio Bitrate
            </label>
            <select
              value={audioBitrate}
              onChange={(e) => setAudioBitrate(e.target.value)}
              className="w-48"
            >
              <option value="192k">192k</option>
              <option value="256k">256k</option>
              <option value="320k">320k</option>
            </select>
          </div>

          <div>
            <label className="font-mono text-[11px] uppercase tracking-wider text-dust block mb-2">
              FFmpeg Path
            </label>
            <input
              type="text"
              value={ffmpegPath}
              onChange={(e) => setFfmpegPath(e.target.value)}
              className="w-full"
            />
          </div>
        </div>
      </section>
    </div>
  );
}
