"use client";

import { useState } from "react";

export default function SettingsPage() {
  const [geminiKey, setGeminiKey] = useState("");
  const [showGemini, setShowGemini] = useState(false);
  const [geminiStatus, setGeminiStatus] = useState<"idle" | "testing" | "valid" | "invalid">("idle");

  // Pipeline defaults
  const [outputDir, setOutputDir] = useState("./output");
  const [crf, setCrf] = useState(18);
  const [audioBitrate, setAudioBitrate] = useState("320k");
  const [ffmpegPath, setFfmpegPath] = useState("/usr/bin/ffmpeg");

  const testGeminiKey = async () => {
    setGeminiStatus("testing");
    try {
      const resp = await fetch("/api/test-gemini", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key: geminiKey }),
      });
      const data = await resp.json();
      setGeminiStatus(data.valid ? "valid" : "invalid");
    } catch {
      setGeminiStatus("invalid");
    }
  };

  const statusIcon = (status: string) => {
    switch (status) {
      case "valid":
        return <span className="text-tape">&#10003; Valid</span>;
      case "invalid":
        return <span className="text-crimson">&#10007; Invalid</span>;
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
          API Key
        </h2>
        <div className="h-[1px] bg-noir-3 mb-4" />

        <div className="space-y-6">
          <div>
            <label className="font-mono text-[11px] uppercase tracking-wider text-dust block mb-2">
              Gemini API Key
            </label>
            <p className="font-body text-xs text-dust mb-3">
              Powers all features: Lyria 3 Pro (music), Gemini (thumbnails, metadata, research).
            </p>
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
            The API key is read from <code className="font-mono text-xs text-ash">GEMINI_API_KEY</code> in{" "}
            <code className="font-mono text-xs text-ash">.env.local</code> at server startup.
            Edit the file directly and restart the server to update.
          </p>

          <div className="p-4 border border-tape/15 rounded bg-noir-3">
            <p className="font-mono text-[10px] uppercase tracking-wider text-tape mb-2">Powered by Google Gemini</p>
            <div className="space-y-1 font-mono text-xs text-dust">
              <p>Music generation: <span className="text-ash">Lyria 3 Pro</span> (lyria-3-pro-preview)</p>
              <p>Thumbnails: <span className="text-ash">Gemini 3.1 Flash</span> (gemini-3.1-flash-image-preview)</p>
              <p>Text/metadata: <span className="text-ash">Gemini 2.5 Flash</span> (gemini-2.5-flash)</p>
            </div>
          </div>
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
