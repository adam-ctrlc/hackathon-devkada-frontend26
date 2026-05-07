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

      {/* Header */}
      <div className="mb-5 sm:mb-7 flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div>
          <div className="text-[11px] tracking-[0.18em] uppercase text-brand-600 font-semibold mb-2">
            Health Calendar
          </div>
          <h1 className="font-display text-[26px] sm:text-[34px] leading-[1.05] tracking-tight text-slate-900">
            {MONTHS[month]} {year}
          </h1>
          <p className="text-slate-600 mt-2 max-w-[560px]">
            Daily patterns from food, water, sleep, diary, and budget.
          </p>
        </div>
        <div className="flex items-center gap-2 sm:mt-1 shrink-0">
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
          {/* Calendar grid */}
          <Card className="lg:col-span-8 p-4 sm:p-5 overflow-hidden">
            <div className="overflow-x-auto">
              <div className="min-w-[480px]">
                <div className="grid grid-cols-7 mb-2">
                  {WEEKDAYS.map((weekday) => (
                    <div
                      key={weekday}
                      className="text-center text-[10px] uppercase tracking-widest text-slate-400 font-semibold py-1.5"
                    >
                      {weekday}
                    </div>
                  ))}
                </div>
                <div className="grid grid-cols-7 gap-1.5">
                  {cells.map((cell, index) => {
                    if (!cell) return <div key={index} />;
                    const isSelected = selectedCell?.key === cell.key;
                    const cellBg =
                      cell.level === "High"
                        ? "bg-emerald-50"
                        : cell.level === "Medium"
                          ? "bg-amber-50"
                          : cell.level === "Low"
                            ? "bg-red-50"
                            : "bg-white";
                    const cellBorder =
                      cell.level === "High"
                        ? "border-emerald-100"
                        : cell.level === "Medium"
                          ? "border-amber-100"
                          : cell.level === "Low"
                            ? "border-red-100"
                            : "border-slate-200";
                    const scoreColor =
                      cell.level === "High"
                        ? "text-emerald-700"
                        : cell.level === "Medium"
                          ? "text-amber-700"
                          : cell.level === "Low"
                            ? "text-red-600"
                            : "text-slate-400";
                    return (
                      <button
                        key={cell.key}
                        onClick={() =>
                          setSelectedCell(isSelected ? null : cell)
                        }
                        disabled={cell.isFuture}
                        className={`relative aspect-square rounded-xl p-1.5 flex flex-col justify-between transition
                          ${
                            cell.isFuture
                              ? "bg-slate-50 border border-slate-100 opacity-25 cursor-not-allowed"
                              : isSelected
                                ? `ring-2 ring-brand-500 ring-offset-1 ${cellBg} border border-transparent shadow-sm`
                                : cell.isToday
                                  ? `ring-2 ring-brand-400 ${cellBg} border border-transparent shadow-sm`
                                  : `${cellBg} border ${cellBorder} hover:shadow-sm hover:border-slate-300 cursor-pointer`
                          }`}
                      >
                        <div className="flex items-start justify-between gap-0.5">
                          <span
                            className={`font-mono text-[11px] tabular-nums font-semibold leading-none ${cell.isToday ? "text-brand-700" : "text-slate-500"}`}
                          >
                            {cell.d}
                          </span>
                          {cell.isToday && (
                            <span className="text-[7px] uppercase tracking-wide text-brand-700 font-bold bg-brand-100 px-1 py-0.5 rounded leading-none">
                              today
                            </span>
                          )}
                        </div>
                        <div className="flex-1 flex items-center justify-center">
                          <span
                            className={`font-display text-[17px] leading-none tabular-nums ${scoreColor}`}
                          >
                            {cell.score ?? ""}
                          </span>
                        </div>
                        <div>
                          <div
                            className={`h-1 rounded-full ${toneBar(cell.level)}`}
                          />
                          {(cell.summary?.foodEntryCount > 0 ||
                            cell.summary?.budgetLogs?.length > 0) && (
                            <div className="flex gap-0.5 mt-0.5">
                              {cell.summary?.foodEntryCount > 0 && (
                                <span className="h-1 w-1 rounded-full bg-brand-400" />
                              )}
                              {cell.summary?.budgetLogs?.length > 0 && (
                                <span className="h-1 w-1 rounded-full bg-amber-400" />
                              )}
                            </div>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-4 pt-4 mt-4 border-t border-slate-100 flex-wrap">
              {[
                { label: "High support", color: "bg-emerald-400" },
                { label: "Medium", color: "bg-amber-300" },
                { label: "Low", color: "bg-red-300" },
              ].map(({ label, color }) => (
                <span
                  key={label}
                  className="flex items-center gap-1.5 text-[12px] text-slate-500"
                >
                  <span className={`w-2.5 h-1 rounded-full ${color}`} /> {label}
                </span>
              ))}
              {calendarData?.streaks?.notice && (
                <span className="ml-auto text-[12px] text-slate-500 hidden sm:block">
                  {calendarData.streaks.notice}
                </span>
              )}
            </div>
          </Card>

          {/* Sidebar */}
          <div className="lg:col-span-4 space-y-4">
            {/* Week strip */}
            <Card className="p-5">
              <div className="flex items-center justify-between mb-1">
                <div>
                  <div className="text-[11px] uppercase tracking-wider text-slate-400 font-semibold">
                    {weekInfo.ongoing ? "This week so far" : "This week"}
                  </div>
                  <h3 className="font-display text-[16px] mt-0.5 text-slate-900">
                    Weekly rhythm
                  </h3>
                </div>
                {weekInfo.ongoing && (
                  <span className="inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full bg-brand-50 text-brand-700 ring-1 ring-brand-100">
                    <span className="w-1.5 h-1.5 rounded-full bg-brand-500 animate-pulse" />{" "}
                    Live
                  </span>
                )}
              </div>
              <p className="text-[12.5px] text-slate-600 leading-snug mb-3 mt-1">
                {weekStatusCopy}
              </p>
              <div className="flex items-center gap-1 mb-4">
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
                      title={`${day.d.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" })}${day.score != null ? ` · ${day.score}` : ""}`}
                      className={`flex-1 h-11 rounded-lg flex flex-col items-center justify-center gap-0.5 ${tone} ${day.isToday ? "ring-2 ring-brand-500" : ""}`}
                    >
                      <span className="text-[9px] font-bold opacity-60">
                        {labels[idx]}
                      </span>
                      <span className="text-[11px] font-mono tabular-nums font-semibold">
                        {day.isFuture ? "·" : (day.score ?? "—")}
                      </span>
                    </div>
                  );
                })}
              </div>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { label: "Avg score", value: weekInfo.avgScore ?? "—" },
                  { label: "Foods", value: weekInfo.foodCount },
                  {
                    label: "Water",
                    value: `${(weekInfo.waterMl / 1000).toFixed(1)}L`,
                  },
                ].map((s) => (
                  <div
                    key={s.label}
                    className="rounded-xl bg-slate-50 ring-1 ring-slate-100 px-2 py-2.5 text-center"
                  >
                    <div className="text-[9px] uppercase tracking-wider text-slate-400 font-semibold">
                      {s.label}
                    </div>
                    <div className="font-display text-[17px] text-slate-900 mt-0.5 leading-none">
                      {s.value}
                    </div>
                  </div>
                ))}
              </div>
            </Card>

            {/* Selected / today detail */}
            {(selectedCell ?? todayCell) &&
              (() => {
                const cell = selectedCell ?? todayCell;
                const ringTone =
                  cell.level === "High"
                    ? "green"
                    : cell.level === "Low"
                      ? "red"
                      : "amber";
                return (
                  <Card className="p-5">
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <div className="text-[11px] uppercase tracking-wider text-slate-400 font-semibold">
                          {selectedCell
                            ? `${MONTHS[month]} ${selectedCell.d}`
                            : "Today"}
                        </div>
                        <h3 className="font-display text-[16px] mt-0.5 text-slate-900">
                          Day snapshot
                        </h3>
                      </div>
                      {selectedCell && (
                        <button
                          onClick={() => setSelectedCell(null)}
                          className="text-[11px] text-slate-400 hover:text-slate-600 transition"
                        >
                          Clear
                        </button>
                      )}
                    </div>
                    <div className="flex items-center gap-3 mb-3">
                      <Ring
                        value={cell.score ?? 0}
                        size={76}
                        stroke={7}
                        tone={ringTone}
                        sub="score"
                      />
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-1.5 mb-1.5">
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
                        <div className="text-[13px] font-medium leading-snug text-slate-900">
                          {summaryItemText(cell.summary?.highlights?.[0]) ||
                            "No detailed log"}
                        </div>
                      </div>
                    </div>
                    <p className="text-[12.5px] text-slate-500 leading-snug">
                      {summaryItemText(cell.summary?.suggestions?.[0]) ||
                        "Click any day to see food, water, budget, and timing details."}
                    </p>
                  </Card>
                );
              })()}

            {/* Month at a glance */}
            <Card className="p-5">
              <div className="mb-1">
                <div className="text-[11px] uppercase tracking-wider text-slate-400 font-semibold">
                  Month
                </div>
                <h3 className="font-display text-[16px] mt-0.5 text-slate-900">
                  At a glance
                </h3>
              </div>
              <div className="space-y-3 mt-3">
                {stats.map((stat) => (
                  <div key={stat.l}>
                    <div className="flex items-baseline justify-between mb-1">
                      <span className="text-[12.5px] text-slate-700">
                        {stat.l}
                      </span>
                      <span className="font-mono text-[11px] text-slate-400 tabular-nums">
                        {stat.v}d · {stat.pct}%
                      </span>
                    </div>
                    <Bar value={stat.pct} tone={stat.tone} />
                  </div>
                ))}
              </div>
            </Card>

            {/* Best recorded day */}
            <Card className="p-5">
              <div className="mb-3">
                <div className="text-[11px] uppercase tracking-wider text-slate-400 font-semibold">
                  All time
                </div>
                <h3 className="font-display text-[16px] mt-0.5 text-slate-900">
                  Best recorded day
                </h3>
              </div>
              {bestSummary ? (
                <div className="rounded-xl bg-emerald-50 ring-1 ring-emerald-100 p-3">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[12px] text-emerald-800 font-medium">
                      {new Date(bestSummary.date).toLocaleDateString(
                        undefined,
                        { month: "short", day: "numeric", year: "numeric" },
                      )}
                    </span>
                    <span className="font-display text-[18px] text-emerald-700 leading-none">
                      {bestSummary.score}
                    </span>
                  </div>
                  <p className="text-[12px] text-slate-600 leading-snug">
                    {bestSummary.highlights
                      ?.map(summaryItemText)
                      .filter(Boolean)
                      .join(", ") || "Daily details available."}
                  </p>
                </div>
              ) : (
                <div className="flex items-start gap-2 text-[13px] text-slate-500 rounded-xl bg-slate-50 ring-1 ring-slate-100 p-3">
                  <Sparkle
                    size={14}
                    className="text-brand-500 shrink-0 mt-0.5"
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
