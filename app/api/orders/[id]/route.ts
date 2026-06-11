import { prisma } from "@/lib/prisma"
import { requireSession } from "@/lib/auth"
import { serializeOrder } from "@/lib/serializers"
import { json, error } from "@/lib/api-utils"

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const session = await requireSession()
  if (!session) return error("Unauthorized", 401)

  const order = await prisma.order.findFirst({
    where: {
      OR: [{ displayId: id }, { id }],
      ...(session.role === "CUSTOMER" ? { customerId: session.userId } : {}),
    },
    include: {
      items: true,
      mill: true,
      customer: true,
      rider: { include: { user: true } },
    },
  })
  if (!order) return error("Order not found", 404)

  return json({ order: serializeOrder(order) })
}
