import type { Mill, Grain, MillProduct, Order, OrderItem, DeliveryPartner } from "@prisma/client"
import { haversineKm, etaMins } from "@/lib/geo"
import { categoryToClient, paymentToClient, relativeTime, textureToClient } from "@/lib/api-utils"

type MillWithProducts = Mill & {
  products: (MillProduct & { grain: Grain })[]
}

type OrderWithRelations = Order & {
  items: OrderItem[]
  mill?: Mill
  customer?: { name: string | null; phone: string }
  rider?: (DeliveryPartner & { user: { name: string | null; phone: string } }) | null
}

export function serializeMill(m: Mill, userLat?: number, userLng?: number) {
  const distanceKm =
    userLat != null && userLng != null
      ? Math.round(haversineKm(userLat, userLng, m.lat, m.lng) * 10) / 10
      : 0
  return {
    id: m.id,
    name: m.name,
    owner: m.ownerName,
    image: m.image ?? "/placeholder.svg",
    rating: m.rating,
    reviews: m.reviews,
    distanceKm,
    etaMins: etaMins(distanceKm),
    isOpen: m.isOpen,
    address: m.address,
    specialties: m.specialties.split(","),
    yearsActive: m.yearsActive,
    deliveryFee: m.deliveryFee,
    lat: m.lat,
    lng: m.lng,
    deliveryRadiusKm: m.deliveryRadiusKm,
    hoursOpen: m.hoursOpen,
    hoursClose: m.hoursClose,
  }
}

export function serializeGrain(g: Grain, mp?: MillProduct) {
  let subTypes: string[] = []
  if (g.subTypes) {
    try { subTypes = JSON.parse(g.subTypes) } catch { subTypes = [] }
  }
  return {
    id: g.id,
    name: g.name,
    localName: g.localName,
    category: categoryToClient(g.category),
    pricePerKg: mp?.customPrice ?? g.pricePerKg,
    grindingFeePerKg: mp?.customGrindingFee ?? g.grindingFeePerKg,
    image: g.image ?? "/placeholder.svg",
    description: g.description,
    popular: g.popular,
    subTypes,
    inStock: mp?.inStock ?? true,
    millProductId: mp?.id,
  }
}

export function serializeOrder(o: OrderWithRelations) {
  return {
    id: o.displayId,
    dbId: o.id,
    millId: o.millId,
    millName: o.mill?.name ?? "",
    customerName: o.customer?.name ?? "Customer",
    customerPhone: o.customer?.phone ?? "",
    address: o.address,
    addressLat: o.addressLat,
    addressLng: o.addressLng,
    items: o.items.map((it) => ({
      grainId: it.grainId,
      grainName: it.grainName,
      subType: it.subType,
      quantityKg: it.quantityKg,
      texture: textureToClient(it.texture),
      roasted: it.roasted,
      pricePerKg: it.pricePerKg,
      grindingFeePerKg: it.grindingFeePerKg,
    })),
    status: o.status.toLowerCase(),
    placedAt: relativeTime(o.placedAt),
    placedAtDate: o.placedAt.toISOString(),
    total: o.total,
    deliveryFee: o.deliveryFee,
    paymentMethod: paymentToClient(o.paymentMethod),
    paymentStatus: o.paymentStatus.toLowerCase(),
    deliveryPartner: o.rider?.user.name ?? undefined,
    riderPhone: o.rider?.user.phone ?? undefined,
    deliveryOtp: o.deliveryOtp,
    distanceKm: 0,
    riderLat: o.riderLat,
    riderLng: o.riderLng,
    millLat: o.mill?.lat,
    millLng: o.mill?.lng,
  }
}
