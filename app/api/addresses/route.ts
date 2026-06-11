import { z } from "zod"
import type { Role } from "@/lib/types"
import { prisma } from "@/lib/prisma"
import { requireSession } from "@/lib/auth"
import { json, error } from "@/lib/api-utils"

export async function GET() {
  const session = await requireSession(["CUSTOMER"])
  if (!session) return error("Unauthorized", 401)

  const addresses = await prisma.address.findMany({
    where: { userId: session.userId },
    orderBy: { isDefault: "desc" },
  })
  return json({ addresses })
}

const createSchema = z.object({
  label: z.string(),
  line1: z.string(),
  lat: z.number(),
  lng: z.number(),
  isDefault: z.boolean().optional(),
})

export async function POST(req: Request) {
  const session = await requireSession(["CUSTOMER"])
  if (!session) return error("Unauthorized", 401)

  const body = await req.json().catch(() => null)
  const parsed = createSchema.safeParse(body)
  if (!parsed.success) return error("Invalid address")

  if (parsed.data.isDefault) {
    await prisma.address.updateMany({
      where: { userId: session.userId },
      data: { isDefault: false },
    })
  }

  const address = await prisma.address.create({
    data: { userId: session.userId, ...parsed.data },
  })

  return json({ address }, 201)
}

const patchSchema = z.object({
  id: z.string(),
  isDefault: z.boolean(),
})

export async function PATCH(req: Request) {
  const session = await requireSession(["CUSTOMER"])
  if (!session) return error("Unauthorized", 401)

  const body = await req.json().catch(() => null)
  const parsed = patchSchema.safeParse(body)
  if (!parsed.success) return error("Invalid data")

  const existing = await prisma.address.findFirst({
    where: { id: parsed.data.id, userId: session.userId },
  })
  if (!existing) return error("Address not found", 404)

  if (parsed.data.isDefault) {
    await prisma.address.updateMany({
      where: { userId: session.userId },
      data: { isDefault: false },
    })
  }

  const address = await prisma.address.update({
    where: { id: parsed.data.id },
    data: { isDefault: parsed.data.isDefault },
  })

  return json({ address })
}
