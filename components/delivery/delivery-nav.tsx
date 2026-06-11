"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { Home, Package, User } from "lucide-react"
import { useDelivery } from "@/lib/delivery-context"
import { cn } from "@/lib/utils"

const items = [
  { href: "/delivery", icon: Home, label: "Home" },
  { href: "/delivery/jobs", icon: Package, label: "Jobs" },
  { href: "/delivery/profile", icon: User, label: "Profile" },
]

export function DeliveryNav() {
  const pathname = usePathname()
  const { available } = useDelivery()

  return (
    <nav className="fixed bottom-0 left-1/2 z-40 w-full max-w-md -translate-x-1/2 border-t border-border bg-card/95 backdrop-blur">
      <div className="flex items-center justify-around px-2 py-2">
        {items.map((item) => {
          const active = pathname === item.href
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "relative flex flex-1 flex-col items-center gap-1 rounded-xl py-2 text-xs font-medium transition-colors",
                active ? "text-primary" : "text-muted-foreground hover:text-foreground",
              )}
            >
              <div className="relative">
                <item.icon className="size-5" />
                {item.href === "/delivery/jobs" && available.length > 0 && (
                  <span className="absolute -right-2 -top-2 flex size-4 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">
                    {available.length}
                  </span>
                )}
              </div>
              {item.label}
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
