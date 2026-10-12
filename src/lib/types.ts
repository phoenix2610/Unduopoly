export type Paise = number;

export type OrderKind = "pickup" | "dine_in" | "booking";

export const isTableKind = (kind: OrderKind) => kind !== "pickup";

export type OrderStatus = "new" | "cooking" | "ready" | "done" | "cancelled";

export interface MenuCategory {
  id: string;
  name: string;
}

export interface Photo {
  src: string;
  width: number;
  height: number;
  blur: string;
  alt: string;
  credit?: string;
  creditUrl?: string;
  sourceUrl?: string;
}

export interface MenuItem {
  id: string;
  categoryId: string;
  name: string;
  description?: string;
  pricePaise: Paise;
  veg: boolean;
  available: boolean;
  photo?: Photo;
  bestseller?: boolean;
  portion?: string;
}

export interface DiningTable {
  id: string;
  label: string;
  seats: number;
  qrToken: string;
}

export interface Restaurant {
  slug: string;
  name: string;
  area: string;
  phone: string;
  accent: string;
  cover?: Photo;
  demo?: boolean;
  opensAt: number;
  closesAt: number;
  slotMinutes: number;
  leadMinutes: number;
  maxPickupsPerSlot: number;
  diningMinutes: number;
  cancelCutoffMinutes: number;
  platformFeePaise: Paise;
  categories: MenuCategory[];
  items: MenuItem[];
  tables: DiningTable[];
}

export interface OrderLine {
  itemId: string;
  name: string;
  pricePaise: Paise;
  veg: boolean;
  qty: number;
}

export interface Order {
  id: string;
  code: string;
  token: string;
  slug: string;
  kind: OrderKind;
  slotStart: string;
  partySize?: number;
  tableId?: string;
  customerName: string;
  phone: string;
  lines: OrderLine[];
  subtotalPaise: Paise;
  gatewayPaise: Paise;
  totalPaise: Paise;
  platformFeePaise: Paise;
  status: OrderStatus;
  createdAt: string;
  acceptedAt?: string;
  readyAt?: string;
  doneAt?: string;
  cancelledAt?: string;
  arrivedAt?: string;
  arrivedTableId?: string;
}

export interface PublicOrder {
  id: string;
  code: string;
  kind: OrderKind;
  slotStart: string;
  partySize?: number;
  tableLabel?: string;
  customerName: string;
  lines: OrderLine[];
  subtotalPaise: Paise;
  gatewayPaise: Paise;
  totalPaise: Paise;
  status: OrderStatus;
  createdAt: string;
  acceptedAt?: string;
  readyAt?: string;
  doneAt?: string;
  arrivedAt?: string;
  arrivedTableLabel?: string;
  canCancelUntil: string;
  reviewed?: boolean;
}

export interface BoardOrder extends PublicOrder {
  phone: string;
  platformFeePaise: Paise;
}

export interface Slot {
  start: string;
  available: boolean;
}

export interface Review {
  id: string;
  slug: string;
  orderId?: string;
  name: string;
  rating: 1 | 2 | 3 | 4 | 5;
  text?: string;
  kind: OrderKind;
  itemIds: string[];
  createdAt: string;
}

export interface ReviewSummary {
  average: number;
  count: number;
  histogram: [number, number, number, number, number];
}
