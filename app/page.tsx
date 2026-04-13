"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Job } from "@/lib/types";

const quickActions = [
  { href: "/studio", label: "Pipeline", detail: "Full production flow", accent: "text-crimson", border: "border-crimson/30" },
  { href: "/music", label: "Music", detail: "Generate variations", accent: "text-tape", border: "border-tape/25" },
  { href: "/thumbnails", label: "Thumbnails", detail: "Create artwork", accent: "text-tape", border: "border-tape/25" },
  { href: "/video", label: "Video", detail: "Assemble MP4", accent: "text-tape", border: "border-tape/25" },
];

export default function Dashboard() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/jobs")
      .then((response) => response.json())
      .then((data) => {
        setJobs(data.jobs || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const recentJobs = useMemo(
    () => [...jobs].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).slice(0, 6),
    [jobs]
  );
  const completedJobs = useMemo(
    () => jobs.filter((job) => job.status === "complete" || job.status === "legacy"),
    [jobs]
  );
  const runningJobs = useMemo(() => jobs.filter((job) => job.status === "running"), [jobs]);
  const lastRelease = completedJobs[0]
    ? [...completedJobs].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0]
    : null;

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <span className="font-mono text-sm text-dust animate-pulse-opacity">Loading studio...</span>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <section className="relative overflow-hidden rounded-[30px] border border-[rgba(212,168,83,0.16)] bg-[linear-gradient(135deg,rgba(160,28,18,0.26),rgba(18,12,8,0.98)_45%,rgba(212,168,83,0.08))] px-6 py-8 shadow-[0_30px_80px_rgba(0,0,0,0.28)]">
        <div className="absolute inset-y-0 right-0 hidden w-1/2 bg-[radial-gradient(circle_at_top_right,rgba(212,168,83,0.18),transparent_55%)] lg:block" />
        <div className="relative grid gap-6 lg:grid-cols-[minmax(0,1.2fr)_360px]">
          <div>
            <p className="font-mono text-[11px] uppercase tracking-[0.28em] text-tape">Piros Tape Control Room</p>
            <h1 className="mt-3 font-display text-4xl leading-none text-paper md:text-6xl">
              Build, review, and ship the whole release from one studio.
            </h1>
            <p className="mt-4 max-w-2xl font-body text-lg leading-8 text-ash">
              Run the full pipeline, generate single assets on demand, and keep every song, thumbnail, and video organized in one place.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link href="/studio" className="btn-primary">
                Start a new production
              </Link>
              <Link href="/assets" className="btn-secondary">
                Open asset library
              </Link>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-1">
            <StatCard label="Produced" value={String(completedJobs.length)} tone="text-paper" />
            <StatCard label="Running" value={String(runningJobs.length)} tone={runningJobs.length > 0 ? "text-tape" : "text-paper"} />
            <StatCard
              label="Last Release"
              value={lastRelease ? lastRelease.title : "None yet"}
              tone="text-paper"
              small
              meta={lastRelease ? new Date(lastRelease.createdAt).toLocaleDateString("hu-HU") : "Ready when you are"}
            />
          </div>
        </div>
      </section>

      <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        {quickActions.map((action) => (
          <Link
            key={action.href}
            href={action.href}
            className={`rounded-[24px] border ${action.border} bg-noir-2/80 p-5 shadow-[0_18px_50px_rgba(0,0,0,0.18)] transition-all hover:-translate-y-0.5 hover:border-dust/40`}
          >
            <p className={`font-mono text-[10px] uppercase tracking-[0.24em] ${action.accent}`}>{action.label}</p>
            <p className="mt-3 font-display text-2xl text-paper">{action.detail}</p>
            <p className="mt-4 font-mono text-[10px] uppercase tracking-[0.18em] text-dust">Open workspace</p>
          </Link>
        ))}
      </section>

      <section className="grid gap-6 xl:grid-cols-[minmax(0,1.25fr)_360px]">
        <div className="rounded-[26px] border border-[rgba(212,168,83,0.16)] bg-noir-2/80 p-6 shadow-[0_18px_50px_rgba(0,0,0,0.2)]">
          <div className="mb-5 flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="font-mono text-[10px] uppercase tracking-[0.24em] text-dust">Recent Productions</p>
              <h2 className="mt-2 font-display text-3xl text-paper">Latest Sessions</h2>
            </div>
            <Link href="/jobs" className="font-mono text-[10px] uppercase tracking-[0.2em] text-tape hover:text-paper">
              View all jobs
            </Link>
          </div>

          {recentJobs.length === 0 ? (
            <div className="rounded-[22px] border border-dust/10 bg-noir-3/60 px-5 py-14 text-center">
              <p className="font-body text-lg italic text-dust">A tape feltöltve. Az első dal még vár.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {recentJobs.map((job) => (
                <Link
                  key={job.id}
                  href={`/studio/${job.id}`}
                  className="block rounded-[22px] border border-dust/12 bg-noir-3/60 p-4 transition-all hover:-translate-y-0.5 hover:border-dust/30"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="font-display text-2xl text-paper">{job.title}</p>
                      <p className="mt-1 font-body text-sm text-ash">{job.artists}</p>
                      <div className="mt-3 flex flex-wrap gap-2">
                        <span className="rounded-full border border-dust/15 px-3 py-1 font-mono text-[10px] uppercase tracking-[0.16em] text-dust">
                          {job.style}
                        </span>
                        <span className="rounded-full border border-dust/15 px-3 py-1 font-mono text-[10px] uppercase tracking-[0.16em] text-dust">
                          {job.bpm} BPM
                        </span>
                      </div>
                    </div>
                    <div className="text-right">
                      <StatusBadge status={job.status} />
                      <p className="mt-2 font-mono text-[10px] uppercase tracking-[0.16em] text-dust">
                        {new Date(job.createdAt).toLocaleDateString("hu-HU")}
                      </p>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>

        <div className="space-y-6">
          <section className="rounded-[26px] border border-[rgba(212,168,83,0.16)] bg-noir-2/80 p-6 shadow-[0_18px_50px_rgba(0,0,0,0.2)]">
            <p className="font-mono text-[10px] uppercase tracking-[0.24em] text-dust">Pipeline Status</p>
            <div className="mt-4 space-y-3">
              <HealthRow label="Engine" value={runningJobs.length > 0 ? "Running" : "Ready"} tone={runningJobs.length > 0 ? "text-tape" : "text-paper"} />
              <HealthRow label="Jobs" value={String(jobs.length)} tone="text-paper" />
              <HealthRow label="Completed" value={String(completedJobs.length)} tone="text-paper" />
            </div>
          </section>

          <section className="rounded-[26px] border border-[rgba(212,168,83,0.16)] bg-noir-2/80 p-6 shadow-[0_18px_50px_rgba(0,0,0,0.2)]">
            <p className="font-mono text-[10px] uppercase tracking-[0.24em] text-dust">Jump Back In</p>
            <div className="mt-4 space-y-3">
              <Link href="/music" className="block rounded-[20px] border border-dust/12 bg-noir-3/60 px-4 py-4 font-mono text-xs uppercase tracking-[0.18em] text-paper transition-all hover:border-dust/30">
                Generate a standalone song
              </Link>
              <Link href="/thumbnails" className="block rounded-[20px] border border-dust/12 bg-noir-3/60 px-4 py-4 font-mono text-xs uppercase tracking-[0.18em] text-paper transition-all hover:border-dust/30">
                Generate standalone artwork
              </Link>
              <Link href="/video" className="block rounded-[20px] border border-dust/12 bg-noir-3/60 px-4 py-4 font-mono text-xs uppercase tracking-[0.18em] text-paper transition-all hover:border-dust/30">
                Assemble a video from assets
              </Link>
            </div>
          </section>
        </div>
      </section>
    </div>
  );
}

function StatCard({
  label,
  value,
  tone,
  meta,
  small = false,
}: {
  label: string;
  value: string;
  tone: string;
  meta?: string;
  small?: boolean;
}) {
  return (
    <div className="rounded-[22px] border border-[rgba(212,168,83,0.14)] bg-[rgba(10,6,4,0.42)] p-4 backdrop-blur">
      <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-dust">{label}</p>
      <p className={`mt-2 ${small ? "truncate text-lg" : "text-3xl"} font-display ${tone}`}>{value}</p>
      {meta ? <p className="mt-2 font-mono text-[10px] uppercase tracking-[0.16em] text-dust">{meta}</p> : null}
    </div>
  );
}

function HealthRow({ label, value, tone }: { label: string; value: string; tone: string }) {
  return (
    <div className="flex items-center justify-between rounded-[18px] border border-dust/12 bg-noir-3/60 px-4 py-3">
      <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-dust">{label}</span>
      <span className={`font-mono text-[11px] uppercase tracking-[0.18em] ${tone}`}>{value}</span>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    complete: "text-tape",
    legacy: "text-tape",
    running: "text-paper",
    pending: "text-dust",
    error: "text-crimson",
  };

  const label: Record<string, string> = {
    complete: "Done",
    legacy: "Legacy",
    running: "Running",
    pending: "Pending",
    error: "Error",
  };

  return (
    <span className={`rounded-full border border-current/20 px-3 py-1 font-mono text-[10px] uppercase tracking-[0.18em] ${styles[status] || "text-dust"}`}>
      {label[status] || status}
    </span>
  );
}
