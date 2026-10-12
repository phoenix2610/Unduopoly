const STAR = "M8 1.6l1.93 3.98 4.37.6-3.18 3.05.78 4.33L8 11.5l-3.9 2.06.78-4.33L1.7 6.18l4.37-.6L8 1.6z";

export function Star({ filled = true, className = "size-3.5" }: { filled?: boolean; className?: string }) {
  return (
    <svg viewBox="0 0 16 16" className={className} aria-hidden>
      <path d={STAR} fill={filled ? "currentColor" : "none"} stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round" />
    </svg>
  );
}

export function Stars({ rating, className = "size-3.5" }: { rating: number; className?: string }) {
  return (
    <span className="inline-flex gap-0.5 text-accent" role="img" aria-label={`${rating} out of 5 stars`}>
      {[1, 2, 3, 4, 5].map((n) => (
        <Star key={n} filled={n <= rating} className={className} />
      ))}
    </span>
  );
}
