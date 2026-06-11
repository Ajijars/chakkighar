import { destroySession } from "@/lib/auth"
import { json } from "@/lib/api-utils"

export async function POST() {
  await destroySession()
  return json({ success: true })
}
