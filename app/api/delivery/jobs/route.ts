import { prisma } from "@/lib/prisma"
import { requireSession } from "@/lib/auth"
import { haversineKm, isWithinRadius, MAX_RADIUS_KM } from "@/lib/geo"
import { serializeOrder } from "@/lib/serializers"
import { json, error } from "@/lib/api-utils"

const RIDER_BASE_PAY = 25

function riderPayout(deliveryFee: number) {
  return deliveryFee + RIDER_BASE_PAY
}

export async function GET() {
  const session = await requireSession(["DELIVERY"])
  if (!session) return error("Unauthorized", 401)

  const rider = await prisma.deliveryPartner.findUnique({ where: { userId: session.userId } })
  if (!rider) return error("Delivery profile not found", 404)

  const readyOrders = await prisma.order.findMany({
    where: { status: "READY", riderId: null },
    include: { items: true, mill: true, customer: true },
    orderBy: { placedAt: "asc" },
  })

  const riderLat = rider.currentLat ?? 18.5204
  const riderLng = rider.currentLng ?? 73.8567

  const jobs = readyOrders
    .filter((o) => {
      if (!o.mill) return false
      const tripKm = haversineKm(o.mill.lat, o.mill.lng, o.addressLat, o.addressLng)
      const maxKm = Math.min(o.mill.deliveryRadiusKm ?? MAX_RADIUS_KM, MAX_RADIUS_KM)
      return tripKm <= maxKm
    })
    .map((o) => {
      const tripKm = o.mill
        ? Math.round(haversineKm(o.mill.lat, o.mill.lng, o.addressLat, o.addressLng) * 10) / 10
        : 0
      const payout = riderPayout(o.deliveryFee)
      const serialized = serializeOrder({ ...o, rider: null })
      return { ...serialized, distanceKm: tripKm, payout }
    })

  const active = await prisma.order.findFirst({
    where: {
      riderId: rider.id,
      status: { in: ["PICKED_UP", "OUT_FOR_DELIVERY"] },
    },
    include: { items: true, mill: true, customer: true, rider: { include: { user: true } } },
  })

  const startOfDay = new Date()
  startOfDay.setHours(0, 0, 0, 0)

  const todayDelivered = await prisma.order.findMany({
    where: { riderId: rider.id, status: "DELIVERED", updatedAt: { gte: startOfDay } },
    select: { deliveryFee: true },
  })

  const earningsToday = todayDelivered.reduce((s, o) => s + riderPayout(o.deliveryFee), 0)

  return json({
    jobs,
    active: active ? { ...serializeOrder(active), payout: riderPayout(active.deliveryFee) } : null,
    online: rider.isOnline,
    earnings: earningsToday,
    completed: rider.trips,
    riderLat,
    riderLng,
  })
}
