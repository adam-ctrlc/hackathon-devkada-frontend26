import { MINI_BAR_TONE } from "../../../../utils/insights.js";

export function MiniBars({
  data = [],
  tone = "brand",
  highlightIndex = -1,
  height = 36,
}) {
  if (!data.length) return null;
  const max = Math.max(1, ...data);
  const cls = MINI_BAR_TONE[tone] ?? MINI_BAR_TONE.brand;
  return (
    <div className="flex items-end gap-1" style={{ height }}>
      {data.map((v, i) => {
        const isDim = highlightIndex >= 0 && i !== highlightIndex;
        return (
          <div
            key={i}
            className={`w-1.5 rounded-sm ${cls} ${isDim ? "opacity-25" : "opacity-90"}`}
            style={{ height: `${Math.max(4, (v / max) * height)}px` }}
          />
        );
      })}
    </div>
  );
}
