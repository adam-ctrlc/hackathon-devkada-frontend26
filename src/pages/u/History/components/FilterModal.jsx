import { useState } from "react";
import { Modal } from "../../../../components/ui/Modal.jsx";
import { Button } from "../../../../components/ui/Button.jsx";
import { Check } from "@phosphor-icons/react";

export function FilterModal({ filters, onChange, onClose }) {
  const [local, setLocal] = useState(filters);
  const apply = () => {
    onChange(local);
    onClose();
  };
  const reset = () => {
    onChange({ support: "All", minScore: "", maxScore: "" });
    onClose();
  };

  return (
    <Modal
      title="Filter scans"
      width="max-w-[360px]"
      onClose={onClose}
      footer={
        <div className="flex justify-between">
          <Button variant="ghost" size="sm" onClick={reset}>
            Reset
          </Button>
          <Button variant="primary" size="sm" onClick={apply}>
            <Check size={13} /> Apply
          </Button>
        </div>
      }
    >
      <div className="space-y-4">
        <div>
          <label className="text-[11px] uppercase tracking-wider text-slate-500 font-semibold block mb-2">
            Support level
          </label>
          <div className="flex gap-2 flex-wrap">
            {["All", "High", "Medium", "Low"].map((level) => (
              <button
                key={level}
                onClick={() =>
                  setLocal((filters) => ({ ...filters, support: level }))
                }
                className={`h-8 px-3 rounded-full text-[12px] font-medium transition
                  ${local.support === level ? "bg-slate-900 text-white" : "bg-slate-50 ring-1 ring-slate-200 text-slate-700 hover:bg-slate-100"}`}
              >
                {level}
              </button>
            ))}
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="text-[11px] uppercase tracking-wider text-slate-500 font-semibold block mb-1.5">
              Min score
            </label>
            <input
              type="number"
              min="0"
              max="100"
              value={local.minScore}
              onChange={(event) =>
                setLocal((filters) => ({
                  ...filters,
                  minScore: event.target.value,
                }))
              }
              placeholder="0"
              className="w-full h-9 px-3 rounded-lg bg-slate-50 ring-1 ring-slate-200 text-[13px] outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>
          <div>
            <label className="text-[11px] uppercase tracking-wider text-slate-500 font-semibold block mb-1.5">
              Max score
            </label>
            <input
              type="number"
              min="0"
              max="100"
              value={local.maxScore}
              onChange={(event) =>
                setLocal((filters) => ({
                  ...filters,
                  maxScore: event.target.value,
                }))
              }
              placeholder="100"
              className="w-full h-9 px-3 rounded-lg bg-slate-50 ring-1 ring-slate-200 text-[13px] outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>
        </div>
      </div>
    </Modal>
  );
}
