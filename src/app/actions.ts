"use server";

import {
  advanceOrder,
  cancelOrder,
  checkIn,
  findOrderByCode,
  placeOrder,
  type PlaceOrderInput,
} from "@/lib/orders";
import { addReview } from "@/lib/reviews";
import type { OrderStatus } from "@/lib/types";

export async function placeOrderAction(input: PlaceOrderInput) {
  return placeOrder(input);
}

export async function cancelOrderAction(id: string, token: string) {
  return cancelOrder(id, token);
}

export async function checkInAction(slug: string, id: string, token: string, tableToken?: string) {
  return checkIn(slug, id, token, tableToken);
}

export async function findOrderAction(slug: string, code: string, phoneLast4: string) {
  if (!/^\d{4}$/.test(phoneLast4.trim())) return null;
  return findOrderByCode(slug, code, phoneLast4);
}

export async function advanceOrderAction(slug: string, id: string, from: OrderStatus) {
  return advanceOrder(slug, id, from);
}

export async function addReviewAction(orderId: string, token: string, rating: number, text: string) {
  return addReview(orderId, token, rating, text);
}
