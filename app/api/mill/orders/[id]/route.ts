import { z } from "zod"
import type { OrderStatus } from "@/lib/types"
import { prisma } from "@/lib/prisma"
import { requireSession } from "@/lib/auth"
import { serializeOrder } from "@/lib/serializers"
import { json, error } from "@/lib/api-utils"
import { triggerOrderEvent } from "@/lib/pusher"

const schema = z.object({
  status: z.enum(["accepted", "grinding", "ready", "cancelled"]),
})

const statusMap: Record<string, OrderStatus> = {
  accepted: "ACCEPTED",
  grinding: "GRINDING",
  ready: "READY",
  cancelled: "CANCELLED",
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireSession(["MILL_OWNER"])
  if (!session) return error("Unauthorized", 401)

  const { id } = await params
  const body = await req.json().catch(() => null)
  const parsed = schema.safeParse(body)
  if (!parsed.success) return error("Invalid status")

  const mill = await prisma.mill.findUnique({ where: { ownerId: session.userId } })
  if (!mill) return error("Mill not found", 404)

  const order = await prisma.order.findFirst({
    where: { OR: [{ displayId: id }, { id }], millId: mill.id },
  })
  if (!order) return error("Order not found", 404)

  const updated = await prisma.order.update({
    where: { id: order.id },
    data: { status: statusMap[parsed.data.status] },
    include: { items: true, mill: true, customer: true, rider: { include: { user: true } } },
  })

  const serialized = serializeOrder(updated)

  // Push real-time status change to the customer tracking page
  await triggerOrderEvent(order.displayId, "status-update", {
    status: serialized.status,
  })

  return json({ order: serialized })
}
