export function Card({ className = "", children, as: As = "div", ...rest }) {
  return (
    <As
      className={`bg-white rounded-2xl border border-slate-200 ${className}`}
      {...rest}
    >
      {children}
    </As>
  );
}

export function Section({ eyebrow, title, action, children, className = "" }) {
  return (
    <section className={`mb-10 ${className}`}>
      <header className="flex items-end justify-between mb-4">
        <div>
          {eyebrow && (
            <div className="text-[11px] font-semibold tracking-[0.18em] uppercase text-brand-600 mb-2">
              {eyebrow}
            </div>
          )}
          {title && (
            <h2 className="font-display text-[26px] leading-[1.1] text-slate-900">
              {title}
            </h2>
          )}
        </div>
        {action}
      </header>
      {children}
    </section>
  );
}
