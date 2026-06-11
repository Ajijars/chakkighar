import { z } from "zod"
import { prisma } from "@/lib/prisma"
import { requireSession } from "@/lib/auth"
import { json, error } from "@/lib/api-utils"

const RIDER_BASE_PAY = 25

function riderPayout(deliveryFee: number) {
  return deliveryFee + RIDER_BASE_PAY
}

export async function GET() {
  const session = await requireSession(["DELIVERY"])
  if (!session) return error("Unauthorized", 401)

  const rider = await prisma.deliveryPartner.findUnique({
    where: { userId: session.userId },
    include: { user: true },
  })
  if (!rider) return error("Profile not found", 404)

  const now = new Date()
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const startOfWeek = new Date(startOfDay)
  startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay())

  const delivered = await prisma.order.findMany({
    where: { riderId: rider.id, status: "DELIVERED" },
    select: { deliveryFee: true, updatedAt: true },
  })

  const earningsToday = delivered
    .filter((o) => o.updatedAt >= startOfDay)
    .reduce((s, o) => s + riderPayout(o.deliveryFee), 0)

  const earningsWeek = delivered
    .filter((o) => o.updatedAt >= startOfWeek)
    .reduce((s, o) => s + riderPayout(o.deliveryFee), 0)

  return json({
    name: rider.user.name,
    phone: rider.user.phone,
    vehicleInfo: rider.vehicleInfo,
    licenseUrl: rider.licenseUrl,
    rating: rider.rating,
    trips: rider.trips,
    isOnline: rider.isOnline,
    earningsToday,
    earningsWeek,
  })
}

const patchSchema = z.object({
  vehicleInfo: z.string().optional(),
  licenseUrl: z.string().optional(),
})

export async function PATCH(req: Request) {
  const session = await requireSession(["DELIVERY"])
  if (!session) return error("Unauthorized", 401)

  const body = await req.json().catch(() => null)
  const parsed = patchSchema.safeParse(body)
  if (!parsed.success) return error("Invalid data")

  const rider = await prisma.deliveryPartner.update({
    where: { userId: session.userId },
    data: parsed.data,
    include: { user: true },
  })

  return json({
    name: rider.user.name,
    phone: rider.user.phone,
    vehicleInfo: rider.vehicleInfo,
    licenseUrl: rider.licenseUrl,
  })
}
