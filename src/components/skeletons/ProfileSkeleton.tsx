import { Skeleton } from "@/components/ui/skeleton"

export function ProfileSkeleton() {
  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Cover / header area */}
      <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
        <div className="h-32 bg-gradient-to-r from-slate-100 to-slate-200" />
        <div className="px-6 pb-6 -mt-12">
          <div className="flex items-end gap-5">
            <Skeleton className="w-24 h-24 rounded-full ring-4 ring-white" />
            <div className="pb-1 space-y-2 flex-1">
              <Skeleton className="h-6 w-48" />
              <Skeleton className="h-4 w-32" />
            </div>
          </div>
        </div>
      </div>

      {/* Stats / tabs row */}
      <div className="flex gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-20 flex-1 rounded-xl" />
        ))}
      </div>

      {/* Content panel */}
      <div className="bg-white rounded-xl border shadow-sm p-6 space-y-4">
        <Skeleton className="h-6 w-40" />
        <div className="grid grid-cols-2 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="space-y-1">
              <Skeleton className="h-3 w-16" />
              <Skeleton className="h-5 w-36" />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
