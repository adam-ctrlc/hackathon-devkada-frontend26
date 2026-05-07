export function Ring({
  value = 72,
  size = 120,
  stroke = 10,
  label,
  sub,
  tone = "brand",
}) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const off = c - (value / 100) * c;
  const colors = {
    brand: "#2563EB",
    amber: "#D97706",
    red: "#DC2626",
    green: "#059669",
  };
  return (
    <div
      className="relative inline-grid place-items-center"
      style={{ width: size, height: size }}
    >
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke="#E2E8F0"
          strokeWidth={stroke}
          fill="none"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke={colors[tone] ?? colors.brand}
          strokeWidth={stroke}
          fill="none"
          strokeDasharray={c}
          strokeDashoffset={off}
          strokeLinecap="round"
        />
      </svg>
      <div className="absolute inset-0 grid place-items-center text-center">
        <div>
          <div className="font-display text-[26px] leading-none text-slate-900">
            {label ?? value}
          </div>
          {sub && (
            <div className="text-[10px] uppercase tracking-wider text-slate-500 mt-1">
              {sub}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export function Spark({
  data = [],
  w = 120,
  h = 36,
  tone = "brand",
  area = true,
}) {
  if (!data.length) return null;
  const min = Math.min(...data),
    max = Math.max(...data);
  const range = max - min || 1;
  const pts = data.map((v, i) => [
    (i / (data.length - 1)) * w,
    h - ((v - min) / range) * (h - 4) - 2,
  ]);
  const path = pts
    .map(
      (p, i) => (i === 0 ? "M" : "L") + p[0].toFixed(1) + " " + p[1].toFixed(1),
    )
    .join(" ");
  const fill = `${path} L ${w} ${h} L 0 ${h} Z`;
  const colors = { brand: "#2563EB", amber: "#D97706" };
  return (
    <svg width={w} height={h}>
      {area && (
        <path d={fill} fill={colors[tone] ?? colors.brand} opacity=".10" />
      )}
      <path
        d={path}
        fill="none"
        stroke={colors[tone] ?? colors.brand}
        strokeWidth="1.6"
      />
    </svg>
  );
}

export function Bar({ value = 60, tone = "brand" }) {
  const colors = {
    brand: "bg-brand-600",
    amber: "bg-amber-500",
    red: "bg-red-500",
    green: "bg-emerald-500",
    slate: "bg-slate-400",
  };
  return (
    <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
      <div
        className={`h-full ${colors[tone] ?? colors.brand} rounded-full`}
        style={{ width: `${value}%` }}
      />
    </div>
  );
}
