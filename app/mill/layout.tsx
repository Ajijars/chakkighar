"use client"

import type { ReactNode } from "react"
import { useEffect } from "react"
import { useRouter, usePathname } from "next/navigation"
import { useQuery } from "@tanstack/react-query"
import { MillProvider } from "@/lib/mill-context"
import { MillNav } from "@/components/mill/mill-nav"
import { WrongRoleScreen } from "@/components/wrong-role-screen"
import { useAuth } from "@/lib/auth-context"
import { api } from "@/lib/api-client"

function MillGate({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth()
  const router = useRouter()
  const pathname = usePathname()

  const { data } = useQuery({
    queryKey: ["mill-me"],
    queryFn: () => api<{ registered: boolean }>("/api/mill/me"),
    enabled: !!user && user.role === "MILL_OWNER",
  })

  useEffect(() => {
    if (loading) return
    if (!user) router.replace("/login/mill")
    else if (user.role !== "MILL_OWNER") return
    else if (data && !data.registered && pathname !== "/mill/register") router.replace("/mill/register")
  }, [user, loading, data, pathname, router])

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

  if (user.role !== "MILL_OWNER") {
    return <WrongRoleScreen expected="mill owner" loginPath="/login/mill" />
  }
  if (pathname === "/mill/register") return <>{children}</>

  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col bg-background pb-20">
      {children}
      <MillNav />
    </div>
  )
}

export default function MillLayout({ children }: { children: ReactNode }) {
  return (
    <MillProvider>
      <MillGate>{children}</MillGate>
    </MillProvider>
  )
}
