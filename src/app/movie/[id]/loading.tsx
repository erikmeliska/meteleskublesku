import { Skeleton } from "@/components/ui/skeleton";

export default function MovieLoading() {
  return (
    <div className="container py-6 pb-32">
      <Skeleton className="h-8 w-32 mb-4" />
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
        <div className="md:col-span-4">
          <Skeleton className="aspect-video w-full rounded-lg" />
          <div className="grid grid-cols-4 gap-2 mt-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="aspect-video rounded" />
            ))}
          </div>
        </div>
        <div className="md:col-span-3 space-y-3">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-16 w-full" />
        </div>
        <div className="md:col-span-5">
          <div className="space-y-2">
            {Array.from({ length: 8 }).map((_, i) => (
              <Skeleton key={i} className="h-10 w-full" />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
