import { z } from "zod"
import type { Role } from "@/lib/types"
import { prisma } from "@/lib/prisma"
import { requireSession } from "@/lib/auth"
import { serializeOrder } from "@/lib/serializers"
import { json, error, textureFromClient } from "@/lib/api-utils"
import { haversineKm, MAX_RADIUS_KM } from "@/lib/geo"

const itemSchema = z.object({
  grainId: z.string(),
  grainName: z.string(),
  subType: z.string().optional(),
  quantityKg: z.number().positive(),
  texture: z.enum(["fine", "medium", "coarse"]),
  roasted: z.boolean(),
  pricePerKg: z.number(),
  grindingFeePerKg: z.number(),
})

const createSchema = z.object({
  millId: z.string(),
  addressId: z.string().optional(),
  address: z.string().optional(),
  addressLat: z.number(),
  addressLng: z.number(),
  paymentMethod: z.enum(["cash", "upi"]),
  items: z.array(itemSchema).min(1),
})

export async function GET() {
  const session = await requireSession(["CUSTOMER"])
  if (!session) return error("Unauthorized", 401)

  const orders = await prisma.order.findMany({
    where: { customerId: session.userId },
    include: { items: true, mill: true, customer: true, rider: { include: { user: true } } },
    orderBy: { placedAt: "desc" },
  })

  return json({ orders: orders.map(serializeOrder) })
}

export async function POST(req: Request) {
  const session = await requireSession(["CUSTOMER"])
  if (!session) return error("Please log in to place an order", 401)

  const body = await req.json().catch(() => null)
  const parsed = createSchema.safeParse(body)
  if (!parsed.success) return error("Invalid order data")

  const { millId, addressId, address, paymentMethod, items } = parsed.data
  let { addressLat, addressLng } = parsed.data

  const mill = await prisma.mill.findUnique({ where: { id: millId } })
  if (!mill || !mill.isOpen) return error("Mill is not available", 400)

  let deliveryAddress = address
  if (addressId) {
    const addr = await prisma.address.findFirst({
      where: { id: addressId, userId: session.userId },
    })
    if (!addr) return error("Address not found", 404)
    deliveryAddress = addr.line1
    addressLat = addr.lat
    addressLng = addr.lng
  }
  if (!deliveryAddress) return error("Delivery address required")

  const maxKm = Math.min(mill.deliveryRadiusKm ?? MAX_RADIUS_KM, MAX_RADIUS_KM)
  const distanceKm = haversineKm(mill.lat, mill.lng, addressLat, addressLng)
  if (distanceKm > maxKm) {
    return error(`Delivery address is ${distanceKm.toFixed(1)} km away — this mill delivers within ${maxKm} km only`, 400)
  }

  const subtotal = items.reduce(
    (s, it) => s + it.quantityKg * (it.pricePerKg + it.grindingFeePerKg + (it.roasted ? 8 : 0)),
    0,
  )
  const taxes = Math.round(subtotal * 0.05)
  const total = subtotal + mill.deliveryFee + taxes

  const count = await prisma.order.count()
  const displayId = `ORD-${Date.now().toString().slice(-6)}`

  const order = await prisma.order.create({
    data: {
      displayId,
      customerId: session.userId,
      millId,
      address: deliveryAddress,
      addressLat,
      addressLng,
      total,
      deliveryFee: mill.deliveryFee,
      paymentMethod: paymentMethod.toUpperCase() as "CASH" | "UPI",
      paymentStatus: paymentMethod === "upi" ? "PAID" : "PENDING",
      items: {
        create: items.map((it) => ({
          grainId: it.grainId,
          grainName: it.grainName,
          subType: it.subType,
          quantityKg: it.quantityKg,
          texture: textureFromClient(it.texture),
          roasted: it.roasted,
          pricePerKg: it.pricePerKg,
          grindingFeePerKg: it.grindingFeePerKg,
        })),
      },
    },
    include: { items: true, mill: true, customer: true },
  })

  return json({ order: serializeOrder(order) }, 201)
}
