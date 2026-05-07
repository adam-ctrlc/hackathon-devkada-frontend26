import { Card } from "./Card.jsx";

export function RouteHeaderSkeleton() {
  return (
    <div className="mb-7">
      <div className="h-3 w-28 rounded bg-slate-200 animate-pulse mb-3" />
      <div className="h-9 w-80 max-w-full rounded bg-slate-200 animate-pulse" />
      <div className="h-4 w-[28rem] max-w-full rounded bg-slate-100 animate-pulse mt-3" />
    </div>
  );
}

export function RouteCardsSkeleton({ cards = 3 }) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
      {Array.from({ length: cards }).map((_, index) => (
        <Card key={index} className="p-6 lg:col-span-4">
          <div className="h-3 w-24 rounded bg-slate-200 animate-pulse mb-4" />
          <div className="h-7 w-24 rounded bg-slate-200 animate-pulse mb-4" />
          <div className="h-2.5 w-full rounded bg-slate-100 animate-pulse mb-2" />
          <div className="h-2.5 w-2/3 rounded bg-slate-100 animate-pulse" />
        </Card>
      ))}
    </div>
  );
}

export function RouteTableSkeleton({ rows = 6 }) {
  return (
    <Card className="overflow-hidden p-0">
      <div className="px-6 py-3 border-b border-slate-200 bg-slate-50">
        <div className="h-3 w-48 rounded bg-slate-200 animate-pulse" />
      </div>
      <div className="divide-y divide-slate-100">
        {Array.from({ length: rows }).map((_, index) => (
          <div key={index} className="px-6 py-4">
            <div className="h-3.5 w-3/4 rounded bg-slate-200 animate-pulse mb-2" />
            <div className="h-3 w-1/2 rounded bg-slate-100 animate-pulse" />
          </div>
        ))}
      </div>
    </Card>
  );
}

export function RoutePageSkeleton({ cards = 3, rows = 6 }) {
  return (
    <>
      <RouteHeaderSkeleton />
      <RouteCardsSkeleton cards={cards} />
      <div className="mt-5">
        <RouteTableSkeleton rows={rows} />
      </div>
    </>
  );
}
