import { Card } from "../../../components/ui/Card.jsx";

const Pulse = ({ className }) => (
  <div className={`animate-pulse rounded bg-slate-200 ${className}`} />
);

export function DashboardSkeleton() {
  return (
    <div className="space-y-5">
      <Card className="p-6">
        <Pulse className="h-3 w-24 mb-3" />
        <Pulse className="h-9 w-72 max-w-full mb-3" />
        <Pulse className="h-4 w-96 max-w-full" />
      </Card>
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        <Card className="p-6 lg:col-span-4 space-y-3">
          <Pulse className="h-3 w-24" />
          <Pulse className="h-24 w-24 rounded-full" />
          <Pulse className="h-4 w-32" />
        </Card>
        <Card className="p-6 lg:col-span-5 space-y-3">
          <Pulse className="h-3 w-28" />
          <Pulse className="h-4 w-40" />
          <Pulse className="h-2 w-full" />
          <Pulse className="h-2 w-3/4" />
        </Card>
        <Card className="p-6 lg:col-span-3 space-y-3">
          <Pulse className="h-3 w-20" />
          <Pulse className="h-8 w-16" />
          <Pulse className="h-14 w-full" />
        </Card>
      </div>
    </div>
  );
}

export function ScannerSkeleton() {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
      <Card className="lg:col-span-7 p-6">
        <Pulse className="h-3 w-20 mb-3" />
        <Pulse className="h-40 w-full mb-4" />
        <div className="grid grid-cols-2 gap-3">
          <Pulse className="h-10 w-full" />
          <Pulse className="h-10 w-full" />
        </div>
      </Card>
      <Card className="lg:col-span-5 p-6 space-y-3">
        <Pulse className="h-3 w-24" />
        {Array.from({ length: 4 }).map((_, i) => (
          <Pulse key={i} className="h-12 w-full" />
        ))}
      </Card>
    </div>
  );
}

export function SwapSkeleton() {
  return (
    <div className="space-y-5">
      <Card className="p-6 space-y-3">
        <Pulse className="h-3 w-24" />
        <Pulse className="h-8 w-72 max-w-full" />
      </Card>
      <Card className="p-0 overflow-hidden">
        <div className="p-4 border-b border-slate-200">
          <Pulse className="h-8 w-64" />
        </div>
        <div className="p-4 space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <Pulse key={i} className="h-12 w-full" />
          ))}
        </div>
      </Card>
    </div>
  );
}

export function DiarySkeleton() {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
      <Card className="lg:col-span-4 p-5 space-y-3">
        <Pulse className="h-3 w-20" />
        {Array.from({ length: 5 }).map((_, i) => (
          <Pulse key={i} className="h-10 w-full" />
        ))}
      </Card>
      <Card className="lg:col-span-8 p-5 space-y-3">
        <Pulse className="h-3 w-28" />
        <Pulse className="h-36 w-full" />
        <div className="grid grid-cols-2 gap-3">
          <Pulse className="h-10 w-full" />
          <Pulse className="h-10 w-full" />
        </div>
      </Card>
    </div>
  );
}

export function WellnessLogSkeleton() {
  return (
    <div className="space-y-5">
      <Card className="p-4 space-y-2">
        <Pulse className="h-3 w-24" />
        <Pulse className="h-10 w-full" />
      </Card>
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        <Card className="lg:col-span-7 p-6 space-y-3">
          <Pulse className="h-3 w-24" />
          <Pulse className="h-24 w-full" />
          <Pulse className="h-12 w-full" />
        </Card>
        <Card className="lg:col-span-5 p-6 space-y-3">
          <Pulse className="h-3 w-28" />
          {Array.from({ length: 3 }).map((_, i) => (
            <Pulse key={i} className="h-14 w-full" />
          ))}
        </Card>
      </div>
    </div>
  );
}

export function BudgetSkeleton() {
  return (
    <div className="space-y-5">
      <Card className="p-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <Pulse className="h-28 w-full" />
          <Pulse className="h-28 w-full" />
          <Pulse className="h-28 w-full" />
        </div>
      </Card>
      <Card className="p-6 space-y-3">
        <Pulse className="h-3 w-28" />
        <Pulse className="h-10 w-full" />
        <Pulse className="h-20 w-full" />
      </Card>
    </div>
  );
}

export function CalendarSkeleton() {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
      <Card className="lg:col-span-8 p-6">
        <Pulse className="h-3 w-32 mb-3" />
        <Pulse className="h-80 w-full" />
      </Card>
      <div className="lg:col-span-4 space-y-5">
        <Card className="p-5">
          <Pulse className="h-3 w-24 mb-3" />
          <Pulse className="h-24 w-full" />
        </Card>
        <Card className="p-5">
          <Pulse className="h-3 w-24 mb-3" />
          <Pulse className="h-24 w-full" />
        </Card>
      </div>
    </div>
  );
}

export function InsightsSkeleton() {
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        {Array.from({ length: 3 }).map((_, i) => (
          <Card key={i} className="p-5 space-y-3">
            <Pulse className="h-3 w-24" />
            <Pulse className="h-8 w-20" />
            <Pulse className="h-10 w-full" />
          </Card>
        ))}
      </div>
      <Card className="p-6">
        <Pulse className="h-3 w-36 mb-3" />
        <Pulse className="h-48 w-full" />
      </Card>
    </div>
  );
}

export function HistorySkeleton() {
  return (
    <Card className="overflow-hidden p-0">
      <div className="p-4 border-b border-slate-200">
        <Pulse className="h-9 w-72 max-w-full" />
      </div>
      <div className="p-4 space-y-3">
        {Array.from({ length: 7 }).map((_, i) => (
          <Pulse key={i} className="h-12 w-full" />
        ))}
      </div>
    </Card>
  );
}

export function ProfileSkeleton() {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
      <Card className="lg:col-span-4 p-5 space-y-3">
        <Pulse className="h-20 w-20 rounded-full" />
        <Pulse className="h-4 w-40" />
        <Pulse className="h-10 w-full" />
      </Card>
      <Card className="lg:col-span-8 p-5 space-y-3">
        <Pulse className="h-4 w-32" />
        <Pulse className="h-10 w-full" />
        <Pulse className="h-10 w-full" />
        <Pulse className="h-10 w-full" />
      </Card>
    </div>
  );
}

export function StatusSkeleton() {
  return (
    <div className="space-y-5">
      <Card className="p-5">
        <Pulse className="h-3 w-36 mb-3" />
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Pulse key={i} className="h-12 w-full" />
          ))}
        </div>
      </Card>
      <Card className="p-5">
        <Pulse className="h-3 w-28 mb-3" />
        <Pulse className="h-24 w-full" />
      </Card>
    </div>
  );
}

export function AllScansSkeleton() {
  return (
    <Card className="overflow-hidden p-0">
      <div className="p-4 border-b border-slate-200">
        <Pulse className="h-9 w-80 max-w-full" />
      </div>
      <div className="p-4 space-y-3">
        {Array.from({ length: 8 }).map((_, i) => (
          <Pulse key={i} className="h-12 w-full" />
        ))}
      </div>
    </Card>
  );
}
