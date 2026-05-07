const tones = {
  brand: "bg-brand-50 text-brand-700 ring-1 ring-brand-100",
  slate: "bg-slate-100 text-slate-700 ring-1 ring-slate-200",
  red: "bg-red-50 text-red-700 ring-1 ring-red-100",
  amber: "bg-amber-50 text-amber-800 ring-1 ring-amber-100",
  green: "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100",
  sky: "bg-sky-50 text-sky-700 ring-1 ring-sky-100",
  ink: "bg-slate-900 text-white",
};

export function Pill({ tone = "brand", className = "", children }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium tracking-wide uppercase ${tones[tone] ?? tones.brand} ${className}`}
    >
      {children}
    </span>
  );
}

export function Support({ level = "High", showDot = true }) {
  const map = {
    High: { tone: "green", dot: "bg-emerald-500" },
    Medium: { tone: "amber", dot: "bg-amber-500" },
    Low: { tone: "red", dot: "bg-red-500" },
  }[level] ?? { tone: "slate", dot: "bg-slate-400" };
  return (
    <Pill tone={map.tone} className="!normal-case !tracking-normal">
      {showDot && <span className={`w-1.5 h-1.5 rounded-full ${map.dot}`} />}
      {level} support
    </Pill>
  );
}
