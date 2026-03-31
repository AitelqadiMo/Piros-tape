"use client";

import { useEffect, useState } from "react";
import TrackCard from "@/components/TrackCard";
import { Job } from "@/lib/types";

export default function CatalogPage() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/jobs")
      .then((r) => r.json())
      .then((data) => {
        const completed = (data.jobs || []).filter(
          (j: Job) => j.status === "complete" || j.status === "legacy"
        );
        setJobs(
          completed.sort(
            (a: Job, b: Job) =>
              new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
          )
        );
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

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
    <div className="space-y-6">
      <h1 className="font-display text-2xl text-paper animate-fade-in">
        Catalog
      </h1>

      {jobs.length === 0 ? (
        <div className="text-center py-16 animate-fade-in animate-delay-1">
          <p className="font-body italic text-lg text-dust">
            Még nincs kiadott szám. Kezdj egy új productiont.
          </p>
        </div>
      ) : (
        <div className="catalog-grid grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 animate-fade-in animate-delay-1">
          {jobs.map((job) => (
            <TrackCard key={job.id} job={job} />
          ))}
        </div>
      )}
    </div>
  );
}
