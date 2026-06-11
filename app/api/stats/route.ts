import { prisma } from "@/lib/prisma"
import { json } from "@/lib/api-utils"

export async function GET() {
  const [millCount, orderCount, mills] = await Promise.all([
    prisma.mill.count({ where: { isOpen: true } }),
    prisma.order.count({ where: { status: "DELIVERED" } }),
    prisma.mill.findMany({ select: { rating: true } }),
  ])

  const avgRating =
    mills.length > 0
      ? Math.round((mills.reduce((s, m) => s + m.rating, 0) / mills.length) * 10) / 10
      : 4.8

  return json({
    millCount,
    deliveredOrders: orderCount,
    avgRating,
    avgDeliveryMins: 28,
  })
}
