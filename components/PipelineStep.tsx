"use client";

import { StepStatus } from "@/lib/types";

interface PipelineStepProps {
  number: number;
  name: string;
  status: StepStatus;
  progress: number;
  message?: string;
  isAudioStep?: boolean;
}

function StepIcon({ status }: { status: StepStatus }) {
  if (status === "done") {
    return (
      <div className="w-5 h-5 rounded-full bg-tape flex items-center justify-center">
        <svg className="w-3 h-3 text-noir" viewBox="0 0 12 12" fill="none">
          <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>
    );
  }

  if (status === "running") {
    return (
      <div className="w-5 h-5 relative">
        <div className="absolute inset-0 rounded-full border-2 border-crimson border-t-transparent animate-spin" />
      </div>
    );
  }

  if (status === "error") {
    return (
      <div className="w-5 h-5 rounded-full bg-crimson flex items-center justify-center">
        <span className="text-paper text-xs font-bold">!</span>
      </div>
    );
  }

  return <div className="w-5 h-5 rounded-full border border-dust" />;
}

function StatusBadge({ status }: { status: StepStatus }) {
  const styles: Record<StepStatus, string> = {
    done: "text-tape",
    running: "text-paper animate-pulse-opacity",
    pending: "text-dust",
    error: "text-crimson",
  };

  return (
    <span className={`font-mono text-[11px] uppercase tracking-wider ${styles[status]}`}>
      {status === "done" ? "DONE" : status === "running" ? "RUNNING" : status === "error" ? "ERROR" : "PENDING"}
    </span>
  );
}

function WaveformAnimation() {
  return (
    <div className="flex items-end gap-[2px] h-5 ml-3">
      {[1, 2, 3, 4, 5].map((i) => (
        <div key={i} className="waveform-bar" />
      ))}
    </div>
  );
}

export default function PipelineStep({
  number,
  name,
  status,
  progress,
  message,
  isAudioStep,
}: PipelineStepProps) {
  return (
    <div
      className={`p-4 border-[0.5px] border-[rgba(212,168,83,0.15)] bg-noir-2 transition-all duration-200 ${
        status === "running" ? "border-l-[3px] animate-pulse-border bg-velvet" : ""
      }`}
      style={{ borderRadius: "2px" }}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <StepIcon status={status} />
          <span className="font-mono text-xs uppercase tracking-wider text-paper">
            [{number}] {name}
          </span>
          {isAudioStep && status === "running" && <WaveformAnimation />}
        </div>
        <StatusBadge status={status} />
      </div>

      {(status === "running" || status === "done") && (
        <div className="mt-3 ml-8">
          <div className="h-1 bg-noir-3 rounded-sm overflow-hidden">
            <div
              className="h-full bg-tape transition-all duration-500 ease-out"
              style={{ width: `${progress}%` }}
            />
          </div>
          {message && (
            <p className="font-mono text-[11px] text-dust mt-1">{message}</p>
          )}
        </div>
      )}
    </div>
  );
}
