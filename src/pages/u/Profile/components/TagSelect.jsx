import { useState } from "react";
import { X, Plus } from "@phosphor-icons/react";
import { Select } from "../../../../components/Select.jsx";

export function TagSelect({
  tags,
  onAdd,
  onRemove,
  options = [],
  colorClass,
  placeholder = "Select or type…",
  error,
  disabled = false,
}) {
  const [customVal, setCustomVal] = useState("");
  const available = options.filter((o) => !tags.includes(o));

  const addCustom = () => {
    const t = customVal.trim();
    if (t && !tags.includes(t)) {
      onAdd(t);
      setCustomVal("");
    }
  };

  return (
    <div className="space-y-2">
      {tags.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {tags.map((t) => (
            <span
              key={t}
              className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[12px] font-medium ring-1 ${colorClass} ${disabled ? "opacity-60" : ""}`}
            >
              {t}
              {!disabled && (
                <button
                  type="button"
                  onClick={() => onRemove(t)}
                  className="hover:opacity-70 transition ml-0.5"
                >
                  <X size={11} />
                </button>
              )}
            </span>
          ))}
        </div>
      )}

      {!disabled && (
        <>
          {available.length > 0 && (
            <Select
              value=""
              onChange={(e) => {
                if (e.target.value) onAdd(e.target.value);
              }}
            >
              <option value="">{placeholder}</option>
              {available.map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </Select>
          )}

          <div className="flex gap-1.5">
            <input
              value={customVal}
              onChange={(e) => setCustomVal(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && addCustom()}
              placeholder="Or type custom…"
              className="flex-1 h-9 px-3 rounded-lg ring-1 ring-dashed ring-slate-300 text-[13px] outline-none focus:ring-brand-400 bg-transparent placeholder:text-slate-400"
            />
            {customVal.trim() && (
              <button
                type="button"
                onClick={addCustom}
                className="w-9 h-9 rounded-lg bg-brand-600 text-white grid place-items-center hover:bg-brand-700 transition shrink-0"
              >
                <Plus size={13} />
              </button>
            )}
          </div>
        </>
      )}

      {error && (
        <p className="text-[11px] text-red-600 font-medium flex items-start gap-1">
          <span className="mt-px shrink-0">✕</span>
          {error}
        </p>
      )}
    </div>
  );
}
