"use client"

import { createContext, useContext, useCallback, type ReactNode } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { api } from "@/lib/api-client"
import { useAuth } from "@/lib/auth-context"
import type { Order, OrderStatus, Mill } from "@/lib/data"
import { toast } from "sonner"

interface MillState {
  isOpen: boolean
  setIsOpen: (v: boolean) => void
  setDeliveryRadius: (km: number) => void
  orders: Order[]
  advance: (id: string, status: OrderStatus) => Promise<void>
  reject: (id: string) => Promise<void>
  loading: boolean
  registered: boolean
  mill: Mill | null
  refresh: () => void
}

const MillContext = createContext<MillState | null>(null)

export function MillProvider({ children }: { children: ReactNode }) {
  const qc = useQueryClient()
  const { user } = useAuth()

  const { data: millMe } = useQuery({
    queryKey: ["mill-me"],
    queryFn: () => api<{ registered: boolean; mill: Mill | null }>("/api/mill/me"),
    enabled: user?.role === "MILL_OWNER",
    retry: false,
  })

  const registered = millMe?.registered === true

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["mill-orders"],
    queryFn: () => api<{ orders: Order[]; mill: Mill }>("/api/mill/orders"),
    enabled: registered,
    refetchInterval: registered ? 5000 : false,
    retry: false,
  })

  const toggleOpen = useMutation({
    mutationFn: (isOpen: boolean) =>
      api("/api/mill/me", { method: "PATCH", body: JSON.stringify({ isOpen }) }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["mill-orders"] })
      qc.invalidateQueries({ queryKey: ["mill-me"] })
    },
  })

  const setRadius = useMutation({
    mutationFn: (deliveryRadiusKm: number) =>
      api("/api/mill/me", { method: "PATCH", body: JSON.stringify({ deliveryRadiusKm }) }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["mill-orders"] })
      qc.invalidateQueries({ queryKey: ["mill-me"] })
      qc.invalidateQueries({ queryKey: ["mill-analytics"] })
    },
  })

  const updateStatus = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      api(`/api/mill/orders/${id}`, { method: "PATCH", body: JSON.stringify({ status }) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["mill-orders"] }),
    onError: (e) => toast.error(e instanceof Error ? e.message : "Could not update order"),
  })

  const advance = useCallback(
    (id: string, status: OrderStatus) => {
      const map: Partial<Record<OrderStatus, string>> = {
        accepted: "accepted",
        grinding: "grinding",
        ready: "ready",
      }
      const s = map[status]
      if (!s) return Promise.reject(new Error("Invalid status"))
      return updateStatus.mutateAsync({ id, status: s })
    },
    [updateStatus],
  )

  const reject = useCallback(
    (id: string) => updateStatus.mutateAsync({ id, status: "cancelled" }),
    [updateStatus],
  )

  return (
    <MillContext.Provider
      value={{
        isOpen: data?.mill?.isOpen ?? millMe?.mill?.isOpen ?? true,
        setIsOpen: (v) => toggleOpen.mutate(v),
        setDeliveryRadius: (km) => setRadius.mutate(km),
        orders: data?.orders ?? [],
        advance,
        reject,
        loading: isLoading || millMe === undefined,
        registered,
        mill: data?.mill ?? millMe?.mill ?? null,
        refresh: () => {
          refetch()
          qc.invalidateQueries({ queryKey: ["mill-me"] })
        },
      }}
    >
      {children}
    </MillContext.Provider>
  )
}

export function useMill() {
  const ctx = useContext(MillContext)
  if (!ctx) throw new Error("useMill must be used within MillProvider")
  return ctx
}
