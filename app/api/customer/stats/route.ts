import { prisma } from "@/lib/prisma"
import { requireSession } from "@/lib/auth"
import { json, error } from "@/lib/api-utils"

export async function GET() {
  const session = await requireSession(["CUSTOMER"])
  if (!session) return error("Unauthorized", 401)

  const orders = await prisma.order.findMany({
    where: { customerId: session.userId },
    include: { items: true },
  })

  const orderCount = orders.length
  const kgMilled = orders.reduce(
    (s, o) => s + o.items.reduce((a, i) => a + i.quantityKg, 0),
    0,
  )
  const uniqueMills = new Set(orders.map((o) => o.millId)).size

  const addresses = await prisma.address.count({ where: { userId: session.userId } })

  return json({
    orderCount,
    kgMilled: Math.round(kgMilled),
    uniqueMills,
    addressCount: addresses,
  })
}
