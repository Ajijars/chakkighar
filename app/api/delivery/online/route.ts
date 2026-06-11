import { z } from "zod"
import type { Role } from "@/lib/types"
import { prisma } from "@/lib/prisma"
import { requireSession } from "@/lib/auth"
import { json, error } from "@/lib/api-utils"

const schema = z.object({ online: z.boolean() })

export async function PATCH(req: Request) {
  const session = await requireSession(["DELIVERY"])
  if (!session) return error("Unauthorized", 401)

  const body = await req.json().catch(() => null)
  const parsed = schema.safeParse(body)
  if (!parsed.success) return error("Invalid data")

  const rider = await prisma.deliveryPartner.update({
    where: { userId: session.userId },
    data: { isOnline: parsed.data.online },
  })

  return json({ online: rider.isOnline })
}
