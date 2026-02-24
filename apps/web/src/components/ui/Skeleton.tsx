interface SkeletonProps {
  className?: string;
  style?: React.CSSProperties;
}

export function Skeleton({ className = '', style }: SkeletonProps) {
  return (
    <div
      role="status"
      className={`animate-pulse rounded-md bg-zinc-800 ${className}`}
      style={style}
    />
  );
}

export function StatSkeleton() {
  return (
    <div className="card p-5">
      <Skeleton className="mb-3 h-3 w-20" />
      <Skeleton className="h-7 w-16" />
    </div>
  );
}

export function CardSkeleton() {
  return (
    <div className="card p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Skeleton className="h-2.5 w-2.5 rounded-full" />
          <div className="space-y-2">
            <Skeleton className="h-4 w-36" />
            <Skeleton className="h-3 w-48" />
          </div>
        </div>
        <Skeleton className="h-5 w-14 rounded-full" />
      </div>
    </div>
  );
}

export function ChartSkeleton() {
  return (
    <div className="card p-5 space-y-4">
      <div className="flex items-center justify-between">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-7 w-24 rounded-md" />
      </div>
      <div className="flex items-end gap-2 h-48 pt-4">
        {Array.from({ length: 12 }).map((_, i) => (
          <Skeleton
            key={i}
            className="flex-1 rounded-t-sm"
            style={{ height: `${30 + ((i * 37 + 13) % 70)}%` }}
          />
        ))}
      </div>
    </div>
  );
}
