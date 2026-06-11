"use client"

import { useEffect, useRef, useState } from "react"
import type { Map as LeafletMap, Marker as LeafletMarker } from "leaflet"
import { Button } from "@/components/ui/button"
import { LocateFixed } from "lucide-react"
import { toast } from "sonner"

interface MapPickerProps {
  lat: number
  lng: number
  onChange: (lat: number, lng: number) => void
  height?: string
  label?: string
}

function pinIcon(L: typeof import("leaflet")) {
  return L.divIcon({
    className: "",
    html: `<div style="background:#c2410c;width:20px;height:20px;border-radius:50% 50% 50% 0;transform:rotate(-45deg);border:2.5px solid white;box-shadow:0 2px 8px rgba(0,0,0,.35)"></div>`,
    iconSize: [20, 20],
    iconAnchor: [10, 20],
  })
}

export function MapPicker({ lat, lng, onChange, height = "280px", label = "Your location" }: MapPickerProps) {
  const ref = useRef<HTMLDivElement>(null)
  const mapRef = useRef<LeafletMap | null>(null)
  const markerRef = useRef<LeafletMarker | null>(null)
  const onChangeRef = useRef(onChange)
  const readyRef = useRef(false)
  const [locating, setLocating] = useState(false)

  useEffect(() => {
    onChangeRef.current = onChange
  }, [onChange])

  useEffect(() => {
    if (!ref.current || mapRef.current) return

    let cancelled = false

    import("leaflet").then((L) => {
      if (cancelled || !ref.current) return
      void import("leaflet/dist/leaflet.css")

      const map = L.map(ref.current!, { zoomControl: true }).setView([lat, lng], 16)
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: '&copy; OpenStreetMap',
        maxZoom: 19,
      }).addTo(map)

      const marker = L.marker([lat, lng], { icon: pinIcon(L), draggable: true }).addTo(map)
      marker.bindPopup(label)

      marker.on("dragend", () => {
        const pos = marker.getLatLng()
        onChangeRef.current(pos.lat, pos.lng)
      })

      map.on("click", (e) => {
        marker.setLatLng(e.latlng)
        marker.openPopup()
        onChangeRef.current(e.latlng.lat, e.latlng.lng)
      })

      mapRef.current = map
      markerRef.current = marker
      readyRef.current = true
    })

    return () => {
      cancelled = true
      readyRef.current = false
      mapRef.current?.remove()
      mapRef.current = null
      markerRef.current = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (!readyRef.current || !mapRef.current || !markerRef.current) return
    markerRef.current.setLatLng([lat, lng])
    mapRef.current.panTo([lat, lng])
  }, [lat, lng])

  function useGps() {
    if (!navigator.geolocation) {
      toast.error("Geolocation not supported on this device")
      return
    }
    setLocating(true)
    navigator.geolocation.getCurrentPosition(
      (p) => {
        onChange(p.coords.latitude, p.coords.longitude)
        toast.success("Location set — drag the pin to fine-tune if needed")
        setLocating(false)
      },
      () => {
        toast.error("Could not get GPS — tap the map to place your pin")
        setLocating(false)
      },
      { enableHighAccuracy: true, timeout: 12000 },
    )
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-border">
      <div ref={ref} style={{ height, width: "100%" }} className="z-0" />
      <div className="flex items-center justify-between gap-2 border-t border-border bg-card px-3 py-2">
        <p className="text-xs text-muted-foreground">
          Tap map or drag pin · {lat.toFixed(5)}, {lng.toFixed(5)}
        </p>
        <Button size="sm" variant="outline" className="h-8 shrink-0 bg-transparent" onClick={useGps} disabled={locating}>
          <LocateFixed className="size-3.5" />
          {locating ? "Locating..." : "GPS"}
        </Button>
      </div>
    </div>
  )
}
