import { Modal } from "../../../../components/ui/Modal.jsx";
import { Support, Pill } from "../../../../components/ui/Pill.jsx";
import { Bar } from "../../../../components/ui/Charts.jsx";
import { Orange, Sparkle } from "@phosphor-icons/react";
import {
  formatDate,
  numberValue,
  scoreTone,
} from "../../../../utils/history.js";

export function ScanDetail({ scan, onClose, targets }) {
  const macros = [
    {
      k: "Calories",
      v: numberValue(scan.calories),
      u: "kcal",
      pct: Math.min(
        Math.round(numberValue(scan.calories) / (targets.calories / 100)),
        100,
      ),
    },
    {
      k: "Sodium",
      v: numberValue(scan.sodiumMg),
      u: "mg",
      pct: Math.min(
        Math.round(numberValue(scan.sodiumMg) / (targets.sodium / 100)),
        100,
      ),
    },
    {
      k: "Protein",
      v: numberValue(scan.proteinGrams),
      u: "g",
      pct: Math.min(
        Math.round(numberValue(scan.proteinGrams) / (targets.protein / 100)),
        100,
      ),
    },
    {
      k: "Fat",
      v: numberValue(scan.fatGrams),
      u: "g",
      pct: Math.min(Math.round(numberValue(scan.fatGrams) / (65 / 100)), 100),
    },
    {
      k: "Sugar",
      v: numberValue(scan.sugarGrams),
      u: "g",
      pct: Math.min(
        Math.round(numberValue(scan.sugarGrams) / (targets.sugar / 100)),
        100,
      ),
    },
    {
      k: "Fiber",
      v: numberValue(scan.fiberGrams),
      u: "g",
      pct: Math.min(Math.round(numberValue(scan.fiberGrams) / (28 / 100)), 100),
    },
  ];
  const tone = scoreTone(scan.score);
  const pillTone = { green: "green", amber: "amber", red: "red" }[tone];

  return (
    <Modal
      title={scan.productName}
      subtitle={`${scan.brand ?? ""} · ${formatDate(scan.createdAt)}`}
      width="max-w-[480px]"
      onClose={onClose}
    >
      <div className="flex items-center gap-4 mb-5">
        <div className="w-14 h-14 rounded-xl bg-brand-50 ring-1 ring-brand-100 grid place-items-center shrink-0">
          <Orange size={22} className="text-brand-500" />
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <Support level={scan.supportLevel} />
            <Pill tone={pillTone} className="!normal-case !tracking-normal">
              Score {scan.score}
            </Pill>
            <span className="text-[12px] text-slate-500">{scan.foodType}</span>
          </div>
          {scan.variant && (
            <div className="text-[12px] text-slate-500 mt-1">
              {scan.variant}
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mb-5">
        {macros.map((macro) => (
          <div
            key={macro.k}
            className="rounded-xl bg-slate-50 ring-1 ring-slate-200 p-3"
          >
            <div className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold mb-1">
              {macro.k}
            </div>
            <div className="font-display text-[18px] text-slate-900 leading-none">
              {macro.v}
              <span className="text-[11px] text-slate-400 ml-1">{macro.u}</span>
            </div>
            <div className="mt-2">
              <Bar
                value={macro.pct}
                tone={
                  macro.pct > 80 ? "red" : macro.pct > 50 ? "amber" : "brand"
                }
              />
            </div>
          </div>
        ))}
      </div>

      {scan.notes?.length > 0 && (
        <div className="space-y-2 mb-4">
          {scan.notes.map((note, index) => {
            const cls =
              {
                red: "bg-red-50 ring-red-100 text-red-700",
                amber: "bg-amber-50 ring-amber-100 text-amber-800",
                slate: "bg-slate-100 ring-slate-200 text-slate-700",
              }[note.tone] ?? "bg-slate-100 ring-slate-200 text-slate-700";
            return (
              <div key={index} className={`rounded-xl ring-1 p-3 ${cls}`}>
                <div className="font-semibold text-[13px] mb-0.5">
                  {note.label}
                </div>
                <div className="text-[12px] opacity-80">{note.detail}</div>
              </div>
            );
          })}
        </div>
      )}

      {scan.wellnessImpact && (
        <div className="rounded-xl bg-brand-50 ring-1 ring-brand-100 p-3 flex gap-2.5">
          <Sparkle size={14} className="text-brand-600 shrink-0 mt-0.5" />
          <p className="text-[13px] text-slate-700 leading-snug">
            {scan.wellnessImpact}
          </p>
        </div>
      )}
    </Modal>
  );
}
