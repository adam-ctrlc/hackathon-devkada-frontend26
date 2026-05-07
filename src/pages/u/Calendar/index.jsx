import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card } from "../../../components/ui/Card.jsx";
import { Pill } from "../../../components/ui/Pill.jsx";
import { Ring, Bar } from "../../../components/ui/Charts.jsx";
import {
  CaretLeft,
  CaretRight,
  CalendarBlank,
  Sparkle,
} from "@phosphor-icons/react";
import { apiRequest } from "../../../lib/api.js";
import { clearAuthSession, getAuthSession } from "../../../lib/auth-session.js";
import { DayDetail } from "./components/DayDetail.jsx";
import { MonthPicker } from "./components/MonthPicker.jsx";
import {
  MONTHS,
  WEEKDAYS,
  buildMonth,
  dateKey,
  deriveScore,
  deriveSupportLevel,
  pillTone,
  summaryItemText,
  today,
  toneBar,
  toneRing,
} from "../../../utils/calendar.js";
import { CalendarSkeleton } from "../components/RouteSkeletons.jsx";
import { usePageTitle } from "../../../hooks/usePageTitle.js";

export default function Calendar() {
  usePageTitle("Calendar");
  const navigate = useNavigate();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());
  const [showPicker, setShowPicker] = useState(false);
  const [selectedCell, setSelectedCell] = useState(null);
  const [calendarData, setCalendarData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const session = getAuthSession();
    const profileId = session?.profile?.id;

    if (!profileId) {
      navigate("/", { replace: true });
      return;
    }

    const loadCalendar = async () => {
      setLoading(true);
      try {
        const data = await apiRequest(`/calendar/${profileId}?days=90`);
        if (!cancelled) setCalendarData(data);
      } catch (err) {
        if (String(err.message).toLowerCase().includes("profile not found")) {
          clearAuthSession();
          navigate("/", { replace: true });
          return;
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    loadCalendar();

    return () => {
      cancelled = true;
    };
  }, [navigate]);

  const calendarByDate = useMemo(
    () =>
      new Map((calendarData?.calendar ?? []).map((item) => [item.date, item])),
    [calendarData],
  );
  const cells = buildMonth(year, month, calendarByDate);
  const filled = cells.filter(Boolean).filter((cell) => !cell.isFuture);
  const counts = calendarData?.counts ?? {};
  const total = Math.max(1, filled.length);
  const stats = [
    { l: "High support", v: counts.High ?? 0, tone: "green" },
    { l: "Medium support", v: counts.Medium ?? 0, tone: "amber" },
    { l: "Low support", v: counts.Low ?? 0, tone: "red" },
  ].map((item) => ({ ...item, pct: Math.round((item.v / total) * 100) }));
  const todayCell = cells.find((cell) => cell?.isToday);

  const weekInfo = useMemo(() => {
    const now = new Date();
    const dow = (now.getDay() + 6) % 7; // 0 = Mon
    const monday = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate() - dow,
    );
    const days = Array.from({ length: 7 }, (_, i) => {
      const d = new Date(
        monday.getFullYear(),
        monday.getMonth(),
        monday.getDate() + i,
      );
      const key = dateKey(d.getFullYear(), d.getMonth(), d.getDate());
      const summary = calendarByDate.get(key);
      const score = deriveScore(summary);
      const level = deriveSupportLevel(summary, score);
      const isToday = d.toDateString() === now.toDateString();
      const isFuture = d > now && !isToday;
      return { d, key, summary, score, level, isToday, isFuture };
    });
    const elapsed = days.filter((it) => !it.isFuture);
    const scored = elapsed.filter((it) => it.score != null);
    const avgScore = scored.length
      ? Math.round(scored.reduce((s, it) => s + it.score, 0) / scored.length)
      : null;
    const foodCount = elapsed.reduce(
      (s, it) =>
        s +
        (it.summary?.foodEntryCount ?? it.summary?.foodEntries?.length ?? 0),
      0,
    );
    const waterMl = elapsed.reduce(
      (s, it) => s + Number(it.summary?.waterTotalMl ?? 0),
      0,
    );
    const counts = elapsed.reduce(
      (acc, it) => {
        if (it.level && acc[it.level] != null) acc[it.level] += 1;
        return acc;
      },
      { High: 0, Medium: 0, Low: 0 },
    );
    const ongoing = days.some((it) => it.isToday) && elapsed.length < 7;
    return {
      days,
      elapsed,
      scored,
      avgScore,
      foodCount,
      waterMl,
      counts,
      ongoing,
    };
  }, [calendarByDate]);

  const weekStatusCopy = (() => {
    if (!weekInfo.ongoing) return "Week complete — here's the recap.";
    const remaining = 7 - weekInfo.elapsed.length;
    if (weekInfo.scored.length === 0)
      return `You're just getting started — ${remaining} day${remaining === 1 ? "" : "s"} left to log.`;
    if ((weekInfo.avgScore ?? 0) >= 75)
      return `You're on the way — strong rhythm with ${remaining} day${remaining === 1 ? "" : "s"} to go.`;
    if ((weekInfo.avgScore ?? 0) >= 50)
      return `Steady progress — ${remaining} day${remaining === 1 ? "" : "s"} left to lift the average.`;
    return `Keep going — ${remaining} day${remaining === 1 ? "" : "s"} left to turn the week around.`;
  })();
  const bestSummary = [...calendarByDate.values()]
    .filter((item) => item.score != null)
    .sort((a, b) => b.score - a.score)[0];

  const prevMonth = () => {
    if (month === 0) {
      setYear((value) => value - 1);
      setMonth(11);
    } else setMonth((value) => value - 1);
    setSelectedCell(null);
  };
  const nextMonth = () => {
    if (year === today.getFullYear() && month >= today.getMonth()) return;
    if (month === 11) {
      setYear((value) => value + 1);
      setMonth(0);
    } else setMonth((value) => value + 1);
    setSelectedCell(null);
  };

  return (
    <div className="px-4 sm:px-6 lg:px-10 py-6 lg:py-8 max-w-[1180px]">
      {showPicker && (
        <MonthPicker
          year={year}
          month={month}
          onChange={(nextYear, nextMonthValue) => {
            setYear(nextYear);
            setMonth(nextMonthValue);
            setSelectedCell(null);
          }}
          onClose={() => setShowPicker(false)}
        />
      )}
      {selectedCell && (
        <DayDetail
          cell={selectedCell}
          year={year}
          month={month}
          onClose={() => setSelectedCell(null)}
        />
      )}

      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-7">
        <div>
          <div className="text-[11px] tracking-[0.18em] uppercase text-brand-600 font-semibold mb-2">
            Health Impact Calendar
          </div>
          <h1 className="font-display text-[34px] leading-[1.05] tracking-tight text-slate-900">
            {MONTHS[month]} {year}
          </h1>
          <p className="text-slate-600 mt-2 max-w-[560px]">
            Daily patterns from your food, meals, water, diary, budget, and
            health status.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={prevMonth}
            className="w-9 h-9 rounded-xl bg-white ring-1 ring-slate-200 grid place-items-center text-slate-600 hover:bg-slate-50 transition"
          >
            <CaretLeft size={15} />
          </button>
          <button
            onClick={() => setShowPicker(true)}
            className="h-9 px-4 rounded-xl bg-white ring-1 ring-slate-200 text-[13px] font-medium text-slate-700 hover:bg-slate-50 transition flex items-center gap-2"
          >
            <CalendarBlank size={14} className="text-brand-500" />
            {MONTHS[month].slice(0, 3)} {year}
          </button>
          <button
            onClick={nextMonth}
            disabled={year === today.getFullYear() && month >= today.getMonth()}
            className="w-9 h-9 rounded-xl bg-white ring-1 ring-slate-200 grid place-items-center text-slate-600 hover:bg-slate-50 transition disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <CaretRight size={15} />
          </button>
        </div>
      </div>

      {loading ? (
        <CalendarSkeleton />
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          <Card className="lg:col-span-8 p-4 sm:p-6 overflow-hidden">
            <div className="overflow-x-auto pb-2">
              <div className="min-w-[520px]">
                <div className="grid grid-cols-7 gap-2 text-[11px] uppercase tracking-wider text-slate-500 font-semibold mb-3">
                  {WEEKDAYS.map((weekday) => (
                    <div key={weekday} className="text-center">
                      {weekday}
                    </div>
                  ))}
                </div>
                <div className="grid grid-cols-7 gap-2">
                  {cells.map((cell, index) => {
                    if (!cell) return <div key={index} />;
                    const isSelected = selectedCell?.key === cell.key;
                    return (
                      <button
                        key={cell.key}
                        onClick={() =>
                          setSelectedCell(isSelected ? null : cell)
                        }
                        disabled={cell.isFuture}
                        className={`relative aspect-square rounded-xl p-2 flex flex-col justify-between transition
                      ${cell.isFuture ? "bg-slate-50 border border-slate-100 opacity-30 cursor-not-allowed" : isSelected || cell.isToday ? `ring-2 ${toneRing(cell.level)} bg-white border border-transparent shadow-sm` : "bg-slate-50 border border-slate-200 hover:bg-white hover:border-slate-300 hover:shadow-sm cursor-pointer"}`}
                      >
                        <div className="flex items-center justify-between">
                          <span
                            className={`font-mono text-[12px] tabular-nums ${cell.isToday ? "text-brand-700 font-semibold" : "text-slate-700"}`}
                          >
                            {cell.d}
                          </span>
                          {cell.isToday && (
                            <span className="text-[9px] uppercase tracking-wider text-brand-700 font-semibold">
                              today
                            </span>
                          )}
                        </div>
                        <div className="space-y-1">
                          <div
                            className={`h-1.5 rounded-full ${toneBar(cell.level)}`}
                          />
                          {(cell.summary?.budgetLogs?.length > 0 ||
                            cell.summary?.foodEntryCount > 0) && (
                            <div className="flex gap-1">
                              {cell.summary?.foodEntryCount > 0 && (
                                <span className="h-1.5 w-1.5 rounded-full bg-brand-400" />
                              )}
                              {cell.summary?.budgetLogs?.length > 0 && (
                                <span className="h-1.5 w-1.5 rounded-full bg-amber-400" />
                              )}
                            </div>
                          )}
                          <div className="text-[10px] text-slate-500 font-mono tabular-nums">
                            {cell.score ?? "--"}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-5 pt-5 mt-5 border-t border-slate-200 text-[12px] text-slate-600 flex-wrap">
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-1.5 rounded-full bg-emerald-400" /> High
                support
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-1.5 rounded-full bg-amber-300" /> Medium
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-1.5 rounded-full bg-red-300" /> Low
              </span>
              <span className="w-full text-slate-500 sm:ml-auto sm:w-auto">
                {calendarData?.streaks?.notice}
              </span>
            </div>
          </Card>

          <div className="lg:col-span-4 space-y-5">
            <Card className="p-5">
              <div className="flex items-center justify-between mb-3">
                <div className="text-[11px] uppercase tracking-wider text-slate-500 font-semibold">
                  {weekInfo.ongoing ? "This week so far" : "This week"}
                </div>
                {weekInfo.ongoing && (
                  <span className="inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full bg-brand-50 text-brand-700">
                    <span className="w-1.5 h-1.5 rounded-full bg-brand-500 animate-pulse" />
                    Ongoing
                  </span>
                )}
              </div>
              <p className="text-[13.5px] text-slate-700 leading-snug font-medium">
                {weekStatusCopy}
              </p>
              <div className="mt-3 flex items-center gap-1.5">
                {weekInfo.days.map((day) => {
                  const labels = ["M", "T", "W", "T", "F", "S", "S"];
                  const idx = (day.d.getDay() + 6) % 7;
                  const tone = day.isFuture
                    ? "bg-slate-100 text-slate-400"
                    : day.score == null
                      ? "bg-slate-200 text-slate-500"
                      : day.level === "High"
                        ? "bg-emerald-100 text-emerald-700"
                        : day.level === "Medium"
                          ? "bg-amber-100 text-amber-700"
                          : "bg-red-100 text-red-700";
                  return (
                    <div
                      key={day.key}
                      className={`flex-1 h-12 rounded-lg flex flex-col items-center justify-center gap-0.5 ${tone} ${day.isToday ? "ring-2 ring-brand-500" : ""}`}
                      title={`${day.d.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" })}${day.score != null ? ` · ${day.score}` : ""}`}
                    >
                      <span className="text-[10px] font-semibold opacity-70">
                        {labels[idx]}
                      </span>
                      <span className="text-[11px] font-mono tabular-nums">
                        {day.isFuture ? "·" : (day.score ?? "—")}
                      </span>
                    </div>
                  );
                })}
              </div>
              <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-2 text-center">
                <div className="rounded-lg bg-slate-50 p-2">
                  <div className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold">
                    Avg score
                  </div>
                  <div className="font-display text-[18px] text-slate-900 mt-0.5 leading-none">
                    {weekInfo.avgScore ?? "—"}
                  </div>
                </div>
                <div className="rounded-lg bg-slate-50 p-2">
                  <div className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold">
                    Foods
                  </div>
                  <div className="font-display text-[18px] text-slate-900 mt-0.5 leading-none">
                    {weekInfo.foodCount}
                  </div>
                </div>
                <div className="rounded-lg bg-slate-50 p-2">
                  <div className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold">
                    Water
                  </div>
                  <div className="font-display text-[18px] text-slate-900 mt-0.5 leading-none">
                    {(weekInfo.waterMl / 1000).toFixed(1)}
                    <span className="text-[11px] text-slate-400 ml-0.5">L</span>
                  </div>
                </div>
              </div>
            </Card>

            {(selectedCell ?? todayCell) && (
              <Card className="p-5">
                {(() => {
                  const cell = selectedCell ?? todayCell;
                  return (
                    <>
                      <div className="text-[11px] uppercase tracking-wider text-slate-500 font-semibold mb-3">
                        {selectedCell
                          ? `${MONTHS[month]} ${selectedCell.d}`
                          : "Today"}
                      </div>
                      <div className="flex items-center gap-3 mb-3">
                        <Ring
                          value={cell.score ?? 0}
                          size={84}
                          stroke={8}
                          tone={
                            cell.level === "High"
                              ? "green"
                              : cell.level === "Low"
                                ? "red"
                                : "amber"
                          }
                          sub="score"
                        />
                        <div>
                          <div className="flex flex-wrap items-center gap-1.5">
                            <Pill
                              tone={pillTone(cell.level)}
                              className="!normal-case !tracking-normal"
                            >
                              {cell.level} support
                            </Pill>
                            {cell.derived && (
                              <Pill
                                tone="slate"
                                className="!normal-case !tracking-normal"
                              >
                                Estimated
                              </Pill>
                            )}
                          </div>
                          <div className="font-display text-[15px] mt-1.5 leading-tight text-slate-900">
                            {summaryItemText(cell.summary?.highlights?.[0]) ||
                              "No detailed log"}
                          </div>
                        </div>
                      </div>
                      <p className="text-[13px] text-slate-600 leading-snug">
                        {summaryItemText(cell.summary?.suggestions?.[0]) ||
                          "Click any day to see the food, water, budget, and timing details."}
                      </p>
                    </>
                  );
                })()}
              </Card>
            )}

            <Card className="p-5">
              <div className="text-[11px] uppercase tracking-wider text-slate-500 font-semibold mb-3">
                Month at a glance
              </div>
              <div className="space-y-3">
                {stats.map((stat) => (
                  <div key={stat.l}>
                    <div className="flex items-baseline justify-between mb-1">
                      <span className="text-[13px] text-slate-900">
                        {stat.l}
                      </span>
                      <span className="font-mono text-[12px] text-slate-500 tabular-nums">
                        {stat.v}d · {stat.pct}%
                      </span>
                    </div>
                    <Bar value={stat.pct} tone={stat.tone} />
                  </div>
                ))}
              </div>
            </Card>

            <Card className="p-5 !bg-brand-50 !border-brand-100">
              <div className="text-[11px] uppercase tracking-wider text-brand-700 font-semibold mb-1">
                Best recorded day
              </div>
              {bestSummary ? (
                <>
                  <div className="font-display text-[18px] mb-2 text-slate-900">
                    {new Date(bestSummary.date).toLocaleDateString()} · Score{" "}
                    {bestSummary.score}
                  </div>
                  <p className="text-[13px] text-slate-700">
                    {bestSummary.highlights
                      ?.map(summaryItemText)
                      .filter(Boolean)
                      .join(", ") || "Daily details available."}
                  </p>
                </>
              ) : (
                <div className="flex items-start gap-2 text-[13px] text-slate-700">
                  <Sparkle
                    size={14}
                    className="text-brand-600 shrink-0 mt-0.5"
                  />
                  Log meals, scans, diary, or water to generate calendar
                  summaries.
                </div>
              )}
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}
