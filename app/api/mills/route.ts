import { prisma } from "@/lib/prisma"
import { isWithinRadius } from "@/lib/geo"
import { serializeMill } from "@/lib/serializers"
import { json } from "@/lib/api-utils"

const CATEGORY_MAP: Record<string, string> = {
  wheat: "WHEAT",
  rice: "RICE",
  millet: "MILLET",
  pulses: "PULSES",
  spices: "SPICES",
  corn: "CORN",
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const lat = parseFloat(searchParams.get("lat") ?? "")
  const lng = parseFloat(searchParams.get("lng") ?? "")
  const query = searchParams.get("q")?.toLowerCase() ?? ""
  const category = searchParams.get("category")?.toLowerCase()

  const mills = await prisma.mill.findMany({
    where: { isOpen: true },
    orderBy: { rating: "desc" },
  })

  let result = mills.map((m) => serializeMill(m, lat, lng))

  if (!isNaN(lat) && !isNaN(lng)) {
    result = result.filter((m) => isWithinRadius(lat, lng, m.lat!, m.lng!, m.deliveryRadiusKm ?? 10))
    result.sort((a, b) => a.distanceKm - b.distanceKm)
  }

  if (query) {
    result = result.filter(
      (m) =>
        m.name.toLowerCase().includes(query) ||
        m.specialties.some((s) => s.toLowerCase().includes(query)),
    )
  }

  if (category && category !== "all") {
    const dbCategory = CATEGORY_MAP[category]
    if (dbCategory) {
      const grains = await prisma.grain.findMany({ where: { category: dbCategory } })
      const keywords = grains.flatMap((g) => [g.name.toLowerCase(), g.localName.toLowerCase()])
      result = result.filter((m) =>
        m.specialties.some((s) => {
          const sl = s.toLowerCase()
          return keywords.some((k) => sl.includes(k) || k.includes(sl.split(" ")[0]))
        }),
      )
    }
  }

  return json({ mills: result })
}
