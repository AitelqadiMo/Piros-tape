"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import PipelineStep from "@/components/PipelineStep";
import LogStream from "@/components/LogStream";
import MetadataBlock from "@/components/MetadataBlock";
import SongSelector, { SongClip } from "@/components/SongSelector";
import ThumbnailReview from "@/components/ThumbnailReview";
import VideoReview from "@/components/VideoReview";
import { Job, PIPELINE_STEPS, PipelineLogEvent, StepStatus } from "@/lib/types";

interface StepState {
  status: StepStatus;
  progress: number;
  message: string;
}

interface JobResponse {
  job: Job;
  runnerActive: boolean;
}

type AwaitingInputEvent =
  | { type: "song_selection"; payload: { clips?: SongClip[] } }
  | { type: "thumbnail_review"; payload: { thumbnailUrl?: string } }
  | { type: "video_review"; payload: { videoUrl?: string; thumbnailUrl?: string } };

type ConnectionState = "connecting" | "live" | "retrying" | "offline";

type AwaitingState =
  | null
  | { type: "song_selection"; clips: SongClip[] }
  | { type: "thumbnail_review"; thumbnailUrl: string }
  | { type: "video_review"; videoUrl: string; thumbnailUrl: string };

const STEP_HINTS = [
  "Sending the music brief to Suno and waiting for two takes.",
  "Generating thumbnail concepts with Gemini.",
  "Applying PIROS TAPE branding and final composition.",
  "Rendering the final video with FFmpeg.",
  "Review the assembled video before finalizing.",
  "Writing title, description, and delivery metadata.",
];

const INITIAL_STEPS: StepState[] = PIPELINE_STEPS.map(() => ({
  status: "pending",
  progress: 0,
  message: "",
}));

function formatElapsed(seconds: number) {
  const minutes = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
}

function getElapsedSeconds(job: Job | null) {
  if (!job?.createdAt) return 0;
  const start = new Date(job.createdAt).getTime();
  const end = job.completedAt ? new Date(job.completedAt).getTime() : Date.now();
  return Math.max(0, Math.round((end - start) / 1000));
}

function getStatusTone(status: Job["status"]) {
  if (status === "complete" || status === "legacy") return "text-tape";
  if (status === "error") return "text-crimson";
  if (status === "running") return "text-paper";
  return "text-dust";
}

function getStatusLabel(job: Job | null, awaiting: AwaitingState) {
  if (!job) return "Loading";
  if (awaiting?.type === "song_selection") return "Choose variation";
  if (awaiting?.type === "thumbnail_review") return "Review thumbnail";
  if (awaiting?.type === "video_review") return "Review video";
  if (job.status === "complete" || job.status === "legacy") return "Complete";
  if (job.status === "error") return "Failed";
  if (job.status === "running") return "In production";
  return "Queued";
}

function getConnectionLabel(state: ConnectionState) {
  if (state === "live") return "Live stream";
  if (state === "retrying") return "Reconnecting";
  if (state === "offline") return "Offline";
  return "Connecting";
}

function mapWaitingState(job: Job | null): AwaitingState {
  if (!job?.waitingFor || !job.waitingPayload) return null;

  if (job.waitingFor === "song_selection") {
    const payload = job.waitingPayload as { clips?: SongClip[] };
    return { type: "song_selection", clips: payload.clips || [] };
  }

  if (job.waitingFor === "thumbnail_review") {
    const payload = job.waitingPayload as { thumbnailUrl?: string };
    const url = payload.thumbnailUrl
      ? `${payload.thumbnailUrl}${payload.thumbnailUrl.includes("?") ? "&" : "?"}t=${Date.now()}`
      : "";
    return { type: "thumbnail_review", thumbnailUrl: url };
  }

  if (job.waitingFor === "video_review") {
    const payload = job.waitingPayload as { videoUrl?: string; thumbnailUrl?: string };
    return {
      type: "video_review",
      videoUrl: payload.videoUrl || "",
      thumbnailUrl: payload.thumbnailUrl || "",
    };
  }

  return null;
}

function hydrateStepsFromJob(job: Job, previous: StepState[]) {
  return PIPELINE_STEPS.map((step, index) => {
    const status = job.stepStatuses[index] ?? "pending";
    const prior = previous[index] ?? INITIAL_STEPS[index];
    const progress = status === "done" ? 100 : status === "running" ? Math.max(prior.progress, 12) : 0;
    const message = prior.message || (status === "running" ? STEP_HINTS[index] : status === "done" ? "Complete" : "");
    return {
      ...step,
      status,
      progress,
      message,
    };
  });
}

function buildNextAction(job: Job | null, awaiting: AwaitingState) {
  if (!job) return "Loading production brief.";
  if (awaiting?.type === "song_selection") return "Listen to both variations and choose the keeper.";
  if (awaiting?.type === "thumbnail_review") return "Approve the thumbnail or ask for another pass.";
  if (awaiting?.type === "video_review") return "Review the video. Adjust settings and re-render, or approve.";
  if (job.status === "complete" || job.status === "legacy") return "Download the assets and metadata package.";
  if (job.status === "error") return "Review the error log and restart from a fresh job.";
  if (job.status === "pending") return "Starting the pipeline engine.";
  return STEP_HINTS[Math.max(0, job.currentStep - 1)] || "Pipeline is moving.";
}

async function loadMetadata(jobId: string) {
  const response = await fetch(`/api/jobs/${jobId}/download?file=metadata`);
  if (!response.ok) return null;
  const text = await response.text();
  const titleMatch = text.match(/YOUTUBE TITLE:\n(.+)/);
  const descMatch = text.match(/YOUTUBE DESCRIPTION:\n([\s\S]+)/);
  if (!titleMatch || !descMatch) return null;
  return {
    title: titleMatch[1],
    description: descMatch[1].trim(),
  };
}

export default function JobPage() {
  const params = useParams();
  const jobId = params.jobId as string;

  const [job, setJob] = useState<Job | null>(null);
  const [steps, setSteps] = useState<StepState[]>(INITIAL_STEPS);
  const [logs, setLogs] = useState<PipelineLogEvent[]>([]);
  const [awaiting, setAwaiting] = useState<AwaitingState>(null);
  const [completed, setCompleted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [actionPending, setActionPending] = useState(false);
  const [connectionState, setConnectionState] = useState<ConnectionState>("connecting");
  const [metadata, setMetadata] = useState<{ title: string; description: string } | null>(null);
  const [runnerActive, setRunnerActive] = useState(false);

  const eventSourceRef = useRef<EventSource | null>(null);
  const terminalRef = useRef(false);
  const metadataLoadedRef = useRef(false);

  const syncFromJob = useCallback(async (incoming: Job, nextRunnerActive = false) => {
    setJob(incoming);
    setRunnerActive(nextRunnerActive);
    setCompleted(incoming.status === "complete" || incoming.status === "legacy");
    setAwaiting(mapWaitingState(incoming));
    setSteps((previous) => hydrateStepsFromJob(incoming, previous));

    if (incoming.status === "error") {
      setError(`The production stopped on step ${incoming.currentStep}. Check the log for details.`);
    }

    if ((incoming.status === "complete" || incoming.status === "legacy") && !metadataLoadedRef.current) {
      metadataLoadedRef.current = true;
      const nextMetadata = await loadMetadata(incoming.id);
      if (nextMetadata) {
        setMetadata(nextMetadata);
      }
    }
  }, []);

  useEffect(() => {
    let cancelled = false;

    const refreshJob = async () => {
      const response = await fetch(`/api/jobs/${jobId}`, { cache: "no-store" });
      if (!response.ok) throw new Error("Unable to load job");
      const data = (await response.json()) as JobResponse;
      if (cancelled) return;
      await syncFromJob(data.job, data.runnerActive);
    };

    const startJob = async () => {
      const response = await fetch(`/api/jobs/${jobId}/start`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      if (!response.ok) {
        const data = await response.json().catch(() => ({ error: "Failed to start pipeline" }));
        throw new Error(data.error || "Failed to start pipeline");
      }
    };

    const connect = () => {
      const source = new EventSource(`/api/jobs/${jobId}/stream`);
      eventSourceRef.current = source;
      setConnectionState("connecting");

      source.onopen = () => {
        setConnectionState("live");
      };

      source.addEventListener("heartbeat", () => {
        setConnectionState("live");
      });

      source.addEventListener("runner", (event) => {
        const data = JSON.parse((event as MessageEvent).data) as { active?: boolean };
        setRunnerActive(Boolean(data.active));
      });

      source.addEventListener("step", (event) => {
        setConnectionState("live");
        const data = JSON.parse((event as MessageEvent).data) as StepState & { step: number };
        setSteps((previous) => {
          const next = [...previous];
          next[data.step - 1] = {
            status: data.status,
            progress: data.progress,
            message: data.message,
          };
          return next;
        });
      });

      source.addEventListener("log", (event) => {
        setConnectionState("live");
        const data = JSON.parse((event as MessageEvent).data) as PipelineLogEvent;
        setLogs((previous) => [...previous, data]);
      });

      source.addEventListener("awaiting_input", (event) => {
        setConnectionState("live");
        const data = JSON.parse((event as MessageEvent).data) as AwaitingInputEvent;

        if (data.type === "song_selection") {
          setAwaiting({ type: "song_selection", clips: data.payload.clips || [] });
        }

        if (data.type === "thumbnail_review") {
          const url = data.payload.thumbnailUrl
            ? `${data.payload.thumbnailUrl}${data.payload.thumbnailUrl.includes("?") ? "&" : "?"}t=${Date.now()}`
            : "";
          setAwaiting({ type: "thumbnail_review", thumbnailUrl: url });
        }

        if (data.type === "video_review") {
          const payload = data.payload as { videoUrl?: string; thumbnailUrl?: string };
          setAwaiting({
            type: "video_review",
            videoUrl: payload.videoUrl || "",
            thumbnailUrl: payload.thumbnailUrl || "",
          });
        }
      });

      source.addEventListener("complete", async () => {
        terminalRef.current = true;
        setConnectionState("offline");
        setCompleted(true);
        setAwaiting(null);
        await refreshJob();
        source.close();
      });

      source.addEventListener("pipeline_error", async (event) => {
        terminalRef.current = true;
        const data = JSON.parse((event as MessageEvent).data) as { message?: string };
        setError(data.message || "Pipeline failed");
        setConnectionState("offline");
        await refreshJob().catch(() => {});
        source.close();
      });

      source.onerror = () => {
        if (terminalRef.current) return;
        setConnectionState("retrying");
      };
    };

    (async () => {
      try {
        await refreshJob();
        await startJob();
        connect();
      } catch (jobError) {
        const message = jobError instanceof Error ? jobError.message : String(jobError);
        if (!cancelled) {
          setError(message);
          setConnectionState("offline");
        }
      }
    })();

    const poll = setInterval(() => {
      refreshJob().catch(() => {
        if (!terminalRef.current) {
          setConnectionState("retrying");
        }
      });
    }, 5000);

    return () => {
      cancelled = true;
      clearInterval(poll);
      eventSourceRef.current?.close();
    };
  }, [jobId, syncFromJob]);

  const elapsed = getElapsedSeconds(job);
  const doneSteps = steps.filter((step) => step.status === "done").length;
  const overallProgress =
    (steps.reduce((sum, step) => {
      if (step.status === "done") return sum + 100;
      if (step.status === "running") return sum + step.progress;
      return sum;
    }, 0) /
      (PIPELINE_STEPS.length * 100)) *
    100;

  const sendAction = async (type: string, payload: Record<string, unknown>) => {
    setActionPending(true);
    try {
      const response = await fetch(`/api/jobs/${jobId}/action`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type, ...payload }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Action failed");
      }
      setAwaiting(null);
      setConnectionState("live");
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : String(actionError));
    } finally {
      setActionPending(false);
    }
  };

  return (
    <div className="space-y-8">
      <section className="relative overflow-hidden rounded-[28px] border border-[rgba(212,168,83,0.16)] bg-[linear-gradient(135deg,rgba(160,28,18,0.28),rgba(18,12,8,0.96)_45%,rgba(212,168,83,0.08))] px-6 py-7 shadow-[0_30px_80px_rgba(0,0,0,0.28)]">
        <div className="absolute inset-y-0 right-0 hidden w-1/2 bg-[radial-gradient(circle_at_top_right,rgba(212,168,83,0.18),transparent_55%)] lg:block" />
        <div className="relative flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              <Link href="/studio" className="rounded-full border border-[rgba(237,232,226,0.18)] px-3 py-1 font-mono text-[10px] uppercase tracking-[0.24em] text-dust transition-colors hover:text-paper">
                New Brief
              </Link>
              <Link href="/jobs" className="rounded-full border border-[rgba(237,232,226,0.18)] px-3 py-1 font-mono text-[10px] uppercase tracking-[0.24em] text-dust transition-colors hover:text-paper">
                All Jobs
              </Link>
            </div>
            <div>
              <p className="font-mono text-[11px] uppercase tracking-[0.28em] text-tape">
                Production Session
              </p>
              <h1 className="mt-2 font-display text-3xl leading-none text-paper md:text-5xl">
                {job?.title || "Loading session"}
              </h1>
              <p className="mt-2 font-body text-lg text-ash">
                {job?.artists || "Resolving artist line..."}
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <span className={`rounded-full border px-3 py-1 font-mono text-[10px] uppercase tracking-[0.2em] ${job ? getStatusTone(job.status) : "text-dust"} border-current/20`}>
                {getStatusLabel(job, awaiting)}
              </span>
              <span className="rounded-full border border-[rgba(237,232,226,0.12)] px-3 py-1 font-mono text-[10px] uppercase tracking-[0.2em] text-dust">
                {getConnectionLabel(connectionState)}
              </span>
              <span className="rounded-full border border-[rgba(237,232,226,0.12)] px-3 py-1 font-mono text-[10px] uppercase tracking-[0.2em] text-dust">
                {doneSteps} / {PIPELINE_STEPS.length} steps
              </span>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-3 lg:min-w-[420px]">
            <div className="rounded-[22px] border border-[rgba(212,168,83,0.14)] bg-[rgba(10,6,4,0.42)] p-4 backdrop-blur">
              <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-dust">Elapsed</p>
              <p className="mt-2 font-display text-3xl text-paper">{formatElapsed(elapsed)}</p>
            </div>
            <div className="rounded-[22px] border border-[rgba(212,168,83,0.14)] bg-[rgba(10,6,4,0.42)] p-4 backdrop-blur">
              <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-dust">Current Step</p>
              <p className="mt-2 font-display text-3xl text-paper">{Math.max(job?.currentStep || 1, 1)}</p>
            </div>
            <div className="rounded-[22px] border border-[rgba(212,168,83,0.14)] bg-[rgba(10,6,4,0.42)] p-4 backdrop-blur">
              <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-dust">Runner</p>
              <p className={`mt-2 font-display text-3xl ${runnerActive ? "text-tape" : "text-paper"}`}>
                {runnerActive ? "Live" : completed ? "Done" : "Queued"}
              </p>
            </div>
          </div>
        </div>

        <div className="relative mt-6">
          <div className="h-2 overflow-hidden rounded-full bg-[rgba(237,232,226,0.08)]">
            <div
              className="h-full rounded-full bg-[linear-gradient(90deg,var(--tape),#f0d48e,var(--crimson))] transition-all duration-700 ease-out"
              style={{ width: `${Math.max(overallProgress, 6)}%` }}
            />
          </div>
          <div className="mt-2 flex flex-wrap items-center justify-between gap-2 font-mono text-[10px] uppercase tracking-[0.18em] text-dust">
            <span>{buildNextAction(job, awaiting)}</span>
            <span>{Math.round(overallProgress)}% complete</span>
          </div>
        </div>
      </section>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.3fr)_360px]">
        <div className="space-y-6">
          <section className="rounded-[26px] border border-[rgba(212,168,83,0.16)] bg-noir-2/80 p-6 shadow-[0_18px_50px_rgba(0,0,0,0.2)]">
            <div className="mb-5 flex items-end justify-between gap-4">
              <div>
                <p className="font-mono text-[10px] uppercase tracking-[0.24em] text-dust">Pipeline</p>
                <h2 className="mt-2 font-display text-2xl text-paper">Session Timeline</h2>
              </div>
              <p className="max-w-xs text-right font-body text-sm text-dust">
                The engine can pause for your decisions and resume without losing the job state.
              </p>
            </div>

            <div className="space-y-3">
              {PIPELINE_STEPS.map((step, index) => (
                <PipelineStep
                  key={step.number}
                  number={step.number}
                  name={step.name}
                  status={steps[index].status}
                  progress={steps[index].progress}
                  message={steps[index].message || STEP_HINTS[index]}
                  isAudioStep={step.number === 1}
                />
              ))}
            </div>
          </section>

          {awaiting?.type === "song_selection" && (
            <section className="rounded-[26px] border border-[rgba(212,168,83,0.16)] bg-noir-2/80 p-6 shadow-[0_18px_50px_rgba(0,0,0,0.2)]">
              <div className="mb-4">
                <p className="font-mono text-[10px] uppercase tracking-[0.24em] text-tape">Decision Required</p>
                <h2 className="mt-2 font-display text-2xl text-paper">Pick The Winning Variation</h2>
              </div>
              <SongSelector
                clips={awaiting.clips}
                onSelect={(clipIndex) => sendAction("song_selection", { clipIndex })}
                disabled={actionPending}
              />
            </section>
          )}

          {awaiting?.type === "thumbnail_review" && (
            <section className="rounded-[26px] border border-[rgba(212,168,83,0.16)] bg-noir-2/80 p-6 shadow-[0_18px_50px_rgba(0,0,0,0.2)]">
              <div className="mb-4">
                <p className="font-mono text-[10px] uppercase tracking-[0.24em] text-tape">Decision Required</p>
                <h2 className="mt-2 font-display text-2xl text-paper">Approve The Visual Direction</h2>
              </div>
              <ThumbnailReview
                thumbnailUrl={awaiting.thumbnailUrl}
                onAccept={() => sendAction("thumbnail_review", { action: "accept" })}
                onRegenerate={() => sendAction("thumbnail_review", { action: "regenerate" })}
                disabled={actionPending}
              />
            </section>
          )}

          {awaiting?.type === "video_review" && (
            <section className="rounded-[26px] border border-[rgba(212,168,83,0.16)] bg-noir-2/80 p-6 shadow-[0_18px_50px_rgba(0,0,0,0.2)]">
              <div className="mb-4">
                <p className="font-mono text-[10px] uppercase tracking-[0.24em] text-tape">Decision Required</p>
                <h2 className="mt-2 font-display text-2xl text-paper">Review The Final Video</h2>
                <p className="mt-1 font-body text-sm text-dust">Watch the video. Adjust quality settings and re-render if needed, or approve to continue.</p>
              </div>
              <VideoReview
                videoUrl={awaiting.videoUrl}
                thumbnailUrl={awaiting.thumbnailUrl}
                onAccept={() => sendAction("video_review", { action: "accept" })}
                onReRender={(settings) => sendAction("video_review", { action: "re_render", ...settings })}
              />
            </section>
          )}

          {completed && (
            <section className="rounded-[26px] border border-[rgba(212,168,83,0.16)] bg-noir-2/80 p-6 shadow-[0_18px_50px_rgba(0,0,0,0.2)]">
              <div className="mb-4 flex flex-wrap items-end justify-between gap-4">
                <div>
                  <p className="font-mono text-[10px] uppercase tracking-[0.24em] text-tape">Complete</p>
                  <h2 className="mt-2 font-display text-2xl text-paper">Final Output</h2>
                </div>
                <div className="flex flex-wrap gap-3">
                  <a href={`/api/jobs/${jobId}/download?file=video`} className="btn-primary text-center">
                    Download MP4
                  </a>
                  <a href={`/api/jobs/${jobId}/download?file=thumbnail`} className="btn-secondary text-center">
                    Thumbnail
                  </a>
                  <a href={`/api/jobs/${jobId}/download?file=audio`} className="btn-secondary text-center">
                    Audio
                  </a>
                  <Link href="/assets" className="btn-secondary text-center">
                    Assets
                  </Link>
                </div>
              </div>

              <div className="overflow-hidden rounded-[20px] border border-[rgba(212,168,83,0.12)] bg-noir">
                <video controls className="aspect-video w-full bg-noir" src={`/api/jobs/${jobId}/download?file=video`} />
              </div>

              {metadata && (
                <div className="mt-6 space-y-3">
                  <MetadataBlock title="Title" content={metadata.title} />
                  <MetadataBlock title="Description" content={metadata.description} />
                </div>
              )}
            </section>
          )}

          <section className="rounded-[26px] border border-[rgba(212,168,83,0.16)] bg-noir-2/80 p-6 shadow-[0_18px_50px_rgba(0,0,0,0.2)]">
            <div className="mb-4 flex items-end justify-between gap-4">
              <div>
                <p className="font-mono text-[10px] uppercase tracking-[0.24em] text-dust">Diagnostics</p>
                <h2 className="mt-2 font-display text-2xl text-paper">Live Production Log</h2>
              </div>
              <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-dust">
                {logs.length} entries
              </p>
            </div>
            <LogStream logs={logs} />
          </section>

          {error && (
            <section className="rounded-[26px] border border-crimson/60 bg-[rgba(160,28,18,0.08)] p-5 shadow-[0_18px_50px_rgba(0,0,0,0.2)]">
              <p className="font-mono text-[10px] uppercase tracking-[0.24em] text-crimson">Pipeline Error</p>
              <p className="mt-2 font-body text-base text-ash">{error}</p>
            </section>
          )}
        </div>

        <aside className="space-y-6 xl:sticky xl:top-6 xl:self-start">
          <section className="rounded-[26px] border border-[rgba(212,168,83,0.16)] bg-noir-2/80 p-6 shadow-[0_18px_50px_rgba(0,0,0,0.2)]">
            <p className="font-mono text-[10px] uppercase tracking-[0.24em] text-dust">Production Brief</p>
            <div className="mt-4 space-y-4">
              <div>
                <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-dust">Style</p>
                <p className="mt-1 font-display text-xl text-paper">{job?.style || "Waiting"}</p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-[18px] border border-[rgba(212,168,83,0.12)] bg-noir-3/70 p-3">
                  <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-dust">BPM</p>
                  <p className="mt-1 font-mono text-lg text-paper">{job?.bpm || "—"}</p>
                </div>
                <div className="rounded-[18px] border border-[rgba(212,168,83,0.12)] bg-noir-3/70 p-3">
                  <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-dust">Budapest</p>
                  <p className="mt-1 font-mono text-lg text-paper">{job?.budapestYear || "—"}</p>
                </div>
              </div>
              <div>
                <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-dust">Mood Line</p>
                <p className="mt-2 font-body text-sm leading-6 text-ash">{job?.moodLine || "No mood line saved."}</p>
              </div>
              <div>
                <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-dust">Next Move</p>
                <p className="mt-2 font-body text-sm leading-6 text-ash">{buildNextAction(job, awaiting)}</p>
              </div>
            </div>
          </section>

          <section className="rounded-[26px] border border-[rgba(212,168,83,0.16)] bg-noir-2/80 p-6 shadow-[0_18px_50px_rgba(0,0,0,0.2)]">
            <p className="font-mono text-[10px] uppercase tracking-[0.24em] text-dust">Session Health</p>
            <div className="mt-4 space-y-3">
              <div className="flex items-center justify-between rounded-[18px] border border-[rgba(212,168,83,0.12)] bg-noir-3/70 px-4 py-3">
                <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-dust">Stream</span>
                <span className={`font-mono text-[11px] uppercase tracking-[0.18em] ${connectionState === "live" ? "text-tape" : connectionState === "retrying" ? "text-paper" : "text-dust"}`}>
                  {getConnectionLabel(connectionState)}
                </span>
              </div>
              <div className="flex items-center justify-between rounded-[18px] border border-[rgba(212,168,83,0.12)] bg-noir-3/70 px-4 py-3">
                <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-dust">Runner</span>
                <span className={`font-mono text-[11px] uppercase tracking-[0.18em] ${runnerActive ? "text-tape" : "text-dust"}`}>
                  {runnerActive ? "Active" : completed ? "Finished" : "Idle"}
                </span>
              </div>
              <div className="flex items-center justify-between rounded-[18px] border border-[rgba(212,168,83,0.12)] bg-noir-3/70 px-4 py-3">
                <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-dust">Awaiting</span>
                <span className="font-mono text-[11px] uppercase tracking-[0.18em] text-paper">
                  {awaiting ? "Your input" : "Engine"}
                </span>
              </div>
            </div>
          </section>
        </aside>
      </div>
    </div>
  );
}
