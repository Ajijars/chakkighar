import { prisma } from "@/lib/prisma"
import { getPusher } from "@/lib/pusher"

export async function sendSms(phone: string, body: string, otp?: string): Promise<void> {
  const msg91Key = process.env.MSG91_KEY
  const msg91TemplateId = process.env.MSG91_TEMPLATE_ID

  const twilioSid = process.env.TWILIO_ACCOUNT_SID
  const twilioToken = process.env.TWILIO_AUTH_TOKEN
  const twilioFrom = process.env.TWILIO_FROM_NUMBER

  console.log(`[SMS SENDER] Sending to +91${phone}: "${body}" (OTP: ${otp || 'none'})`)

  // 1. Log to DB for development simulator
  try {
    await prisma.devMessage.create({
      data: { phone, body },
    })
  } catch (e) {
    console.error("Failed to save dev message to DB:", e)
  }

  // 2. Broadcast via Pusher if configured
  try {
    const pusher = getPusher()
    if (pusher) {
      await pusher.trigger(`phone-${phone}`, "sms-received", { phone, body, otp })
      // Also broadcast globally for anyone listening on a dev-wide logs console
      await pusher.trigger("dev-sms-channel", "sms-received", { phone, body, otp })
    }
  } catch (e) {
    console.error("Failed to broadcast SMS via Pusher:", e)
  }

  // 3. Send real SMS using MSG91
  if (msg91Key && msg91TemplateId && otp) {
    try {
      const res = await fetch("https://api.msg91.com/api/v5/otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          template_id: msg91TemplateId,
          mobile: `91${phone}`,
          authkey: msg91Key,
          otp,
        }),
      })

      if (!res.ok) {
        const text = await res.text()
        console.error("MSG91 API error response:", text)
        throw new Error(`MSG91 returned status ${res.status}`)
      }
    } catch (e) {
      console.error("MSG91 transmission failed:", e)
      throw e;
    }
  }
  // 4. Send real SMS using Twilio
  else if (twilioSid && twilioToken && twilioFrom) {
    try {
      const params = new URLSearchParams()
      params.append("To", `+91${phone}`)
      params.append("From", twilioFrom)
      params.append("Body", body)

      const res = await fetch(
        `https://api.twilio.com/2010-04-01/Accounts/${twilioSid}/Messages.json`,
        {
          method: "POST",
          headers: {
            Authorization: `Basic ${btoa(`${twilioSid}:${twilioToken}`)}`,
            "Content-Type": "application/x-www-form-urlencoded",
          },
          body: params.toString(),
        }
      )

      if (!res.ok) {
        const text = await res.text()
        console.error("Twilio API error response:", text)
        throw new Error(`Twilio returned status ${res.status}`)
      }
    } catch (e) {
      console.error("Twilio transmission failed:", e)
      throw e;
    }
  } else {
    console.log(`[SMS MOCK] Offline mode. No credentials. SMS mock saved.`)
  }
}
