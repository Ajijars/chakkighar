"use client"

import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from "react"
import type { GrindTexture } from "@/lib/data"
import { toast } from "sonner"

export interface CartLine {
  key: string
  grainId: string
  grainName: string
  millId: string
  millName: string
  quantityKg: number
  texture: GrindTexture
  roasted: boolean
  pricePerKg: number
  image: string
  subType?: string
  grindingFeePerKg?: number
}

interface CartContextValue {
  lines: CartLine[]
  deliveryFee: number
  addLine: (line: Omit<CartLine, "key">) => void
  updateQty: (key: string, quantityKg: number) => void
  removeLine: (key: string) => void
  clear: () => void
  count: number
  subtotal: number
}

const STORAGE_KEY = "chakkighar_cart"

const CartContext = createContext<CartContextValue | null>(null)

function loadCart(): { lines: CartLine[]; deliveryFee: number } {
  if (typeof window === "undefined") return { lines: [], deliveryFee: 0 }
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return { lines: [], deliveryFee: 0 }
    return JSON.parse(raw)
  } catch {
    return { lines: [], deliveryFee: 0 }
  }
}

export function CartProvider({ children }: { children: ReactNode }) {
  const [lines, setLines] = useState<CartLine[]>([])
  const [deliveryFee, setDeliveryFee] = useState(0)
  const [hydrated, setHydrated] = useState(false)

  useEffect(() => {
    const saved = loadCart()
    setLines(saved.lines)
    setDeliveryFee(saved.deliveryFee)
    setHydrated(true)
  }, [])

  useEffect(() => {
    if (!hydrated) return
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ lines, deliveryFee }))
  }, [lines, deliveryFee, hydrated])

  const addLine = useCallback((line: Omit<CartLine, "key">) => {
    const key = `${line.grainId}-${line.texture}-${line.roasted}-${line.subType ?? ""}`
    setLines((prev) => {
      if (prev.length > 0 && prev[0].millId !== line.millId) {
        toast.error("Cart already has items from another mill", {
          description: "Clear your cart first or finish that order.",
        })
        return prev
      }
      const existing = prev.find((l) => l.key === key)
      if (existing) {
        return prev.map((l) => (l.key === key ? { ...l, quantityKg: l.quantityKg + line.quantityKg } : l))
      }
      return [...prev, { ...line, key }]
    })
  }, [])

  const updateQty = useCallback((key: string, quantityKg: number) => {
    setLines((prev) =>
      prev.map((l) => (l.key === key ? { ...l, quantityKg: Math.max(0.5, quantityKg) } : l)),
    )
  }, [])

  const removeLine = useCallback((key: string) => {
    setLines((prev) => prev.filter((l) => l.key !== key))
  }, [])

  const clear = useCallback(() => {
    setLines([])
    setDeliveryFee(0)
  }, [])

  const setMillDeliveryFee = useCallback((fee: number) => {
    setDeliveryFee(fee)
  }, [])

  // Expose fee setter via addLine side-effect when mill changes
  useEffect(() => {
    if (lines.length > 0) {
      fetch(`/api/mills/${lines[0].millId}`)
        .then((r) => r.json())
        .then((d) => {
          if (d.mill?.deliveryFee != null) setMillDeliveryFee(d.mill.deliveryFee)
        })
        .catch(() => {})
    }
  }, [lines, setMillDeliveryFee])

  const count = lines.reduce((n, l) => n + 1, 0)
  const subtotal = lines.reduce((sum, l) => sum + l.quantityKg * l.pricePerKg, 0)

  return (
    <CartContext.Provider value={{ lines, deliveryFee, addLine, updateQty, removeLine, clear, count, subtotal }}>
      {children}
    </CartContext.Provider>
  )
}

export function useCart() {
  const ctx = useContext(CartContext)
  if (!ctx) throw new Error("useCart must be used within CartProvider")
  return ctx
}
