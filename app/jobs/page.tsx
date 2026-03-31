"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Job } from "@/lib/types";

export default function JobsPage() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/jobs")
      .then((r) => r.json())
      .then((d) => {
        setJobs((d.jobs || []).sort((a: Job, b: Job) => 
          new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()
        ));
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const statusColor = (status: string) => {
    switch (status) {
      case "complete":
        return "text-tape";
      case "error":
        return "text-crimson";
      case "running":
        return "text-dust";
      case "pending":
        return "text-ash";
      default:
        return "text-paper";
    }
  };

  const statusIcon = (status: string) => {
    switch (status) {
      case "complete":
        return "✓";
      case "error":
        return "✗";
      case "running":
        return "⟳";
      default:
        return "◯";
    }
  };

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div className="flex items-center justify-between animate-fade-in">
        <h1 className="font-display text-2xl text-paper uppercase tracking-wide">
          Previous Productions
        </h1>
        <Link href="/studio" className="btn-primary">
          + New Production
        </Link>
      </div>

      {loading ? (
        <p className="text-dust">Loading...</p>
      ) : jobs.length === 0 ? (
        <div className="text-center py-12 border-[0.5px] border-[rgba(212,168,83,0.15)] bg-noir-2">
          <p className="text-dust italic">No productions yet</p>
          <Link href="/studio" className="text-tape hover:text-paper transition-colors mt-4 inline-block">
            Create your first one →
          </Link>
        </div>
      ) : (
        <div className="space-y-2">
          {jobs.map((job) => (
            <Link
              key={job.id}
              href={`/studio/${job.id}`}
              className="block border-[0.5px] border-[rgba(212,168,83,0.15)] bg-noir-2 hover:bg-noir-2-hover p-4 transition-colors"
              style={{ borderRadius: "2px" }}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`font-display text-lg ${statusColor(job.status)}`}>
                      {statusIcon(job.status)}
                    </span>
                    <h3 className="font-display text-paper uppercase">
                      {job.title}
                    </h3>
                    <span className="text-dust text-sm">by {job.artists}</span>
                  </div>
                  <div className="font-mono text-xs text-ash space-x-3">
                    <span>{job.style}</span>
                    <span>•</span>
                    <span>{job.decade}s</span>
                    <span>•</span>
                    <span>{job.bpm} BPM</span>
                  </div>
                </div>

                <div className="text-right">
                  <p className={`font-mono text-xs uppercase ${statusColor(job.status)}`}>
                    {job.status}
                  </p>
                  <p className="font-mono text-[10px] text-dust mt-1">
                    {new Date(job.createdAt || 0).toLocaleDateString()} {new Date(job.createdAt || 0).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
              </div>

              {job.status === "running" && (
                <div className="mt-3 pt-3 border-t-[0.5px] border-[rgba(212,168,83,0.1)]">
                  <p className="font-mono text-[10px] text-dust">
                    Step {job.currentStep} of 5 — {job.stepStatuses.filter((s) => s === "done").length}/{job.stepStatuses.length} complete
                  </p>
                </div>
              )}

              {job.status === "error" && (
                <div className="mt-3 pt-3 border-t-[0.5px] border-[rgba(212,168,83,0.1)]">
                  <p className="font-mono text-[10px] text-crimson italic">Failed at step {job.currentStep}</p>
                </div>
              )}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
