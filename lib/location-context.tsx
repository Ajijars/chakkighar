"use client"

import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from "react"
import { useAuth } from "@/lib/auth-context"

interface LocationState {
  lat: number | null
  lng: number | null
  address: string | null
  addressId: string | null
  loading: boolean
  error: string | null
  requestLocation: () => void
  setLocation: (lat: number, lng: number, address?: string, addressId?: string | null) => void
}

const LocationContext = createContext<LocationState | null>(null)

const FALLBACK_LAT = 18.5204
const FALLBACK_LNG = 73.8567

export function LocationProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  const [lat, setLat] = useState<number | null>(null)
  const [lng, setLng] = useState<number | null>(null)
  const [address, setAddress] = useState<string | null>(null)
  const [addressId, setAddressId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const addressKey =
    user?.addresses?.map((a) => `${a.id}:${a.isDefault}:${a.lat}:${a.lng}:${a.line1}`).join("|") ?? ""

  const setLocation = useCallback(
    (newLat: number, newLng: number, newAddress?: string, newAddressId?: string | null) => {
      setLat(newLat)
      setLng(newLng)
      if (newAddress !== undefined) setAddress(newAddress)
      if (newAddressId !== undefined) setAddressId(newAddressId)
      setLoading(false)
      setError(null)
    },
    [],
  )

  const requestLocation = useCallback(() => {
    if (!navigator.geolocation) {
      setError("Geolocation not supported")
      setLat(FALLBACK_LAT)
      setLng(FALLBACK_LNG)
      setAddress("Tap map to set your delivery location")
      setAddressId(null)
      setLoading(false)
      return
    }
    setLoading(true)
    setError(null)
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        setLat(pos.coords.latitude)
        setLng(pos.coords.longitude)
        try {
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?lat=${pos.coords.latitude}&lon=${pos.coords.longitude}&format=json`,
            { headers: { "Accept-Language": "en" } },
          )
          const data = await res.json()
          setAddress(data.display_name?.split(",").slice(0, 3).join(", ") ?? "Current location")
        } catch {
          setAddress("Current location")
        }
        setAddressId(null)
        setLoading(false)
      },
      () => {
        setError("Location permission denied")
        setLat(FALLBACK_LAT)
        setLng(FALLBACK_LNG)
        setAddress("Set your location on the map")
        setAddressId(null)
        setLoading(false)
      },
      { enableHighAccuracy: true, timeout: 12000 },
    )
  }, [])

  useEffect(() => {
    if (user?.addresses?.length) {
      const def = user.addresses.find((a) => a.isDefault) ?? user.addresses[0]
      setLat(def.lat)
      setLng(def.lng)
      setAddress(def.line1)
      setAddressId(def.id)
      setLoading(false)
      setError(null)
      return
    }
    requestLocation()
  }, [user?.id, addressKey, requestLocation])

  return (
    <LocationContext.Provider
      value={{ lat, lng, address, addressId, loading, error, requestLocation, setLocation }}
    >
      {children}
    </LocationContext.Provider>
  )
}

export function useLocation() {
  const ctx = useContext(LocationContext)
  if (!ctx) throw new Error("useLocation must be used within LocationProvider")
  return ctx
}
