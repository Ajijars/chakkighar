import { z } from "zod"
import type { OrderStatus } from "@/lib/types"
import { prisma } from "@/lib/prisma"
import { requireSession } from "@/lib/auth"
import { serializeOrder } from "@/lib/serializers"
import { json, error } from "@/lib/api-utils"

const schema = z.object({
  status: z.enum(["out_for_delivery", "delivered"]),
})

const statusMap: Record<string, OrderStatus> = {
  out_for_delivery: "OUT_FOR_DELIVERY",
  delivered: "DELIVERED",
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireSession(["DELIVERY"])
  if (!session) return error("Unauthorized", 401)

  const { id } = await params
  const body = await req.json().catch(() => null)
  const parsed = schema.safeParse(body)
  if (!parsed.success) return error("Invalid status")

  const rider = await prisma.deliveryPartner.findUnique({ where: { userId: session.userId } })
  if (!rider) return error("Not found", 404)

  const order = await prisma.order.findFirst({
    where: { OR: [{ displayId: id }, { id }], riderId: rider.id },
  })
  if (!order) return error("Order not found", 404)

  const newStatus = statusMap[parsed.data.status]

  const updated = await prisma.order.update({
    where: { id: order.id },
    data: {
      status: newStatus,
      ...(newStatus === "DELIVERED"
        ? { paymentStatus: order.paymentMethod === "CASH" ? "PAID" : order.paymentStatus }
        : {}),
    },
    include: { items: true, mill: true, customer: true, rider: { include: { user: true } } },
  })

  if (newStatus === "DELIVERED") {
    await prisma.deliveryPartner.update({
      where: { id: rider.id },
      data: { trips: { increment: 1 } },
    })
  }

  return json({ order: serializeOrder(updated) })
}
