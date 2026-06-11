import { z } from "zod"
import { prisma } from "@/lib/prisma"
import { requireSession } from "@/lib/auth"
import { json, error } from "@/lib/api-utils"
import { triggerOrderEvent } from "@/lib/pusher"

const schema = z.object({
  lat: z.number(),
  lng: z.number(),
})

export async function POST(req: Request) {
  const session = await requireSession(["DELIVERY"])
  if (!session) return error("Unauthorized", 401)

  const body = await req.json().catch(() => null)
  const parsed = schema.safeParse(body)
  if (!parsed.success) return error("Invalid coordinates")

  const { lat, lng } = parsed.data
  const rider = await prisma.deliveryPartner.findUnique({ where: { userId: session.userId } })
  if (!rider) return error("Not found", 404)

  await prisma.deliveryPartner.update({
    where: { id: rider.id },
    data: { currentLat: lat, currentLng: lng },
  })

  const active = await prisma.order.findFirst({
    where: {
      riderId: rider.id,
      status: { in: ["PICKED_UP", "OUT_FOR_DELIVERY"] },
    },
    include: { mill: true },
  })

  if (active) {
    const targetLat = active.status === "PICKED_UP" ? (active.mill?.lat ?? lat) : active.addressLat
    const targetLng = active.status === "PICKED_UP" ? (active.mill?.lng ?? lng) : active.addressLng

    const smoothLat = lat + (targetLat - lat) * 0.3
    const smoothLng = lng + (targetLng - lng) * 0.3

    await prisma.order.update({
      where: { id: active.id },
      data: { riderLat: smoothLat, riderLng: smoothLng },
    })

    // Push real-time rider location to the customer tracking page
    await triggerOrderEvent(active.displayId, "location-update", {
      riderLat: smoothLat,
      riderLng: smoothLng,
    })
  }

  return json({ success: true })
}
