import { z } from "zod"
import { prisma } from "@/lib/prisma"
import { generateOtp } from "@/lib/auth"
import { json, error } from "@/lib/api-utils"
import { checkRateLimit } from "@/lib/rate-limit"

const schema = z.object({
  phone: z.string().min(10).max(10),
})

async function sendSmsMSG91(phone: string, otp: string): Promise<void> {
  const authKey = process.env.MSG91_KEY
  const templateId = process.env.MSG91_TEMPLATE_ID

  if (!authKey || !templateId) return // skip in dev

  const body = JSON.stringify({
    template_id: templateId,
    mobile: `91${phone}`,
    authkey: authKey,
    otp,
  })

  const res = await fetch("https://api.msg91.com/api/v5/otp", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body,
  })

  if (!res.ok) {
    const text = await res.text()
    console.error("MSG91 error:", text)
    throw new Error("Failed to send OTP SMS")
  }
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => null)
  const parsed = schema.safeParse(body)
  if (!parsed.success) return error("Enter a valid 10-digit mobile number")

  const { phone } = parsed.data

  // Rate limiting — max 3 OTPs per phone per 10 minutes
  const rl = checkRateLimit(phone)
  if (!rl.allowed) {
    return error(
      `Too many OTP requests. Try again in ${rl.retryAfterSecs} seconds.`,
      429,
    )
  }

  const code = generateOtp()
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000)

  await prisma.otpCode.deleteMany({ where: { phone } })
  await prisma.otpCode.create({ data: { phone, code, expiresAt } })

  const hasSms = !!process.env.MSG91_KEY

  if (hasSms) {
    try {
      await sendSmsMSG91(phone, code)
    } catch (e) {
      console.error("SMS send failed:", e)
    }
  } else {
    // No SMS provider configured — log OTP so it's visible in Vercel Function Logs
    console.log(`[ChakkiGhar OTP] phone=${phone} otp=${code}`)
  }

  return json({
    success: true,
    message: hasSms ? "OTP sent to your mobile number" : "OTP generated (check server logs)",
    // Return OTP in response when SMS is not configured (dev/testing mode)
    devOtp: !hasSms ? code : undefined,
  })
}
