import { z } from "zod"
import { prisma } from "@/lib/prisma"
import { generateOtp } from "@/lib/auth"
import { json, error } from "@/lib/api-utils"
import { checkRateLimit } from "@/lib/rate-limit"
import { sendSms } from "@/lib/sms"

const schema = z.object({
  phone: z.string().min(10).max(10),
})

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

  const hasSms = !!(
    process.env.MSG91_KEY ||
    (process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN)
  )

  const messageBody = `ChakkiGhar: Your verification OTP is ${code}. Valid for 10 minutes.`

  try {
    await sendSms(phone, messageBody, code)
  } catch (e) {
    console.error("SMS send failed:", e)
  }

  return json({
    success: true,
    message: hasSms ? "OTP sent to your mobile number" : "OTP generated (check server logs)",
    // Return OTP in response when SMS is not configured (dev/testing mode)
    devOtp: !hasSms ? code : undefined,
  })
}
