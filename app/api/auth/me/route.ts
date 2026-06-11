import { getUserFromSession } from "@/lib/auth"
import { json } from "@/lib/api-utils"

export async function GET() {
  const user = await getUserFromSession()
  if (!user) return json({ user: null })
  return json({
    user: {
      id: user.id,
      phone: user.phone,
      name: user.name,
      role: user.role,
      isFirstTime: user.isFirstTime,
      addresses: user.addresses,
      mill: user.mill,
      deliveryPartner: user.deliveryPartner,
    },
  })
}
