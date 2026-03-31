"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import PipelineStep from "@/components/PipelineStep";
import LogStream from "@/components/LogStream";
import MetadataBlock from "@/components/MetadataBlock";
import SongSelector, { SongClip } from "@/components/SongSelector";
import ThumbnailReview from "@/components/ThumbnailReview";
import { PIPELINE_STEPS, PipelineLogEvent, StepStatus } from "@/lib/types";

interface StepState {
  status: StepStatus;
  progress: number;
  message: string;
}

type AwaitingState =
  | null
  | { type: "song_selection"; clips: SongClip[] }
  | { type: "thumbnail_review"; thumbnailUrl: string };

function playSuccessChime() {
  try {
    const ctx = new AudioContext();
    [523.25, 659.25, 783.99].forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.frequency.value = freq;
      osc.type = "sine";
      gain.gain.setValueAtTime(0.12, ctx.currentTime + i * 0.12);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + i * 0.12 + 0.35);
      osc.start(ctx.currentTime + i * 0.12);
      osc.stop(ctx.currentTime + i * 0.12 + 0.35);
    });
  } catch { /* no audio support */ }
}

export default function JobPage() {
  const params = useParams();
  const jobId = params.jobId as string;

  const [steps, setSteps] = useState<StepState[]>(
    PIPELINE_STEPS.map(() => ({ status: "pending" as StepStatus, progress: 0, message: "" }))
  );
  const [logs, setLogs] = useState<PipelineLogEvent[]>([]);
  const [elapsed, setElapsed] = useState(0);
  const [completed, setCompleted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [jobTitle, setJobTitle] = useState("");
  const [awaiting, setAwaiting] = useState<AwaitingState>(null);
  const [actionPending, setActionPending] = useState(false);
  const [metadata, setMetadata] = useState<{ title: string; description: string } | null>(null);

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const hasConnected = useRef(false);

  const startTimer = useCallback(() => {
    if (timerRef.current) return;
    timerRef.current = setInterval(() => setElapsed((p) => p + 1), 1000);
  }, []);

  const stopTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  // Post an action to the pipeline
  const sendAction = useCallback(async (type: string, payload: Record<string, unknown>) => {
    setActionPending(true);
    try {
      await fetch(`/api/jobs/${jobId}/action`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type, ...payload }),
      });
      setAwaiting(null);
    } catch (err) {
      console.error("Action error:", err);
    } finally {
      setActionPending(false);
    }
  }, [jobId]);

  useEffect(() => {
    if (hasConnected.current) return;
    hasConnected.current = true;

    fetch("/api/jobs")
      .then((r) => r.json())
      .then((data) => {
        const job = (data.jobs || []).find((j: { id: string }) => j.id === jobId);
        if (job) setJobTitle(job.title);
      })
      .catch(() => {});

    startTimer();

    const evtSource = new EventSource(`/api/jobs/${jobId}/stream`);

    evtSource.addEventListener("step", (e) => {
      const data = JSON.parse(e.data);
      setSteps((prev) => {
        const next = [...prev];
        next[data.step - 1] = { status: data.status, progress: data.progress, message: data.message };
        return next;
      });
    });

    evtSource.addEventListener("log", (e) => {
      const data = JSON.parse(e.data);
      setLogs((prev) => [...prev, data]);
    });

    evtSource.addEventListener("awaiting_input", (e) => {
      const data = JSON.parse(e.data);
      if (data.type === "song_selection") {
        setAwaiting({ type: "song_selection", clips: data.payload.clips });
      } else if (data.type === "thumbnail_review") {
        // Append cache-buster so browser re-fetches if regenerating
        const url = `${data.payload.thumbnailUrl}&t=${Date.now()}`;
        setAwaiting({ type: "thumbnail_review", thumbnailUrl: url });
      }
    });

    evtSource.addEventListener("complete", () => {
      setCompleted(true);
      setAwaiting(null);
      stopTimer();
      playSuccessChime();

      fetch(`/api/jobs/${jobId}/download?file=metadata`)
        .then((r) => r.text())
        .then((text) => {
          const titleMatch = text.match(/YOUTUBE TITLE:\n(.+)/);
          const descMatch = text.match(/YOUTUBE DESCRIPTION:\n([\s\S]+)/);
          if (titleMatch && descMatch) {
            setMetadata({ title: titleMatch[1], description: descMatch[1].trim() });
          }
        })
        .catch(() => {});

      evtSource.close();
    });

    evtSource.addEventListener("error", (e) => {
      try {
        const data = JSON.parse((e as MessageEvent).data);
        setError(data.message);
      } catch {
        // Generic connection error — don't surface it unless it's persistent
      }
      stopTimer();
      evtSource.close();
    });

    return () => {
      evtSource.close();
      stopTimer();
    };
  }, [jobId, startTimer, stopTimer]);

  const formatElapsed = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
  };

  // Overall progress across all 5 steps
  const overallProgress = steps.reduce((sum, s) => {
    if (s.status === "done") return sum + 100;
    if (s.status === "running") return sum + s.progress;
    return sum;
  }, 0) / (PIPELINE_STEPS.length * 100) * 100;

  const activeStep = steps.findIndex((s) => s.status === "running") + 1;

  return (
    <div className="space-y-6 max-w-3xl">
      {/* Header */}
      <div className="flex items-center justify-between animate-fade-in">
        <div className="flex items-center gap-4">
          <Link href="/studio" className="font-mono text-xs text-dust hover:text-paper transition-colors">
            ← Back
          </Link>
          <h1 className="font-display text-xl text-paper uppercase tracking-wide">
            {jobTitle || "PRODUCTION"}
          </h1>
        </div>
        <span className="font-mono text-[10px] text-dust">
          {jobId.slice(0, 8)}
        </span>
      </div>

      {!completed ? (
        <>
          {/* Overall progress bar */}
          <div className="animate-fade-in">
            <div className="flex items-center justify-between mb-1">
              <span className="font-mono text-[10px] uppercase tracking-wider text-dust">
                {awaiting ? "Awaiting Input" : activeStep > 0 ? `Step ${activeStep} of ${PIPELINE_STEPS.length}` : "Initializing"}
              </span>
              <span className="font-mono text-[10px] text-tape">
                {Math.round(overallProgress)}% · {formatElapsed(elapsed)}
              </span>
            </div>
            <div className="h-[2px] bg-noir-3">
              <div
                className="h-full bg-tape transition-all duration-700 ease-out"
                style={{ width: `${overallProgress}%` }}
              />
            </div>
          </div>

          {/* Pipeline steps */}
          <div className="space-y-2 animate-fade-in animate-delay-1">
            <h2 className="font-mono text-[11px] uppercase tracking-wider text-dust mb-3">
              Production Pipeline
            </h2>
            {PIPELINE_STEPS.map((step, i) => (
              <PipelineStep
                key={step.number}
                number={step.number}
                name={step.name}
                status={steps[i].status}
                progress={steps[i].progress}
                message={steps[i].message}
                isAudioStep={step.number === 1}
              />
            ))}
          </div>

          {/* Interactive: Song Selection */}
          {awaiting?.type === "song_selection" && (
            <div className="animate-fade-in">
              <SongSelector
                clips={awaiting.clips}
                onSelect={(clipIndex) => sendAction("song_selection", { clipIndex })}
                disabled={actionPending}
              />
            </div>
          )}

          {/* Interactive: Thumbnail Review */}
          {awaiting?.type === "thumbnail_review" && (
            <div className="animate-fade-in">
              <ThumbnailReview
                thumbnailUrl={awaiting.thumbnailUrl}
                onAccept={() => sendAction("thumbnail_review", { action: "accept" })}
                onRegenerate={() => sendAction("thumbnail_review", { action: "regenerate" })}
                disabled={actionPending}
              />
            </div>
          )}

          {/* Log output */}
          <div className="animate-fade-in animate-delay-2">
            <h2 className="font-mono text-[11px] uppercase tracking-wider text-dust mb-3">
              Log Output
            </h2>
            <LogStream logs={logs} />
          </div>

          {/* Error display */}
          {error && (
            <div className="bg-noir-2 border-[0.5px] border-crimson p-4" style={{ borderRadius: "2px" }}>
              <p className="font-mono text-xs text-crimson uppercase">Pipeline Error</p>
              <p className="font-body text-sm text-ash mt-1">{error}</p>
            </div>
          )}
        </>
      ) : (
        /* ── Completion View ── */
        <div className="space-y-6 animate-fade-in">
          <div
            className="text-center py-8 border-[0.5px] border-tape bg-noir-2"
            style={{ borderRadius: "2px" }}
          >
            <p className="font-display text-3xl italic text-tape">✓ Production Complete</p>
            <p className="font-mono text-xs text-dust mt-2 uppercase tracking-wider">
              Finished in {formatElapsed(elapsed)}
            </p>
          </div>

          {/* Video preview */}
          <div className="bg-noir-2 border-[0.5px] border-[rgba(212,168,83,0.15)] overflow-hidden" style={{ borderRadius: "2px" }}>
            <video
              controls
              className="w-full aspect-video bg-noir"
              src={`/api/jobs/${jobId}/download?file=video`}
            />
          </div>

          {/* Download buttons */}
          <div className="flex gap-3">
            <a href={`/api/jobs/${jobId}/download?file=video`} className="btn-primary flex-1 text-center py-3">
              ↓ Download MP4
            </a>
            <a href={`/api/jobs/${jobId}/download?file=thumbnail`} className="btn-secondary flex-1 text-center py-3">
              ↓ Download Thumbnail
            </a>
          </div>

          {/* Metadata */}
          {metadata && (
            <div className="space-y-3">
              <h2 className="font-mono text-[11px] uppercase tracking-wider text-dust">
                YouTube Metadata
              </h2>
              <MetadataBlock title="Title" content={metadata.title} />
              <MetadataBlock title="Description" content={metadata.description} />
            </div>
          )}

          {/* Production log (collapsed) */}
          <details>
            <summary className="font-mono text-[11px] text-dust uppercase tracking-wider cursor-pointer hover:text-paper transition-colors">
              Show Production Log ({logs.length} entries)
            </summary>
            <div className="mt-3">
              <LogStream logs={logs} />
            </div>
          </details>
        </div>
      )}
    </div>
  );
}
