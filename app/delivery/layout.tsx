"use client"

import type { ReactNode } from "react"
import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { DeliveryProvider } from "@/lib/delivery-context"
import { DeliveryNav } from "@/components/delivery/delivery-nav"
import { WrongRoleScreen } from "@/components/wrong-role-screen"
import { useAuth } from "@/lib/auth-context"

function DeliveryGate({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (loading) return
    if (!user) router.replace("/login/delivery")
    else if (user.role !== "DELIVERY") return
  }, [user, loading, router])

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <p className="text-sm text-muted-foreground">Loading...</p>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <p className="text-sm text-muted-foreground">Redirecting to login...</p>
      </div>
    )
  }

  if (user.role !== "DELIVERY") {
    return <WrongRoleScreen expected="delivery partner" loginPath="/login/delivery" />
  }

  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col bg-background pb-20">
      {children}
      <DeliveryNav />
    </div>
  )
}

export default function DeliveryLayout({ children }: { children: ReactNode }) {
  return (
    <DeliveryProvider>
      <DeliveryGate>{children}</DeliveryGate>
    </DeliveryProvider>
  )
}
