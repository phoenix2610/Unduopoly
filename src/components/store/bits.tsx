"use client";

export function DietMark({ veg, className = "" }: { veg: boolean; className?: string }) {
  const color = veg ? "var(--color-veg)" : "var(--color-nonveg)";
  return (
    <svg viewBox="0 0 14 14" width="14" height="14" className={`shrink-0 ${className}`} aria-label={veg ? "Veg" : "Non-veg"} role="img">
      <rect x="0.75" y="0.75" width="12.5" height="12.5" rx="1.5" fill="none" stroke={color} strokeWidth="1.5" />
      {veg ? <circle cx="7" cy="7" r="3.2" fill={color} /> : <path d="M7 3.6 10.4 9.8H3.6Z" fill={color} />}
    </svg>
  );
}

export function Stepper({
  qty,
  onChange,
  label,
  size = "md",
}: {
  qty: number;
  onChange: (qty: number) => void;
  label: string;
  size?: "sm" | "md";
}) {
  const h = size === "sm" ? "h-8" : "h-9";
  const w = size === "sm" ? "w-8" : "w-9";
  return (
    <div className={`inline-flex ${h} items-stretch rounded-md bg-accent text-accent-ink`} role="group" aria-label={label}>
      <button type="button" className={`press ${w} grid place-items-center rounded-l-md`} onClick={() => onChange(qty - 1)} aria-label={`One less ${label}`}>
        <Glyph d="M4 8h8" />
      </button>
      <span className="num grid min-w-6 place-items-center text-sm font-semibold" aria-live="polite">
        {qty}
      </span>
      <button type="button" className={`press ${w} grid place-items-center rounded-r-md`} onClick={() => onChange(qty + 1)} aria-label={`One more ${label}`}>
        <Glyph d="M4 8h8M8 4v8" />
      </button>
    </div>
  );
}

export function Glyph({ d, className = "" }: { d: string; className?: string }) {
  return (
    <svg viewBox="0 0 16 16" width="16" height="16" className={className} fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d={d} />
    </svg>
  );
}

export const glyphs = {
  back: "M10 3 5 8l5 5",
  next: "M6 3l5 5-5 5",
  check: "M3.5 8.5 6.5 11.5 12.5 4.5",
};
