"use client"

import { useState } from "react"
import Image from "next/image"
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { Button } from "@/components/ui/button"
import { grindTextures, type Grain, type Mill, type GrindTexture, formatINR } from "@/lib/data"
import { useCart } from "@/lib/cart-context"
import { Minus, Plus, Flame } from "lucide-react"
import { cn } from "@/lib/utils"
import { toast } from "sonner"

export function GrainCustomizer({
  grain,
  mill,
  open,
  onOpenChange,
}: {
  grain: Grain | null
  mill: Mill
  open: boolean
  onOpenChange: (v: boolean) => void
}) {
  const { addLine } = useCart()
  const [qty, setQty] = useState(2)
  const [texture, setTexture] = useState<GrindTexture>("medium")
  const [roasted, setRoasted] = useState(false)
  const [subType, setSubType] = useState<string | null>(null)

  if (!grain) return null

  const subTypes = (grain as Grain & { subTypes?: string[] }).subTypes ?? []
  const roastFee = roasted ? 8 * qty : 0
  const grindFee = grain.grindingFeePerKg * qty
  const total = grain.pricePerKg * qty + grindFee + roastFee

  function add() {
    if (!grain) return
    if (subTypes.length > 0 && !subType) {
      toast.error("Select a wheat variety")
      return
    }
    addLine({
      grainId: grain.id,
      grainName: `${grain.name} (${grain.localName})${subType ? ` - ${subType}` : ""}`,
      millId: mill.id,
      millName: mill.name,
      quantityKg: qty,
      texture,
      roasted,
      pricePerKg: grain.pricePerKg + grain.grindingFeePerKg + (roasted ? 8 : 0),
      grindingFeePerKg: grain.grindingFeePerKg,
      image: grain.image,
      subType: subType ?? undefined,
    })
    toast.success(`${grain.name} added to cart`, { description: `${qty} kg \u00B7 ${texture} grind` })
    onOpenChange(false)
    setQty(2)
    setTexture("medium")
    setRoasted(false)
    setSubType(null)
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="mx-auto max-w-md rounded-t-3xl p-0">
        <SheetHeader className="sr-only">
          <SheetTitle>Customize {grain.name}</SheetTitle>
        </SheetHeader>
        <div className="flex items-center gap-3 border-b border-border p-5">
          <div className="relative size-16 shrink-0 overflow-hidden rounded-2xl">
            <Image src={grain.image || "/placeholder.svg"} alt={grain.name} fill className="object-cover" />
          </div>
          <div>
            <h3 className="font-bold">{grain.name}</h3>
            <p className="text-sm text-muted-foreground">
              {grain.localName} {"\u00B7"} {formatINR(grain.pricePerKg)}/kg
            </p>
          </div>
        </div>

        <div className="max-h-[60vh] space-y-6 overflow-y-auto p-5">
          {subTypes.length > 0 && (
            <div>
              <p className="mb-2 text-sm font-semibold">Variety</p>
              <div className="flex flex-wrap gap-2">
                {subTypes.map((s) => (
                  <button
                    key={s}
                    onClick={() => setSubType(s)}
                    className={cn(
                      "rounded-full border px-3 py-1.5 text-sm font-medium transition-colors",
                      subType === s
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border bg-card",
                    )}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div>
            <p className="mb-2 text-sm font-semibold">Quantity (kg)</p>
            <div className="flex items-center gap-4">
              <Button variant="outline" size="icon" className="size-11 rounded-full bg-transparent" onClick={() => setQty((q) => Math.max(0.5, +(q - 0.5).toFixed(1)))}>
                <Minus className="size-4" />
              </Button>
              <span className="w-16 text-center text-2xl font-bold tabular-nums">{qty}</span>
              <Button variant="outline" size="icon" className="size-11 rounded-full bg-transparent" onClick={() => setQty((q) => +(q + 0.5).toFixed(1))}>
                <Plus className="size-4" />
              </Button>
            </div>
          </div>

          <div>
            <p className="mb-2 text-sm font-semibold">Grind texture</p>
            <div className="grid grid-cols-3 gap-2">
              {grindTextures.map((t) => (
                <button
                  key={t.value}
                  onClick={() => setTexture(t.value)}
                  className={cn(
                    "rounded-2xl border p-3 text-left transition-colors",
                    texture === t.value ? "border-primary bg-primary/10" : "border-border bg-card hover:border-primary/40",
                  )}
                >
                  <p className="text-sm font-bold">{t.label}</p>
                  <p className="mt-0.5 text-[11px] leading-tight text-muted-foreground">{t.desc}</p>
                </button>
              ))}
            </div>
          </div>

          <button
            onClick={() => setRoasted((r) => !r)}
            className={cn(
              "flex w-full items-center justify-between rounded-2xl border p-4 transition-colors",
              roasted ? "border-primary bg-primary/10" : "border-border bg-card",
            )}
          >
            <span className="flex items-center gap-3">
              <Flame className={cn("size-5", roasted ? "text-primary" : "text-muted-foreground")} />
              <span className="text-left">
                <span className="block text-sm font-bold">Roast before grinding</span>
                <span className="block text-xs text-muted-foreground">Nutty aroma {"\u00B7"} +{"\u20B9"}8/kg</span>
              </span>
            </span>
            <span className={cn("flex h-6 w-11 items-center rounded-full p-0.5 transition-colors", roasted ? "bg-primary" : "bg-muted")}>
              <span className={cn("size-5 rounded-full bg-card shadow transition-transform", roasted && "translate-x-5")} />
            </span>
          </button>
        </div>

        <div className="border-t border-border p-5">
          <div className="mb-4 space-y-1.5 text-sm">
            <div className="flex justify-between text-muted-foreground">
              <span>Grain ({qty}kg {"\u00D7"} {formatINR(grain.pricePerKg)})</span>
              <span>{formatINR(grain.pricePerKg * qty)}</span>
            </div>
            <div className="flex justify-between text-muted-foreground">
              <span>Grinding ({qty}kg {"\u00D7"} {formatINR(grain.grindingFeePerKg)})</span>
              <span>{formatINR(grindFee)}</span>
            </div>
            {roasted && (
              <div className="flex justify-between text-muted-foreground">
                <span>Roasting ({qty}kg {"\u00D7"} {formatINR(8)})</span>
                <span>{formatINR(roastFee)}</span>
              </div>
            )}
          </div>
          <Button className="w-full gap-2" size="lg" onClick={add}>
            Add to cart {"\u00B7"} {formatINR(total)}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  )
}
