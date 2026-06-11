import { z } from "zod"
import type { Role } from "@/lib/types"
import { prisma } from "@/lib/prisma"
import { createSession } from "@/lib/auth"
import { json, error } from "@/lib/api-utils"

const schema = z.object({
  phone: z.string().min(10).max(10),
  otp: z.string().min(4).max(4),
  role: z.enum(["customer", "mill", "delivery"]),
  name: z.string().optional(),
})

const roleMap: Record<string, Role> = {
  customer: "CUSTOMER",
  mill: "MILL_OWNER",
  delivery: "DELIVERY",
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => null)
  const parsed = schema.safeParse(body)
  if (!parsed.success) return error("Invalid request")

  const { phone, otp, role, name } = parsed.data
  const prismaRole = roleMap[role]

  const record = await prisma.otpCode.findFirst({
    where: { phone, code: otp, expiresAt: { gt: new Date() } },
    orderBy: { createdAt: "desc" },
  })
  if (!record) return error("Invalid or expired OTP", 401)

  await prisma.otpCode.deleteMany({ where: { phone } })

  let user = await prisma.user.findUnique({ where: { phone } })

  if (!user) {
    user = await prisma.user.create({
      data: { phone, name: name ?? null, role: prismaRole },
    })
    if (prismaRole === "DELIVERY") {
      await prisma.deliveryPartner.create({ data: { userId: user.id } })
    }
  } else if (user.role !== prismaRole) {
    return error(`This number is registered as ${user.role.toLowerCase().replace("_", " ")}`, 403)
  }

  if (name && !user.name) {
    user = await prisma.user.update({ where: { id: user.id }, data: { name, isFirstTime: false } })
  } else if (user.isFirstTime) {
    user = await prisma.user.update({ where: { id: user.id }, data: { isFirstTime: false } })
  }

  await createSession({
    userId: user.id,
    phone: user.phone,
    role: user.role,
    name: user.name,
  })

  return json({
    success: true,
    user: {
      id: user.id,
      phone: user.phone,
      name: user.name,
      role: user.role,
      isFirstTime: user.isFirstTime,
    },
  })
}
