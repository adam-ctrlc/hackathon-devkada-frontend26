import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, Section } from "../../../components/ui/Card.jsx";
import { Spark, Bar } from "../../../components/ui/Charts.jsx";
import { BrandName } from "../../../components/BrandName.jsx";
import {
  Heart,
  CheckCircle,
  Sparkle,
  TrendUp,
  Drop,
  Calendar as CalendarIcon,
  Wallet,
  Clock as ClockIcon,
  Brain,
} from "@phosphor-icons/react";
import { apiRequest } from "../../../lib/api.js";
import { clearAuthSession, getAuthSession } from "../../../lib/auth-session.js";
import { MiniBars } from "./components/MiniBars.jsx";
import { InsightsSkeleton } from "../components/RouteSkeletons.jsx";
import { usePageTitle } from "../../../hooks/usePageTitle.js";

const dayLabel = (date) =>
  new Intl.DateTimeFormat("en-US", { weekday: "short" }).format(new Date(date));

const mealPeriodLabel = (value) => {
  const text = String(value ?? "").trim();
  return text ? text[0].toUpperCase() + text.slice(1) : "-";
};

export default function Insights() {
  usePageTitle("Insights");
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(null);

  useEffect(() => {
    let cancelled = false;
    const session = getAuthSession();
    const profileId = session?.profile?.id;

    if (!profileId) {
      navigate("/", { replace: true });
      return;
    }

    const loadInsights = async () => {
      setLoading(true);
      try {
        const response = await apiRequest(`/insights/${profileId}`);
        if (!cancelled) setData(response);
      } catch (err) {
        if (String(err.message).toLowerCase().includes("profile not found")) {
          clearAuthSession();
          navigate("/", { replace: true });
          return;
        }
        if (!cancelled) setToast(err.message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    loadInsights();

    return () => {
      cancelled = true;
    };
  }, [navigate]);

  const summaries =
    data?.water?.series?.map((waterDay) => ({
      d: dayLabel(waterDay.date),
      score:
        data?.metrics?.dailyWellnessScore != null
          ? data.metrics.dailyWellnessScore
          : 70,
      waterMl: waterDay.amountMl ?? 0,
    })) ?? [];
  const maxWater = Math.max(1, ...summaries.map((item) => item.waterMl));
  const maxScore = Math.max(1, ...summaries.map((item) => item.score));
  const avgScore = summaries.length
    ? Math.round(
        summaries.reduce((sum, item) => sum + item.score, 0) / summaries.length,
      )
    : (data?.metrics?.dailyWellnessScore ?? 0);
  const bestDay = summaries.reduce(
    (best, item) => (item.score > best.score ? item : best),
    summaries[0] ?? { d: "-", score: 0 },
  );
  const waterTotal = data?.water?.totalMl ?? 0;
  const budget = data?.budget ?? {};
  const budgetCurrency = budget.budgetCurrency ?? "PHP";
  const budgetAmount = Number(budget.budgetAmount ?? 0);
  const budgetSpent = Number(budget.spent ?? 0);
  const budgetPlanned = Number(budget.planned ?? 0);
  const mealTiming = data?.mealTiming ?? {};
  const timedMealPeriods = Object.entries(mealTiming).filter(([period]) =>
    String(period).trim(),
  );
  const topMealPeriod = timedMealPeriods.sort((a, b) => b[1] - a[1])[0];
  const nutritionLevel = data?.metrics?.nutrition?.level ?? "Medium";
  const hydrationLevel = data?.metrics?.hydration?.level ?? "Medium";
  const contextReasons = Array.isArray(data?.contextReasons)
    ? data.contextReasons
    : [];
  const contextAdvice =
    nutritionLevel === "Low"
      ? "Your meals may need more steady protein, fiber, or lower-sugar choices this week."
      : hydrationLevel === "Low"
        ? "Hydration looks like the clearest next habit to improve."
        : "Your week looks fairly steady. Keep logging meals and water so trends stay accurate.";
  const aiFocus = data?.aiInsights?.focus ?? "balanced";
  const aiSummary =
    data?.aiInsights?.summary ??
    "KainWise needs more logs to explain your week clearly.";
  const aiContextHint = data?.aiInsights?.contextHint ?? "";
  const aiSuggestions = Array.isArray(data?.aiInsights?.suggestions)
    ? data.aiInsights.suggestions
    : [];
  const ml = data?.aiInsights?.ml ?? null;
  const mlSignals = Array.isArray(ml?.signals) ? ml.signals : [];
  const mlDrivers = Array.isArray(ml?.drivers) ? ml.drivers : [];
  const nutritionScore = data?.metrics?.nutrition?.score ?? 0;
  const hydrationScore = data?.metrics?.hydration?.score ?? 0;
  const energyScore = data?.metrics?.energySupport?.score ?? 0;
  const moodScore = data?.metrics?.moodSupport?.score ?? 0;
  const findings = useMemo(
    () =>
      (data?.insights ?? []).map((insight, index) => ({
        title: `Insight ${index + 1}`,
        body: String(insight),
        tone: index % 3 === 0 ? "green" : index % 3 === 1 ? "brand" : "amber",
        stat: index + 1,
        sub: "signal",
      })),
    [data],
  );

  return (
    <div className="px-4 sm:px-6 lg:px-10 py-6 lg:py-8 max-w-[1180px] relative">
      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-slate-900 text-white text-[13px] font-medium px-4 py-2.5 rounded-xl shadow-xl flex items-center gap-2">
          <CheckCircle size={14} className="text-emerald-400" /> {toast}
        </div>
      )}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-7">
        <div>
          <div className="text-[11px] tracking-[0.18em] uppercase text-brand-600 font-semibold mb-2">
            Weekly Insights
          </div>
          <h1 className="font-display text-[34px] leading-[1.05] tracking-tight text-slate-900">
            Patterns we noticed
          </h1>
          <p className="text-slate-600 mt-2 max-w-[600px]">
            A weekly view of your food choices, hydration, budget, and logged
            habits.
          </p>
        </div>
      </div>

      {loading ? (
        <InsightsSkeleton />
      ) : (
        <>
          {(() => {
            const scoreSeries = summaries.map((s) => s.score);
            const waterSeries = summaries.map((s) => s.waterMl);
            const bestIdx = summaries.reduce(
              (best, s, i) =>
                s.score > (summaries[best]?.score ?? 0) ? i : best,
              0,
            );
            const budgetPct = budgetAmount
              ? Math.min(100, (budgetSpent / budgetAmount) * 100)
              : 0;
            const plannedPct = budgetAmount
              ? Math.min(100, (budgetPlanned / budgetAmount) * 100)
              : 0;
            const periodOrder = [
              "morning",
              "midday",
              "afternoon",
              "evening",
              "night",
            ];
            const periodCounts = periodOrder.map((p) =>
              Number(mealTiming?.[p] ?? 0),
            );
            const topPeriodIdx = periodOrder.indexOf(
              String(topMealPeriod?.[0] ?? "").toLowerCase(),
            );
            const findingTones = findings.reduce(
              (acc, f) => ({ ...acc, [f.tone]: (acc[f.tone] ?? 0) + 1 }),
              { green: 0, brand: 0, amber: 0 },
            );
            const kpis = [
              {
                l: "Avg wellness",
                v: String(avgScore),
                sub: "out of 100",
                color: "text-emerald-600",
                Icon: TrendUp,
                iconWrap: "bg-emerald-50 text-emerald-600",
                chart: (
                  <Spark
                    data={scoreSeries.length ? scoreSeries : [0, 0]}
                    w={120}
                    h={42}
                    tone="brand"
                  />
                ),
              },
              {
                l: "Best day",
                v: bestDay.d,
                sub: `score ${bestDay.score}`,
                color: "text-emerald-600",
                Icon: CalendarIcon,
                iconWrap: "bg-emerald-50 text-emerald-600",
                chart: (
                  <MiniBars
                    data={scoreSeries.length ? scoreSeries : [0]}
                    tone="emerald"
                    highlightIndex={bestIdx}
                    height={42}
                  />
                ),
              },
              {
                l: "Water total",
                v: `${waterTotal}ml`,
                sub: "last 7 days",
                color: "text-brand-700",
                Icon: Drop,
                iconWrap: "bg-brand-50 text-brand-600",
                chart: (
                  <Spark
                    data={waterSeries.length ? waterSeries : [0, 0]}
                    w={120}
                    h={42}
                    tone="brand"
                  />
                ),
              },
              {
                l: "Insights",
                v: String(findings.length),
                sub: "this week",
                color: "text-amber-700",
                Icon: Sparkle,
                iconWrap: "bg-amber-50 text-amber-600",
                chart: (
                  <div className="flex w-full flex-col gap-1.5 sm:w-[120px]">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] w-10 text-slate-500">
                        Good
                      </span>
                      <div className="flex-1">
                        <Bar
                          value={
                            findings.length
                              ? (findingTones.green / findings.length) * 100
                              : 0
                          }
                          tone="green"
                        />
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] w-10 text-slate-500">
                        Info
                      </span>
                      <div className="flex-1">
                        <Bar
                          value={
                            findings.length
                              ? (findingTones.brand / findings.length) * 100
                              : 0
                          }
                          tone="brand"
                        />
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] w-10 text-slate-500">
                        Watch
                      </span>
                      <div className="flex-1">
                        <Bar
                          value={
                            findings.length
                              ? (findingTones.amber / findings.length) * 100
                              : 0
                          }
                          tone="amber"
                        />
                      </div>
                    </div>
                  </div>
                ),
              },
              {
                l: "Food budget",
                v: `${budgetCurrency} ${budgetAmount.toFixed(0)}`,
                sub: `${budgetCurrency} ${budgetSpent.toFixed(0)} spent · ${budgetCurrency} ${budgetPlanned.toFixed(0)} planned`,
                color: "text-brand-700",
                Icon: Wallet,
                iconWrap: "bg-brand-50 text-brand-600",
                chart: (
                  <div className="w-full">
                    <div className="relative h-2 w-full rounded-full bg-slate-100 overflow-hidden">
                      <div
                        className="absolute inset-y-0 left-0 bg-brand-200 rounded-full"
                        style={{ width: `${plannedPct}%` }}
                      />
                      <div
                        className="absolute inset-y-0 left-0 bg-brand-600 rounded-full"
                        style={{ width: `${budgetPct}%` }}
                      />
                    </div>
                    <div className="flex justify-between text-[10px] text-slate-500 mt-1.5">
                      <span>{Math.round(budgetPct)}% used</span>
                      <span>{Math.round(plannedPct)}% planned</span>
                    </div>
                  </div>
                ),
              },
              {
                l: "Top meal time",
                v: mealPeriodLabel(topMealPeriod?.[0]),
                sub: topMealPeriod
                  ? `${topMealPeriod[1]} entries`
                  : "no meals logged",
                color: "text-emerald-600",
                Icon: ClockIcon,
                iconWrap: "bg-emerald-50 text-emerald-600",
                chart: (
                  <MiniBars
                    data={periodCounts.some(Boolean) ? periodCounts : [0]}
                    tone="emerald"
                    highlightIndex={topPeriodIdx}
                    height={42}
                  />
                ),
              },
            ];
            return (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 mb-8">
                {kpis.map((k) => (
                  <div
                    key={k.l}
                    className="rounded-2xl bg-white border border-slate-200 p-5 flex flex-col"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="text-[11px] uppercase tracking-wider text-slate-500 font-semibold">
                          {k.l}
                        </div>
                        <div className="font-display text-[34px] mt-2 leading-none text-slate-900 truncate">
                          {k.v}
                        </div>
                        <div className={`text-[12px] mt-2 ${k.color}`}>
                          {k.sub}
                        </div>
                      </div>
                      <div
                        className={`shrink-0 w-9 h-9 rounded-xl grid place-items-center ${k.iconWrap}`}
                      >
                        <k.Icon size={18} weight="bold" />
                      </div>
                    </div>
                    <div className="mt-4 flex min-w-0 items-end justify-end overflow-hidden">
                      {k.chart}
                    </div>
                  </div>
                ))}
              </div>
            );
          })()}

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 mb-8">
            <Card className="lg:col-span-8 p-6">
              <div className="text-[11px] uppercase tracking-wider text-slate-500 font-semibold">
                Wellness vs water
              </div>
              <h3 className="font-display text-[20px] mt-0.5 mb-5 text-slate-900">
                Your wellness and water in two bars
              </h3>
              <div className="mb-4 flex flex-wrap items-center gap-4 text-[12px] text-slate-500">
                <span className="inline-flex items-center gap-1.5">
                  <span className="h-2.5 w-2.5 rounded-full bg-brand-500" />
                  Wellness score
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <span className="h-2.5 w-2.5 rounded-full bg-cyan-300" />
                  Water intake
                </span>
              </div>
              <div className="overflow-x-auto pb-2">
                <div className="flex h-[220px] min-w-[520px] items-end gap-3">
                  {summaries.map((w, i) => (
                    <div
                      key={`${w.d}-${i}`}
                      className="flex flex-1 flex-col items-center gap-2"
                    >
                      <div className="flex h-full w-full items-end justify-center gap-1">
                        <div
                          className="w-5 rounded-t-md bg-brand-500"
                          style={{ height: `${(w.score / maxScore) * 180}px` }}
                        />
                        <div
                          className="w-5 rounded-t-md bg-cyan-300"
                          style={{
                            height: `${(w.waterMl / maxWater) * 180}px`,
                          }}
                        />
                      </div>
                      <div className="text-[11px] uppercase tracking-wider font-semibold text-slate-500">
                        {w.d}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </Card>

            <Card className="lg:col-span-4 p-6 relative overflow-hidden">
              <div className="absolute -right-10 -bottom-10 w-48 h-48 rounded-full bg-brand-100/60 blur-3xl" />
              <div className="relative">
                <div className="flex items-center gap-2 text-[11px] uppercase tracking-wider text-brand-600 font-semibold mb-3">
                  <Heart size={13} /> Current context
                </div>
                <p className="font-display text-[19px] leading-snug text-slate-900">
                  {contextAdvice}
                </p>
                <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <div className="rounded-xl bg-white/70 p-3">
                    <div className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold">
                      Meals
                    </div>
                    <div className="font-display text-[18px] text-slate-900 mt-1">
                      {nutritionScore}/100
                    </div>
                    <div className="text-[11px] text-slate-500 mt-1">
                      {nutritionLevel} support
                    </div>
                  </div>
                  <div className="rounded-xl bg-white/70 p-3">
                    <div className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold">
                      Hydration
                    </div>
                    <div className="font-display text-[18px] text-slate-900 mt-1">
                      {hydrationScore}/100
                    </div>
                    <div className="text-[11px] text-slate-500 mt-1">
                      {hydrationLevel} support
                    </div>
                  </div>
                  <div className="rounded-xl bg-white/70 p-3">
                    <div className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold">
                      Energy
                    </div>
                    <div className="font-display text-[18px] text-slate-900 mt-1">
                      {energyScore}/100
                    </div>
                    <div className="text-[11px] text-slate-500 mt-1">
                      {data?.metrics?.energySupport?.level ?? "Medium"} support
                    </div>
                  </div>
                  <div className="rounded-xl bg-white/70 p-3">
                    <div className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold">
                      Mood
                    </div>
                    <div className="font-display text-[18px] text-slate-900 mt-1">
                      {moodScore}/100
                    </div>
                    <div className="text-[11px] text-slate-500 mt-1">
                      {data?.metrics?.moodSupport?.level ?? "Medium"} support
                    </div>
                  </div>
                </div>
                <div className="mt-4 rounded-2xl bg-white/75 p-3.5">
                  <div className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold mb-2">
                    Why this context
                  </div>
                  {contextReasons.length ? (
                    <ul className="space-y-2">
                      {contextReasons.slice(0, 4).map((reason) => (
                        <li
                          key={reason}
                          className="flex gap-2 text-[12.5px] leading-snug text-slate-600"
                        >
                          <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-brand-500 shrink-0" />
                          <span>{reason}</span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-[12.5px] leading-snug text-slate-500">
                      Add more scans, meals, and water logs so KainWise can
                      explain the pattern with specific foods.
                    </p>
                  )}
                </div>
              </div>
            </Card>
          </div>

          <Section eyebrow="Weekly pattern" title="What stood out this week">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
              <Card className="lg:col-span-5 p-6">
                <div className="text-[11px] uppercase tracking-wider text-slate-500 font-semibold">
                  Focus
                </div>
                <div className="font-display text-[26px] mt-2 text-slate-900">
                  {aiFocus}
                </div>
                <p className="mt-3 text-[14px] leading-snug text-slate-600">
                  {aiSummary}
                </p>
                {aiContextHint && (
                  <div className="mt-4 rounded-2xl bg-brand-50 ring-1 ring-brand-100 p-4 text-[13px] leading-snug text-slate-700">
                    {aiContextHint}
                  </div>
                )}
              </Card>

              <Card className="lg:col-span-7 p-6">
                <div className="text-[11px] uppercase tracking-wider text-slate-500 font-semibold mb-3">
                  Specific signals
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {[
                    {
                      l: "Wellness",
                      v: `${data?.metrics?.dailyWellnessScore ?? 0}/100`,
                      s: `${data?.metrics?.nutrition?.level ?? "Medium"} nutrition · ${data?.metrics?.hydration?.level ?? "Medium"} hydration`,
                    },
                    {
                      l: "Water",
                      v: `${waterTotal}ml`,
                      s: `${data?.water?.series?.length ?? 0} logged days · target from profile ${data?.metrics?.waterTargetMl ?? 0}ml`,
                    },
                    {
                      l: "Budget",
                      v: `${budgetCurrency} ${budgetSpent.toFixed(0)}`,
                      s: `${budgetCurrency} ${budgetPlanned.toFixed(0)} planned · ${budgetCurrency} ${budgetAmount.toFixed(0)} budget`,
                    },
                    {
                      l: "Meal timing",
                      v: topMealPeriod
                        ? mealPeriodLabel(topMealPeriod?.[0])
                        : "-",
                      s: topMealPeriod
                        ? `${topMealPeriod[1]} entries in ${topMealPeriod[0]}`
                        : "no timing data yet",
                    },
                  ].map((item) => (
                    <div key={item.l} className="rounded-xl bg-slate-50 p-3">
                      <div className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold">
                        {item.l}
                      </div>
                      <div className="font-display text-[18px] text-slate-900 mt-1">
                        {item.v}
                      </div>
                      <div className="text-[12px] mt-1.5 text-slate-600 leading-snug">
                        {item.s}
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            </div>
          </Section>

          {ml && (
            <Section
              eyebrow="Smart patterns"
              title={
                <span className="inline-flex items-baseline gap-1.5">
                  How <BrandName /> reads your week
                </span>
              }
            >
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
                <Card className="lg:col-span-6 p-6 overflow-hidden relative">
                  <div className="absolute -right-10 -bottom-12 h-40 w-40 rounded-full bg-brand-100/70 blur-3xl" />
                  <div className="relative">
                    <div className="flex items-center gap-2 text-[11px] uppercase tracking-wider text-brand-600 font-semibold">
                      <Brain size={14} /> Main pattern
                    </div>
                    <div className="font-display text-[28px] leading-tight text-slate-900 mt-3">
                      {ml.predictionLabel}
                    </div>
                    <p className="mt-2 text-[13px] leading-snug text-slate-600">
                      KainWise grouped your week as{" "}
                      <span className="font-semibold text-slate-900">
                        {ml.prediction}
                      </span>{" "}
                      based on your food logs, water intake, budget activity,
                      meal timing, and health profile.
                    </p>
                    <div className="mt-5 rounded-2xl bg-white/80 ring-1 ring-brand-100 p-4">
                      <div className="flex items-baseline justify-between">
                        <span className="text-[11px] uppercase tracking-wider text-slate-500 font-semibold">
                          How sure we are
                        </span>
                        <span className="font-display text-[22px] text-slate-900">
                          {Math.round((ml.confidence ?? 0) * 100)}%
                        </span>
                      </div>
                      <Bar
                        value={Math.round((ml.confidence ?? 0) * 100)}
                        tone={
                          ml.confidence >= 0.8
                            ? "green"
                            : ml.confidence >= 0.62
                              ? "brand"
                              : "amber"
                        }
                      />
                      <div className="mt-2 text-[12px] text-slate-500">
                        {ml.confidenceLabel} certainty based on your current
                        logs
                      </div>
                    </div>
                  </div>
                </Card>

                <Card className="lg:col-span-6 p-6">
                  <div className="text-[11px] uppercase tracking-wider text-slate-500 font-semibold mb-3">
                    Biggest factors
                  </div>
                  <div className="space-y-3">
                    {mlDrivers.map((driver) => (
                      <div key={driver.label}>
                        <div className="mb-1.5 flex items-center justify-between gap-3">
                          <span className="text-[13px] font-medium text-slate-800">
                            {driver.label}
                          </span>
                          <span
                            className={`text-[11px] font-semibold ${
                              driver.direction === "strong"
                                ? "text-emerald-700"
                                : "text-amber-700"
                            }`}
                          >
                            {driver.direction}
                          </span>
                        </div>
                        <Bar
                          value={driver.percent}
                          tone={
                            driver.direction === "strong" ? "green" : "amber"
                          }
                        />
                        <div className="mt-1 text-[11px] text-slate-500">
                          This factor contributed about {driver.percent}% to the
                          pattern.
                        </div>
                      </div>
                    ))}
                  </div>
                </Card>

                <Card className="lg:col-span-12 p-6">
                  <div className="flex flex-col gap-3 mb-4 sm:flex-row sm:items-end sm:justify-between">
                    <div>
                      <div className="text-[11px] uppercase tracking-wider text-slate-500 font-semibold">
                        Signals checked
                      </div>
                      <h3 className="font-display text-[20px] text-slate-900 mt-1">
                        The habits KainWise compared this week
                      </h3>
                    </div>
                    <div className="text-[12px] text-slate-500">
                      Higher bars mean stronger influence this week
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3">
                    {mlSignals.map((signal) => (
                      <div key={signal.label}>
                        <div className="mb-1.5 flex items-center justify-between gap-3">
                          <span className="text-[12.5px] text-slate-700">
                            {signal.label}
                          </span>
                          <span className="font-mono text-[11px] text-slate-500">
                            {signal.percent}%
                          </span>
                        </div>
                        <Bar value={signal.percent} tone="brand" />
                      </div>
                    ))}
                  </div>
                </Card>
              </div>
            </Section>
          )}

          <Section eyebrow="Next steps" title="Most specific actions">
            {aiSuggestions.length ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                {aiSuggestions.map((suggestion, index) => (
                  <Card key={`${suggestion.title}-${index}`} className="p-5">
                    <div className="text-[11px] uppercase tracking-wider text-brand-600 font-semibold">
                      {suggestion.priority ?? "Medium"} priority
                    </div>
                    <h4 className="font-display text-[18px] mt-2 text-slate-900">
                      {suggestion.title}
                    </h4>
                    <p className="mt-2 text-[13px] leading-snug text-slate-600">
                      {suggestion.reason}
                    </p>
                    <div className="mt-3 rounded-xl bg-brand-50 ring-1 ring-brand-100 p-3 text-[13px] leading-snug text-slate-700">
                      {suggestion.action}
                    </div>
                  </Card>
                ))}
              </div>
            ) : (
              <Card className="p-8 text-center text-[14px] text-slate-500">
                Add more profile data, meals, and water logs to generate more
                specific next steps.
              </Card>
            )}
          </Section>

          <Section eyebrow="Insights" title="What changed your week">
            {findings.length ? (
              (() => {
                const tonePriority = { amber: 0, brand: 1, green: 2 };
                const toneDot = {
                  amber: "bg-amber-500",
                  brand: "bg-brand-500",
                  green: "bg-emerald-500",
                };
                const toneLabel = {
                  amber: "Watch",
                  brand: "Info",
                  green: "Good",
                };
                const toneChip = {
                  amber: "bg-amber-50 text-amber-700",
                  brand: "bg-brand-50 text-brand-700",
                  green: "bg-emerald-50 text-emerald-700",
                };
                const sorted = [...findings].sort(
                  (a, b) => tonePriority[a.tone] - tonePriority[b.tone],
                );
                return (
                  <Card className="overflow-hidden">
                    <div className="overflow-x-auto">
                      <table className="min-w-[620px] w-full text-left">
                        <thead>
                          <tr className="bg-slate-50 text-[10px] uppercase tracking-wider text-slate-500 font-semibold">
                            <th className="px-5 py-3 w-16">#</th>
                            <th className="px-3 py-3 w-24">Signal</th>
                            <th className="px-3 py-3">Insight</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {sorted.map((f, i) => (
                            <tr
                              key={f.title}
                              className="align-middle hover:bg-slate-50/60 transition"
                            >
                              <td className="px-5 py-3.5 text-[12px] font-semibold text-slate-500">
                                {String(i + 1).padStart(2, "0")}
                              </td>
                              <td className="px-3 py-3.5">
                                <span className="inline-flex items-center gap-1.5">
                                  <span
                                    className={`h-2 w-2 rounded-full ${toneDot[f.tone]}`}
                                  />
                                  <span
                                    className={`text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full ${toneChip[f.tone]}`}
                                  >
                                    {toneLabel[f.tone]}
                                  </span>
                                </span>
                              </td>
                              <td className="px-3 py-3.5 text-[13.5px] text-slate-700 leading-snug">
                                {f.body}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </Card>
                );
              })()
            ) : (
              <Card className="p-8 text-center text-[14px] text-slate-500">
                Add scans, meals, diary entries, or water logs to generate
                insights.
              </Card>
            )}
          </Section>
        </>
      )}
    </div>
  );
}
