import { useState } from "react";
import { Modal } from "../../../../components/ui/Modal.jsx";
import { CaretLeft, CaretRight } from "@phosphor-icons/react";
import { MONTHS, today } from "../../../../utils/calendar.js";

export function MonthPicker({ year, month, onChange, onClose }) {
  const [pickerYear, setPickerYear] = useState(year);
  return (
    <Modal title="Jump to month" width="max-w-[320px]" onClose={onClose}>
      <div className="flex items-center justify-between mb-4">
        <button
          onClick={() => setPickerYear((value) => value - 1)}
          className="w-8 h-8 rounded-lg bg-slate-50 ring-1 ring-slate-200 grid place-items-center text-slate-600 hover:bg-slate-100 transition"
        >
          <CaretLeft size={14} />
        </button>
        <span className="font-display text-[18px] text-slate-900">
          {pickerYear}
        </span>
        <button
          onClick={() => setPickerYear((value) => value + 1)}
          className="w-8 h-8 rounded-lg bg-slate-50 ring-1 ring-slate-200 grid place-items-center text-slate-600 hover:bg-slate-100 transition"
        >
          <CaretRight size={14} />
        </button>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
        {MONTHS.map((label, index) => {
          const isActive = pickerYear === year && index === month;
          const isFuture = new Date(pickerYear, index, 1) > today;
          return (
            <button
              key={label}
              disabled={isFuture}
              onClick={() => {
                onChange(pickerYear, index);
                onClose();
              }}
              className={`h-10 rounded-xl text-[13px] font-medium transition
                ${isActive ? "bg-brand-600 text-white" : isFuture ? "text-slate-300 cursor-not-allowed" : "bg-slate-50 text-slate-700 ring-1 ring-slate-200 hover:bg-brand-50 hover:text-brand-700"}`}
            >
              {label.slice(0, 3)}
            </button>
          );
        })}
      </div>
    </Modal>
  );
}
