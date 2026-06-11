"use client"

import Link from "next/link"
import { useQuery } from "@tanstack/react-query"
import { useAuth } from "@/lib/auth-context"
import { api } from "@/lib/api-client"
import { statusMeta, formatINR, type Order } from "@/lib/data"
import { cn } from "@/lib/utils"
import { ChevronRight, Package } from "lucide-react"
import { Button } from "@/components/ui/button"

export default function OrdersPage() {
  const { user } = useAuth()

  const { data, isLoading } = useQuery({
    queryKey: ["customer-orders"],
    queryFn: () => api<{ orders: Order[] }>("/api/orders"),
    enabled: !!user,
    refetchInterval: 5000,
  })

  if (!user) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 px-5 text-center">
        <p className="text-muted-foreground">Log in to see your orders</p>
        <Link href="/login/customer"><Button>Log in</Button></Link>
      </div>
    )
  }

  const orders = data?.orders ?? []

  return (
    <div>
      <header className="sticky top-0 z-30 bg-background/95 px-5 py-5 backdrop-blur">
        <h1 className="text-xl font-bold">Your orders</h1>
        <p className="text-sm text-muted-foreground">Track current and past orders</p>
      </header>

      {isLoading && <p className="px-5 text-sm text-muted-foreground">Loading...</p>}

      <div className="flex flex-col gap-3 px-5 py-2">
        {orders.map((o) => {
          const active = !["delivered", "cancelled"].includes(o.status)
          const meta = statusMeta[o.status as keyof typeof statusMeta]
          return (
            <Link key={o.id} href={`/customer/orders/${o.id}`} className="rounded-2xl border border-border bg-card p-4 transition-shadow hover:shadow-md">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                    <Package className="size-5" />
                  </div>
                  <div>
                    <p className="font-semibold">{o.millName}</p>
                    <p className="text-xs text-muted-foreground">{o.id} {"\u00B7"} {o.placedAt}</p>
                  </div>
                </div>
                <ChevronRight className="size-5 text-muted-foreground" />
              </div>
              <div className="mt-3 flex items-center justify-between">
                <span className={cn("rounded-full px-2.5 py-1 text-xs font-semibold", meta?.tone)}>{meta?.label ?? o.status}</span>
                <span className="text-sm font-bold">{formatINR(o.total)}</span>
              </div>
              {active && <span className="mt-2 inline-block text-xs font-semibold text-primary">Track order {"\u2192"}</span>}
            </Link>
          )
        })}
        {!isLoading && orders.length === 0 && (
          <p className="py-12 text-center text-sm text-muted-foreground">No orders yet. Place your first order!</p>
        )}
      </div>
    </div>
  )
}
