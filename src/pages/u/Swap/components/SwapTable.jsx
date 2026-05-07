import { Card } from "../../../../components/ui/Card.jsx";
import { Pill } from "../../../../components/ui/Pill.jsx";
import {
  ArrowRight,
  Check,
  X,
  Basket,
  Eye,
  ArrowsClockwise,
  CaretLeft,
  CaretRight,
} from "@phosphor-icons/react";
import { deltaColor, statusLabel } from "../../../../utils/swap.js";

export function SwapTable({
  rows,
  page,
  totalPages,
  totalRows,
  onPageChange,
  onView,
  onAccept,
  onDismiss,
  onRestore,
  mutatingIds = new Set(),
}) {
  const pageNumbers = Array.from(
    { length: totalPages },
    (_, index) => index + 1,
  );

  return (
    <Card className="p-0 overflow-hidden mb-8">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[920px] border-collapse">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200 text-left">
              {["Swap", "Why", "Impact", "Groceries", "Status", "Actions"].map(
                (heading) => (
                  <th
                    key={heading}
                    className="px-4 py-3 text-[10px] uppercase tracking-wider font-semibold text-slate-500"
                  >
                    {heading}
                  </th>
                ),
              )}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {rows.map((swap) => (
              <tr key={swap.id} className="align-top hover:bg-slate-50/70">
                <td className="px-4 py-4 w-[230px]">
                  <div className="text-[12px] text-slate-400 line-through truncate">
                    {swap.from}
                  </div>
                  <div className="mt-1 flex items-center gap-2">
                    <ArrowRight size={12} className="text-brand-500 shrink-0" />
                    <span className="font-display text-[15px] text-slate-900 leading-tight">
                      {swap.to}
                    </span>
                  </div>
                </td>
                <td className="px-4 py-4 max-w-[270px]">
                  <p className="text-[13px] text-slate-600 leading-snug line-clamp-3">
                    {swap.reason}
                  </p>
                </td>
                <td className="px-4 py-4 w-[210px]">
                  <div className="flex gap-1.5 flex-wrap">
                    {swap.delta.length ? (
                      swap.delta.slice(0, 3).map((delta) => (
                        <span
                          key={delta.k}
                          className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-medium ${deltaColor[delta.tone] ?? deltaColor.slate}`}
                        >
                          <span className="uppercase tracking-wider opacity-60">
                            {delta.k}
                          </span>
                          <span>{delta.v}</span>
                        </span>
                      ))
                    ) : (
                      <span className="text-[12px] text-slate-400">None</span>
                    )}
                  </div>
                </td>
                <td className="px-4 py-4 w-[210px]">
                  <div className="flex gap-1.5 flex-wrap">
                    {swap.groceries.length ? (
                      swap.groceries.slice(0, 4).map((item) => (
                        <span
                          key={item}
                          className="inline-flex items-center gap-1 rounded-full bg-slate-50 px-2 py-1 text-[11px] text-slate-600 ring-1 ring-slate-200"
                        >
                          <Basket size={10} /> {item}
                        </span>
                      ))
                    ) : (
                      <span className="text-[12px] text-slate-400">None</span>
                    )}
                  </div>
                </td>
                <td className="px-4 py-4 w-[120px]">
                  <Pill
                    tone={
                      swap.status === "accepted"
                        ? "green"
                        : swap.status === "dismissed"
                          ? "slate"
                          : "brand"
                    }
                    className="!normal-case !tracking-normal capitalize"
                  >
                    {statusLabel[swap.status] ?? swap.status}
                  </Pill>
                  <div className="mt-2 text-[11px] text-slate-500">
                    {swap.supportLevel ?? "Medium"} support
                  </div>
                </td>
                <td className="px-4 py-4 w-[170px]">
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => onView(swap)}
                      className="w-8 h-8 rounded-lg bg-white ring-1 ring-slate-200 text-slate-500 hover:text-brand-700 hover:ring-brand-200 hover:bg-brand-50 transition grid place-items-center"
                    >
                      <Eye size={14} />
                    </button>
                    {swap.status === "suggested" ? (
                      <>
                        <button
                          type="button"
                          disabled={mutatingIds.has(swap.id)}
                          onClick={() => onAccept(swap.id)}
                          className="w-8 h-8 rounded-lg bg-brand-600 text-white hover:bg-brand-700 transition grid place-items-center disabled:opacity-50 disabled:cursor-wait"
                        >
                          <Check size={14} />
                        </button>
                        <button
                          type="button"
                          disabled={mutatingIds.has(swap.id)}
                          onClick={() => onDismiss(swap.id)}
                          className="w-8 h-8 rounded-lg bg-white ring-1 ring-slate-200 text-slate-500 hover:text-red-600 hover:ring-red-100 hover:bg-red-50 transition grid place-items-center disabled:opacity-50 disabled:cursor-wait"
                        >
                          <X size={14} />
                        </button>
                      </>
                    ) : (
                      <button
                        type="button"
                        disabled={mutatingIds.has(swap.id)}
                        onClick={() => onRestore(swap.id)}
                        className="w-8 h-8 rounded-lg bg-white ring-1 ring-slate-200 text-slate-500 hover:text-brand-700 hover:ring-brand-200 hover:bg-brand-50 transition grid place-items-center disabled:opacity-50 disabled:cursor-wait"
                      >
                        <ArrowsClockwise size={14} />
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="px-4 py-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between gap-3">
        <div className="text-[12px] text-slate-500">
          Showing{" "}
          <span className="font-medium text-slate-900">{rows.length}</span> of{" "}
          <span className="font-medium text-slate-900">{totalRows}</span> swaps
        </div>
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            disabled={page <= 1}
            onClick={() => onPageChange(page - 1)}
            className="w-8 h-8 rounded-lg text-slate-500 hover:bg-white hover:text-slate-900 disabled:opacity-35 disabled:pointer-events-none transition grid place-items-center"
          >
            <CaretLeft size={13} />
          </button>
          {pageNumbers.map((pageNumber) => (
            <button
              key={pageNumber}
              type="button"
              onClick={() => onPageChange(pageNumber)}
              className={`min-w-8 h-8 px-2 rounded-lg text-[12px] font-semibold tabular-nums transition ${
                pageNumber === page
                  ? "bg-slate-900 text-white"
                  : "text-slate-500 hover:bg-white hover:text-slate-900"
              }`}
            >
              {pageNumber}
            </button>
          ))}
          <button
            type="button"
            disabled={page >= totalPages}
            onClick={() => onPageChange(page + 1)}
            className="w-8 h-8 rounded-lg text-slate-500 hover:bg-white hover:text-slate-900 disabled:opacity-35 disabled:pointer-events-none transition grid place-items-center"
          >
            <CaretRight size={13} />
          </button>
        </div>
      </div>
    </Card>
  );
}
