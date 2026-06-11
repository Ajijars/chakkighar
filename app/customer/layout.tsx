import type { ReactNode } from "react"
import { CartProvider } from "@/lib/cart-context"
import { LocationProvider } from "@/lib/location-context"
import { CustomerNav } from "@/components/customer/customer-nav"

export default function CustomerLayout({ children }: { children: ReactNode }) {
  return (
    <LocationProvider>
      <CartProvider>
        <div className="mx-auto flex min-h-screen max-w-md flex-col bg-background pb-20">
          {children}
          <CustomerNav />
        </div>
      </CartProvider>
    </LocationProvider>
  )
}
