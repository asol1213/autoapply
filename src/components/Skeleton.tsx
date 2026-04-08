"use client";

export function SkeletonPulse({ className = "" }: { className?: string }) {
  return (
    <div
      className={`skeleton-pulse rounded ${className}`}
      style={{ background: "var(--border)" }}
    />
  );
}

export function SkeletonKPICard() {
  return (
    <div className="bg-[var(--card)] border border-[var(--border)] rounded-lg p-2 text-center">
      <SkeletonPulse className="h-3 w-12 mx-auto mb-2" />
      <SkeletonPulse className="h-6 w-8 mx-auto" />
    </div>
  );
}

export function SkeletonCard() {
  return (
    <div className="bg-[var(--card)] border border-[var(--border)] rounded-lg p-2.5">
      <div className="flex items-start justify-between mb-1">
        <SkeletonPulse className="h-4 w-24" />
        <SkeletonPulse className="h-3 w-3 rounded-full" />
      </div>
      <SkeletonPulse className="h-3 w-32 mb-2" />
      <SkeletonPulse className="h-3 w-16 mb-1" />
      <div className="flex items-center justify-between mt-2">
        <div className="flex gap-1">
          <SkeletonPulse className="h-4 w-10 rounded" />
          <SkeletonPulse className="h-4 w-10 rounded" />
        </div>
        <SkeletonPulse className="h-3 w-6" />
      </div>
    </div>
  );
}

export function SkeletonColumn() {
  return (
    <div className="rounded-xl border border-[var(--border)] flex flex-col bg-[var(--card)]">
      <div className="p-2.5 border-b border-[var(--border)] flex items-center justify-between">
        <div className="flex items-center gap-2">
          <SkeletonPulse className="w-2 h-2 rounded-full" />
          <SkeletonPulse className="h-3 w-16" />
        </div>
        <SkeletonPulse className="h-4 w-6 rounded" />
      </div>
      <div className="p-1.5 flex-1 space-y-1.5">
        <SkeletonCard />
        <SkeletonCard />
        <SkeletonCard />
      </div>
    </div>
  );
}

export function SkeletonDashboard() {
  return (
    <>
      {/* Skeleton KPI cards */}
      <div className="grid grid-cols-5 md:grid-cols-10 gap-2 mb-4">
        {Array.from({ length: 10 }).map((_, i) => (
          <SkeletonKPICard key={i} />
        ))}
      </div>
      {/* Skeleton Kanban columns */}
      <div className="grid grid-cols-4 gap-2 mb-5" style={{ minHeight: 420 }}>
        {Array.from({ length: 4 }).map((_, i) => (
          <SkeletonColumn key={i} />
        ))}
      </div>
    </>
  );
}
