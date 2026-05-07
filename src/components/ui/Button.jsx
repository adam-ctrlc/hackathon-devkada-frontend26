export function Button({
  variant = "primary",
  size = "md",
  className = "",
  children,
  ...rest
}) {
  const variants = {
    primary: "bg-brand-600 hover:bg-brand-700 text-white",
    ghost: "bg-transparent hover:bg-slate-100 text-slate-700",
    line: "bg-white hover:bg-slate-50 text-slate-700 ring-1 ring-slate-200",
    soft: "bg-brand-50 hover:bg-brand-100 text-brand-700",
    dark: "bg-slate-900 hover:bg-slate-800 text-white",
  };
  const sizes = {
    sm: "h-8 px-3 text-[13px]",
    md: "h-10 px-4 text-sm",
    lg: "h-12 px-5 text-[15px]",
  };
  return (
    <button
      className={`inline-flex items-center justify-center gap-2 rounded-lg font-medium transition cursor-pointer ${variants[variant] ?? variants.primary} ${sizes[size] ?? sizes.md} ${className}`}
      {...rest}
    >
      {children}
    </button>
  );
}
