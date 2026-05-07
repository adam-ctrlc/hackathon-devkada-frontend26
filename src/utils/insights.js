export const dayLabel = (date) =>
  new Intl.DateTimeFormat("en-US", { weekday: "short" }).format(new Date(date));

export const mealPeriodLabel = (value) => {
  const text = String(value ?? "").trim();
  return text ? text[0].toUpperCase() + text.slice(1) : "-";
};

export const MINI_BAR_TONE = {
  brand: "bg-brand-500",
  cyan: "bg-cyan-400",
  emerald: "bg-emerald-500",
  amber: "bg-amber-500",
};
