import { prisma } from "@/lib/prisma"
import { serializeMill, serializeGrain } from "@/lib/serializers"
import { json, error } from "@/lib/api-utils"

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const { searchParams } = new URL(req.url)
  const lat = parseFloat(searchParams.get("lat") ?? "")
  const lng = parseFloat(searchParams.get("lng") ?? "")

  const mill = await prisma.mill.findUnique({
    where: { id },
    include: { products: { include: { grain: true } } },
  })
  if (!mill) return error("Mill not found", 404)

  const products = mill.products
    .filter((p) => p.inStock)
    .map((p) => serializeGrain(p.grain, p))

  return json({
    mill: serializeMill(mill, isNaN(lat) ? undefined : lat, isNaN(lng) ? undefined : lng),
    products,
  })
}
