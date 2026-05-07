export function Input({ className = "", ...props }) {
  return (
    <input
      {...props}
      className={`w-full h-10 px-3.5 rounded-lg bg-white ring-1 ring-slate-200 focus:ring-2 focus:ring-brand-500 outline-none text-[14px] ${className}`}
    />
  );
}

export { Select } from "../Select.jsx";

export function Field({ label, hint, children, className = "" }) {
  return (
    <label className={`block ${className}`}>
      <div className="flex items-baseline justify-between mb-1.5">
        <span className="text-[12px] font-medium text-slate-700">{label}</span>
        {hint && <span className="text-[11px] text-slate-400">{hint}</span>}
      </div>
      {children}
    </label>
  );
}
