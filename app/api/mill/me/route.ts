import { z } from "zod"
import type { Role } from "@/lib/types"
import { prisma } from "@/lib/prisma"
import { requireSession } from "@/lib/auth"
import { serializeMill } from "@/lib/serializers"
import { json, error } from "@/lib/api-utils"

export async function GET() {
  const session = await requireSession(["MILL_OWNER"])
  if (!session) return error("Unauthorized", 401)

  const mill = await prisma.mill.findUnique({ where: { ownerId: session.userId } })
  if (!mill) return json({ mill: null, registered: false })

  return json({ mill: serializeMill(mill), registered: true })
}

const updateSchema = z.object({
  isOpen: z.boolean().optional(),
  deliveryRadiusKm: z.number().min(1).max(10).optional(),
  name: z.string().optional(),
  ownerName: z.string().optional(),
  address: z.string().optional(),
  lat: z.number().optional(),
  lng: z.number().optional(),
  licenseUrl: z.string().optional(),
  hoursOpen: z.string().optional(),
  hoursClose: z.string().optional(),
  deliveryFee: z.number().min(0).optional(),
})

export async function PATCH(req: Request) {
  const session = await requireSession(["MILL_OWNER"])
  if (!session) return error("Unauthorized", 401)

  const body = await req.json().catch(() => null)
  const parsed = updateSchema.safeParse(body)
  if (!parsed.success) return error("Invalid data")

  const mill = await prisma.mill.findUnique({ where: { ownerId: session.userId } })
  if (!mill) return error("Mill not found", 404)

  const updated = await prisma.mill.update({
    where: { id: mill.id },
    data: parsed.data,
  })

  return json({ mill: serializeMill(updated) })
}

const registerSchema = z.object({
  name: z.string().min(2),
  ownerName: z.string().min(2),
  address: z.string().min(5),
  lat: z.number(),
  lng: z.number(),
  licenseUrl: z.string().optional(),
  specialties: z.string().optional(),
})

export async function POST(req: Request) {
  const session = await requireSession(["MILL_OWNER"])
  if (!session) return error("Unauthorized", 401)

  const existing = await prisma.mill.findUnique({ where: { ownerId: session.userId } })
  if (existing) return error("Mill already registered")

  const body = await req.json().catch(() => null)
  const parsed = registerSchema.safeParse(body)
  if (!parsed.success) return error("Invalid registration data")

  const grains = await prisma.grain.findMany()
  const mill = await prisma.mill.create({
    data: {
      ownerId: session.userId,
      name: parsed.data.name,
      ownerName: parsed.data.ownerName,
      address: parsed.data.address,
      lat: parsed.data.lat,
      lng: parsed.data.lng,
      licenseUrl: parsed.data.licenseUrl,
      specialties: parsed.data.specialties ?? "Whole Wheat,Multigrain",
      products: {
        create: grains.slice(0, 4).map((g) => ({
          grainId: g.id,
          customPrice: g.pricePerKg,
          customGrindingFee: g.grindingFeePerKg,
        })),
      },
    },
  })

  return json({ mill: serializeMill(mill) }, 201)
}
