"use client"

import { useEffect, useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { useMill } from "@/lib/mill-context"
import { api } from "@/lib/api-client"
import { formatINR } from "@/lib/data"
import { MAX_RADIUS_KM } from "@/lib/geo"
import { Card } from "@/components/ui/card"
import { Switch } from "@/components/ui/switch"
import { Slider } from "@/components/ui/slider"
import { Badge } from "@/components/ui/badge"
import { toast } from "sonner"
import { IndianRupee, Package, Wheat, TrendingUp, MapPin } from "lucide-react"

export default function MillAnalyticsPage() {
  const { isOpen, setIsOpen, setDeliveryRadius } = useMill()
  const [radius, setRadius] = useState(8)

  const { data, isLoading } = useQuery({
    queryKey: ["mill-analytics"],
    queryFn: () =>
      api<{
        weekTotal: number
        avgOrder: number
        kgMilled: number
        topGrains: { name: string; share: number }[]
        weeklyRevenue: { day: string; value: number }[]
        growthPct: number
        deliveryRadiusKm: number
      }>("/api/mill/analytics"),
    refetchInterval: 15000,
  })

  useEffect(() => {
    if (data?.deliveryRadiusKm != null) setRadius(data.deliveryRadiusKm)
  }, [data?.deliveryRadiusKm])

  if (isLoading || !data) {
    return <p className="p-5 text-muted-foreground">Loading analytics...</p>
  }

  const max = Math.max(...data.weeklyRevenue.map((d) => d.value), 1)

  return (
    <div className="px-4 py-5">
      <h1 className="text-2xl font-bold text-foreground text-balance">Analytics</h1>
      <p className="text-sm text-muted-foreground">Your performance & operating limits</p>

      <div className="mt-4 grid grid-cols-3 gap-3">
        <Card className="gap-1 p-3">
          <IndianRupee className="size-5 text-primary" />
          <p className="text-lg font-bold leading-none text-foreground">{formatINR(data.weekTotal)}</p>
          <p className="text-xs text-muted-foreground">This week</p>
        </Card>
        <Card className="gap-1 p-3">
          <Package className="size-5 text-primary" />
          <p className="text-lg font-bold leading-none text-foreground">{formatINR(data.avgOrder)}</p>
          <p className="text-xs text-muted-foreground">Avg order</p>
        </Card>
        <Card className="gap-1 p-3">
          <Wheat className="size-5 text-primary" />
          <p className="text-lg font-bold leading-none text-foreground">{data.kgMilled}kg</p>
          <p className="text-xs text-muted-foreground">Milled</p>
        </Card>
      </div>

      <Card className="mt-3 gap-4 p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="font-semibold text-foreground">Revenue trend</p>
            <p className="text-xs text-muted-foreground">Last 7 days</p>
          </div>
          {data.growthPct > 0 && (
            <Badge className="bg-accent/15 text-accent">
              <TrendingUp className="size-3.5" /> +{data.growthPct}%
            </Badge>
          )}
        </div>
        <div className="flex h-40 items-stretch justify-between gap-2">
          {data.weeklyRevenue.map((d) => (
            <div key={d.day} className="flex h-full flex-1 flex-col items-center justify-end gap-1.5">
              <span className="text-[10px] font-medium text-muted-foreground">
                {d.value > 0 ? `${Math.round(d.value / 100) / 10}k` : "—"}
              </span>
              <div
                className="w-full rounded-t-md bg-primary transition-all"
                style={{ height: `${(d.value / max) * 80}%`, minHeight: d.value > 0 ? "4px" : "0" }}
                aria-label={`${d.day}: ${formatINR(d.value)}`}
              />
              <span className="text-[11px] font-medium text-muted-foreground">{d.day}</span>
            </div>
          ))}
        </div>
      </Card>

      <Card className="mt-3 gap-3 p-4">
        <p className="font-semibold text-foreground">Top sellers</p>
        {data.topGrains.length === 0 && (
          <p className="text-sm text-muted-foreground">No sales data yet.</p>
        )}
        <div className="flex flex-col gap-3">
          {data.topGrains.map((g) => (
            <div key={g.name} className="flex items-center gap-3">
              <span className="w-28 shrink-0 truncate text-sm text-foreground">{g.name}</span>
              <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
                <div className="h-full rounded-full bg-accent" style={{ width: `${g.share}%` }} />
              </div>
              <span className="w-9 shrink-0 text-right text-xs font-semibold text-muted-foreground">{g.share}%</span>
            </div>
          ))}
        </div>
      </Card>

      <Card className="mt-3 gap-4 p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="font-semibold text-foreground">Platform status</p>
            <p className="text-xs text-muted-foreground">
              {isOpen ? "Live and discoverable to customers" : "Hidden from customer search"}
            </p>
          </div>
          <Switch
            checked={isOpen}
            onCheckedChange={(v) => {
              setIsOpen(v)
              toast.success(v ? "Mill is now live" : "Mill taken offline")
            }}
          />
        </div>

        <div className="border-t border-border pt-4">
          <div className="flex items-center justify-between">
            <p className="flex items-center gap-1.5 text-sm font-medium text-foreground">
              <MapPin className="size-4 text-primary" /> Max delivery range
            </p>
            <span className="text-sm font-bold text-primary">{radius} km</span>
          </div>
          <Slider
            value={[radius]}
            onValueCommitted={(v) => {
              const km = Array.isArray(v) ? v[0] : v
              setDeliveryRadius(km)
              toast.success(`Delivery range set to ${km} km`)
            }}
            onValueChange={(v) => setRadius(Array.isArray(v) ? v[0] : v)}
            min={1}
            max={MAX_RADIUS_KM}
            step={1}
            className="mt-3"
          />
          <p className="mt-2 text-xs text-muted-foreground">
            Hard-capped at {MAX_RADIUS_KM} km to keep flour fresh and deliveries fast.
          </p>
        </div>
      </Card>
    </div>
  )
}
