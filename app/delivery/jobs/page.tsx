"use client"

import Link from "next/link"
import { useDelivery } from "@/lib/delivery-context"
import { formatINR } from "@/lib/data"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Store, MapPin, Navigation, IndianRupee, Package2, Wifi } from "lucide-react"

export default function DeliveryJobsPage() {
  const { available, active, accept, online } = useDelivery()
  const router = useRouter()

  return (
    <div className="px-4 py-5">
      <h1 className="text-2xl font-bold text-foreground text-balance">Available Jobs</h1>
      <p className="text-sm text-muted-foreground">Accept a job to start earning</p>

      {!online && (
        <Card className="mt-4 flex-row items-center gap-3 border-accent/30 bg-accent/5 p-3">
          <Wifi className="size-5 text-accent" />
          <p className="flex-1 text-sm text-foreground">
            Go <strong>Online</strong> on the home or profile screen before accepting jobs.
          </p>
        </Card>
      )}

      {active && (
        <Card className="mt-4 flex-row items-center gap-3 border-primary/30 bg-primary/5 p-3">
          <Package2 className="size-5 text-primary" />
          <div className="flex-1">
            <p className="text-sm font-medium text-foreground">Active delivery: {active.id}</p>
            <p className="text-xs text-muted-foreground">Finish it before accepting new jobs.</p>
          </div>
          <Button size="sm" asChild>
            <Link href="/delivery">Continue</Link>
          </Button>
        </Card>
      )}

      <div className="mt-4 flex flex-col gap-3">
        {available.length === 0 && (
          <Card className="items-center gap-2 p-8 text-center">
            <p className="font-medium text-foreground">No jobs available right now</p>
            <p className="text-sm text-muted-foreground">
              Jobs appear when a mill marks an order as <strong>Ready for Pickup</strong> within 10 km.
            </p>
          </Card>
        )}

        {available.map((job) => {
          const totalKg = job.items.reduce((s, i) => s + i.quantityKg, 0)
          const payout = job.payout ?? job.deliveryFee + 25
          return (
            <Card key={job.id} className="gap-0 overflow-hidden p-0">
              <div className="flex items-center justify-between px-4 py-3">
                <div className="flex items-center gap-1.5">
                  <Badge className="bg-accent/15 text-accent">{formatINR(payout)} payout</Badge>
                  <span className="text-xs text-muted-foreground">{job.distanceKm} km trip</span>
                </div>
                <span className="text-xs text-muted-foreground">{totalKg} kg load</span>
              </div>
              <Separator />
              <div className="flex flex-col gap-2.5 p-4">
                <div className="flex items-center gap-3">
                  <Store className="size-4 text-primary" />
                  <div>
                    <p className="text-sm font-medium text-foreground">{job.millName}</p>
                    <p className="text-xs text-muted-foreground">Pickup</p>
                  </div>
                </div>
                <div className="ml-2 h-4 border-l border-dashed border-border" />
                <div className="flex items-center gap-3">
                  <MapPin className="size-4 text-accent" />
                  <div>
                    <p className="text-sm font-medium text-foreground">{job.customerName}</p>
                    <p className="text-xs text-muted-foreground">{job.address}</p>
                  </div>
                </div>
              </div>
              <Separator />
              <div className="flex items-center gap-2 p-3">
                <div className="flex flex-1 items-center justify-center gap-1 text-sm text-muted-foreground">
                  <IndianRupee className="size-4" /> {formatINR(payout)}
                </div>
                <Button
                  className="flex-1"
                  disabled={!!active || !online}
                  onClick={async () => {
                    try {
                      await accept(job.id)
                      toast.success(`Accepted ${job.id}`)
                      router.push("/delivery")
                    } catch {
                      /* error toast from context */
                    }
                  }}
                >
                  <Navigation className="size-4" /> Accept
                </Button>
              </div>
            </Card>
          )
        })}
      </div>
    </div>
  )
}
