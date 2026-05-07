export const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

export const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export const summaryItemText = (item) => {
  if (item == null) return "";
  if (typeof item === "string") return item;
  if (typeof item === "object")
    return item.title ?? item.action ?? item.reason ?? "";
  return String(item);
};

export const formatMealTiming = (periods = {}) => {
  const entries = Object.entries(periods).filter(([, count]) => count > 0);
  if (!entries.length) return "No meal time saved yet.";
  return entries.map(([period, count]) => `${period} (${count})`).join(", ");
};

export const SUPPORT_TO_SCORE = { High: 85, Medium: 60, Low: 35 };

export const deriveScore = (summary) => {
  if (!summary) return null;
  if (summary.score != null && summary.score > 0) return summary.score;
  const foods = summary.foodEntries ?? [];
  const waterMl = Number(summary.waterTotalMl ?? 0);
  if (!foods.length && !waterMl) return null;

  const foodScores = foods
    .map((food) =>
      food.score != null
        ? Number(food.score)
        : (SUPPORT_TO_SCORE[food.supportLevel] ?? null),
    )
    .filter((value) => value != null && Number.isFinite(value));

  let base = foodScores.length
    ? foodScores.reduce((sum, value) => sum + value, 0) / foodScores.length
    : 50;

  const hydrationBonus = Math.min(8, Math.round((waterMl / 2000) * 8));
  const varietyBonus = Math.min(4, Math.max(0, foods.length - 2));
  const lowPenalty =
    foods.filter((food) => food.supportLevel === "Low").length * 3;
  return Math.max(
    1,
    Math.min(
      100,
      Math.round(base + hydrationBonus + varietyBonus - lowPenalty),
    ),
  );
};

export const deriveSupportLevel = (summary, score) => {
  if (summary?.supportLevel && summary.supportLevel !== "No Data")
    return summary.supportLevel;
  if (score == null) return "No Data";
  if (score >= 75) return "High";
  if (score >= 50) return "Medium";
  return "Low";
};

export const describeSupport = (summary) => {
  if (!summary) return "No daily data yet.";
  const foods = summary.foodEntries ?? [];
  const waterTotal = Number(summary.waterTotalMl ?? 0);
  const lowerSupport = foods.filter((food) =>
    ["Low", "Medium"].includes(food.supportLevel),
  );
  const latestFood = foods[0]?.name;
  const effectiveScore = deriveScore(summary) ?? 0;

  if (effectiveScore >= 80) {
    return latestFood
      ? `${latestFood} helped keep the day in a stronger range.`
      : "Your logged habits kept this day in a stronger range.";
  }
  if (effectiveScore >= 50) {
    return lowerSupport.length
      ? `${lowerSupport[0].name} kept the day moderate, so the next meal should add protein, fiber, or lower-sugar choices.`
      : waterTotal
        ? `Hydration reached ${waterTotal}ml, but food variety still needs more detail.`
        : "The day was moderate. More food and hydration logs will make this more precise.";
  }
  return lowerSupport.length
    ? `${lowerSupport
        .map((food) => food.name)
        .slice(0, 2)
        .join(
          " and ",
        )} pulled the day down. Balance the next meal with lean protein, vegetables, or water.`
    : "This day needs more supportive logs before KainWise can show a stronger pattern.";
};

export const nutrientLine = (food) => {
  const parts = [
    food.calories != null ? `${food.calories} kcal` : null,
    food.proteinGrams != null ? `${food.proteinGrams}g protein` : null,
    food.sugarGrams != null ? `${food.sugarGrams}g sugar` : null,
    food.sodiumMg != null ? `${Math.round(food.sodiumMg)}mg sodium` : null,
  ].filter(Boolean);
  return parts.length ? parts.join(" · ") : "Nutrition estimate saved";
};

export const today = new Date();

export function dateKey(y, m, d) {
  return `${y}-${String(m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

export const toneBar = (level) =>
  level === "High"
    ? "bg-emerald-400"
    : level === "Medium"
      ? "bg-amber-300"
      : level === "Low"
        ? "bg-red-300"
        : "bg-slate-200";

export const toneRing = (level) =>
  level === "High"
    ? "ring-emerald-500"
    : level === "Medium"
      ? "ring-amber-500"
      : level === "Low"
        ? "ring-red-500"
        : "ring-slate-300";

export const pillTone = (level) =>
  level === "High" ? "green" : level === "Low" ? "red" : "amber";

export function buildMonth(year, month, calendarByDate) {
  const firstDay = new Date(year, month, 1).getDay();
  const offset = (firstDay + 6) % 7;
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells = [];

  for (let i = 0; i < 42; i += 1) {
    const d = i - offset + 1;
    if (d < 1 || d > daysInMonth) {
      cells.push(null);
      continue;
    }
    const key = dateKey(year, month, d);
    const summary = calendarByDate.get(key);
    const isToday = key === today.toISOString().slice(0, 10);
    const isFuture = new Date(year, month, d) > today;
    const derivedScore = deriveScore(summary);
    const derivedLevel = deriveSupportLevel(summary, derivedScore);
    cells.push({
      d,
      key,
      level: derivedLevel,
      score: derivedScore,
      derived:
        summary != null &&
        (summary.score == null || summary.score === 0) &&
        derivedScore != null,
      summary,
      isToday,
      isFuture,
    });
  }

  while (cells.length > 7 && cells.slice(-7).every((cell) => cell === null)) {
    cells.splice(-7);
  }

  return cells;
}
