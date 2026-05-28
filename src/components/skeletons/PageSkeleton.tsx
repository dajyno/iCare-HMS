import * as React from "react"
import { Skeleton } from "@/components/ui/skeleton"

interface PageSkeletonProps {
  title?: string
  description?: string
  children?: React.ReactNode
}

export function PageSkeleton({ title, description, children }: PageSkeletonProps) {
  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          {title ? (
            <h1 className="text-2xl font-bold text-slate-900">{title}</h1>
          ) : (
            <Skeleton className="h-8 w-48" />
          )}
          {description ? (
            <p className="text-sm text-slate-500">{description}</p>
          ) : (
            <Skeleton className="h-4 w-64" />
          )}
        </div>
      </div>
      {children || (
        <div className="space-y-4">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      )}
    </div>
  )
}
