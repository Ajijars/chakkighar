import { z } from "zod"
import type { OrderStatus } from "@/lib/types"
import { prisma } from "@/lib/prisma"
import { requireSession } from "@/lib/auth"
import { serializeOrder } from "@/lib/serializers"
import { json, error } from "@/lib/api-utils"
import { triggerOrderEvent } from "@/lib/pusher"
import { sendSms } from "@/lib/sms"

const schema = z.object({
  status: z.enum(["out_for_delivery", "delivered"]),
  otp: z.string().optional(),
})

const statusMap: Record<string, OrderStatus> = {
  out_for_delivery: "OUT_FOR_DELIVERY",
  delivered: "DELIVERED",
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireSession(["DELIVERY"])
  if (!session) return error("Unauthorized", 401)

  const { id } = await params
  const body = await req.json().catch(() => null)
  const parsed = schema.safeParse(body)
  if (!parsed.success) return error("Invalid parameters")

  const rider = await prisma.deliveryPartner.findUnique({ where: { userId: session.userId } })
  if (!rider) return error("Not found", 404)

  const order = await prisma.order.findFirst({
    where: { OR: [{ displayId: id }, { id }], riderId: rider.id },
    include: { customer: true },
  })
  if (!order) return error("Order not found", 404)

  const newStatus = statusMap[parsed.data.status]

  // Enforce OTP check if marking order as DELIVERED
  if (newStatus === "DELIVERED") {
    const { otp } = parsed.data
    if (!otp) {
      return error("Delivery verification OTP is required to complete this order", 400)
    }
    if (order.deliveryOtp && order.deliveryOtp !== otp) {
      return error("Invalid verification OTP. Please ask the customer for the correct code.", 400)
    }
  }

  // Generate OTP if transitioning to OUT_FOR_DELIVERY
  let deliveryOtp = order.deliveryOtp
  if (newStatus === "OUT_FOR_DELIVERY" && !deliveryOtp) {
    deliveryOtp = String(Math.floor(1000 + Math.random() * 9000))
  }

  const updated = await prisma.order.update({
    where: { id: order.id },
    data: {
      status: newStatus,
      deliveryOtp,
      ...(newStatus === "DELIVERED"
        ? { paymentStatus: order.paymentMethod === "CASH" ? "PAID" : order.paymentStatus }
        : {}),
    },
    include: { items: true, mill: true, customer: true, rider: { include: { user: true } } },
  })

  // If newly dispatched out for delivery, send the OTP SMS to the customer
  if (newStatus === "OUT_FOR_DELIVERY" && deliveryOtp) {
    const customerPhone = updated.customer.phone
    const smsBody = `Your ChakkiGhar order verification code for #${updated.displayId} is ${deliveryOtp}. Share this with the delivery partner to confirm delivery.`
    try {
      await sendSms(customerPhone, smsBody, deliveryOtp)
    } catch (e) {
      console.error("Failed to send customer delivery OTP SMS:", e)
    }
  }

  if (newStatus === "DELIVERED") {
    await prisma.deliveryPartner.update({
      where: { id: rider.id },
      data: { trips: { increment: 1 } },
    })
  }

  const serialized = serializeOrder(updated)

  // Push real-time status change to the customer tracking page
  await triggerOrderEvent(order.displayId, "status-update", {
    status: serialized.status,
  })

  return json({ order: serialized })
}
