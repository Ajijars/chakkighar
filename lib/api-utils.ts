import { NextResponse } from "next/server"
import type { GrindTexture, OrderStatus, GrainCategory, PaymentMethod } from "@/lib/types"

export function json<T>(data: T, status = 200) {
  return NextResponse.json(data, { status })
}

export function error(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status })
}

export function toOrderStatusLabel(status: OrderStatus): string {
  const map: Record<OrderStatus, string> = {
    PLACED: "Order Placed",
    ACCEPTED: "Accepted",
    GRINDING: "Grinding",
    READY: "Ready for Pickup",
    PICKED_UP: "Picked Up",
    OUT_FOR_DELIVERY: "Out for Delivery",
    DELIVERED: "Delivered",
    CANCELLED: "Cancelled",
  }
  return map[status]
}

export function textureToClient(t: GrindTexture): "fine" | "medium" | "coarse" {
  return t.toLowerCase() as "fine" | "medium" | "coarse"
}

export function textureFromClient(t: string): GrindTexture {
  return t.toUpperCase() as GrindTexture
}

export function categoryToClient(c: GrainCategory): string {
  return c.toLowerCase()
}

export function paymentToClient(p: PaymentMethod): "cash" | "upi" {
  return p.toLowerCase() as "cash" | "upi"
}

export function relativeTime(date: Date): string {
  const mins = Math.floor((Date.now() - date.getTime()) / 60000)
  if (mins < 1) return "Just now"
  if (mins < 60) return `${mins} min${mins > 1 ? "s" : ""} ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs} hour${hrs > 1 ? "s" : ""} ago`
  return `${Math.floor(hrs / 24)} day${hrs >= 48 ? "s" : ""} ago`
}
