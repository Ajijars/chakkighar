export type Role = "customer" | "mill" | "delivery"

export type GrainCategory = "wheat" | "rice" | "millet" | "pulses" | "spices" | "corn"

export type GrindTexture = "fine" | "medium" | "coarse"

export interface Grain {
  id: string
  name: string
  localName: string
  category: GrainCategory
  pricePerKg: number
  grindingFeePerKg: number
  image: string
  description: string
  popular?: boolean
  subTypes?: string[]
  inStock?: boolean
  millProductId?: string
}

export interface Mill {
  id: string
  name: string
  owner: string
  image: string
  rating: number
  reviews: number
  distanceKm: number
  etaMins: number
  isOpen: boolean
  address: string
  specialties: string[]
  yearsActive: number
  deliveryFee: number
  lat?: number
  lng?: number
  deliveryRadiusKm?: number
  hoursOpen?: string
  hoursClose?: string
}

export type OrderStatus =
  | "placed"
  | "accepted"
  | "grinding"
  | "ready"
  | "picked_up"
  | "out_for_delivery"
  | "delivered"
  | "cancelled"

export interface OrderItem {
  grainId: string
  grainName: string
  quantityKg: number
  texture: GrindTexture
  pricePerKg: number
  roasted: boolean
  subType?: string
  grindingFeePerKg?: number
}

export interface Order {
  id: string
  millId: string
  millName: string
  customerName: string
  customerPhone: string
  address: string
  items: OrderItem[]
  status: OrderStatus
  placedAt: string
  total: number
  deliveryFee: number
  paymentMethod: "cash" | "upi"
  deliveryPartner?: string
  distanceKm: number
  payout?: number
  addressLat?: number
  addressLng?: number
  millLat?: number
  millLng?: number
  riderLat?: number
  riderLng?: number
  dbId?: string
}

export const grindTextures: { value: GrindTexture; label: string; desc: string }[] = [
  { value: "fine", label: "Fine", desc: "Soft rotis & baking" },
  { value: "medium", label: "Medium", desc: "Everyday all-purpose" },
  { value: "coarse", label: "Coarse", desc: "Dalia & bhakri" },
]

export const statusMeta: Record<OrderStatus, { label: string; tone: string }> = {
  placed: { label: "Order Placed", tone: "bg-muted text-muted-foreground" },
  accepted: { label: "Accepted", tone: "bg-chart-4/20 text-foreground" },
  grinding: { label: "Grinding", tone: "bg-primary/15 text-primary" },
  ready: { label: "Ready for Pickup", tone: "bg-accent/15 text-accent" },
  picked_up: { label: "Picked Up", tone: "bg-chart-4/20 text-foreground" },
  out_for_delivery: { label: "Out for Delivery", tone: "bg-primary/15 text-primary" },
  delivered: { label: "Delivered", tone: "bg-accent/15 text-accent" },
  cancelled: { label: "Cancelled", tone: "bg-destructive/15 text-destructive" },
}

export function formatINR(n: number) {
  return "\u20B9" + n.toLocaleString("en-IN")
}
