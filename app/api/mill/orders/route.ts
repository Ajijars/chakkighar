import type { Role } from "@/lib/types"
import { prisma } from "@/lib/prisma"
import { requireSession } from "@/lib/auth"
import { serializeOrder, serializeMill } from "@/lib/serializers"
import { json, error } from "@/lib/api-utils"

export async function GET() {
  const session = await requireSession(["MILL_OWNER"])
  if (!session) return error("Unauthorized", 401)

  const mill = await prisma.mill.findUnique({ where: { ownerId: session.userId } })
  if (!mill) return json({ orders: [], mill: null, registered: false })

  const orders = await prisma.order.findMany({
    where: { millId: mill.id },
    include: { items: true, mill: true, customer: true, rider: { include: { user: true } } },
    orderBy: { placedAt: "desc" },
  })

  return json({
    orders: orders.map(serializeOrder),
    mill: serializeMill(mill),
    registered: true,
  })
}
