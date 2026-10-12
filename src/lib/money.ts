import type { Paise } from "./types";

export const GATEWAY_RATE_BPS = 200;

export function gatewayCharge(subtotal: Paise): Paise {
  return Math.round((subtotal * GATEWAY_RATE_BPS) / 10_000);
}

const whole = new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 });
const exact = new Intl.NumberFormat("en-IN", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

export function rupees(paise: Paise): string {
  const fmt = paise % 100 === 0 ? whole : exact;
  return `₹${fmt.format(paise / 100)}`;
}
