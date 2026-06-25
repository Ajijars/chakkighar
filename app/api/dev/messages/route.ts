import { prisma } from "@/lib/prisma"
import { json } from "@/lib/api-utils"

export async function GET() {
  try {
    const messages = await prisma.devMessage.findMany({
      orderBy: { createdAt: "desc" },
      take: 50,
    })
    return json({ messages })
  } catch (e) {
    return json({ messages: [], error: e instanceof Error ? e.message : "Database error" }, 500)
  }
}

export async function DELETE() {
  try {
    await prisma.devMessage.deleteMany()
    return json({ success: true, message: "Cleared all messages" })
  } catch (e) {
    return json({ success: false, error: e instanceof Error ? e.message : "Database error" }, 500)
  }
}
