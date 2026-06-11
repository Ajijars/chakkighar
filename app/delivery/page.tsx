"use client"

import { useQuery } from "@tanstack/react-query"
import { useDelivery } from "@/lib/delivery-context"
import { useAuth } from "@/lib/auth-context"
import { api } from "@/lib/api-client"
import { formatINR } from "@/lib/data"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { MapView } from "@/components/map-view"
import { SlideConfirm } from "@/components/slide-confirm"
import Link from "next/link"
import { toast } from "sonner"
import { IndianRupee, Package, MapPin, Phone, Navigation, Store } from "lucide-react"

export default function DeliveryHomePage() {
  const { online, setOnline, available, active, advance, complete, earnings, completed } = useDelivery()
  const { user } = useAuth()

  const { data: profile } = useQuery({
    queryKey: ["delivery-profile"],
    queryFn: () => api<{ name: string | null }>("/api/delivery/profile"),
  })

  const displayName = profile?.name ?? user?.name ?? "Partner"

  const markers = active
    ? [
        ...(active.millLat && active.millLng ? [{ lat: active.millLat, lng: active.millLng, label: active.millName, color: "#2563eb" }] : []),
        ...(active.addressLat && active.addressLng ? [{ lat: active.addressLat, lng: active.addressLng, label: "Customer", color: "#c2410c" }] : []),
        ...(active.riderLat && active.riderLng ? [{ lat: active.riderLat, lng: active.riderLng, label: "You", color: "#16a34a" }] : []),
      ]
    : []

  const center: [number, number] = active?.riderLat && active?.riderLng
    ? [active.riderLat, active.riderLng]
    : [active?.millLat ?? 18.52, active?.millLng ?? 73.85]

  const payout = active ? (active.payout ?? active.deliveryFee + 25) : 0

  return (
    <div className="px-4 py-5">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-muted-foreground">Good morning,</p>
          <h1 className="text-2xl font-bold text-foreground">{displayName}</h1>
        </div>
        <div className="flex items-center gap-2 rounded-full bg-card px-3 py-2 shadow-sm">
          <span className={`size-2 rounded-full ${online ? "bg-accent" : "bg-muted-foreground"}`} />
          <span className="text-sm font-medium text-foreground">{online ? "Online" : "Offline"}</span>
          <Switch checked={online} onCheckedChange={setOnline} />
        </div>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3">
        <Card className="gap-1 p-4">
          <IndianRupee className="size-5 text-accent" />
          <p className="text-2xl font-bold text-foreground">{formatINR(earnings)}</p>
          <p className="text-xs text-muted-foreground">Today's earnings</p>
        </Card>
        <Card className="gap-1 p-4">
          <Package className="size-5 text-primary" />
          <p className="text-2xl font-bold text-foreground">{completed}</p>
          <p className="text-xs text-muted-foreground">Deliveries done</p>
        </Card>
      </div>

      {active ? (
        <Card className="mt-5 gap-0 overflow-hidden p-0">
          <div className="flex items-center justify-between bg-primary px-4 py-3 text-primary-foreground">
            <span className="font-semibold">Active Delivery {"\u00B7"} {active.id}</span>
            <Badge className="bg-primary-foreground/20 text-primary-foreground">
              {active.status === "picked_up" ? "Pickup" : "Delivering"}
            </Badge>
          </div>
          <MapView center={center} markers={markers} height="180px" />
          <div className="flex flex-col gap-3 p-4">
            <div className="flex items-start gap-3">
              <Store className="mt-0.5 size-5 text-primary" />
              <div>
                <p className="text-sm font-medium text-foreground">{active.millName}</p>
                <p className="text-xs text-muted-foreground">Pickup point</p>
              </div>
            </div>
            <Separator />
            <div className="flex items-start gap-3">
              <MapPin className="mt-0.5 size-5 text-accent" />
              <div className="flex-1">
                <p className="text-sm font-medium text-foreground">{active.customerName}</p>
                <p className="text-xs text-muted-foreground">{active.address}</p>
              </div>
              <Button variant="outline" size="icon" className="size-9 bg-transparent" asChild>
                <a href={`tel:+91${active.customerPhone}`} aria-label="Call customer">
                  <Phone className="size-4" />
                </a>
              </Button>
            </div>

            <div className="grid grid-cols-2 gap-3 rounded-lg bg-muted p-3 text-center">
              <div>
                <p className="text-xs text-muted-foreground">Distance</p>
                <p className="font-semibold text-foreground">{active.distanceKm} km</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Your payout</p>
                <p className="font-semibold text-accent">{formatINR(payout)}</p>
              </div>
            </div>

            {active.status === "picked_up" && (
              <SlideConfirm
                label="Slide to confirm pickup"
                onConfirm={() => {
                  advance("out_for_delivery")
                  toast.success("Pickup confirmed — heading to customer")
                }}
              />
            )}
            {active.status === "out_for_delivery" && (
              <SlideConfirm
                label="Slide to confirm delivered"
                onConfirm={() => {
                  complete()
                  toast.success("Delivery completed! Payout added.")
                }}
              />
            )}

            <Button variant="outline" className="w-full bg-transparent" asChild>
              <a
                href={`https://www.google.com/maps/dir/?api=1&destination=${active.status === "picked_up" ? `${active.millLat},${active.millLng}` : `${active.addressLat},${active.addressLng}`}`}
                target="_blank"
                rel="noreferrer"
              >
                <Navigation className="size-4" /> Open in Maps
              </a>
            </Button>
          </div>
        </Card>
      ) : (
        <Card className="mt-5 items-center gap-2 p-8 text-center">
          <Package className="size-10 text-accent" />
          <p className="font-medium text-foreground">No active delivery</p>
          <p className="text-sm text-muted-foreground">
            {available.length > 0 ? `${available.length} jobs waiting nearby` : "Stay online to receive jobs"}
          </p>
          <Button asChild className="mt-2">
            <Link href="/delivery/jobs">View available jobs</Link>
          </Button>
        </Card>
      )}
    </div>
  )
}
