import { useId } from "react";
import { PieChart, Pie, Cell, AreaChart, Area } from "recharts";

const TONE_HEX = {
  brand: "#2563EB",
  amber: "#D97706",
  red: "#DC2626",
  green: "#059669",
};

const BAR_CLS = {
  brand: "bg-brand-600",
  amber: "bg-amber-500",
  red: "bg-red-500",
  green: "bg-emerald-500",
  slate: "bg-slate-400",
};

export function Ring({
  value = 72,
  size = 120,
  stroke = 10,
  label,
  sub,
  tone = "brand",
}) {
  const color = TONE_HEX[tone] ?? TONE_HEX.brand;
  const clamped = Math.max(0, Math.min(100, value));
  const outerR = Math.floor(size / 2) - 1;
  const innerR = outerR - stroke;
  const data = [{ v: clamped }, { v: 100 - clamped }];
  const labelSize =
    size >= 100 ? "text-[26px]" : size >= 70 ? "text-[18px]" : "text-[13px]";

  return (
    <div
      className="relative inline-grid place-items-center"
      style={{ width: size, height: size }}
    >
      <PieChart width={size} height={size}>
        <Pie
          data={data}
          dataKey="v"
          innerRadius={innerR}
          outerRadius={outerR}
          startAngle={90}
          endAngle={-270}
          strokeWidth={0}
          isAnimationActive
          animationBegin={0}
          animationDuration={600}
        >
          <Cell fill={color} />
          <Cell fill="#E2E8F0" />
        </Pie>
      </PieChart>
      <div className="absolute inset-0 grid place-items-center text-center pointer-events-none">
        <div>
          <div
            className={`font-display leading-none text-slate-900 ${labelSize}`}
          >
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
  const gradId = useId();
  if (!data.length) return null;

  const color = TONE_HEX[tone] ?? TONE_HEX.brand;
  const chartData = data.map((v, i) => ({ i, v }));

  return (
    <AreaChart
      width={w}
      height={h}
      data={chartData}
      margin={{ top: 2, right: 0, bottom: 0, left: 0 }}
    >
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="5%" stopColor={color} stopOpacity={0.12} />
          <stop offset="95%" stopColor={color} stopOpacity={0} />
        </linearGradient>
      </defs>
      <Area
        type="monotone"
        dataKey="v"
        stroke={color}
        strokeWidth={1.6}
        fill={area ? `url(#${gradId})` : "none"}
        dot={false}
        isAnimationActive={false}
      />
    </AreaChart>
  );
}

export function Bar({ value = 60, tone = "brand" }) {
  return (
    <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
      <div
        className={`h-full ${BAR_CLS[tone] ?? BAR_CLS.brand} rounded-full`}
        style={{ width: `${Math.max(0, Math.min(100, value))}%` }}
      />
    </div>
  );
}
