"use client"

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { api } from "@/lib/api-client"
import { formatINR, type Grain } from "@/lib/data"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogClose, DialogFooter } from "@/components/ui/dialog"
import Image from "next/image"
import { toast } from "sonner"
import { Plus } from "lucide-react"

type MillProduct = Grain & { available: boolean; customPrice: number; customGrindingFee: number }

export default function MillProductsPage() {
  const qc = useQueryClient()

  const { data, isLoading } = useQuery({
    queryKey: ["mill-products"],
    queryFn: () => api<{ products: MillProduct[] }>("/api/mill/products"),
  })

  const { data: catalog } = useQuery({
    queryKey: ["grains-catalog"],
    queryFn: () => api<{ grains: Grain[] }>("/api/grains"),
  })

  const updateMut = useMutation({
    mutationFn: (body: { productId: string; customPrice?: number; customGrindingFee?: number; inStock?: boolean }) =>
      api("/api/mill/products", { method: "PATCH", body: JSON.stringify(body) }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["mill-products"] })
      toast.success("Product updated")
    },
  })

  const addMut = useMutation({
    mutationFn: (grainId: string) =>
      api("/api/mill/products", { method: "POST", body: JSON.stringify({ grainId }) }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["mill-products"] })
      toast.success("Grain added")
    },
  })

  const products = data?.products ?? []
  const availableCount = products.filter((p) => p.available).length

  if (isLoading) return <p className="p-5 text-muted-foreground">Loading products...</p>

  return (
    <div className="px-4 py-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground text-balance">Products</h1>
          <p className="text-sm text-muted-foreground">{availableCount} of {products.length} available</p>
        </div>
        <AddProductDialog
          existing={products.map((p) => p.id)}
          options={catalog?.grains ?? []}
          onAdd={(g) => addMut.mutate(g.id)}
        />
      </div>

      <div className="mt-4 flex flex-col gap-3">
        {products.map((p) => (
          <Card key={p.id} className="gap-3 p-3">
            <div className="flex items-center gap-3">
              <div className="relative size-14 shrink-0 overflow-hidden rounded-lg bg-muted">
                <Image src={p.image || "/placeholder.svg"} alt={p.name} fill className="object-cover" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <p className="truncate font-medium text-foreground">{p.name}</p>
                  {!p.available && <Badge variant="secondary">Hidden</Badge>}
                </div>
                <p className="text-xs text-muted-foreground">{p.localName}</p>
              </div>
              <Switch
                checked={p.available}
                onCheckedChange={(v) => updateMut.mutate({ productId: p.millProductId!, inStock: v })}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Grain price /kg</Label>
                <div className="flex items-center gap-1">
                  <span className="text-sm text-muted-foreground">{"\u20B9"}</span>
                  <Input
                    type="number"
                    defaultValue={p.customPrice}
                    onBlur={(e) => updateMut.mutate({ productId: p.millProductId!, customPrice: Number(e.target.value) })}
                    className="h-8"
                  />
                </div>
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Grinding fee /kg</Label>
                <div className="flex items-center gap-1">
                  <span className="text-sm text-muted-foreground">{"\u20B9"}</span>
                  <Input
                    type="number"
                    defaultValue={p.customGrindingFee}
                    onBlur={(e) => updateMut.mutate({ productId: p.millProductId!, customGrindingFee: Number(e.target.value) })}
                    className="h-8"
                  />
                </div>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  )
}

function AddProductDialog({
  existing,
  options,
  onAdd,
}: {
  existing: string[]
  options: Grain[]
  onAdd: (g: Grain) => void
}) {
  const available = options.filter((g) => !existing.includes(g.id))
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button size="sm"><Plus className="size-4" /> Add</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>Add a grain to your mill</DialogTitle></DialogHeader>
        <div className="flex flex-col gap-2">
          {available.length === 0 && <p className="py-4 text-center text-sm text-muted-foreground">You offer every grain already.</p>}
          {available.map((g) => (
            <DialogClose asChild key={g.id}>
              <button onClick={() => onAdd(g)} className="flex items-center gap-3 rounded-lg border border-border p-2 text-left transition-colors hover:bg-muted">
                <div className="relative size-12 overflow-hidden rounded-md bg-muted">
                  <Image src={g.image || "/placeholder.svg"} alt={g.name} fill className="object-cover" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-foreground">{g.name}</p>
                  <p className="text-xs text-muted-foreground">{formatINR(g.pricePerKg)}/kg</p>
                </div>
              </button>
            </DialogClose>
          ))}
        </div>
        <DialogFooter><Label className="sr-only">Close</Label></DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
