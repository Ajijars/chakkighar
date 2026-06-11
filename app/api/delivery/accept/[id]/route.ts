import { prisma } from "@/lib/prisma"
import { requireSession } from "@/lib/auth"
import { serializeOrder } from "@/lib/serializers"
import { json, error } from "@/lib/api-utils"

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireSession(["DELIVERY"])
  if (!session) return error("Unauthorized", 401)

  const { id } = await params
  const rider = await prisma.deliveryPartner.findUnique({ where: { userId: session.userId } })
  if (!rider) return error("Delivery profile not found", 404)
  if (!rider.isOnline) return error("Go online to accept jobs", 400)

  const active = await prisma.order.findFirst({
    where: {
      riderId: rider.id,
      status: { in: ["PICKED_UP", "OUT_FOR_DELIVERY"] },
    },
  })
  if (active) return error("Finish your active delivery first", 400)

  const order = await prisma.order.findFirst({
    where: { OR: [{ displayId: id }, { id }], status: "READY", riderId: null },
    include: { mill: true },
  })
  if (!order) return error("Job no longer available", 404)

  const updated = await prisma.order.update({
    where: { id: order.id },
    data: {
      riderId: rider.id,
      status: "PICKED_UP",
      riderLat: order.mill?.lat,
      riderLng: order.mill?.lng,
    },
    include: { items: true, mill: true, customer: true, rider: { include: { user: true } } },
  })

  return json({ order: serializeOrder(updated) })
}
