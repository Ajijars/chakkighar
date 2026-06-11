"use client"

import { useState } from "react"
import Link from "next/link"
import Image from "next/image"
import { useQuery } from "@tanstack/react-query"
import { useLocation } from "@/lib/location-context"
import { useAuth } from "@/lib/auth-context"
import { api } from "@/lib/api-client"
import type { Mill, Grain, GrainCategory } from "@/lib/data"
import { MAX_RADIUS_KM } from "@/lib/geo"
import { MapPin, Star, Clock, Search, ChevronRight, Bike, LocateFixed } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

const categories: { id: "all" | GrainCategory; label: string }[] = [
  { id: "all", label: "All" },
  { id: "wheat", label: "Wheat" },
  { id: "millet", label: "Millets" },
  { id: "rice", label: "Rice" },
  { id: "pulses", label: "Pulses" },
  { id: "spices", label: "Spices" },
  { id: "corn", label: "Corn" },
]

export default function CustomerHome() {
  const { lat, lng, address, loading: locLoading, requestLocation } = useLocation()
  const { user } = useAuth()
  const [query, setQuery] = useState("")
  const [cat, setCat] = useState<"all" | GrainCategory>("all")

  const { data: millsData, isLoading } = useQuery({
    queryKey: ["mills", lat, lng, query, cat],
    queryFn: () => {
      const params = new URLSearchParams()
      if (lat != null) params.set("lat", String(lat))
      if (lng != null) params.set("lng", String(lng))
      if (query) params.set("q", query)
      if (cat !== "all") params.set("category", cat)
      return api<{ mills: Mill[] }>(`/api/mills?${params}`)
    },
    enabled: lat != null && lng != null,
  })

  const { data: grainsData } = useQuery({
    queryKey: ["grains"],
    queryFn: () => api<{ grains: Grain[] }>("/api/grains"),
  })

  const filteredMills = millsData?.mills ?? []
  const popularGrains = (grainsData?.grains ?? []).filter((g) => g.popular)
  const needsAddress = !!user && !(user.addresses?.length)

  return (
    <div>
      {needsAddress && (
        <div className="mx-5 mt-3 rounded-2xl border border-primary/30 bg-primary/5 p-4">
          <p className="text-sm font-semibold">Set your delivery location</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Add an address with map pin so we can show mills within 10 km of you.
          </p>
          <Link href="/customer/addresses" className="mt-2 inline-block text-sm font-semibold text-primary">
            Add address →
          </Link>
        </div>
      )}
      <header className="sticky top-0 z-30 bg-background/95 px-5 pb-3 pt-5 backdrop-blur">
        <div className="flex items-center justify-between">
          <div>
            <p className="flex items-center gap-1 text-xs font-medium text-muted-foreground">
              <MapPin className="size-3.5 text-primary" /> Deliver to
            </p>
            {user ? (
              <Link href="/customer/addresses" className="text-sm font-bold hover:text-primary">
                {address ?? "Getting location..."}
              </Link>
            ) : (
              <p className="text-sm font-bold">{address ?? "Getting location..."}</p>
            )}
            <p className="mt-0.5 text-[11px] font-medium text-accent">
              Showing mills within {MAX_RADIUS_KM} km
            </p>
          </div>
          <Link
            href={user ? "/customer/profile" : "/login/customer"}
            className="flex size-10 items-center justify-center rounded-full bg-secondary text-sm font-bold text-secondary-foreground"
          >
            {user?.name?.slice(0, 2).toUpperCase() ?? "?"}
          </Link>
        </div>
        <div className="mt-3 flex gap-2">
          <div className="flex flex-1 items-center gap-2 rounded-2xl border border-input bg-card px-3 py-2.5">
            <Search className="size-4 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search mills or grains"
              className="border-0 bg-transparent px-0 shadow-none focus-visible:ring-0"
            />
          </div>
          <Button size="icon" variant="outline" onClick={requestLocation} disabled={locLoading} className="shrink-0 bg-transparent">
            <LocateFixed className="size-4" />
          </Button>
        </div>
      </header>

      <div className="no-scrollbar flex gap-2 overflow-x-auto px-5 py-3">
        {categories.map((c) => (
          <button
            key={c.id}
            onClick={() => setCat(c.id)}
            className={cn(
              "whitespace-nowrap rounded-full border px-4 py-1.5 text-sm font-medium transition-colors",
              cat === c.id
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border bg-card text-muted-foreground hover:text-foreground",
            )}
          >
            {c.label}
          </button>
        ))}
      </div>

      <section className="px-5 py-2">
        <h2 className="mb-3 text-base font-bold">Popular this week</h2>
        <div className="no-scrollbar flex gap-3 overflow-x-auto pb-1">
          {popularGrains.map((g) => (
            <div key={g.id} className="w-28 shrink-0">
              <div className="relative aspect-square overflow-hidden rounded-2xl border border-border">
                <Image src={g.image || "/placeholder.svg"} alt={g.name} fill className="object-cover" />
              </div>
              <p className="mt-1.5 truncate text-sm font-semibold">{g.name}</p>
              <p className="text-xs text-muted-foreground">{"\u20B9"}{g.pricePerKg}/kg</p>
            </div>
          ))}
        </div>
      </section>

      <section className="px-5 py-3">
        <h2 className="mb-3 text-base font-bold">
          Mills near you{" "}
          <span className="text-muted-foreground">
            ({isLoading ? "..." : filteredMills.length})
          </span>
        </h2>
        {filteredMills.length === 0 && !isLoading && (
          <div className="rounded-3xl border border-dashed border-border p-8 text-center">
            <MapPin className="mx-auto size-7 text-muted-foreground" />
            <p className="mt-2 text-sm font-semibold">No mills within {MAX_RADIUS_KM} km</p>
            <p className="mt-1 text-xs text-muted-foreground">Try updating your location or changing filters.</p>
          </div>
        )}
        <div className="flex flex-col gap-4">
          {filteredMills.map((m) => (
            <Link
              key={m.id}
              href={`/customer/mill/${m.id}`}
              className="overflow-hidden rounded-3xl border border-border bg-card transition-shadow hover:shadow-lg hover:shadow-foreground/5"
            >
              <div className="relative aspect-[16/9]">
                <Image src={m.image || "/placeholder.svg"} alt={m.name} fill className="object-cover" />
                <div className="absolute right-3 top-3 flex items-center gap-1 rounded-full bg-card px-2 py-1 text-xs font-bold shadow">
                  <Star className="size-3 fill-primary text-primary" /> {m.rating}
                </div>
                {!m.isOpen && (
                  <div className="absolute inset-0 flex items-center justify-center bg-foreground/50">
                    <span className="rounded-full bg-card px-3 py-1 text-sm font-semibold">Currently Closed</span>
                  </div>
                )}
              </div>
              <div className="p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-bold">{m.name}</h3>
                    <p className="text-xs text-muted-foreground">{m.specialties.join(" \u00B7 ")}</p>
                  </div>
                  <ChevronRight className="size-5 text-muted-foreground" />
                </div>
                <div className="mt-3 flex items-center gap-4 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Clock className="size-3.5" /> {m.etaMins} min
                  </span>
                  <span className="flex items-center gap-1">
                    <MapPin className="size-3.5" /> {m.distanceKm} km
                  </span>
                  <span className="flex items-center gap-1">
                    <Bike className="size-3.5" /> {"\u20B9"}{m.deliveryFee} delivery
                  </span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </section>
    </div>
  )
}
