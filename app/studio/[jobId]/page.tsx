"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import PipelineStep from "@/components/PipelineStep";
import LogStream from "@/components/LogStream";
import MetadataBlock from "@/components/MetadataBlock";
import { PIPELINE_STEPS, PipelineLogEvent, StepStatus } from "@/lib/types";

interface StepState {
  status: StepStatus;
  progress: number;
  message: string;
}

function playSuccessChime() {
  try {
    const ctx = new AudioContext();
    const notes = [523.25, 659.25, 783.99]; // C5, E5, G5 pentatonic
    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.frequency.value = freq;
      osc.type = "sine";
      gain.gain.setValueAtTime(0.15, ctx.currentTime + i * 0.1);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + i * 0.1 + 0.3);
      osc.start(ctx.currentTime + i * 0.1);
      osc.stop(ctx.currentTime + i * 0.1 + 0.3);
    });
  } catch {
    // Audio not supported
  }
}

export default function JobPage() {
  const params = useParams();
  const jobId = params.jobId as string;

  const [steps, setSteps] = useState<StepState[]>(
    PIPELINE_STEPS.map(() => ({ status: "pending", progress: 0, message: "" }))
  );
  const [logs, setLogs] = useState<PipelineLogEvent[]>([]);
  const [elapsed, setElapsed] = useState(0);
  const [completed, setCompleted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [jobTitle, setJobTitle] = useState("");
  const [metadata, setMetadata] = useState<{ title: string; description: string } | null>(null);

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const hasConnected = useRef(false);

  const startTimer = useCallback(() => {
    if (timerRef.current) return;
    timerRef.current = setInterval(() => {
      setElapsed((prev) => prev + 1);
    }, 1000);
  }, []);

  useEffect(() => {
    if (hasConnected.current) return;
    hasConnected.current = true;

    // Fetch job info
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
        next[data.step - 1] = {
          status: data.status,
          progress: data.progress,
          message: data.message,
        };
        return next;
      });
    });

    evtSource.addEventListener("log", (e) => {
      const data = JSON.parse(e.data);
      setLogs((prev) => [...prev, data]);
    });

    evtSource.addEventListener("complete", (e) => {
      setCompleted(true);
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      playSuccessChime();

      // Fetch metadata
      fetch(`/api/jobs/${jobId}/download?file=metadata`)
        .then((r) => r.text())
        .then((text) => {
          const titleMatch = text.match(/YOUTUBE TITLE:\n(.+)/);
          const descMatch = text.match(/YOUTUBE DESCRIPTION:\n([\s\S]+)/);
          if (titleMatch && descMatch) {
            setMetadata({
              title: titleMatch[1],
              description: descMatch[1].trim(),
            });
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
        setError("Connection lost");
      }
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      evtSource.close();
    });

    return () => {
      evtSource.close();
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [jobId, startTimer]);

  const formatElapsed = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between animate-fade-in">
        <div className="flex items-center gap-4">
          <Link
            href="/studio"
            className="font-mono text-xs text-dust hover:text-paper transition-colors"
          >
            ← Back
          </Link>
          <h1 className="font-display text-xl text-paper">
            {jobTitle || "PRODUCTION"}
          </h1>
        </div>
        <span className="font-mono text-[11px] text-dust">
          Job ID: {jobId.slice(0, 8)}
        </span>
      </div>

      {!completed ? (
        <>
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

          {/* Log output */}
          <div className="animate-fade-in animate-delay-2">
            <h2 className="font-mono text-[11px] uppercase tracking-wider text-dust mb-3">
              Log Output
            </h2>
            <LogStream logs={logs} />
          </div>

          {/* Error display */}
          {error && (
            <div
              className="bg-noir-2 border-[0.5px] border-crimson p-4"
              style={{ borderRadius: "2px" }}
            >
              <p className="font-mono text-xs text-crimson uppercase">Error</p>
              <p className="font-body text-sm text-ash mt-1">{error}</p>
            </div>
          )}

          {/* Elapsed time */}
          <div className="font-mono text-xs text-dust animate-fade-in animate-delay-3">
            ELAPSED: {formatElapsed(elapsed)}
          </div>
        </>
      ) : (
        /* Completion view */
        <div className="space-y-6 animate-fade-in">
          <div className="text-center py-8">
            <p className="font-display text-2xl text-tape">
              ✓ PRODUCTION COMPLETE
            </p>
            <p className="font-mono text-xs text-dust mt-2">
              Completed in {formatElapsed(elapsed)}
            </p>
          </div>

          {/* Video preview */}
          <div
            className="bg-noir-2 border-[0.5px] border-[rgba(212,168,83,0.15)] overflow-hidden"
            style={{ borderRadius: "2px" }}
          >
            <video
              controls
              className="w-full aspect-video"
              src={`/api/jobs/${jobId}/download?file=video`}
            />
          </div>

          {/* Download buttons */}
          <div className="flex gap-3">
            <a
              href={`/api/jobs/${jobId}/download?file=video`}
              className="btn-primary flex-1 text-center"
            >
              ↓ Download MP4
            </a>
            <a
              href={`/api/jobs/${jobId}/download?file=thumbnail`}
              className="btn-secondary flex-1 text-center"
            >
              ↓ Download Thumbnail
            </a>
          </div>

          {/* Metadata */}
          {metadata && (
            <div className="space-y-4">
              <h2 className="font-mono text-[11px] uppercase tracking-wider text-dust">
                YouTube Metadata
              </h2>
              <MetadataBlock title="Title" content={metadata.title} />
              <MetadataBlock title="Description" content={metadata.description} />
            </div>
          )}

          {/* Log output (collapsed) */}
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
