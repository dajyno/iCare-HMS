import { Skeleton } from "@/components/ui/skeleton"

interface TableSkeletonProps {
  rows?: number
  columns?: number
  searchable?: boolean
}

export function TableSkeleton({ rows = 5, columns = 4, searchable = true }: TableSkeletonProps) {
  return (
    <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
      {searchable && (
        <div className="p-4 border-b bg-slate-50/50">
          <Skeleton className="h-9 w-72" />
        </div>
      )}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b bg-slate-50/50">
              {Array.from({ length: columns }).map((_, i) => (
                <th key={i} className="px-4 py-3">
                  <Skeleton className="h-4 w-24" />
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: rows }).map((_, r) => (
              <tr key={r} className="border-b last:border-b-0">
                {Array.from({ length: columns }).map((_, c) => (
                  <td key={c} className="px-4 py-3">
                    <Skeleton className={`h-4 ${c === 0 ? "w-32" : "w-20"}`} />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
