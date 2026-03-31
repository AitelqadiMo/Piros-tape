"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Job } from "@/lib/types";

export default function Dashboard() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/jobs")
      .then((r) => r.json())
      .then((data) => {
        setJobs(data.jobs || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const completedJobs = jobs.filter(
    (j) => j.status === "complete" || j.status === "legacy"
  );
  const lastRelease = completedJobs.length > 0
    ? completedJobs.sort((a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      )[0]
    : null;
  const isRunning = jobs.some((j) => j.status === "running");
  const recentJobs = [...jobs]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 5);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <span className="font-mono text-sm text-dust animate-pulse-opacity">
          Loading...
        </span>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Stat cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 animate-fade-in">
        <div
          className="bg-noir-2 border-[0.5px] border-[rgba(212,168,83,0.15)] p-6"
          style={{ borderRadius: "2px" }}
        >
          <p className="font-mono text-[11px] uppercase tracking-wider text-dust">
            Tracks Produced
          </p>
          <p className="font-display text-4xl text-paper mt-2">
            {completedJobs.length}
          </p>
        </div>

        <div
          className="bg-noir-2 border-[0.5px] border-[rgba(212,168,83,0.15)] p-6"
          style={{ borderRadius: "2px" }}
        >
          <p className="font-mono text-[11px] uppercase tracking-wider text-dust">
            Last Release
          </p>
          {lastRelease ? (
            <>
              <p className="font-mono text-sm text-paper mt-2 uppercase">
                {lastRelease.title}
              </p>
              <p className="font-mono text-[11px] text-dust mt-1">
                {new Date(lastRelease.createdAt).toLocaleDateString("hu-HU")}
              </p>
            </>
          ) : (
            <p className="font-body italic text-sm text-dust mt-2">—</p>
          )}
        </div>

        <div
          className="bg-noir-2 border-[0.5px] border-[rgba(212,168,83,0.15)] p-6"
          style={{ borderRadius: "2px" }}
        >
          <p className="font-mono text-[11px] uppercase tracking-wider text-dust">
            Pipeline Status
          </p>
          <p className={`font-mono text-sm mt-2 uppercase ${isRunning ? "text-tape animate-pulse-opacity" : "text-tape"}`}>
            {isRunning ? "Running" : "Ready"}
          </p>
        </div>
      </div>

      {/* Start new track button */}
      <div className="animate-fade-in animate-delay-1">
        <Link href="/studio" className="btn-primary inline-block text-center w-full md:w-auto">
          Start New Track
        </Link>
      </div>

      {/* Recent jobs table */}
      <div className="animate-fade-in animate-delay-2">
        <h2 className="font-display text-xl text-paper mb-4">Recent Productions</h2>

        {recentJobs.length === 0 ? (
          <div className="text-center py-16">
            <p className="font-body italic text-lg text-dust">
              A tape feltöltve. Az első dal még vár.
            </p>
          </div>
        ) : (
          <div
            className="bg-noir-2 border-[0.5px] border-[rgba(212,168,83,0.15)] overflow-hidden"
            style={{ borderRadius: "2px" }}
          >
            <table className="w-full">
              <thead>
                <tr className="border-b border-noir-3">
                  <th className="font-mono text-[11px] uppercase tracking-wider text-dust text-left px-4 py-3">
                    Title
                  </th>
                  <th className="font-mono text-[11px] uppercase tracking-wider text-dust text-left px-4 py-3 hidden md:table-cell">
                    Style
                  </th>
                  <th className="font-mono text-[11px] uppercase tracking-wider text-dust text-left px-4 py-3 hidden md:table-cell">
                    Date
                  </th>
                  <th className="font-mono text-[11px] uppercase tracking-wider text-dust text-left px-4 py-3">
                    Status
                  </th>
                  <th className="font-mono text-[11px] uppercase tracking-wider text-dust text-left px-4 py-3">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {recentJobs.map((job) => (
                  <tr
                    key={job.id}
                    className="border-b border-noir-3 last:border-b-0"
                  >
                    <td className="px-4 py-3">
                      <span className="font-mono text-xs uppercase text-paper">
                        {job.title}
                      </span>
                      <br />
                      <span className="font-body text-xs text-dust">
                        {job.artists}
                      </span>
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell">
                      <span className="font-mono text-[11px] text-dust">
                        {job.style}
                      </span>
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell">
                      <span className="font-mono text-[11px] text-dust">
                        {new Date(job.createdAt).toLocaleDateString("hu-HU")}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={job.status} />
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-2">
                        {(job.status === "complete" || job.status === "legacy") &&
                          !job.id.startsWith("legacy") && (
                            <>
                              <Link
                                href={`/studio/${job.id}`}
                                className="font-mono text-[10px] text-tape hover:text-paper uppercase"
                              >
                                Preview
                              </Link>
                              <a
                                href={`/api/jobs/${job.id}/download?file=video`}
                                className="font-mono text-[10px] text-tape hover:text-paper uppercase"
                              >
                                Download
                              </a>
                            </>
                          )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    complete: "text-tape",
    legacy: "text-tape",
    running: "text-paper animate-pulse-opacity",
    pending: "text-dust",
    error: "text-crimson",
  };

  const label: Record<string, string> = {
    complete: "DONE",
    legacy: "LEGACY",
    running: "RUNNING",
    pending: "PENDING",
    error: "ERROR",
  };

  return (
    <span className={`font-mono text-[11px] uppercase ${styles[status] || "text-dust"}`}>
      {label[status] || status}
    </span>
  );
}
