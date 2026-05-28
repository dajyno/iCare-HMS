import { Skeleton } from "@/components/ui/skeleton"

interface CardGridSkeletonProps {
  count?: number
  columns?: number
}

export function CardGridSkeleton({ count = 10, columns = 4 }: CardGridSkeletonProps) {
  return (
    <div
      className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4"
      style={{ gridTemplateColumns: `repeat(${Math.min(columns, count)}, minmax(0, 1fr))` }}
    >
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="rounded-xl border-none shadow-sm ring-1 ring-slate-200 p-5 space-y-3"
        >
          <div className="flex items-start justify-between">
            <div className="space-y-2 flex-1">
              <Skeleton className="h-3 w-20" />
              <Skeleton className="h-5 w-16" />
            </div>
            <Skeleton className="w-10 h-10 rounded-lg shrink-0" />
          </div>
        </div>
      ))}
    </div>
  )
}
