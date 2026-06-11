"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { useRouter } from "next/navigation"
import { api } from "@/lib/api-client"
import { useAuth } from "@/lib/auth-context"
import { useLocation } from "@/lib/location-context"
import { MapPicker } from "@/components/map-picker"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ArrowLeft, MapPin, Plus } from "lucide-react"
import { toast } from "sonner"

interface Address {
  id: string
  label: string
  line1: string
  lat: number
  lng: number
  isDefault: boolean
}

const DEFAULT_LAT = 18.5204
const DEFAULT_LNG = 73.8567

export default function AddressesPage() {
  const router = useRouter()
  const { user, refresh } = useAuth()
  const { lat, lng, setLocation } = useLocation()
  const qc = useQueryClient()
  const [label, setLabel] = useState("Home")
  const [line1, setLine1] = useState("")
  const [showForm, setShowForm] = useState(false)
  const [pinLat, setPinLat] = useState(DEFAULT_LAT)
  const [pinLng, setPinLng] = useState(DEFAULT_LNG)

  const { data, isLoading } = useQuery({
    queryKey: ["addresses"],
    queryFn: () => api<{ addresses: Address[] }>("/api/addresses"),
    enabled: !!user,
  })

  useEffect(() => {
    if (showForm) {
      setPinLat(lat ?? DEFAULT_LAT)
      setPinLng(lng ?? DEFAULT_LNG)
    }
  }, [showForm, lat, lng])

  const setDefault = useMutation({
    mutationFn: (id: string) =>
      api("/api/addresses", { method: "PATCH", body: JSON.stringify({ id, isDefault: true }) }),
    onSuccess: async () => {
      qc.invalidateQueries({ queryKey: ["addresses"] })
      qc.invalidateQueries({ queryKey: ["customer-stats"] })
      await refresh()
      toast.success("Default address updated")
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed to update"),
  })

  const addAddress = useMutation({
    mutationFn: (body: { label: string; line1: string; lat: number; lng: number; isDefault: boolean }) =>
      api<{ address: Address }>("/api/addresses", { method: "POST", body: JSON.stringify(body) }),
    onSuccess: async (data) => {
      const saved = data.address
      qc.invalidateQueries({ queryKey: ["addresses"] })
      qc.invalidateQueries({ queryKey: ["customer-stats"] })
      setLocation(saved.lat, saved.lng, saved.line1, saved.id)
      await refresh()
      setShowForm(false)
      setLine1("")
      setLabel("Home")
      toast.success("Address saved")
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed to save address"),
  })

  const addresses = data?.addresses ?? []

  function handlePinChange(newLat: number, newLng: number) {
    setPinLat(newLat)
    setPinLng(newLng)
  }

  function openAddForm() {
    setPinLat(lat ?? DEFAULT_LAT)
    setPinLng(lng ?? DEFAULT_LNG)
    setShowForm(true)
  }

  if (!user) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 px-5 text-center">
        <MapPin className="size-10 text-muted-foreground" />
        <p className="text-muted-foreground">Log in to save your delivery addresses</p>
        <Link href="/login/customer">
          <Button>Log in</Button>
        </Link>
      </div>
    )
  }

  return (
    <div>
      <header className="sticky top-0 z-30 flex items-center gap-3 bg-background/95 px-5 py-4 backdrop-blur">
        <button onClick={() => router.back()} className="flex size-9 items-center justify-center rounded-full bg-secondary">
          <ArrowLeft className="size-5" />
        </button>
        <h1 className="text-lg font-bold">Saved addresses</h1>
      </header>

      <div className="flex flex-col gap-3 px-5 py-3">
        {isLoading && <p className="text-sm text-muted-foreground">Loading addresses...</p>}

        {!isLoading && addresses.length === 0 && !showForm && (
          <div className="rounded-2xl border border-dashed border-border p-6 text-center">
            <MapPin className="mx-auto size-8 text-primary" />
            <p className="mt-2 text-sm font-semibold">No saved address yet</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Add your delivery location so mills can reach you within 10 km.
            </p>
          </div>
        )}

        {addresses.map((a) => (
          <div key={a.id} className="rounded-2xl border border-border bg-card p-4">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <MapPin className="size-4 text-primary" />
                <p className="font-semibold">{a.label}</p>
                {a.isDefault && (
                  <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">Default</span>
                )}
              </div>
              {!a.isDefault && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 text-xs text-primary"
                  onClick={() => setDefault.mutate(a.id)}
                  disabled={setDefault.isPending}
                >
                  Set default
                </Button>
              )}
            </div>
            <p className="mt-1 text-sm text-muted-foreground">{a.line1}</p>
          </div>
        ))}

        {showForm ? (
          <div className="space-y-3 rounded-2xl border border-border bg-card p-4">
            <div className="space-y-1">
              <Label>Label</Label>
              <Input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="Home, Work..." />
            </div>
            <div className="space-y-1">
              <Label>Street address</Label>
              <Input value={line1} onChange={(e) => setLine1(e.target.value)} placeholder="Flat, street, area, landmark" />
            </div>

            <div>
              <Label className="mb-2 block">Drop pin on map</Label>
              <MapPicker
                lat={pinLat}
                lng={pinLng}
                onChange={handlePinChange}
                height="240px"
                label="Delivery location"
              />
              <p className="mt-1 text-xs text-muted-foreground">
                Tap the map or drag the pin to your exact delivery spot.
              </p>
            </div>

            <div className="flex gap-2">
              <Button
                className="flex-1"
                disabled={!line1.trim() || addAddress.isPending}
                onClick={() =>
                  addAddress.mutate({
                    label: label.trim() || "Home",
                    line1: line1.trim(),
                    lat: pinLat,
                    lng: pinLng,
                    isDefault: addresses.length === 0,
                  })
                }
              >
                {addAddress.isPending ? "Saving..." : "Save address"}
              </Button>
              <Button variant="outline" className="bg-transparent" onClick={() => setShowForm(false)}>
                Cancel
              </Button>
            </div>
          </div>
        ) : (
          <Button variant="outline" className="gap-2 bg-transparent" onClick={openAddForm}>
            <Plus className="size-4" /> Add new address
          </Button>
        )}
      </div>
    </div>
  )
}
