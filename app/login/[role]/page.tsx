import { OtpLogin } from "@/components/otp-login"
import type { Role } from "@/lib/data"
import { Wheat } from "lucide-react"
import Link from "next/link"
import { notFound } from "next/navigation"

const valid: Role[] = ["customer", "mill", "delivery"]

export default async function LoginPage({ params }: { params: Promise<{ role: string }> }) {
  const { role } = await params
  if (!valid.includes(role as Role)) notFound()

  return (
    <main className="flex min-h-screen flex-col items-center justify-center px-5 py-10">
      <Link href="/" className="mb-8 flex items-center gap-2">
        <div className="flex size-9 items-center justify-center rounded-xl bg-primary text-primary-foreground">
          <Wheat className="size-5" />
        </div>
        <span className="text-lg font-bold tracking-tight">ChakkiGhar</span>
      </Link>
      <OtpLogin role={role as Role} />
      <Link href="/" className="mt-6 text-sm text-muted-foreground transition-colors hover:text-foreground">
        Back to home
      </Link>
    </main>
  )
}
