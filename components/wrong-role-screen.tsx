"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { useAuth } from "@/lib/auth-context"
import { Button } from "@/components/ui/button"
import { LogOut } from "lucide-react"
import { toast } from "sonner"

export function WrongRoleScreen({
  expected,
  loginPath,
}: {
  expected: "mill owner" | "delivery partner" | "customer"
  loginPath: string
}) {
  const { user, logout } = useAuth()
  const router = useRouter()

  const current =
    user?.role === "CUSTOMER" ? "customer" : user?.role === "MILL_OWNER" ? "mill owner" : "delivery partner"

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 px-6 text-center">
      <p className="text-lg font-semibold">Wrong account type</p>
      <p className="max-w-xs text-sm text-muted-foreground">
        You are signed in as a <strong>{current}</strong> (+91 {user?.phone}). This area is for{" "}
        <strong>{expected}</strong> only.
      </p>
      <div className="flex flex-col gap-2 w-full max-w-xs">
        <Button
          variant="outline"
          className="gap-2 bg-transparent"
          onClick={async () => {
            await logout()
            toast.success("Logged out")
            router.push(loginPath)
          }}
        >
          <LogOut className="size-4" /> Log out & sign in as {expected}
        </Button>
        <Button asChild variant="ghost">
          <Link href="/">Back to home</Link>
        </Button>
      </div>
    </div>
  )
}
