export const days = ["M", "T", "W", "T", "F", "S", "S"];

export const formatDateLabel = () =>
  new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  }).format(new Date());

const timeLabel = (value) =>
  value ? new Date(value).toTimeString().slice(0, 5) : "--:--";
const dateLabel = (value) =>
  value
    ? new Date(value).toLocaleDateString(undefined, {
        month: "2-digit",
        day: "2-digit",
      })
    : "--/--";

const supportTone = (level) => {
  if (level === "High") return "green";
  if (level === "Medium") return "brand";
  return "amber";
};

const hasLowSodiumPlan = (profile) =>
  [...(profile?.dietRestrictions ?? []), profile?.healthGoal]
    .filter(Boolean)
    .some((item) => String(item).toLowerCase().includes("low sodium"));

export const buildTrendSummary = (trend) => {
  const first = trend[0] ?? 0;
  const last = trend[trend.length - 1] ?? 0;
  const delta = Math.round(last - first);

  if (delta > 0) {
    return {
      value: `+${delta}`,
      label: "trend rising",
      tone: "text-emerald-600",
    };
  }

  if (delta < 0) {
    return {
      value: String(delta),
      label: "trend falling",
      tone: "text-amber-600",
    };
  }

  return { value: "0", label: "trend steady", tone: "text-slate-500" };
};

export const buildDashboardView = (dashboard) => {
  const metrics = dashboard?.metrics ?? {};
  const mealHistory = dashboard?.mealHistory ?? [];
  const waterSeries = dashboard?.water?.series ?? [];
  const trend = waterSeries.length
    ? waterSeries.map((item) => item.amountMl ?? 0)
    : Array.from(
        { length: 7 },
        () => metrics.dailyWellnessScore ?? dashboard?.weeklyScore ?? 0,
      );
  const kcalConsumed = mealHistory.reduce(
    (sum, meal) => sum + (meal.calories ?? 0),
    0,
  );
  const calorieTarget = metrics.calorieTarget ?? 2000;
  const sodiumTarget = hasLowSodiumPlan(dashboard.profile) ? 1500 : 2300;
  const sugarTarget = Math.max(1, Math.round((calorieTarget * 0.1) / 4));
  const totals = mealHistory.reduce(
    (acc, meal) => ({
      protein: acc.protein + (meal.proteinGrams ?? 0),
      sugar: acc.sugar + (meal.sugarGrams ?? 0),
      sodium: acc.sodium + (meal.sodiumMg ?? 0),
    }),
    { protein: 0, sugar: 0, sodium: 0 },
  );
  const sleepTodayHours = Number(dashboard?.sleep?.todayHours ?? 0);
  const sleepAvg7Hours = Number(dashboard?.sleep?.avg7Hours ?? 0);
  const waterTodayMl = Number(
    waterSeries[waterSeries.length - 1]?.amountMl ?? 0,
  );
  const mental = dashboard?.mental ?? {};
  const physical = dashboard?.physical ?? {};
  const mentalStatus = String(mental.status ?? "Watch");
  const physicalStatus = String(physical.status ?? "Building");
  const overallStatus =
    mentalStatus === "Stable" && physicalStatus === "On track"
      ? "You are doing well today."
      : mentalStatus === "Needs support" || physicalStatus === "Needs support"
        ? "Today needs extra support."
        : "You are building momentum today.";
  const budgetLogs = (dashboard?.budgetLogs ?? []).map((log) => ({
    id: log.id,
    title: log.title ?? "Budget log",
    type: log.entryType === "spent" ? "Spent" : "Planned",
    amount: Number(log.amount ?? 0),
    currency: log.currency ?? "PHP",
    date: dateLabel(log.spentAt ?? log.plannedFor ?? log.createdAt),
    itemsCount: Array.isArray(log.items) ? log.items.length : 0,
  }));

  return {
    profile: dashboard.profile,
    healthNotes:
      dashboard.profile?.healthContext?.notes ??
      dashboard.profile?.healthGoal ??
      "Keep logging meals and hydration to personalize the dashboard.",
    wellnessScore: metrics.dailyWellnessScore ?? dashboard.weeklyScore ?? 70,
    supportLevel: dashboard.trend ?? "Medium",
    kcalConsumed,
    calorieTarget,
    macros: [
      {
        name: "Protein",
        value: Math.round(totals.protein),
        target: Math.max(
          1,
          Math.round((dashboard.profile?.weightKg ?? 60) * 1.2),
        ),
        unit: "g",
        tone: "green",
      },
      {
        name: "Sugar",
        value: Math.round(totals.sugar),
        target: sugarTarget,
        unit: "g",
        tone: totals.sugar > sugarTarget ? "amber" : "brand",
      },
      {
        name: "Sodium",
        value: Math.round(totals.sodium),
        target: sodiumTarget,
        unit: "mg",
        tone: totals.sodium > sodiumTarget ? "amber" : "brand",
      },
    ],
    supports: [
      ["Nutrition", metrics.nutrition],
      ["Hydration", metrics.hydration],
      ["Mood", metrics.moodSupport],
      ["Energy", metrics.energySupport],
      ["Heart", metrics.heartHealth],
      ["Digestion", metrics.digestion],
    ].map(([label, item]) => ({
      label,
      level: item?.level ?? "Medium",
      v: item?.score ?? 50,
      tone: supportTone(item?.level),
    })),
    meals: mealHistory.map((meal) => ({
      time: timeLabel(meal.createdAt),
      label: meal.foodType ?? meal.source ?? "meal",
      items: meal.rawText ?? meal.matchedProductName ?? meal.productName,
      kcal: meal.calories ?? 0,
      support: meal.supportLevel ?? "Medium",
    })),
    trend,
    todaySummary: {
      sleepTodayHours,
      sleepAvg7Hours,
      waterTodayMl,
      waterTargetMl: Number(metrics.waterTargetMl ?? 2000),
      mentalStatus,
      physicalStatus,
      stressLevel: mental.stressLevel ?? null,
      moodTag: mental.moodTag ?? null,
      workoutSessions7d: Number(physical.workoutSessions7d ?? 0),
      overallStatus,
    },
    budgetLogs,
    reflection: String(
      dashboard.aiInsights?.summary ??
        dashboard.weeklyInsights?.[0]?.summary ??
        dashboard.weeklyInsights?.[0] ??
        "Your dashboard is connected. Add meals, scans, water, and diary entries to sharpen the weekly summary.",
    ),
  };
};
