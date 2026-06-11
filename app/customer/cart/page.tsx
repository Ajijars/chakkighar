"use client"

import { useState } from "react"
import Image from "next/image"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useQueryClient } from "@tanstack/react-query"
import { useCart } from "@/lib/cart-context"
import { useLocation } from "@/lib/location-context"
import { useAuth } from "@/lib/auth-context"
import { api } from "@/lib/api-client"
import { formatINR } from "@/lib/data"
import { MapView } from "@/components/map-view"
import { ArrowLeft, Minus, Plus, Trash2, ShoppingCart, MapPin, Wallet, Smartphone } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { toast } from "sonner"

export default function CartPage() {
  const { lines, updateQty, removeLine, subtotal, clear, deliveryFee } = useCart()
  const { lat, lng, address, addressId } = useLocation()
  const { user } = useAuth()
  const router = useRouter()
  const qc = useQueryClient()
  const [payment, setPayment] = useState<"upi" | "cash">("upi")
  const [placing, setPlacing] = useState(false)

  const taxes = Math.round(subtotal * 0.05)
  const total = subtotal + deliveryFee + taxes

  async function placeOrder() {
    if (!user) {
      router.push("/login/customer")
      return
    }
    if (lat == null || lng == null) {
      toast.error("Location required for delivery", { description: "Add your address on the map first." })
      router.push("/customer/addresses")
      return
    }
    if (!address?.trim() || address === "Set your location on the map") {
      toast.error("Please save a delivery address")
      router.push("/customer/addresses")
      return
    }
    setPlacing(true)
    try {
      await api("/api/orders", {
        method: "POST",
        body: JSON.stringify({
          millId: lines[0].millId,
          addressId: addressId ?? undefined,
          address: address ?? "Delivery address",
          addressLat: lat,
          addressLng: lng,
          paymentMethod: payment,
          items: lines.map((l) => ({
            grainId: l.grainId,
            grainName: l.grainName,
            subType: l.subType,
            quantityKg: l.quantityKg,
            texture: l.texture,
            roasted: l.roasted,
            pricePerKg: l.pricePerKg - (l.grindingFeePerKg ?? 0) - (l.roasted ? 8 : 0),
            grindingFeePerKg: l.grindingFeePerKg ?? 0,
          })),
        }),
      })
      await qc.invalidateQueries({ queryKey: ["customer-orders"] })
      clear()
      toast.success("Order placed!", { description: "Your mill is grinding fresh now." })
      router.push("/customer/orders")
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to place order")
    } finally {
      setPlacing(false)
    }
  }

  if (!lines.length) {
    return (
      <div className="flex min-h-[80vh] flex-col items-center justify-center gap-4 px-5 text-center">
        <div className="flex size-20 items-center justify-center rounded-full bg-secondary">
          <ShoppingCart className="size-9 text-muted-foreground" />
        </div>
        <div>
          <h2 className="text-lg font-bold">Your cart is empty</h2>
          <p className="mt-1 text-sm text-muted-foreground">Add some freshly milled flour to get started.</p>
        </div>
        <Link href="/customer">
          <Button>Browse mills</Button>
        </Link>
      </div>
    )
  }

  return (
    <div>
      <header className="sticky top-0 z-30 flex items-center gap-3 bg-background/95 px-5 py-4 backdrop-blur">
        <button onClick={() => router.back()} aria-label="Back" className="flex size-9 items-center justify-center rounded-full bg-secondary">
          <ArrowLeft className="size-5" />
        </button>
        <h1 className="text-lg font-bold">Your cart</h1>
      </header>

      <div className="px-5 pb-2">
        <p className="text-sm font-semibold text-muted-foreground">{lines[0].millName}</p>
      </div>

      <div className="flex flex-col gap-3 px-5">
        {lines.map((l) => (
          <div key={l.key} className="flex gap-3 rounded-2xl border border-border bg-card p-3">
            <div className="relative size-16 shrink-0 overflow-hidden rounded-xl">
              <Image src={l.image || "/placeholder.svg"} alt={l.grainName} fill className="object-cover" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold">{l.grainName}</p>
              <p className="text-xs capitalize text-muted-foreground">
                {l.texture} grind{l.roasted ? " \u00B7 roasted" : ""}
              </p>
              <p className="mt-1 text-sm font-bold text-primary">{formatINR(l.pricePerKg * l.quantityKg)}</p>
            </div>
            <div className="flex flex-col items-end justify-between">
              <button onClick={() => removeLine(l.key)} aria-label="Remove" className="text-muted-foreground hover:text-destructive">
                <Trash2 className="size-4" />
              </button>
              <div className="flex items-center gap-2 rounded-full border border-border px-1 py-0.5">
                <button onClick={() => updateQty(l.key, +(l.quantityKg - 0.5).toFixed(1))} aria-label="Decrease">
                  <Minus className="size-3.5" />
                </button>
                <span className="w-10 text-center text-xs font-bold tabular-nums">{l.quantityKg}kg</span>
                <button onClick={() => updateQty(l.key, +(l.quantityKg + 0.5).toFixed(1))} aria-label="Increase">
                  <Plus className="size-3.5" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="mx-5 mt-5 overflow-hidden rounded-2xl border border-border">
        {lat != null && lng != null && <MapView center={[lat, lng]} markers={[{ lat, lng, label: "Delivery", color: "#c2410c" }]} height="160px" />}
        <div className="flex items-start gap-3 bg-card p-4">
          <MapPin className="mt-0.5 size-5 text-primary" />
          <div className="flex-1">
            <p className="text-sm font-semibold">Delivery address</p>
            <p className="text-xs text-muted-foreground">{address ?? "Set your location"}</p>
          </div>
          <Link href="/customer/addresses" className="text-xs font-semibold text-primary">Change</Link>
        </div>
      </div>

      <div className="mx-5 mt-4">
        <p className="mb-2 text-sm font-semibold">Payment method</p>
        <div className="grid grid-cols-2 gap-2">
          <button onClick={() => setPayment("upi")} className={cn("flex items-center gap-2 rounded-2xl border p-3 transition-colors", payment === "upi" ? "border-primary bg-primary/10" : "border-border bg-card")}>
            <Smartphone className="size-5 text-primary" />
            <span className="text-sm font-semibold">UPI</span>
          </button>
          <button onClick={() => setPayment("cash")} className={cn("flex items-center gap-2 rounded-2xl border p-3 transition-colors", payment === "cash" ? "border-primary bg-primary/10" : "border-border bg-card")}>
            <Wallet className="size-5 text-primary" />
            <span className="text-sm font-semibold">Cash</span>
          </button>
        </div>
      </div>

      <div className="mx-5 mt-4 space-y-2 rounded-2xl border border-border bg-card p-4 text-sm">
        <div className="flex justify-between text-muted-foreground"><span>Item total</span><span>{formatINR(subtotal)}</span></div>
        <div className="flex justify-between text-muted-foreground"><span>Delivery fee</span><span>{formatINR(deliveryFee)}</span></div>
        <div className="flex justify-between text-muted-foreground"><span>Taxes & charges</span><span>{formatINR(taxes)}</span></div>
        <div className="mt-2 flex justify-between border-t border-border pt-2 text-base font-bold">
          <span>To pay</span><span>{formatINR(total)}</span>
        </div>
      </div>

      <div className="fixed bottom-20 left-1/2 z-30 w-full max-w-md -translate-x-1/2 border-t border-border bg-card/95 px-5 py-3 backdrop-blur">
        <Button className="w-full" size="lg" onClick={placeOrder} disabled={placing}>
          {placing ? "Placing order..." : `Place order \u00B7 ${formatINR(total)}`}
        </Button>
      </div>
      <div className="h-24" />
    </div>
  )
}
