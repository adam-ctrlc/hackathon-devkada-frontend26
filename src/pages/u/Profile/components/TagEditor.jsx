import { useState } from "react";
import { X, Plus } from "@phosphor-icons/react";

export function TagEditor({ tags, onAdd, onRemove, placeholder, colorClass }) {
  const [val, setVal] = useState("");
  const submit = () => {
    const t = val.trim();
    if (t && !tags.includes(t)) {
      onAdd(t);
      setVal("");
    }
  };
  return (
    <div className="flex flex-wrap gap-1.5 items-center">
      {tags.map((t) => (
        <span
          key={t}
          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[12px] font-medium ring-1 ${colorClass}`}
        >
          {t}
          <button
            onClick={() => onRemove(t)}
            className="hover:opacity-70 transition ml-0.5"
          >
            <X size={11} />
          </button>
        </span>
      ))}
      <div className="flex gap-1">
        <input
          value={val}
          onChange={(e) => setVal(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") submit();
          }}
          placeholder={placeholder}
          className="h-8 px-2.5 w-28 rounded-full ring-1 ring-dashed ring-slate-300 text-[12px] outline-none focus:ring-brand-400 focus:ring-solid bg-transparent placeholder:text-slate-400"
        />
        {val.trim() && (
          <button
            onClick={submit}
            className="w-8 h-8 rounded-full bg-brand-600 text-white grid place-items-center hover:bg-brand-700 transition"
          >
            <Plus size={12} />
          </button>
        )}
      </div>
    </div>
  );
}
