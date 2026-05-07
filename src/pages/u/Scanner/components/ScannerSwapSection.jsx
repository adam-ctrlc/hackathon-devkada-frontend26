import { useState } from "react";
import { Button } from "../../../../components/ui/Button.jsx";
import { Support } from "../../../../components/ui/Pill.jsx";
import { ArrowRight, Check } from "@phosphor-icons/react";

export function ScannerSwapSection({
  suggestion,
  result,
  scoreReasons = [],
  saving = false,
  onAccept,
  onDismiss,
}) {
  const [activeTab, setActiveTab] = useState("overview");
  if (!suggestion) return null;

  return (
    <div className="border-t border-slate-200 bg-white">
      <div className="p-6">
        <div className="mb-4">
          <div>
            <div className="text-[11px] uppercase tracking-wider text-brand-600 font-semibold mb-1">
              Suggested swap
            </div>
            <h3 className="font-display text-[21px] leading-tight text-slate-900">
              A next-time option for this scan
            </h3>
            <p className="mt-1 text-[13px] text-slate-500">
              Review the swap, score context, and ingredients before saving the
              follow-up plan.
            </p>
          </div>
        </div>

        <div className="border-b border-slate-200 bg-slate-50 -mx-6 px-6">
          {[
            ["overview", "Overview"],
            ["why", "Why this score"],
            ["ingredients", "Ingredients"],
          ].map(([key, label]) => (
            <button
              key={key}
              type="button"
              onClick={() => setActiveTab(key)}
              className={`h-11 px-4 text-[13px] font-medium border-b-2 -mb-px transition ${
                activeTab === key
                  ? "border-brand-600 text-brand-700"
                  : "border-transparent text-slate-500 hover:text-slate-700"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {activeTab === "overview" && (
          <div className="mt-5 rounded-2xl bg-slate-50 ring-1 ring-slate-200 p-4">
            <div className="flex items-center justify-between gap-3 mb-3">
              <div className="text-[11px] uppercase tracking-wider text-slate-500 font-semibold">
                Swap recommendation
              </div>
              <div className="flex shrink-0 justify-end gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={saving}
                  onClick={onDismiss}
                >
                  Dismiss
                </Button>
                <Button
                  variant="primary"
                  size="sm"
                  disabled={saving}
                  onClick={onAccept}
                >
                  <Check size={13} />
                  {saving ? "Saving..." : "Save next-time plan"}
                </Button>
              </div>
            </div>
            <div className="flex items-center gap-3 flex-wrap">
              <span className="text-[14px] text-slate-500 line-through">
                {suggestion.from}
              </span>
              <ArrowRight size={14} className="text-brand-500" />
              <span className="font-display text-[22px] text-slate-900">
                {suggestion.to}
              </span>
            </div>
            <p className="mt-3 text-[13.5px] text-slate-600 leading-snug">
              {suggestion.reason}
            </p>
            <div className="mt-4 flex gap-2 flex-wrap">
              {suggestion.delta.map((item) => (
                <span
                  key={item.k}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-white px-2.5 py-1.5 text-[12px] font-medium text-slate-700 ring-1 ring-slate-200"
                >
                  <span className="text-[10px] uppercase tracking-wider text-slate-400">
                    {item.k}
                  </span>
                  {item.v}
                </span>
              ))}
            </div>
          </div>
        )}

        {activeTab === "why" && (
          <div className="mt-5 rounded-2xl bg-white ring-1 ring-slate-200 p-5">
            <div className="flex items-start justify-between gap-4 pb-4 border-b border-slate-100">
              <div>
                <div className="text-[13px] font-semibold text-slate-900">
                  Score: {result?.score ?? suggestion.aiPayload?.score ?? "-"}
                  /100
                </div>
                <p className="mt-1 text-[13px] text-slate-600 leading-snug">
                  {result?.wellnessImpact ?? suggestion.reason}
                </p>
              </div>
              <Support
                level={
                  result?.supportLevel ?? suggestion.aiPayload?.supportLevel
                }
                showDot={false}
              />
            </div>
            {scoreReasons.length ? (
              <ul className="pt-4 divide-y divide-slate-100">
                {scoreReasons.map((reason) => (
                  <li
                    key={reason.label}
                    className="flex gap-3 py-3 first:pt-0 last:pb-0"
                  >
                    <span className="mt-1.5 h-2 w-2 rounded-full bg-brand-500 shrink-0" />
                    <div>
                      <div className="text-[13px] font-semibold text-slate-900">
                        {reason.label}
                      </div>
                      <p className="mt-0.5 text-[12.5px] text-slate-600 leading-snug">
                        {reason.detail}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="pt-4 text-[13px] text-slate-500">
                No score factors were saved for this scan.
              </p>
            )}
          </div>
        )}

        {activeTab === "ingredients" && (
          <div className="mt-5 rounded-2xl bg-white ring-1 ring-slate-200 p-5">
            <div className="text-[11px] uppercase tracking-wider text-slate-500 font-semibold mb-3">
              Ingredients
            </div>
            <p className="text-[14px] text-slate-700 leading-relaxed">
              {result?.ingredients ??
                "The exact recipe is not public, so KainWise could not infer the ingredient list yet."}
            </p>
            {result?.betterAlternatives?.length > 0 && (
              <div className="mt-5 border-t border-slate-100 pt-4">
                <div className="text-[11px] uppercase tracking-wider text-slate-500 font-semibold mb-2">
                  Saved alternatives
                </div>
                <div className="flex flex-wrap gap-2">
                  {result.betterAlternatives.map((item) => (
                    <span
                      key={item}
                      className="rounded-full bg-brand-50 px-3 py-1 text-[12px] font-medium text-brand-700 ring-1 ring-brand-100"
                    >
                      {item}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
