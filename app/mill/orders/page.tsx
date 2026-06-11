"use client"

import { useState } from "react"
import { useMill } from "@/lib/mill-context"
import { formatINR, statusMeta, type Order, type OrderStatus } from "@/lib/data"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Separator } from "@/components/ui/separator"
import { toast } from "sonner"
import { Clock, MapPin, Phone, Flame } from "lucide-react"

const nextStep: Partial<Record<OrderStatus, { next: OrderStatus; label: string }>> = {
  placed: { next: "accepted", label: "Accept Order" },
  accepted: { next: "grinding", label: "Start Grinding" },
  grinding: { next: "ready", label: "Mark Ready" },
}

const filters = [
  { value: "active", label: "Active" },
  { value: "ready", label: "Ready" },
  { value: "done", label: "Completed" },
]

export default function MillOrdersPage() {
  const { orders, advance, reject } = useMill()
  const [filter, setFilter] = useState("active")

  const filtered = orders.filter((o) => {
    if (filter === "active") return ["placed", "accepted", "grinding"].includes(o.status)
    if (filter === "ready") return ["ready", "picked_up", "out_for_delivery"].includes(o.status)
    return ["delivered", "cancelled"].includes(o.status)
  })

  return (
    <div className="px-4 py-5">
      <h1 className="text-2xl font-bold text-foreground text-balance">Orders</h1>
      <p className="text-sm text-muted-foreground">Manage incoming grinding requests</p>

      <Tabs value={filter} onValueChange={setFilter} className="mt-4">
        <TabsList className="w-full">
          {filters.map((f) => (
            <TabsTrigger key={f.value} value={f.value} className="flex-1">
              {f.label}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      <div className="mt-4 flex flex-col gap-3">
        {filtered.length === 0 && (
          <div className="py-12 text-center">
            <p className="text-sm text-muted-foreground">No orders here right now.</p>
            <p className="mt-2 text-xs text-muted-foreground">
              Customers must order from <strong>your mill</strong> on the customer app. After they checkout, tap{" "}
              <strong>Accept → Start Grinding → Mark Ready</strong> to send the job to delivery riders.
            </p>
          </div>
        )}
        {filtered.map((order) => (
          <OrderCard
            key={order.id}
            order={order}
            onAdvance={async (next, label) => {
              try {
                await advance(order.id, next)
                toast.success(`${order.id}: ${label}`)
              } catch {
                /* error toast from context */
              }
            }}
            onReject={async () => {
              try {
                await reject(order.id)
                toast.error(`${order.id} rejected`)
              } catch {
                /* error toast from context */
              }
            }}
          />
        ))}
      </div>
    </div>
  )
}

function OrderCard({
  order,
  onAdvance,
  onReject,
}: {
  order: Order
  onAdvance: (next: OrderStatus, label: string) => Promise<void>
  onReject: () => Promise<void>
}) {
  const step = nextStep[order.status]
  const meta = statusMeta[order.status]

  return (
    <Card className="overflow-hidden p-0">
      <div className="flex items-center justify-between px-4 py-3">
        <div>
          <p className="font-semibold text-foreground">{order.id}</p>
          <p className="flex items-center gap-1 text-xs text-muted-foreground">
            <Clock className="size-3" /> {order.placedAt}
          </p>
        </div>
        <Badge className={meta.tone}>{meta.label}</Badge>
      </div>
      <Separator />
      <div className="px-4 py-3">
        <p className="text-sm font-medium text-foreground">{order.customerName}</p>
        <p className="flex items-center gap-1 text-xs text-muted-foreground">
          <MapPin className="size-3" /> {order.address}
        </p>
        <p className="flex items-center gap-1 text-xs text-muted-foreground">
          <Phone className="size-3" /> {order.customerPhone}
        </p>

        <div className="mt-3 flex flex-col gap-1.5">
          {order.items.map((item, i) => (
            <div key={i} className="flex items-center justify-between text-sm">
              <span className="text-foreground">
                {item.grainName}{" "}
                <span className="text-muted-foreground">
                  {"\u00B7"} {item.quantityKg}kg {"\u00B7"} {item.texture}
                </span>
                {item.roasted && (
                  <span className="ml-1 inline-flex items-center gap-0.5 text-xs text-accent">
                    <Flame className="size-3" /> roasted
                  </span>
                )}
              </span>
              <span className="text-muted-foreground">{formatINR(item.quantityKg * item.pricePerKg)}</span>
            </div>
          ))}
        </div>
      </div>
      <Separator />
      <div className="flex items-center justify-between px-4 py-3">
        <div>
          <p className="text-xs text-muted-foreground">Total {order.paymentMethod === "upi" ? "(UPI)" : "(Cash)"}</p>
          <p className="font-semibold text-foreground">{formatINR(order.total)}</p>
        </div>
        <div className="flex gap-2">
          {order.status === "placed" && (
            <Button variant="outline" size="sm" onClick={onReject}>
              Reject
            </Button>
          )}
          {step && (
            <Button size="sm" onClick={() => onAdvance(step.next, step.label)}>
              {step.label}
            </Button>
          )}
          {order.status === "ready" && <Badge className="bg-accent/15 text-accent">Awaiting pickup</Badge>}
        </div>
      </div>
    </Card>
  )
}
