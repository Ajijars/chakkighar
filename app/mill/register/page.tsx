"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { useQueryClient } from "@tanstack/react-query"
import { api } from "@/lib/api-client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { MapPicker } from "@/components/map-picker"
import { toast } from "sonner"
import { Store, MapPin, Upload, Check } from "lucide-react"
import { cn } from "@/lib/utils"

const SPECIALTY_OPTIONS = [
  "Whole Wheat", "Multigrain", "Bajra", "Jowar", "Rice Flour",
  "Besan", "Corn Flour", "Turmeric", "Ragi", "Maida",
]

export default function MillRegisterPage() {
  const router = useRouter()
  const qc = useQueryClient()
  const [name, setName] = useState("")
  const [ownerName, setOwnerName] = useState("")
  const [address, setAddress] = useState("")
  const [pinLat, setPinLat] = useState(18.5204)
  const [pinLng, setPinLng] = useState(73.8567)
  const [licenseUrl, setLicenseUrl] = useState<string | null>(null)
  const [selectedSpecialties, setSelectedSpecialties] = useState<string[]>(["Whole Wheat"])
  const [loading, setLoading] = useState(false)

  function toggleSpecialty(s: string) {
    setSelectedSpecialties((prev) =>
      prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s],
    )
  }

  async function uploadLicense(file: File) {
    const form = new FormData()
    form.append("file", file)
    const res = await fetch("/api/upload", { method: "POST", body: form, credentials: "include" })
    const data = await res.json()
    if (!res.ok) throw new Error(data.error)
    setLicenseUrl(data.url)
    toast.success("License uploaded")
  }

  async function register() {
    if (!name || !ownerName || !address) {
      toast.error("Fill all required fields")
      return
    }
    if (selectedSpecialties.length === 0) {
      toast.error("Select at least one grain specialty")
      return
    }
    setLoading(true)
    try {
      await api("/api/mill/me", {
        method: "POST",
        body: JSON.stringify({
          name,
          ownerName,
          address,
          lat: pinLat,
          lng: pinLng,
          licenseUrl,
          specialties: selectedSpecialties.join(","),
        }),
      })
      toast.success("Mill registered!")
      await qc.invalidateQueries({ queryKey: ["mill-me"] })
      await qc.invalidateQueries({ queryKey: ["mill-orders"] })
      router.push("/mill")
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Registration failed")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="px-4 py-5">
      <h1 className="text-2xl font-bold">Register your mill</h1>
      <p className="text-sm text-muted-foreground">Set your storefront location within the 10 km network</p>

      <div className="mt-4 space-y-4">
        <div className="space-y-2">
          <Label>Mill name *</Label>
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Annapurna Chakki" />
        </div>
        <div className="space-y-2">
          <Label>Owner name *</Label>
          <Input value={ownerName} onChange={(e) => setOwnerName(e.target.value)} placeholder="Your name" />
        </div>
        <div className="space-y-2">
          <Label>Shop address *</Label>
          <Input value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Shop 4, Gandhi Market" />
        </div>

        {/* Grain specialties */}
        <div className="space-y-2">
          <Label>Grain specialties * <span className="text-muted-foreground font-normal text-xs">(select all that apply)</span></Label>
          <div className="flex flex-wrap gap-2">
            {SPECIALTY_OPTIONS.map((s) => {
              const active = selectedSpecialties.includes(s)
              return (
                <button
                  key={s}
                  type="button"
                  onClick={() => toggleSpecialty(s)}
                  className={cn(
                    "flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm font-medium transition-colors",
                    active
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border bg-card text-muted-foreground hover:text-foreground",
                  )}
                >
                  {active && <Check className="size-3" />}
                  {s}
                </button>
              )
            })}
          </div>
        </div>

        <div>
          <Label className="mb-2 flex items-center gap-1">
            <MapPin className="size-4" /> Drop pin on your mill location
          </Label>
          <MapPicker
            lat={pinLat}
            lng={pinLng}
            onChange={(lat, lng) => { setPinLat(lat); setPinLng(lng) }}
            height="280px"
            label="Your mill"
          />
          <p className="mt-1 text-xs text-muted-foreground">
            Tap anywhere on the map or drag the pin to your exact storefront.
          </p>
        </div>

        <div className="space-y-2">
          <Label>Business license <span className="text-muted-foreground font-normal text-xs">(optional)</span></Label>
          <label className="flex cursor-pointer items-center gap-3 rounded-2xl border border-dashed border-border p-4 transition-colors hover:bg-muted/50">
            <Upload className="size-5 text-muted-foreground" />
            <span className="text-sm">{licenseUrl ? "✅ License uploaded" : "Upload license document (image or PDF)"}</span>
            <input
              type="file"
              className="hidden"
              accept="image/*,.pdf"
              onChange={(e) => e.target.files?.[0] && uploadLicense(e.target.files[0])}
            />
          </label>
        </div>

        <Button className="w-full gap-2" size="lg" onClick={register} disabled={loading}>
          <Store className="size-4" /> {loading ? "Registering..." : "Register mill"}
        </Button>
      </div>
    </div>
  )
}
