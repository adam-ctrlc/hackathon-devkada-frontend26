import { Modal } from "../../../../components/ui/Modal.jsx";
import { Ring } from "../../../../components/ui/Charts.jsx";
import { Pill } from "../../../../components/ui/Pill.jsx";
import { ForkKnife, Basket, Moon } from "@phosphor-icons/react";
import {
  MONTHS,
  describeSupport,
  pillTone,
  nutrientLine,
  formatMealTiming,
} from "../../../../utils/calendar.js";

export function DayDetail({ cell, year, month, onClose }) {
  if (!cell) return null;
  const summary = cell.summary;
  const label = `${MONTHS[month]} ${cell.d}, ${year}${cell.isToday ? " · Today" : ""}`;
  const foodEntries = summary?.foodEntries ?? [];
  const budgetLogs = summary?.budgetLogs ?? [];
  const waterTotalMl = Number(summary?.waterTotalMl ?? 0);
  const sleepLogs = summary?.sleepLogs ?? [];
  const sleepHours = Number(summary?.sleepTotalHours ?? 0);

  return (
    <Modal
      title="Daily summary"
      subtitle={label}
      width="max-w-[560px]"
      onClose={onClose}
    >
      <div className="flex items-center gap-4 mb-5 rounded-2xl bg-slate-50 ring-1 ring-slate-200 p-4">
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
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-1.5 mb-2">
            <Pill
              tone={pillTone(cell.level)}
              className="!normal-case !tracking-normal"
            >
              {cell.level} support
            </Pill>
            {cell.derived && (
              <Pill tone="slate" className="!normal-case !tracking-normal">
                Estimated
              </Pill>
            )}
          </div>
          <div className="font-display text-[19px] leading-tight text-slate-900">
            {summary ? describeSupport(summary) : "No logs for this day yet."}
          </div>
          {summary && (
            <div className="mt-2 text-[12.5px] text-slate-500">
              Based on {foodEntries.length} food log
              {foodEntries.length === 1 ? "" : "s"}, {waterTotalMl}ml water,{" "}
              {sleepHours.toFixed(1)}h sleep, and {budgetLogs.length} budget log
              {budgetLogs.length === 1 ? "" : "s"}.
            </div>
          )}
        </div>
      </div>

      {summary ? (
        <>
          <div className="mb-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="rounded-xl bg-white ring-1 ring-slate-200 p-3">
              <div className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold">
                Food logs
              </div>
              <div className="font-display text-[22px] text-slate-900 mt-1">
                {foodEntries.length}
              </div>
              <div className="text-[11px] text-slate-500 mt-1">
                scanned or added
              </div>
            </div>
            <div className="rounded-xl bg-white ring-1 ring-slate-200 p-3">
              <div className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold">
                Water
              </div>
              <div className="font-display text-[22px] text-slate-900 mt-1">
                {waterTotalMl}ml
              </div>
              <div className="text-[11px] text-slate-500 mt-1">
                {summary.waterLogs?.length ?? 0} entries
              </div>
            </div>
            <div className="rounded-xl bg-white ring-1 ring-slate-200 p-3">
              <div className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold">
                Budget
              </div>
              <div className="font-display text-[22px] text-slate-900 mt-1">
                {budgetLogs.length
                  ? `${budgetLogs[0].currency} ${Number(summary.budgetTotal ?? 0).toFixed(0)}`
                  : "--"}
              </div>
              <div className="text-[11px] text-slate-500 mt-1">
                {budgetLogs.length ? "planned/spent" : "none logged"}
              </div>
            </div>
            <div className="rounded-xl bg-white ring-1 ring-slate-200 p-3">
              <div className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold">
                Sleep
              </div>
              <div className="font-display text-[22px] text-slate-900 mt-1">
                {sleepHours ? `${sleepHours.toFixed(1)}h` : "--"}
              </div>
              <div className="text-[11px] text-slate-500 mt-1">
                {sleepLogs.length
                  ? `${sleepLogs.length} entr${sleepLogs.length === 1 ? "y" : "ies"}`
                  : "none logged"}
              </div>
            </div>
          </div>

          {foodEntries.length > 0 && (
            <div className="mb-4">
              <div className="text-[11px] uppercase tracking-wider text-slate-500 font-semibold mb-2">
                Food that shaped the score
              </div>
              <div className="space-y-2">
                {foodEntries.slice(0, 4).map((food) => (
                  <div
                    key={food.id}
                    className="rounded-xl bg-slate-50 ring-1 ring-slate-200 p-3"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="font-medium text-[13px] text-slate-900 truncate">
                          {food.name}
                        </div>
                        <div className="mt-0.5 text-[11.5px] text-slate-500">
                          {nutrientLine(food)}
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <Pill
                          tone={pillTone(food.supportLevel)}
                          className="!normal-case !tracking-normal"
                        >
                          {food.supportLevel}
                        </Pill>
                        <div className="mt-1 font-mono text-[11px] text-slate-500">
                          {food.score}/100
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="mb-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="rounded-xl bg-slate-50 ring-1 ring-slate-200 p-3">
              <div className="flex items-center gap-1.5 text-[11px] uppercase tracking-wider text-slate-500 font-semibold mb-1">
                <ForkKnife size={12} /> Meal timing
              </div>
              <div className="text-[13px] text-slate-700">
                {formatMealTiming(summary.mealPeriods)}
              </div>
            </div>
            <div className="rounded-xl bg-brand-50 ring-1 ring-brand-100 p-3">
              <div className="flex items-center gap-1.5 text-[11px] uppercase tracking-wider text-brand-700 font-semibold mb-1">
                <Basket size={12} /> Budget notes
              </div>
              <div className="text-[13px] text-slate-700">
                {budgetLogs.length
                  ? `${budgetLogs.length} budget log${budgetLogs.length === 1 ? "" : "s"} connected to this day.`
                  : "No food spending or grocery plan saved for this day."}
              </div>
            </div>
            <div className="rounded-xl bg-indigo-50 ring-1 ring-indigo-100 p-3">
              <div className="flex items-center gap-1.5 text-[11px] uppercase tracking-wider text-indigo-700 font-semibold mb-1">
                <Moon size={12} /> Sleep context
              </div>
              <div className="text-[13px] text-slate-700">
                {sleepHours > 0
                  ? `You slept ${sleepHours.toFixed(1)} hours this day.`
                  : "No sleep hours logged for this day yet."}
              </div>
            </div>
          </div>

          {summary.suggestions?.length > 0 && (
            <div className="mb-4">
              <div className="text-[11px] uppercase tracking-wider text-slate-500 font-semibold mb-2">
                Next best moves
              </div>
              <ul className="space-y-2">
                {summary.suggestions.map((item, i) => {
                  const isObject = item && typeof item === "object";
                  const key = isObject
                    ? `${item.title ?? item.action ?? "suggestion"}-${i}`
                    : `${item}-${i}`;
                  return (
                    <li
                      key={key}
                      className="rounded-xl bg-white ring-1 ring-slate-200 p-3 text-[13px] text-slate-700"
                    >
                      {isObject ? (
                        <div>
                          <div className="font-medium text-slate-900">
                            {item.title ?? item.action ?? "Suggestion"}
                          </div>
                          {item.reason && (
                            <div className="text-[12px] text-slate-500 leading-snug mt-0.5">
                              {item.reason}
                            </div>
                          )}
                          {item.action &&
                            item.title &&
                            item.action !== item.title && (
                              <div className="text-[12px] text-brand-700 mt-1">
                                {item.action}
                              </div>
                            )}
                        </div>
                      ) : (
                        String(item)
                      )}
                    </li>
                  );
                })}
              </ul>
            </div>
          )}

          {budgetLogs.length > 0 && (
            <div className="mb-4">
              <div className="text-[11px] uppercase tracking-wider text-slate-500 font-semibold mb-2">
                Budget logs
              </div>
              <ul className="space-y-1.5">
                {budgetLogs.map((log) => (
                  <li key={log.id} className="text-[13px] text-slate-700">
                    <span className="font-medium text-slate-900">
                      {log.title}
                    </span>{" "}
                    · {log.currency} {Number(log.amount).toFixed(0)}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </>
      ) : (
        <p className="text-[13px] text-slate-500 italic">
          Add scans, meals, diary entries, or water logs to create a daily
          summary.
        </p>
      )}
    </Modal>
  );
}
