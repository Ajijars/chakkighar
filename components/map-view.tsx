"use client"

import { useEffect, useRef } from "react"
import type { Map as LeafletMap, Marker as LeafletMarker } from "leaflet"

interface MapViewProps {
  center: [number, number]
  markers?: { lat: number; lng: number; label?: string; color?: string }[]
  height?: string
  zoom?: number
}

export function MapView({ center, markers = [], height = "220px", zoom = 14 }: MapViewProps) {
  const ref = useRef<HTMLDivElement>(null)
  const mapRef = useRef<LeafletMap | null>(null)
  const markersRef = useRef<LeafletMarker[]>([])

  useEffect(() => {
    if (!ref.current || mapRef.current) return

    import("leaflet").then((L) => {
      import("leaflet/dist/leaflet.css")
      const map = L.map(ref.current!).setView(center, zoom)
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: "&copy; OpenStreetMap",
      }).addTo(map)
      mapRef.current = map
      updateMarkers(L, map)
    })

    return () => {
      mapRef.current?.remove()
      mapRef.current = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function updateMarkers(L: typeof import("leaflet"), map: LeafletMap) {
    markersRef.current.forEach((m) => m.remove())
    markersRef.current = markers.map((m) => {
      const icon = L.divIcon({
        className: "",
        html: `<div style="background:${m.color ?? "#c2410c"};width:14px;height:14px;border-radius:50%;border:2px solid white;box-shadow:0 1px 4px rgba(0,0,0,.3)"></div>`,
        iconSize: [14, 14],
        iconAnchor: [7, 7],
      })
      return L.marker([m.lat, m.lng], { icon }).addTo(map).bindPopup(m.label ?? "")
    })
    if (markers.length > 0) {
      const bounds = L.latLngBounds([center, ...markers.map((m) => [m.lat, m.lng] as [number, number])])
      map.fitBounds(bounds, { padding: [30, 30], maxZoom: 15 })
    } else {
      map.setView(center, zoom)
    }
  }

  useEffect(() => {
    if (!mapRef.current) return
    import("leaflet").then((L) => updateMarkers(L, mapRef.current!))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [center, markers])

  return <div ref={ref} style={{ height, width: "100%", borderRadius: "1rem" }} className="z-0" />
}
