import { Modal } from "../../../../components/ui/Modal.jsx";
import { Button } from "../../../../components/ui/Button.jsx";
import { Pill } from "../../../../components/ui/Pill.jsx";
import {
  ArrowRight,
  Check,
  X,
  Basket,
  ArrowsClockwise,
} from "@phosphor-icons/react";
import { deltaColor, statusLabel } from "../../../../utils/swap.js";

export function SwapDetailModal({
  swap,
  onClose,
  onAccept,
  onDismiss,
  onRestore,
}) {
  if (!swap) return null;

  return (
    <Modal
      title="Swap details"
      subtitle={`${swap.from} -> ${swap.to}`}
      width="max-w-[680px]"
      onClose={onClose}
      footer={
        <div className="flex items-center justify-end gap-2">
          <Button variant="ghost" size="sm" onClick={onClose}>
            Close
          </Button>
          {swap.status === "suggested" ? (
            <>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  onDismiss(swap.id);
                  onClose();
                }}
              >
                <X size={13} /> Dismiss
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={() => {
                  onAccept(swap.id);
                  onClose();
                }}
              >
                <Check size={13} /> Save next-time plan
              </Button>
            </>
          ) : (
            <Button
              variant="line"
              size="sm"
              onClick={() => {
                onRestore(swap.id);
                onClose();
              }}
            >
              <ArrowsClockwise size={13} /> Restore
            </Button>
          )}
        </div>
      }
    >
      <div className="space-y-5">
        <div className="rounded-2xl bg-slate-50 ring-1 ring-slate-200 p-4">
          <div className="text-[11px] uppercase tracking-wider text-slate-500 font-semibold mb-2">
            Recommended swap
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            <span className="text-[14px] text-slate-500 line-through">
              {swap.from}
            </span>
            <ArrowRight size={14} className="text-brand-500" />
            <span className="font-display text-[22px] text-slate-900">
              {swap.to}
            </span>
          </div>
          <p className="text-[14px] text-slate-600 leading-snug mt-3">
            {swap.reason}
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <div className="text-[11px] uppercase tracking-wider text-slate-500 font-semibold mb-2">
              Impact
            </div>
            <div className="flex gap-2 flex-wrap">
              {swap.delta.length ? (
                swap.delta.map((delta) => (
                  <span
                    key={delta.k}
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[13px] font-medium ${deltaColor[delta.tone] ?? deltaColor.slate}`}
                  >
                    <span className="text-[11px] uppercase tracking-wider opacity-60">
                      {delta.k}
                    </span>
                    <span>{delta.v}</span>
                  </span>
                ))
              ) : (
                <span className="text-[13px] text-slate-500">
                  No impact details saved.
                </span>
              )}
            </div>
          </div>
          <div>
            <div className="text-[11px] uppercase tracking-wider text-slate-500 font-semibold mb-2">
              Groceries
            </div>
            <div className="flex gap-1.5 flex-wrap">
              {swap.groceries.length ? (
                swap.groceries.map((item) => (
                  <span
                    key={item}
                    className="inline-flex items-center gap-1 rounded-full bg-slate-50 px-2.5 py-1 text-[12px] text-slate-600 ring-1 ring-slate-200"
                  >
                    <Basket size={11} /> {item}
                  </span>
                ))
              ) : (
                <span className="text-[13px] text-slate-500">
                  No grocery items saved.
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
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
          <Pill tone="slate" className="!normal-case !tracking-normal">
            {swap.supportLevel ?? "Medium"} support
          </Pill>
        </div>
      </div>
    </Modal>
  );
}
