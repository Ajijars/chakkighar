"use client"

import { useQuery } from "@tanstack/react-query"
import { api } from "@/lib/api-client"
import { Star, Clock, MapPin } from "lucide-react"

export function PlatformStats() {
  const { data } = useQuery({
    queryKey: ["platform-stats"],
    queryFn: () =>
      api<{ millCount: number; avgRating: number; avgDeliveryMins: number }>("/api/stats"),
    staleTime: 60000,
  })

  return (
    <div className="flex flex-wrap gap-6 pt-2 text-sm">
      <div className="flex items-center gap-2">
        <Star className="size-4 fill-primary text-primary" />
        <span className="font-semibold">{data?.avgRating ?? "—"}</span>
        <span className="text-muted-foreground">avg mill rating</span>
      </div>
      <div className="flex items-center gap-2">
        <Clock className="size-4 text-primary" />
        <span className="font-semibold">{data?.avgDeliveryMins ?? "—"} min</span>
        <span className="text-muted-foreground">avg delivery</span>
      </div>
      <div className="flex items-center gap-2">
        <MapPin className="size-4 text-primary" />
        <span className="font-semibold">{data?.millCount ?? "—"}</span>
        <span className="text-muted-foreground">local mills</span>
      </div>
    </div>
  )
}
