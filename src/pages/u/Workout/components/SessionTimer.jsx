import { useState, useEffect, useRef } from "react";
import { Modal } from "../../../../components/ui/Modal.jsx";
import { Barbell, Stop, Play, Check } from "@phosphor-icons/react";
import {
  typeIcon,
  typeTone,
  typeLabel,
  fmtSecs,
} from "../../../../utils/workout.js";

export function SessionTimer({ session, onFinish, onCancel }) {
  const [secs, setSecs] = useState(0);
  const [running, setRunning] = useState(true);
  const intervalRef = useRef(null);

  useEffect(() => {
    intervalRef.current = setInterval(() => setSecs((s) => s + 1), 1000);
    return () => clearInterval(intervalRef.current);
  }, []);

  const toggle = () => {
    setRunning((r) => {
      if (r) {
        clearInterval(intervalRef.current);
      } else {
        intervalRef.current = setInterval(() => setSecs((s) => s + 1), 1000);
      }
      return !r;
    });
  };

  const finish = () => {
    clearInterval(intervalRef.current);
    onFinish(Math.max(1, Math.round(secs / 60)));
  };

  const Icon = typeIcon[session.type] ?? Barbell;
  const tone = typeTone[session.type] ?? "brand";
  const dotBg = {
    brand: "bg-brand-50 text-brand-600",
    green: "bg-emerald-50 text-emerald-600",
    amber: "bg-amber-50 text-amber-600",
  }[tone];

  return (
    <Modal width="max-w-[380px]" onClose={onCancel} noPadding>
      <div className="px-6 pt-8 pb-6 flex flex-col items-center gap-4">
        <div
          className={`w-16 h-16 rounded-2xl ${dotBg} grid place-items-center`}
        >
          <Icon size={28} />
        </div>
        <div className="text-center">
          <h2 className="font-display text-[22px] text-slate-900">
            {session.title}
          </h2>
          <div className="text-[13px] text-slate-500 mt-0.5">
            {typeLabel[session.type]} · {session.duration} min target
          </div>
        </div>
        <div className="font-mono text-[52px] font-bold text-slate-900 leading-none tabular-nums">
          {fmtSecs(secs)}
        </div>
        <div className="flex gap-3 w-full">
          <button
            onClick={toggle}
            className={`flex-1 h-11 rounded-xl font-medium text-[14px] flex items-center justify-center gap-2 transition
              ${
                running
                  ? "bg-amber-50 text-amber-700 ring-1 ring-amber-200 hover:bg-amber-100"
                  : "bg-brand-50 text-brand-700 ring-1 ring-brand-200 hover:bg-brand-100"
              }`}
          >
            {running ? (
              <>
                <Stop size={15} /> Pause
              </>
            ) : (
              <>
                <Play size={15} /> Resume
              </>
            )}
          </button>
          <button
            onClick={finish}
            className="flex-1 h-11 rounded-xl bg-brand-600 hover:bg-brand-700 text-white font-medium text-[14px] flex items-center justify-center gap-2 transition"
          >
            <Check size={15} /> Finish
          </button>
        </div>
        <button
          onClick={onCancel}
          className="text-[12px] text-slate-400 hover:text-slate-600 transition"
        >
          Cancel session
        </button>
      </div>
    </Modal>
  );
}
