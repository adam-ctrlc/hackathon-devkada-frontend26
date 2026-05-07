import { forwardRef } from "react";
import { CaretDown } from "@phosphor-icons/react";

export const Select = forwardRef(function Select(
  { className = "", children, ...props },
  ref,
) {
  return (
    <div className="relative w-full">
      <select
        ref={ref}
        {...props}
        className={`w-full h-10 px-3.5 pr-10 rounded-lg bg-white ring-1 ring-slate-200 focus:ring-2 focus:ring-brand-500 outline-none text-[14px] appearance-none ${className}`}
      >
        {children}
      </select>
      <CaretDown
        size={14}
        className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400"
        weight="bold"
      />
    </div>
  );
});
