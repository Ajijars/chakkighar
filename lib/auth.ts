import { SignJWT, jwtVerify } from "jose"
import { cookies } from "next/headers"
import type { Role } from "@/lib/types"
import { prisma } from "@/lib/prisma"

const COOKIE = "chakkighar_session"

export interface SessionPayload {
  userId: string
  phone: string
  role: Role
  name: string | null
}

function secret() {
  const s = process.env.JWT_SECRET
  if (!s) throw new Error("JWT_SECRET is not set")
  return new TextEncoder().encode(s)
}

export async function createSession(payload: SessionPayload) {
  const token = await new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime("30d")
    .sign(secret())

  const jar = await cookies()
  jar.set(COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  })
}

export async function destroySession() {
  const jar = await cookies()
  jar.delete(COOKIE)
}

export async function getSession(): Promise<SessionPayload | null> {
  const jar = await cookies()
  const token = jar.get(COOKIE)?.value
  if (!token) return null
  try {
    const { payload } = await jwtVerify(token, secret())
    return payload as unknown as SessionPayload
  } catch {
    return null
  }
}

export async function requireSession(roles?: Role[]) {
  const session = await getSession()
  if (!session) return null
  if (roles && !roles.includes(session.role)) return null
  return session
}

export async function getUserFromSession() {
  const session = await getSession()
  if (!session) return null
  return prisma.user.findUnique({
    where: { id: session.userId },
    include: {
      addresses: { orderBy: { isDefault: "desc" } },
      mill: true,
      deliveryPartner: true,
    },
  })
}

export function generateOtp(): string {
  return String(Math.floor(1000 + Math.random() * 9000))
}
