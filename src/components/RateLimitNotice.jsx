import {
  ClockCounterClockwise,
  HourglassHigh,
  ShieldWarning,
} from "@phosphor-icons/react";

const formatWait = (seconds) => {
  const value = Number(seconds ?? 0);
  if (!Number.isFinite(value) || value <= 0) return "a moment";
  if (value < 60) return `${Math.ceil(value)} sec`;
  return `${Math.ceil(value / 60)} min`;
};

export function RateLimitNotice({
  error,
  title = "Too many requests",
  className = "",
  compact = false,
}) {
  const waitLabel = formatWait(error?.retryAfterSeconds);

  return (
    <div
      className={`relative overflow-hidden rounded-2xl border border-amber-200 bg-gradient-to-br from-amber-50 via-white to-cyan-50 p-5 text-center ${className}`}
    >
      <div className="pointer-events-none absolute inset-x-8 top-0 h-px bg-gradient-to-r from-transparent via-amber-300 to-transparent" />
      <div className="relative mx-auto mb-4 grid h-20 w-20 place-items-center rounded-full bg-white ring-1 ring-amber-200 shadow-sm">
        <ShieldWarning size={58} weight="duotone" className="text-amber-500" />
        <HourglassHigh
          size={24}
          weight="fill"
          className="absolute bottom-3 right-2 rounded-full bg-white p-0.5 text-teal-700"
        />
      </div>
      <div className="mx-auto mb-2 inline-flex items-center gap-1.5 rounded-full bg-white px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wider text-amber-700 ring-1 ring-amber-200">
        <ClockCounterClockwise size={13} />
        Slow down
      </div>
      <h2
        className={`${compact ? "text-[18px]" : "text-[24px]"} font-display leading-tight text-slate-950`}
      >
        {title}
      </h2>
      <p className="mx-auto mt-2 max-w-[360px] text-[13px] leading-relaxed text-slate-600">
        KainWise paused requests to protect your account and the AI services.
        Try again in{" "}
        <span className="font-semibold text-amber-800">{waitLabel}</span>.
      </p>
    </div>
  );
}
