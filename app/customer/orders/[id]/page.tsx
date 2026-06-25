"use client"

import { use, useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { api } from "@/lib/api-client"
import { formatINR, type OrderStatus } from "@/lib/data"
import { MapView } from "@/components/map-view"
import { getPusherClient } from "@/lib/pusher-client"
import { ArrowLeft, Check, Package, Wheat, CheckCircle2, Bike, Home, Phone, MapPin, ShieldCheck } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"

const steps: { status: OrderStatus; label: string; icon: typeof Package; sub: string }[] = [
  { status: "placed", label: "Order placed", icon: Package, sub: "Mill received your order" },
  { status: "grinding", label: "Grinding fresh", icon: Wheat, sub: "Your grains are being milled" },
  { status: "ready", label: "Ready & packed", icon: CheckCircle2, sub: "Packed and sealed" },
  { status: "out_for_delivery", label: "Out for delivery", icon: Bike, sub: "Partner on the way" },
  { status: "delivered", label: "Delivered", icon: Home, sub: "Enjoy your fresh flour" },
]

const statusIndex: Record<string, number> = {
  placed: 0, accepted: 0, grinding: 1, ready: 2, picked_up: 2,
  out_for_delivery: 3, delivered: 4, cancelled: -1,
}

export default function TrackOrderPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()
  const qc = useQueryClient()

  // Local real-time overrides (Pusher patches without re-fetching full order)
  const [liveStatus, setLiveStatus] = useState<string | null>(null)
  const [liveRiderLat, setLiveRiderLat] = useState<number | null>(null)
  const [liveRiderLng, setLiveRiderLng] = useState<number | null>(null)

  const { data, isLoading, isError } = useQuery({
    queryKey: ["order", id],
    queryFn: () => api<{ order: Record<string, unknown> }>(`/api/orders/${id}`),
    refetchInterval: 10000, // slower polling now — Pusher handles real-time
    retry: false,
  })

  // Subscribe to Pusher channel for this order
  useEffect(() => {
    const pusher = getPusherClient()
    if (!pusher) return

    const channel = pusher.subscribe(`order-${id}`)

    channel.bind("location-update", (data: { riderLat: number; riderLng: number }) => {
      setLiveRiderLat(data.riderLat)
      setLiveRiderLng(data.riderLng)
    })

    channel.bind("status-update", (data: { status: string }) => {
      setLiveStatus(data.status)
      // Also invalidate the query so full order refreshes
      qc.invalidateQueries({ queryKey: ["order", id] })
    })

    return () => {
      channel.unbind_all()
      pusher.unsubscribe(`order-${id}`)
    }
  }, [id, qc])

  const found = data?.order as {
    id: string; millName: string; status: string; address: string; total: number;
    items: { quantityKg: number; grainName: string; texture: string; pricePerKg: number; grainId: string }[];
    riderLat?: number; riderLng?: number; millLat?: number; millLng?: number;
    addressLat?: number; addressLng?: number; deliveryPartner?: string; riderPhone?: string;
    deliveryOtp?: string;
  } | undefined

  if (isError) {
    return (
      <div className="flex min-h-[50vh] flex-col items-center justify-center gap-3 px-5 text-center">
        <p className="text-muted-foreground">Could not load this order.</p>
        <Button variant="outline" onClick={() => router.push("/customer/orders")}>Back to orders</Button>
      </div>
    )
  }

  if (isLoading || !found) {
    return <div className="flex min-h-[50vh] items-center justify-center text-muted-foreground">Loading order...</div>
  }

  // Merge live Pusher data over the polled data
  const currentStatus = liveStatus ?? found.status
  const riderLat = liveRiderLat ?? found.riderLat
  const riderLng = liveRiderLng ?? found.riderLng

  if (currentStatus === "cancelled") {
    return (
      <div>
        <header className="sticky top-0 z-30 flex items-center gap-3 bg-background/95 px-5 py-4 backdrop-blur">
          <button onClick={() => router.back()} aria-label="Back" className="flex size-9 items-center justify-center rounded-full bg-secondary">
            <ArrowLeft className="size-5" />
          </button>
          <div>
            <h1 className="font-bold leading-tight">{found.id}</h1>
            <p className="text-xs text-muted-foreground">{found.millName}</p>
          </div>
        </header>
        <div className="mx-5 mt-8 rounded-3xl border border-destructive/30 bg-destructive/5 p-8 text-center">
          <p className="text-lg font-bold text-destructive">Order cancelled</p>
          <p className="mt-2 text-sm text-muted-foreground">This order was cancelled by the mill.</p>
          <Button className="mt-4" onClick={() => router.push("/customer")}>Browse mills</Button>
        </div>
      </div>
    )
  }

  const stepIndex = statusIndex[currentStatus] ?? 0
  const eta = Math.max(2, 22 - stepIndex * 5)

  const markers = []
  if (found.millLat && found.millLng) markers.push({ lat: found.millLat, lng: found.millLng, label: found.millName, color: "#2563eb" })
  if (found.addressLat && found.addressLng) markers.push({ lat: found.addressLat, lng: found.addressLng, label: "You", color: "#c2410c" })
  if (riderLat && riderLng) markers.push({ lat: riderLat, lng: riderLng, label: "Rider", color: "#16a34a" })

  const center: [number, number] = riderLat && riderLng
    ? [riderLat, riderLng]
    : [found.addressLat ?? 18.52, found.addressLng ?? 73.85]

  return (
    <div>
      <header className="sticky top-0 z-30 flex items-center gap-3 bg-background/95 px-5 py-4 backdrop-blur">
        <button onClick={() => router.back()} aria-label="Back" className="flex size-9 items-center justify-center rounded-full bg-secondary">
          <ArrowLeft className="size-5" />
        </button>
        <div>
          <h1 className="font-bold leading-tight">{found.id}</h1>
          <p className="text-xs text-muted-foreground">{found.millName}</p>
        </div>
        {/* Live indicator when Pusher is active */}
        {liveStatus || liveRiderLat ? (
          <span className="ml-auto flex items-center gap-1.5 rounded-full bg-accent/15 px-2.5 py-1 text-xs font-semibold text-accent">
            <span className="size-1.5 animate-pulse rounded-full bg-accent" />
            Live
          </span>
        ) : null}
      </header>

      <div className="mx-5 mt-2 overflow-hidden rounded-3xl border border-border">
        <MapView center={center} markers={markers} height="200px" />
      </div>

      <div className="mx-5 mt-3 rounded-3xl bg-primary p-5 text-primary-foreground">
        <p className="text-sm opacity-90">{stepIndex >= steps.length - 1 ? "Delivered" : "Estimated arrival"}</p>
        <p className="text-3xl font-extrabold">{stepIndex >= steps.length - 1 ? "Done" : `${eta} mins`}</p>
        <p className="mt-1 text-sm opacity-90">{steps[Math.min(stepIndex, steps.length - 1)].sub}</p>
      </div>

      <div className="px-5 py-6">
        <div className="relative">
          {steps.map((s, i) => {
            const done = i < stepIndex
            const current = i === stepIndex
            return (
              <div key={s.status} className="relative flex gap-4 pb-7 last:pb-0">
                {i < steps.length - 1 && (
                  <span className={cn("absolute left-[19px] top-10 h-full w-0.5 transition-colors duration-700", done ? "bg-primary" : "bg-border")} />
                )}
                <div className={cn("z-10 flex size-10 shrink-0 items-center justify-center rounded-full border-2 transition-all duration-500", done && "border-primary bg-primary text-primary-foreground", current && "border-primary bg-primary/10 text-primary", !done && !current && "border-border bg-card text-muted-foreground")}>
                  {done ? <Check className="size-5" /> : <s.icon className="size-5" />}
                </div>
                <div className={cn("pt-1.5", current && "animate-pulse")}>
                  <p className={cn("font-semibold", !done && !current && "text-muted-foreground")}>{s.label}</p>
                  <p className="text-xs text-muted-foreground">{s.sub}</p>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {stepIndex >= 3 && stepIndex < steps.length - 1 && found.deliveryPartner && (
        <div className="mx-5 mb-4 flex items-center gap-3 rounded-2xl border border-border bg-card p-4">
          <div className="flex size-12 items-center justify-center rounded-full bg-accent/15 text-accent">
            <Bike className="size-6" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-semibold">{found.deliveryPartner} is delivering</p>
            <p className="text-xs text-muted-foreground">Live location on map</p>
          </div>
          {found.riderPhone ? (
            <Button size="icon" variant="outline" className="rounded-full bg-transparent" asChild>
              <a href={`tel:+91${found.riderPhone}`} aria-label="Call rider">
                <Phone className="size-4" />
              </a>
            </Button>
          ) : (
            <Button size="icon" variant="outline" className="rounded-full bg-transparent" disabled>
              <Phone className="size-4" />
            </Button>
          )}
        </div>
      )}

      {found.deliveryOtp && currentStatus !== "delivered" && (
        <div className="mx-5 mb-4 rounded-2xl border border-amber-200/50 bg-amber-500/10 p-5 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-full bg-amber-500/20 text-amber-600 dark:text-amber-400">
              <ShieldCheck className="size-5" />
            </div>
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Delivery OTP</p>
              <p className="text-3xl font-black tracking-[0.25em] text-foreground mt-1">{found.deliveryOtp}</p>
            </div>
          </div>
          <p className="mt-3 text-xs text-muted-foreground leading-normal">
            Share this 4-digit verification code with the delivery partner when they arrive to confirm secure receipt.
          </p>
        </div>
      )}

      <div className="mx-5 mb-6 rounded-2xl border border-border bg-card p-4">
        <p className="mb-3 text-sm font-bold">Order summary</p>
        {found.items.map((it) => (
          <div key={it.grainId + it.grainName} className="flex justify-between py-1 text-sm">
            <span className="text-muted-foreground">{it.quantityKg}kg {it.grainName} <span className="capitalize">({it.texture})</span></span>
            <span className="font-medium">{formatINR(it.quantityKg * it.pricePerKg)}</span>
          </div>
        ))}
        <div className="mt-2 flex justify-between border-t border-border pt-2 text-sm font-bold">
          <span>Total paid</span><span>{formatINR(found.total)}</span>
        </div>
        <p className="mt-3 flex items-center gap-1 text-xs text-muted-foreground"><MapPin className="size-3.5" /> {found.address}</p>
      </div>
    </div>
  )
}
