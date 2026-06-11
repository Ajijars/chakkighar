"use client"

import { use, useState } from "react"
import Image from "next/image"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useQuery } from "@tanstack/react-query"
import { useLocation } from "@/lib/location-context"
import { api } from "@/lib/api-client"
import type { Grain, Mill } from "@/lib/data"
import { GrainCustomizer } from "@/components/customer/grain-customizer"
import { useCart } from "@/lib/cart-context"
import { formatINR } from "@/lib/data"
import { ArrowLeft, Star, Clock, MapPin, ShieldCheck, Plus, ShoppingCart } from "lucide-react"
import { Button } from "@/components/ui/button"

export default function MillDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()
  const { lat, lng } = useLocation()
  const { count, subtotal } = useCart()
  const [selected, setSelected] = useState<Grain | null>(null)
  const [open, setOpen] = useState(false)

  const { data, isLoading } = useQuery({
    queryKey: ["mill", id, lat, lng],
    queryFn: () => {
      const p = new URLSearchParams()
      if (lat != null) p.set("lat", String(lat))
      if (lng != null) p.set("lng", String(lng))
      return api<{ mill: Mill; products: Grain[] }>(`/api/mills/${id}?${p}`)
    },
  })

  const mill = data?.mill
  const products = data?.products ?? []

  if (isLoading) {
    return <div className="flex min-h-[50vh] items-center justify-center text-muted-foreground">Loading...</div>
  }
  if (!mill) {
    return <div className="flex min-h-[50vh] items-center justify-center text-muted-foreground">Mill not found</div>
  }

  function openGrain(g: Grain) {
    setSelected(g)
    setOpen(true)
  }

  return (
    <div>
      <div className="relative aspect-[16/10] w-full">
        <Image src={mill.image || "/placeholder.svg"} alt={mill.name} fill className="object-cover" priority />
        <div className="absolute inset-0 bg-gradient-to-t from-foreground/60 to-transparent" />
        <button
          onClick={() => router.back()}
          className="absolute left-4 top-4 flex size-10 items-center justify-center rounded-full bg-card/90 backdrop-blur"
          aria-label="Go back"
        >
          <ArrowLeft className="size-5" />
        </button>
      </div>

      <div className="relative -mt-6 rounded-t-3xl bg-background px-5 pt-5">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-xl font-bold">{mill.name}</h1>
            <p className="text-sm text-muted-foreground">by {mill.owner} {"\u00B7"} {mill.yearsActive} yrs</p>
          </div>
          <span className="flex items-center gap-1 rounded-full bg-accent/10 px-2.5 py-1 text-sm font-bold text-accent">
            <Star className="size-3.5 fill-accent" /> {mill.rating}
          </span>
        </div>
        <p className="mt-2 flex items-center gap-1 text-sm text-muted-foreground">
          <MapPin className="size-3.5" /> {mill.address} {"\u00B7"} {mill.distanceKm} km
        </p>
        <div className="mt-4 grid grid-cols-3 gap-2 rounded-2xl border border-border bg-card p-3 text-center">
          <div>
            <p className="flex items-center justify-center gap-1 text-sm font-bold">
              <Clock className="size-3.5 text-primary" /> {mill.etaMins}m
            </p>
            <p className="text-[11px] text-muted-foreground">Delivery</p>
          </div>
          <div className="border-x border-border">
            <p className="text-sm font-bold">{mill.reviews.toLocaleString("en-IN")}</p>
            <p className="text-[11px] text-muted-foreground">Reviews</p>
          </div>
          <div>
            <p className="flex items-center justify-center gap-1 text-sm font-bold">
              <ShieldCheck className="size-3.5 text-accent" /> Verified
            </p>
            <p className="text-[11px] text-muted-foreground">Hygiene</p>
          </div>
        </div>
      </div>

      <div className="px-5 py-5">
        <h2 className="mb-3 text-base font-bold">Choose your grains</h2>
        <div className="flex flex-col gap-3">
          {products.map((g) => (
            <div key={g.id} className="flex items-center gap-3 rounded-2xl border border-border bg-card p-3">
              <div className="relative size-16 shrink-0 overflow-hidden rounded-xl">
                <Image src={g.image || "/placeholder.svg"} alt={g.name} fill className="object-cover" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-semibold">{g.name}</p>
                <p className="text-xs text-muted-foreground">{g.localName}</p>
                <p className="mt-0.5 line-clamp-1 text-xs text-muted-foreground">{g.description}</p>
                <p className="mt-1 text-sm font-bold text-primary">{formatINR(g.pricePerKg)}/kg</p>
              </div>
              <Button size="sm" variant="outline" className="shrink-0 gap-1 bg-transparent" onClick={() => openGrain(g)} disabled={!mill.isOpen}>
                <Plus className="size-4" /> Add
              </Button>
            </div>
          ))}
        </div>
      </div>

      <GrainCustomizer grain={selected} mill={mill} open={open} onOpenChange={setOpen} />

      {count > 0 && (
        <div className="fixed bottom-20 left-1/2 z-30 w-full max-w-md -translate-x-1/2 px-5">
          <Link href="/customer/cart">
            <Button className="flex w-full items-center justify-between" size="lg">
              <span className="flex items-center gap-2">
                <ShoppingCart className="size-4" /> {count} item{count > 1 ? "s" : ""}
              </span>
              <span>{formatINR(subtotal)}</span>
            </Button>
          </Link>
        </div>
      )}
    </div>
  )
}
