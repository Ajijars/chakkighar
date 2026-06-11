import { prisma } from "@/lib/prisma"
import { serializeGrain } from "@/lib/serializers"
import { json } from "@/lib/api-utils"

export async function GET() {
  const grains = await prisma.grain.findMany({ orderBy: { name: "asc" } })
  return json({ grains: grains.map((g) => serializeGrain(g)) })
}
