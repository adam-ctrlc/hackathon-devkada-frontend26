export function BrandName({ className = "" }) {
  return (
    <span className={`inline-flex items-center leading-none ${className}`}>
      <span className="font-brand-kain text-brand-600">Kain</span>
      <span className="font-brand-wise -ml-[0.18em] translate-y-[0.03em] text-[1.18em] tracking-normal">
        Wise
      </span>
    </span>
  );
}
