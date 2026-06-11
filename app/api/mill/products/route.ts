import { z } from "zod"
import type { Role } from "@/lib/types"
import { prisma } from "@/lib/prisma"
import { requireSession } from "@/lib/auth"
import { serializeGrain } from "@/lib/serializers"
import { json, error } from "@/lib/api-utils"

export async function GET() {
  const session = await requireSession(["MILL_OWNER"])
  if (!session) return error("Unauthorized", 401)

  const mill = await prisma.mill.findUnique({
    where: { ownerId: session.userId },
    include: { products: { include: { grain: true } } },
  })
  if (!mill) return error("Mill not registered", 404)

  return json({
    products: mill.products.map((p) => ({
      ...serializeGrain(p.grain, p),
      available: p.inStock,
      customPrice: p.customPrice,
      customGrindingFee: p.customGrindingFee,
    })),
  })
}

const updateSchema = z.object({
  productId: z.string(),
  customPrice: z.number().optional(),
  customGrindingFee: z.number().optional(),
  inStock: z.boolean().optional(),
})

export async function PATCH(req: Request) {
  const session = await requireSession(["MILL_OWNER"])
  if (!session) return error("Unauthorized", 401)

  const mill = await prisma.mill.findUnique({ where: { ownerId: session.userId } })
  if (!mill) return error("Mill not found", 404)

  const body = await req.json().catch(() => null)
  const parsed = updateSchema.safeParse(body)
  if (!parsed.success) return error("Invalid data")

  const product = await prisma.millProduct.findFirst({
    where: { id: parsed.data.productId, millId: mill.id },
    include: { grain: true },
  })
  if (!product) return error("Product not found", 404)

  const updated = await prisma.millProduct.update({
    where: { id: product.id },
    data: {
      ...(parsed.data.customPrice != null ? { customPrice: parsed.data.customPrice } : {}),
      ...(parsed.data.customGrindingFee != null ? { customGrindingFee: parsed.data.customGrindingFee } : {}),
      ...(parsed.data.inStock != null ? { inStock: parsed.data.inStock } : {}),
    },
    include: { grain: true },
  })

  return json({ product: serializeGrain(updated.grain, updated) })
}

const addSchema = z.object({ grainId: z.string() })

export async function POST(req: Request) {
  const session = await requireSession(["MILL_OWNER"])
  if (!session) return error("Unauthorized", 401)

  const mill = await prisma.mill.findUnique({ where: { ownerId: session.userId } })
  if (!mill) return error("Mill not found", 404)

  const body = await req.json().catch(() => null)
  const parsed = addSchema.safeParse(body)
  if (!parsed.success) return error("grainId required")

  const grain = await prisma.grain.findUnique({ where: { id: parsed.data.grainId } })
  if (!grain) return error("Grain not found", 404)

  const existing = await prisma.millProduct.findUnique({
    where: { millId_grainId: { millId: mill.id, grainId: grain.id } },
  })
  if (existing) return error("Grain already in catalog")

  const product = await prisma.millProduct.create({
    data: {
      millId: mill.id,
      grainId: grain.id,
      customPrice: grain.pricePerKg,
      customGrindingFee: grain.grindingFeePerKg,
    },
    include: { grain: true },
  })

  return json({ product: serializeGrain(product.grain, product) }, 201)
}
