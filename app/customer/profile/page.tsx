"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { useQuery } from "@tanstack/react-query"
import { useAuth } from "@/lib/auth-context"
import { api } from "@/lib/api-client"
import { MapPin, Wallet, ChevronRight, LogOut, Wheat } from "lucide-react"

export default function ProfilePage() {
  const router = useRouter()
  const { user, logout } = useAuth()
  const initials = user?.name?.slice(0, 2).toUpperCase() ?? "?"

  const { data: stats } = useQuery({
    queryKey: ["customer-stats"],
    queryFn: () =>
      api<{ orderCount: number; kgMilled: number; uniqueMills: number; addressCount: number }>(
        "/api/customer/stats",
      ),
    enabled: !!user,
  })

  if (!user) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 px-5 text-center">
        <p className="text-muted-foreground">Log in to view your profile</p>
        <Link href="/login/customer" className="font-semibold text-primary">Log in</Link>
      </div>
    )
  }

  return (
    <div>
      <header className="bg-primary px-5 pb-8 pt-6 text-primary-foreground">
        <div className="flex items-center gap-4">
          <div className="flex size-16 items-center justify-center rounded-full bg-primary-foreground/20 text-2xl font-bold">
            {initials}
          </div>
          <div>
            <h1 className="text-xl font-bold">{user.name ?? "Customer"}</h1>
            <p className="text-sm opacity-90">+91 {user.phone}</p>
          </div>
        </div>
        <div className="mt-5 grid grid-cols-3 gap-2 rounded-2xl bg-primary-foreground/10 p-3 text-center">
          <div>
            <p className="text-lg font-bold">{stats?.orderCount ?? 0}</p>
            <p className="text-xs opacity-90">Orders</p>
          </div>
          <div className="border-x border-primary-foreground/20">
            <p className="text-lg font-bold">{stats?.kgMilled ?? 0} kg</p>
            <p className="text-xs opacity-90">Milled</p>
          </div>
          <div>
            <p className="text-lg font-bold">{stats?.uniqueMills ?? 0}</p>
            <p className="text-xs opacity-90">Mills</p>
          </div>
        </div>
      </header>

      <div className="-mt-4 rounded-t-3xl bg-background px-5 pt-5">
        <div className="overflow-hidden rounded-2xl border border-border bg-card">
          <Link
            href="/customer/addresses"
            className="flex w-full items-center gap-3 border-b border-border p-4 text-left transition-colors hover:bg-secondary"
          >
            <div className="flex size-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <MapPin className="size-5" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-semibold">Saved addresses</p>
              <p className="text-xs text-muted-foreground">{stats?.addressCount ?? 0} saved</p>
            </div>
            <ChevronRight className="size-5 text-muted-foreground" />
          </Link>
          <div className="flex w-full items-center gap-3 p-4 text-left">
            <div className="flex size-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Wallet className="size-5" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-semibold">Payments</p>
              <p className="text-xs text-muted-foreground">UPI & Cash on delivery</p>
            </div>
          </div>
        </div>

        <button
          onClick={async () => { await logout(); router.push("/") }}
          className="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl border border-destructive/30 bg-card p-4 text-sm font-semibold text-destructive transition-colors hover:bg-destructive/5"
        >
          <LogOut className="size-4" /> Log out
        </button>

        <div className="mt-6 flex items-center justify-center gap-2 text-xs text-muted-foreground">
          <Wheat className="size-4 text-primary" />
          <span>ChakkiGhar v1.0</span>
        </div>
      </div>
    </div>
  )
}
