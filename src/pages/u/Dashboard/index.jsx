import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, Section } from "../../../components/ui/Card.jsx";
import { Button } from "../../../components/ui/Button.jsx";
import { Pill, Support } from "../../../components/ui/Pill.jsx";
import { Ring, Spark, Bar } from "../../../components/ui/Charts.jsx";
import {
  Plus,
  Barcode,
  ArrowRight,
  Sparkle,
  Moon,
  Drop,
  Brain,
  Heartbeat,
} from "@phosphor-icons/react";
import { apiRequest, isRateLimitError } from "../../../lib/api.js";
import { RateLimitNotice } from "../../../components/RateLimitNotice.jsx";
import { clearAuthSession, getAuthSession } from "../../../lib/auth-session.js";
import { getTimeGreeting } from "../../../lib/date-time.js";
import {
  buildDashboardView,
  buildTrendSummary,
  days,
  formatDateLabel,
} from "../../../utils/dashboard.js";
import { DashboardSkeleton } from "../components/RouteSkeletons.jsx";

export default function Dashboard() {
  const navigate = useNavigate();
  const [dashboard, setDashboard] = useState(null);
  const [dashboardReflection, setDashboardReflection] = useState(null);
  const [reflectionLoading, setReflectionLoading] = useState(true);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    let cancelled = false;
    const session = getAuthSession();
    const profileId = session?.profile?.id;

    if (!profileId) {
      navigate("/", { replace: true });
      return;
    }

    const loadDashboard = async () => {
      setLoading(true);
      setError(null);

      try {
        const data = await apiRequest(`/dashboard/${profileId}`);
        if (!cancelled) {
          setDashboard(buildDashboardView(data));
        }
      } catch (err) {
        if (!cancelled) {
          if (String(err.message).toLowerCase().includes("profile not found")) {
            clearAuthSession();
            navigate("/", { replace: true });
            return;
          }

          setError(err);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    loadDashboard();

    return () => {
      cancelled = true;
    };
  }, [navigate]);

  useEffect(() => {
    let cancelled = false;
    let pollTimer = null;
    const session = getAuthSession();
    const profileId = session?.profile?.id;
    if (!profileId) return undefined;

    const loadReflection = async () => {
      try {
        const data = await apiRequest(`/dashboard-reflection/${profileId}`);
        if (cancelled) return;
        setDashboardReflection({
          reflection: String(data?.reflection ?? "").trim(),
          mentalMotivation: String(data?.mentalMotivation ?? "").trim(),
          physicalMotivation: String(data?.physicalMotivation ?? "").trim(),
          whyThisMatters: String(data?.whyThisMatters ?? "").trim(),
          generating: Boolean(data?.generating),
        });
        setReflectionLoading(Boolean(data?.generating) && !data?.reflection);
        if (data?.generating) {
          pollTimer = window.setTimeout(loadReflection, 2600);
        }
      } catch {
        if (!cancelled) {
          setReflectionLoading(false);
        }
      }
    };

    loadReflection();
    return () => {
      cancelled = true;
      if (pollTimer) window.clearTimeout(pollTimer);
    };
  }, []);

  useEffect(() => {
    const interval = window.setInterval(() => {
      setNow(new Date());
    }, 60 * 1000);

    return () => window.clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <div className="px-4 sm:px-6 lg:px-10 py-6 lg:py-8 max-w-[1180px]">
        <DashboardSkeleton />
      </div>
    );
  }

  if (error) {
    return (
      <div className="px-4 sm:px-6 lg:px-10 py-6 lg:py-8 max-w-[1180px]">
        {isRateLimitError(error) ? (
          <RateLimitNotice
            error={error}
            title="Dashboard is cooling down"
            className="mx-auto max-w-[560px] p-8"
          />
        ) : (
          <Card className="p-8">
            <div className="font-display text-[22px] text-slate-900">
              Dashboard unavailable
            </div>
            <p className="mt-2 text-[14px] text-red-700">
              {error.message || "Request failed"}
            </p>
            <Button className="mt-5" size="sm" onClick={() => navigate("/")}>
              Back to login
            </Button>
          </Card>
        )}
      </div>
    );
  }

  const {
    profile,
    healthNotes,
    wellnessScore,
    supportLevel,
    kcalConsumed,
    calorieTarget,
    macros,
    supports,
    trend,
    todaySummary,
    budgetLogs,
    reflection,
  } = dashboard;
  const trendSummary = buildTrendSummary(trend);
  const reflectionText =
    dashboardReflection?.reflection?.trim() ||
    reflection ||
    "Keep logging meals and hydration so your insights stay personalized.";
  const mentalMotivation =
    dashboardReflection?.mentalMotivation?.trim() ||
    "Your next calm, balanced meal can support steadier focus.";
  const physicalMotivation =
    dashboardReflection?.physicalMotivation?.trim() ||
    "A small movement + hydration win today can strengthen your routine.";
  const reflectionWhy =
    dashboardReflection?.whyThisMatters?.trim() || healthNotes;
  const reflectionGenerating =
    reflectionLoading || Boolean(dashboardReflection?.generating);
  const firstName = profile.firstName ?? "there";

  return (
    <div className="px-4 sm:px-6 lg:px-10 py-6 lg:py-8 max-w-[1180px]">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-8">
        <div>
          <div className="text-[11px] tracking-[0.18em] uppercase text-brand-600 font-semibold mb-2">
            {formatDateLabel()}
          </div>
          <h1 className="font-display text-[36px] leading-[1.05] tracking-tight text-slate-900">
            {getTimeGreeting(now)}, {firstName}.
          </h1>
          <p className="text-slate-600 mt-2 max-w-[560px]">
            This week's signal is{" "}
            <span className="text-brand-700 font-medium">
              {String(supportLevel).toLowerCase()} support
            </span>
            . Here is a simple view of how your meals, water, sleep, and mood
            are trending today.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="line" size="sm">
            <Plus size={14} /> Log meal
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={() => navigate("/u/scanner")}
          >
            <Barcode size={14} /> Scan food
          </Button>
        </div>
      </div>

      <Card className="p-5 mb-5 bg-gradient-to-br from-white via-brand-50/30 to-cyan-50/40 ring-1 ring-brand-100/70">
        <div className="mb-5">
          <div className="text-[11px] uppercase tracking-wider text-slate-500 font-semibold">
            Current summary
          </div>
          <h2 className="font-display text-[22px] leading-tight text-slate-900 mt-1">
            {todaySummary.overallStatus}
          </h2>
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="rounded-xl bg-white/70 p-4">
            <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-violet-600 font-semibold mb-2.5">
              <Moon size={11} /> Sleep
            </div>
            <div className="font-display text-[26px] leading-none text-slate-900 tracking-tight">
              {todaySummary.sleepTodayHours.toFixed(1)}
              <span className="text-[13px] text-slate-400 ml-0.5">h</span>
            </div>
            <div className="text-[11px] text-slate-500 mt-1.5">
              7d avg {todaySummary.sleepAvg7Hours.toFixed(1)}h
            </div>
            <div className="mt-3 h-1 rounded-full bg-violet-100 overflow-hidden">
              <div
                className="h-full rounded-full bg-gradient-to-r from-violet-400 to-violet-500 transition-all duration-700"
                style={{
                  width: `${Math.min((todaySummary.sleepTodayHours / 9) * 100, 100)}%`,
                }}
              />
            </div>
          </div>
          <div className="rounded-xl bg-white/70 p-4">
            <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-cyan-600 font-semibold mb-2.5">
              <Drop size={11} /> Water
            </div>
            <div className="font-display text-[26px] leading-none text-slate-900 tracking-tight">
              {todaySummary.waterTodayMl}
              <span className="text-[13px] text-slate-400 ml-0.5">ml</span>
            </div>
            <div className="text-[11px] text-slate-500 mt-1.5">
              of {todaySummary.waterTargetMl}ml goal
            </div>
            <div className="mt-3 h-1 rounded-full bg-cyan-100 overflow-hidden">
              <div
                className="h-full rounded-full bg-gradient-to-r from-cyan-400 to-cyan-500 transition-all duration-700"
                style={{
                  width: `${Math.min((todaySummary.waterTodayMl / todaySummary.waterTargetMl) * 100, 100)}%`,
                }}
              />
            </div>
          </div>
          <div className="rounded-xl bg-white/70 p-4">
            <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-emerald-600 font-semibold mb-2.5">
              <Brain size={11} /> Mental
            </div>
            <div className="font-display text-[26px] leading-none text-slate-900 tracking-tight">
              {todaySummary.mentalStatus}
            </div>
            <div className="text-[11px] text-slate-500 mt-1.5">
              {todaySummary.stressLevel
                ? `Stress ${todaySummary.stressLevel}/5`
                : "No check yet"}
            </div>
            <div className="mt-3 flex gap-0.5">
              {[1, 2, 3, 4, 5].map((i) => (
                <div
                  key={i}
                  className={`h-1 flex-1 rounded-full transition-colors ${
                    i <= (todaySummary.stressLevel ?? 0)
                      ? "bg-emerald-400"
                      : "bg-emerald-100"
                  }`}
                />
              ))}
            </div>
          </div>
          <div className="rounded-xl bg-white/70 p-4">
            <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-amber-600 font-semibold mb-2.5">
              <Heartbeat size={11} /> Physical
            </div>
            <div className="font-display text-[26px] leading-none text-slate-900 tracking-tight">
              {todaySummary.physicalStatus}
            </div>
            <div className="text-[11px] text-slate-500 mt-1.5">
              {todaySummary.workoutSessions7d} session
              {todaySummary.workoutSessions7d !== 1 ? "s" : ""} this week
            </div>
            <div className="mt-3 flex gap-1">
              {Array.from({ length: 7 }).map((_, i) => (
                <div
                  key={i}
                  className={`h-1 flex-1 rounded-full transition-colors ${
                    i < todaySummary.workoutSessions7d
                      ? "bg-amber-400"
                      : "bg-amber-100"
                  }`}
                />
              ))}
            </div>
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 mb-5">
        <Card className="lg:col-span-4 p-6">
          <div className="flex items-center justify-between mb-1">
            <div className="text-[11px] uppercase tracking-wider text-slate-500 font-semibold">
              Daily Wellness
            </div>
            <Pill tone="brand" className="!normal-case !tracking-normal">
              Today
            </Pill>
          </div>
          <div className="flex items-center gap-5 mt-4">
            <Ring value={wellnessScore} size={132} stroke={11} sub="of 100" />
            <div>
              <div className="font-display text-[16px] leading-tight mb-1 text-slate-900">
                {supportLevel} support overall
              </div>
              <p className="text-[13px] text-slate-600 leading-snug max-w-[180px]">
                {healthNotes}
              </p>
              <div
                className={`mt-3 text-[12px] font-medium ${trendSummary.tone}`}
              >
                {trendSummary.value} · {trendSummary.label}
              </div>
            </div>
          </div>
        </Card>

        <Card className="lg:col-span-5 p-6">
          <div className="flex items-center justify-between mb-5">
            <div>
              <div className="text-[11px] uppercase tracking-wider text-slate-500 font-semibold">
                Today's macros
              </div>
              <div className="font-display text-[20px] mt-0.5 text-slate-900">
                {kcalConsumed.toLocaleString()} /{" "}
                {calorieTarget.toLocaleString()} kcal
              </div>
            </div>
            <Button variant="ghost" size="sm">
              Adjust target
            </Button>
          </div>
          <div className="space-y-4">
            {macros.map((m) => {
              const pct = Math.round((m.value / m.target) * 100);
              return (
                <div key={m.name}>
                  <div className="flex items-baseline justify-between mb-1.5">
                    <div className="flex items-center gap-2">
                      <span className="text-[13px] font-medium text-slate-700">
                        {m.name}
                      </span>
                      {pct > 95 && (
                        <span className="text-[10px] uppercase tracking-wider text-red-600">
                          over
                        </span>
                      )}
                    </div>
                    <div className="text-[12px] tabular-nums text-slate-500">
                      <span className="text-slate-900 font-medium">
                        {m.value}
                      </span>
                      <span className="text-slate-400">
                        {" "}
                        / {m.target} {m.unit}
                      </span>
                    </div>
                  </div>
                  <Bar value={Math.min(pct, 100)} tone={m.tone} />
                </div>
              );
            })}
          </div>
        </Card>

        <Card className="lg:col-span-3 p-6">
          <div className="text-[11px] uppercase tracking-wider text-slate-500 font-semibold mb-1">
            7-day trend
          </div>
          <div className="font-display text-[28px] leading-none mt-2 text-slate-900">
            {trendSummary.value}
          </div>
          <div className={`text-[12px] mt-1 ${trendSummary.tone}`}>
            {trendSummary.label}
          </div>
          <div className="mt-5">
            <Spark data={trend} w={200} h={48} tone="brand" />
            <div className="flex justify-between mt-1 text-[10px] text-slate-400 tracking-wider">
              {days.map((d, i) => (
                <span key={i}>{d}</span>
              ))}
            </div>
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 mb-10">
        <Card className="lg:col-span-7 p-6">
          <div className="flex items-center justify-between mb-5">
            <div>
              <div className="text-[11px] uppercase tracking-wider text-slate-500 font-semibold">
                Wellness supports
              </div>
              <h3 className="font-display text-[20px] mt-0.5 text-slate-900">
                How your body is doing
              </h3>
            </div>
            <Button variant="ghost" size="sm">
              Details <ArrowRight size={13} />
            </Button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {supports.map((s) => (
              <div key={s.label} className="rounded-xl bg-slate-50 p-4">
                <div className="mb-2.5">
                  <span className="text-[13px] font-medium text-slate-900 block mb-1.5">
                    {s.label}
                  </span>
                  <Support level={s.level} />
                </div>
                <Bar value={s.v} tone={s.tone} />
                <div className="text-[11px] text-slate-500 mt-1.5 tabular-nums">
                  {s.v}/100
                </div>
              </div>
            ))}
          </div>
        </Card>

        <Card className="lg:col-span-5 p-0 overflow-visible relative bg-gradient-to-br from-brand-50/80 via-white to-cyan-50/50">
          <svg
            className="absolute -top-2 -left-6 w-48 h-48 opacity-30 z-10 pointer-events-none"
            viewBox="0 0 100 100"
            fill="none"
          >
            <path
              d="M20 60 C20 35, 35 20, 55 20 L55 30 C42 30, 33 40, 33 52 L40 52 C46 52, 50 56, 50 62 L50 75 C50 81, 46 85, 40 85 L27 85 C23 85, 20 81, 20 75 Z"
              fill="#a78bfa"
            />
            <path
              d="M58 60 C58 35, 73 20, 93 20 L93 30 C80 30, 71 40, 71 52 L78 52 C84 52, 88 56, 88 62 L88 75 C88 81, 84 85, 78 85 L65 85 C61 85, 58 81, 58 75 Z"
              fill="#a78bfa"
            />
          </svg>
          <svg
            className="absolute -bottom-2 -right-6 w-52 h-52 opacity-25 z-10 pointer-events-none"
            viewBox="0 0 100 100"
            fill="none"
          >
            <path
              d="M80 60 C80 35, 65 20, 45 20 L45 30 C58 30, 67 40, 67 52 L60 52 C54 52, 50 56, 50 62 L50 75 C50 81, 54 85, 60 85 L73 85 C77 85, 80 81, 80 75 Z"
              fill="#22d3ee"
            />
            <path
              d="M42 60 C42 35, 27 20, 7 20 L7 30 C20 30, 29 40, 29 52 L22 52 C16 52, 12 56, 12 62 L12 75 C12 81, 16 85, 22 85 L35 85 C39 85, 42 81, 42 75 Z"
              fill="#22d3ee"
            />
          </svg>
          <div className="relative z-20 px-6 pt-5 pb-6 rounded-t-xl">
            <div>
              <div className="flex items-center gap-2 text-[11px] uppercase tracking-wider text-brand-600 font-semibold mb-4">
                <Sparkle size={13} /> AI Reflection
              </div>
              {reflectionGenerating ? (
                <div className="space-y-3 animate-pulse">
                  <div className="h-5 rounded bg-slate-200 w-full" />
                  <div className="h-5 rounded bg-slate-200 w-11/12" />
                  <div className="h-5 rounded bg-slate-200 w-4/5" />
                </div>
              ) : (
                <p className="font-display text-[18px] leading-[1.4] text-slate-900">
                  {reflectionText}
                </p>
              )}
            </div>
          </div>
          <div className="px-6 py-5 space-y-3">
            {reflectionGenerating ? (
              <div className="space-y-3 animate-pulse">
                <div className="h-14 rounded bg-slate-100 w-full" />
                <div className="h-14 rounded bg-slate-100 w-full" />
              </div>
            ) : (
              <>
                <div className="flex gap-3">
                  <div className="flex-shrink-0 mt-0.5 w-7 h-7 rounded-full bg-violet-100 flex items-center justify-center">
                    <Brain size={13} className="text-violet-600" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-[10px] uppercase tracking-wider font-semibold text-violet-600 mb-0.5">
                      Mental boost
                    </div>
                    <p className="text-[13px] leading-snug text-slate-700">
                      {mentalMotivation}
                    </p>
                  </div>
                </div>
                <div className="flex gap-3">
                  <div className="flex-shrink-0 mt-0.5 w-7 h-7 rounded-full bg-emerald-100 flex items-center justify-center">
                    <Heartbeat size={13} className="text-emerald-600" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-[10px] uppercase tracking-wider font-semibold text-emerald-600 mb-0.5">
                      Physical boost
                    </div>
                    <p className="text-[13px] leading-snug text-slate-700">
                      {physicalMotivation}
                    </p>
                  </div>
                </div>
              </>
            )}
          </div>
          <div className="px-6 py-3 bg-slate-50 border-t border-slate-100 text-[11px] text-slate-400 leading-relaxed">
            {reflectionGenerating
              ? "Refreshing your latest personalized reflection..."
              : reflectionWhy}
          </div>
        </Card>
      </div>

      <Section
        eyebrow="Budget activity"
        title="Read-only budget logs"
        action={
          <Button
            variant="line"
            size="sm"
            onClick={() => navigate("/u/budget")}
          >
            Go to budget <ArrowRight size={13} />
          </Button>
        }
      >
        <Card className="overflow-hidden p-0">
          {budgetLogs.length ? (
            <ul>
              {budgetLogs.map((log, i) => (
                <li
                  key={log.id}
                  className={`grid grid-cols-1 lg:grid-cols-12 gap-3 items-center px-6 py-4 ${i < budgetLogs.length - 1 ? "border-b border-slate-200" : ""}`}
                >
                  <div className="lg:col-span-2 font-mono text-[12px] text-slate-500 tabular-nums">
                    {log.date}
                  </div>
                  <div className="lg:col-span-4 text-[13px] text-slate-900 truncate">
                    {log.title}
                  </div>
                  <div className="lg:col-span-2 text-[12px] uppercase tracking-wider text-slate-700 font-medium">
                    {log.type}
                  </div>
                  <div className="lg:col-span-2 text-left sm:text-right tabular-nums text-[13px] text-slate-600 whitespace-nowrap">
                    {log.currency} {log.amount.toFixed(0)}
                  </div>
                  <div className="lg:col-span-2 flex justify-start sm:justify-end">
                    <Pill
                      tone="slate"
                      className="!normal-case !tracking-normal"
                    >
                      {log.itemsCount} item{log.itemsCount === 1 ? "" : "s"}
                    </Pill>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <div className="px-6 py-10 text-center text-[13px] text-slate-500">
              No budget logs yet. Add planned or spent entries in Budget.
            </div>
          )}
          <div className="px-6 py-3 border-t border-slate-200 bg-slate-50 flex items-center justify-between">
            <span className="text-[12px] text-slate-500">
              {budgetLogs.length} logs · read-only snapshot from budget route
            </span>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => navigate("/u/budget")}
            >
              Open /u/budget
            </Button>
          </div>
        </Card>
      </Section>
    </div>
  );
}
