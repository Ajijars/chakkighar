"use client"

import { useState, useEffect } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { useDelivery } from "@/lib/delivery-context"
import { useAuth } from "@/lib/auth-context"
import { api } from "@/lib/api-client"
import { formatINR } from "@/lib/data"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { useRouter } from "next/navigation"
import { Star, Bike, IndianRupee, Package, TrendingUp, LogOut, Upload } from "lucide-react"
import { toast } from "sonner"

export default function DeliveryProfilePage() {
  const { online, setOnline } = useDelivery()
  const { logout } = useAuth()
  const router = useRouter()
  const qc = useQueryClient()

  const { data: profile, isLoading } = useQuery({
    queryKey: ["delivery-profile"],
    queryFn: () =>
      api<{
        name: string | null
        phone: string
        vehicleInfo: string | null
        licenseUrl: string | null
        rating: number
        trips: number
        earningsToday: number
        earningsWeek: number
      }>("/api/delivery/profile"),
  })

  const [vehicle, setVehicle] = useState("")

  useEffect(() => {
    if (profile?.vehicleInfo != null) setVehicle(profile.vehicleInfo)
  }, [profile?.vehicleInfo])

  const updateProfile = useMutation({
    mutationFn: (body: { vehicleInfo?: string; licenseUrl?: string }) =>
      api("/api/delivery/profile", { method: "PATCH", body: JSON.stringify(body) }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["delivery-profile"] })
      toast.success("Profile updated")
    },
  })

  async function uploadLicense(file: File) {
    const form = new FormData()
    form.append("file", file)
    const res = await fetch("/api/upload", { method: "POST", body: form, credentials: "include" })
    const data = await res.json()
    if (!res.ok) throw new Error(data.error)
    updateProfile.mutate({ licenseUrl: data.url })
  }

  if (isLoading || !profile) {
    return <p className="p-5 text-muted-foreground">Loading profile...</p>
  }

  const initials = profile.name?.slice(0, 2).toUpperCase() ?? "R"

  return (
    <div className="px-4 py-5">
      <h1 className="text-2xl font-bold text-foreground text-balance">Profile</h1>

      <Card className="mt-4 flex-row items-center gap-3 p-4">
        <Avatar className="size-14">
          <AvatarFallback className="bg-primary/15 text-lg text-primary">{initials}</AvatarFallback>
        </Avatar>
        <div className="flex-1">
          <p className="font-semibold text-foreground">{profile.name ?? "Delivery Partner"}</p>
          <p className="text-sm text-muted-foreground">+91 {profile.phone}</p>
          <div className="mt-1 flex items-center gap-1 text-sm">
            <Star className="size-3.5 fill-chart-4 text-chart-4" />
            <span className="font-medium text-foreground">{profile.rating}</span>
            <span className="text-muted-foreground">{"\u00B7"} {profile.trips.toLocaleString("en-IN")} trips</span>
          </div>
        </div>
        <div className="flex flex-col items-center gap-1">
          <Switch checked={online} onCheckedChange={setOnline} />
          <span className="text-xs text-muted-foreground">{online ? "Online" : "Offline"}</span>
        </div>
      </Card>

      <div className="mt-3 grid grid-cols-3 gap-3">
        <Card className="items-center gap-1 p-3">
          <IndianRupee className="size-5 text-accent" />
          <p className="text-lg font-bold text-foreground">{formatINR(profile.earningsToday)}</p>
          <p className="text-center text-xs text-muted-foreground">Today</p>
        </Card>
        <Card className="items-center gap-1 p-3">
          <Package className="size-5 text-primary" />
          <p className="text-lg font-bold text-foreground">{profile.trips}</p>
          <p className="text-center text-xs text-muted-foreground">Deliveries</p>
        </Card>
        <Card className="items-center gap-1 p-3">
          <TrendingUp className="size-5 text-chart-4" />
          <p className="text-lg font-bold text-foreground">{formatINR(profile.earningsWeek)}</p>
          <p className="text-center text-xs text-muted-foreground">This week</p>
        </Card>
      </div>

      <Card className="mt-3 gap-4 p-4">
        <div className="space-y-2">
          <Label className="flex items-center gap-1"><Bike className="size-4" /> Vehicle details</Label>
          <Input
            placeholder="e.g. Hero Splendor · MH 12 AB 4567"
            value={vehicle}
            onChange={(e) => setVehicle(e.target.value)}
            onBlur={() => {
              const trimmed = vehicle.trim()
              if (trimmed && trimmed !== (profile.vehicleInfo ?? "")) {
                updateProfile.mutate({ vehicleInfo: trimmed })
              }
            }}
          />
        </div>
        <Separator />
        <label className="flex cursor-pointer items-center gap-3">
          <Upload className="size-5 text-muted-foreground" />
          <span className="text-sm">{profile.licenseUrl ? "License on file" : "Upload driving license"}</span>
          <input type="file" className="hidden" accept="image/*,.pdf" onChange={(e) => e.target.files?.[0] && uploadLicense(e.target.files[0])} />
        </label>
      </Card>

      <Button
        variant="outline"
        className="mt-4 w-full text-destructive hover:text-destructive bg-transparent"
        onClick={async () => { await logout(); router.push("/") }}
      >
        <LogOut className="size-4" /> Log out
      </Button>
    </div>
  )
}
