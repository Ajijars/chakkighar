"use client"

import Link from "next/link"
import { useQuery } from "@tanstack/react-query"
import { useMill } from "@/lib/mill-context"
import { api } from "@/lib/api-client"
import { formatINR } from "@/lib/data"
import { Switch } from "@/components/ui/switch"
import { Wheat, TrendingUp, Package, Clock, Star, ArrowRight, IndianRupee } from "lucide-react"
import { toast } from "sonner"

export default function MillDashboard() {
  const { isOpen, setIsOpen, orders, mill } = useMill()

  const { data: analytics } = useQuery({
    queryKey: ["mill-analytics"],
    queryFn: () => api<{ topSeller: string | null }>("/api/mill/analytics"),
    refetchInterval: 30000,
  })

  const todayStart = new Date()
  todayStart.setHours(0, 0, 0, 0)

  const todayOrders = orders.filter((o) => {
    // placedAt is relative string from API — use all active + today's completed
    return true
  })

  const active = orders.filter((o) => !["delivered", "cancelled"].includes(o.status))
  const newOrders = orders.filter((o) => o.status === "placed")
  const revenue = orders.reduce((s, o) => s + o.total, 0)
  const kgMilled = Math.round(
    orders.reduce((s, o) => s + o.items.reduce((a, i) => a + i.quantityKg, 0), 0),
  )

  return (
    <div>
      <header className="bg-foreground px-5 pb-6 pt-6 text-background">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex size-11 items-center justify-center rounded-2xl bg-primary text-primary-foreground">
              <Wheat className="size-6" />
            </div>
            <div>
              <p className="text-xs opacity-70">Welcome back</p>
              <h1 className="font-bold">{mill?.name ?? "Your mill"}</h1>
            </div>
          </div>
          {mill && (
            <span className="flex items-center gap-1 rounded-full bg-background/15 px-2.5 py-1 text-sm font-bold">
              <Star className="size-3.5 fill-primary text-primary" /> {mill.rating}
            </span>
          )}
        </div>

        <div className="mt-5 flex items-center justify-between rounded-2xl bg-background/10 p-4">
          <div className="flex items-center gap-3">
            <span className={`size-2.5 rounded-full ${isOpen ? "bg-accent" : "bg-destructive"}`} />
            <div>
              <p className="text-sm font-bold">{isOpen ? "Mill is Open" : "Mill is Closed"}</p>
              <p className="text-xs opacity-70">{isOpen ? "Accepting new orders" : "Not accepting orders"}</p>
            </div>
          </div>
          <Switch
            checked={isOpen}
            onCheckedChange={(v) => {
              setIsOpen(v)
              toast.success(v ? "Mill is now open" : "Mill is now closed")
            }}
          />
        </div>
      </header>

      {!isOpen && (
        <div className="mx-5 mt-4 rounded-2xl border border-destructive/30 bg-destructive/5 p-4">
          <p className="text-sm font-semibold text-destructive">Mill is closed</p>
          <p className="mt-1 text-xs text-muted-foreground">Turn the shop on above — customers cannot place orders while closed.</p>
        </div>
      )}

      {newOrders.length > 0 && (
        <div className="mx-5 mt-4 rounded-2xl border border-primary/30 bg-primary/5 p-4">
          <p className="text-sm font-semibold text-primary">{newOrders.length} new order{newOrders.length > 1 ? "s" : ""} waiting</p>
          <Link href="/mill/orders" className="mt-1 inline-block text-xs font-semibold text-primary">Accept in Orders →</Link>
        </div>
      )}

      <div className="-mt-4 grid grid-cols-3 gap-3 px-5">
        <div className="rounded-2xl border border-border bg-card p-3">
          <IndianRupee className="size-5 text-primary" />
          <p className="mt-2 text-lg font-bold leading-none">{formatINR(revenue)}</p>
          <p className="text-xs text-muted-foreground">Revenue</p>
        </div>
        <div className="rounded-2xl border border-border bg-card p-3">
          <Package className="size-5 text-primary" />
          <p className="mt-2 text-lg font-bold leading-none">{todayOrders.length}</p>
          <p className="text-xs text-muted-foreground">Orders</p>
        </div>
        <div className="rounded-2xl border border-border bg-card p-3">
          <Wheat className="size-5 text-primary" />
          <p className="mt-2 text-lg font-bold leading-none">{kgMilled}kg</p>
          <p className="text-xs text-muted-foreground">Milled</p>
        </div>
      </div>

      <div className="px-5 py-5">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-base font-bold">Active orders</h2>
          <Link href="/mill/orders" className="flex items-center gap-1 text-sm font-semibold text-primary">
            View all <ArrowRight className="size-4" />
          </Link>
        </div>
        <div className="flex flex-col gap-3">
          {active.slice(0, 3).map((o) => (
            <Link key={o.id} href="/mill/orders" className="flex items-center justify-between rounded-2xl border border-border bg-card p-4">
              <div>
                <p className="text-sm font-bold">{o.customerName}</p>
                <p className="text-xs text-muted-foreground">{o.id} {"\u00B7"} {o.items.length} item{o.items.length > 1 ? "s" : ""}</p>
              </div>
              <div className="text-right">
                <p className="text-sm font-bold">{formatINR(o.total)}</p>
                <p className="flex items-center justify-end gap-1 text-xs text-muted-foreground">
                  <Clock className="size-3" /> {o.placedAt}
                </p>
              </div>
            </Link>
          ))}
          {active.length === 0 && (
            <div className="rounded-2xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
              No active orders right now.
            </div>
          )}
        </div>
      </div>

      {analytics?.topSeller && (
        <div className="mx-5 mb-6 flex items-center gap-3 rounded-2xl bg-accent/10 p-4">
          <TrendingUp className="size-5 text-accent" />
          <p className="text-sm text-foreground">
            <span className="font-bold">{analytics.topSeller}</span> is your top seller this week.
          </p>
        </div>
      )}
    </div>
  )
}
