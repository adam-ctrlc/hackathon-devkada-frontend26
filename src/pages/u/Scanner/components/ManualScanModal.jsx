import { Modal } from "../../../../components/ui/Modal.jsx";
import { Button } from "../../../../components/ui/Button.jsx";
import { Sparkle } from "@phosphor-icons/react";

export function ManualScanModal({
  value,
  onChange,
  onSubmit,
  onClose,
  error = "",
  searching = false,
}) {
  const trimmed = value.trim();

  return (
    <Modal
      title="No barcode?"
      subtitle="Tell KainWise what you ate and we'll analyse it like a scan."
      width="max-w-[520px]"
      onClose={searching ? () => {} : onClose}
      footer={
        <div className="flex justify-start sm:justify-end gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            disabled={searching}
          >
            Cancel
          </Button>
          <Button
            variant="primary"
            size="sm"
            disabled={!trimmed || searching}
            onClick={onSubmit}
          >
            <Sparkle size={13} />
            {searching ? "Finding this food you ate..." : "Find this food"}
          </Button>
        </div>
      }
    >
      <div>
        <label className="text-[11px] uppercase tracking-wider text-slate-500 font-semibold block mb-1.5">
          What did you eat?
        </label>
        <textarea
          value={value}
          onChange={(event) => onChange(event.target.value)}
          disabled={searching}
          rows={4}
          placeholder="e.g. Vitamilk, tuna rice, chicken adobo, banana cue"
          className="w-full px-3 py-2.5 rounded-xl bg-slate-50 ring-1 ring-slate-200 text-[14px] outline-none focus:ring-2 focus:ring-brand-500 resize-none disabled:opacity-60"
        />
        <p className="mt-2 text-[12px] text-slate-500 leading-snug">
          Add a brand, portion, or flavor if you know it. Short entries are
          fine.
        </p>
        {error && (
          <div className="mt-3 rounded-xl bg-red-50 ring-1 ring-red-100 px-3 py-2 text-[12.5px] text-red-700 leading-snug">
            {error}
          </div>
        )}
      </div>
    </Modal>
  );
}
