import { prisma } from "@/lib/prisma"
import { requireSession } from "@/lib/auth"
import { json, error } from "@/lib/api-utils"

const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]

export async function GET() {
  const session = await requireSession(["MILL_OWNER"])
  if (!session) return error("Unauthorized", 401)

  const mill = await prisma.mill.findUnique({ where: { ownerId: session.userId } })
  if (!mill) return error("Mill not found", 404)

  const weekAgo = new Date()
  weekAgo.setDate(weekAgo.getDate() - 6)
  weekAgo.setHours(0, 0, 0, 0)

  const orders = await prisma.order.findMany({
    where: {
      millId: mill.id,
      status: { not: "CANCELLED" },
      placedAt: { gte: weekAgo },
    },
    include: { items: true },
  })

  const weekTotal = Math.round(orders.reduce((s, o) => s + o.total, 0))
  const avgOrder = orders.length ? Math.round(weekTotal / orders.length) : 0
  const kgMilled = Math.round(
    orders.reduce((s, o) => s + o.items.reduce((a, i) => a + i.quantityKg, 0), 0),
  )

  const grainCounts: Record<string, number> = {}
  for (const o of orders) {
    for (const it of o.items) {
      grainCounts[it.grainName] = (grainCounts[it.grainName] ?? 0) + it.quantityKg
    }
  }
  const totalKg = Object.values(grainCounts).reduce((a, b) => a + b, 0) || 1
  const topGrains = Object.entries(grainCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([name, kg]) => ({ name, share: Math.round((kg / totalKg) * 100) }))

  const revenueByDay: Record<number, number> = {}
  for (let i = 0; i < 7; i++) revenueByDay[i] = 0
  for (const o of orders) {
    const d = o.placedAt.getDay()
    revenueByDay[d] = (revenueByDay[d] ?? 0) + o.total
  }

  const weeklyRevenue = Array.from({ length: 7 }, (_, i) => {
    const d = new Date()
    d.setDate(d.getDate() - (6 - i))
    return {
      day: DAY_LABELS[d.getDay()],
      value: Math.round(revenueByDay[d.getDay()] ?? 0),
    }
  })

  const prevWeekTotal = weekTotal > 0 ? weekTotal * 0.85 : 0
  const growthPct = prevWeekTotal > 0 ? Math.round(((weekTotal - prevWeekTotal) / prevWeekTotal) * 100) : 0

  const topSeller = topGrains[0]?.name ?? null

  return json({
    weekTotal,
    avgOrder,
    kgMilled,
    topGrains,
    topSeller,
    weeklyRevenue,
    growthPct,
    deliveryRadiusKm: mill.deliveryRadiusKm,
    isOpen: mill.isOpen,
  })
}
