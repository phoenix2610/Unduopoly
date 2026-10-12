"use client";

import type { OrderKind } from "@/lib/types";
import { useStore } from "./store-provider";

const TABLE_OPTIONS: Array<{ kind: OrderKind; title: string; hint: string }> = [
  { kind: "dine_in", title: "Table + food", hint: "Pre-order, served as you sit" },
  { kind: "booking", title: "Just the table", hint: "Order and pay there" },
];

export function ModeChooser() {
  const { cart, setKind, itemCount } = useStore();
  const table = cart.kind !== "pickup";

  return (
    <div>
      <div className="grid grid-cols-2 gap-1 rounded-lg bg-rail p-1" role="radiogroup" aria-label="How you're eating">
        {[
          { on: !table, label: "Pickup", pick: () => setKind("pickup") },
          { on: table, label: "Book a table", pick: () => !table && setKind(itemCount > 0 ? "dine_in" : "booking") },
        ].map((o) => (
          <button
            key={o.label}
            type="button"
            role="radio"
            aria-checked={o.on}
            onClick={o.pick}
            className={`press h-9 rounded-md text-[15px] font-semibold ${o.on ? "bg-paper shadow-[0_1px_2px_rgb(20_21_23/0.12)]" : "text-ink-2"}`}
          >
            {o.label}
          </button>
        ))}
      </div>

      {table ? (
        <div className="mt-2 grid grid-cols-2 gap-2" role="radiogroup" aria-label="Table options">
          {TABLE_OPTIONS.map((o) => {
            const on = cart.kind === o.kind;
            return (
              <button
                key={o.kind}
                type="button"
                role="radio"
                aria-checked={on}
                onClick={() => setKind(o.kind)}
                className={`press rounded-lg border-[1.5px] px-3 py-2 text-left ${on ? "border-accent bg-paper" : "border-line text-ink-2"}`}
              >
                <span className="flex items-center gap-2">
                  <span aria-hidden className={`grid size-3.5 shrink-0 place-items-center rounded-full border-[1.5px] ${on ? "border-accent" : "border-ink-3"}`}>
                    {on && <span className="size-1.5 rounded-full bg-accent" />}
                  </span>
                  <span className={`text-sm font-semibold ${on ? "text-ink" : ""}`}>{o.title}</span>
                </span>
                <span className="mt-0.5 block pl-[22px] text-xs leading-snug text-ink-2">{o.hint}</span>
              </button>
            );
          })}
        </div>
      ) : (
        <p className="mt-2 px-1 text-xs text-ink-2">Pick a time. It&apos;s packed and waiting when you walk in.</p>
      )}
    </div>
  );
}
