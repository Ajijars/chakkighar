"use client"

import { createContext, useContext, useCallback, useEffect, type ReactNode } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { api } from "@/lib/api-client"
import type { Order, OrderStatus } from "@/lib/data"
import { toast } from "sonner"

interface DeliveryState {
  online: boolean
  setOnline: (v: boolean) => void
  available: Order[]
  active: Order | null
  accept: (id: string) => Promise<void>
  advance: (status: OrderStatus) => void
  complete: () => void
  earnings: number
  completed: number
  loading: boolean
}

const DeliveryContext = createContext<DeliveryState | null>(null)

export function DeliveryProvider({ children }: { children: ReactNode }) {
  const qc = useQueryClient()

  const { data, isLoading } = useQuery({
    queryKey: ["delivery-jobs"],
    queryFn: () =>
      api<{
        jobs: Order[]
        active: Order | null
        online: boolean
        earnings: number
        completed: number
      }>("/api/delivery/jobs"),
    refetchInterval: 4000,
  })

  const setOnlineMut = useMutation({
    mutationFn: (online: boolean) =>
      api("/api/delivery/online", { method: "PATCH", body: JSON.stringify({ online }) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["delivery-jobs"] }),
    onError: (e) => toast.error(e instanceof Error ? e.message : "Could not update status"),
  })

  const acceptMut = useMutation({
    mutationFn: (id: string) => api(`/api/delivery/accept/${id}`, { method: "POST" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["delivery-jobs"] }),
    onError: (e) => toast.error(e instanceof Error ? e.message : "Could not accept job"),
  })

  const statusMut = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      api(`/api/delivery/status/${id}`, { method: "PATCH", body: JSON.stringify({ status }) }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["delivery-jobs"] })
      qc.invalidateQueries({ queryKey: ["delivery-profile"] })
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Could not update delivery"),
  })

  const postLocation = useCallback(async (lat: number, lng: number) => {
    try {
      await api("/api/delivery/location", { method: "POST", body: JSON.stringify({ lat, lng }) })
    } catch {
      /* ignore */
    }
  }, [])

  useEffect(() => {
    if (!data?.online) return
    const tick = () => {
      navigator.geolocation?.getCurrentPosition(
        (p) => postLocation(p.coords.latitude, p.coords.longitude),
        undefined,
        { enableHighAccuracy: true },
      )
    }
    tick()
    const id = setInterval(tick, 5000)
    return () => clearInterval(id)
  }, [data?.online, postLocation])

  const advance = useCallback(
    (status: OrderStatus) => {
      if (!data?.active) return
      // Map client-side status values to the strings accepted by /api/delivery/status/[id]
      const map: Partial<Record<OrderStatus, string>> = {
        out_for_delivery: "out_for_delivery",
        delivered: "delivered",
      }
      const s = map[status]
      if (s) statusMut.mutate({ id: data.active.id, status: s })
    },
    [data?.active, statusMut],
  )

  return (
    <DeliveryContext.Provider
      value={{
        online: data?.online ?? false,
        setOnline: (v) => setOnlineMut.mutate(v),
        available: data?.jobs ?? [],
        active: data?.active ?? null,
        accept: (id) => acceptMut.mutateAsync(id),
        advance,
        complete: () => advance("delivered"),
        earnings: data?.earnings ?? 0,
        completed: data?.completed ?? 0,
        loading: isLoading,
      }}
    >
      {children}
    </DeliveryContext.Provider>
  )
}

export function useDelivery() {
  const ctx = useContext(DeliveryContext)
  if (!ctx) throw new Error("useDelivery must be used within DeliveryProvider")
  return ctx
}
