"use client"

import { useState, useRef, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import type { Role } from "@/lib/data"
import { api } from "@/lib/api-client"
import { useAuth } from "@/lib/auth-context"
import { Phone, ShieldCheck, ArrowRight, Loader2, LogOut } from "lucide-react"
import { toast } from "sonner"

const roleMeta: Record<Role, { title: string; home: string; cta: string; prismaRole: string }> = {
  customer: { title: "Customer Login", home: "/customer", cta: "Continue to ordering", prismaRole: "CUSTOMER" },
  mill: { title: "Mill Owner Login", home: "/mill", cta: "Continue to dashboard", prismaRole: "MILL_OWNER" },
  delivery: { title: "Delivery Partner Login", home: "/delivery", cta: "Continue to deliveries", prismaRole: "DELIVERY" },
}

export function OtpLogin({ role }: { role: Role }) {
  const router = useRouter()
  const { user, loading: authLoading, refresh, logout } = useAuth()
  const [step, setStep] = useState<"phone" | "otp">("phone")
  const [phone, setPhone] = useState("")
  const [name, setName] = useState("")
  const [otp, setOtp] = useState(["", "", "", ""])
  const [loading, setLoading] = useState(false)
  const inputs = useRef<(HTMLInputElement | null)[]>([])

  const meta = roleMeta[role]

  useEffect(() => {
    if (authLoading) return
    if (user?.role === meta.prismaRole) {
      router.replace(meta.home)
    }
  }, [authLoading, user, meta.prismaRole, meta.home, router])

  useEffect(() => {
    if (step === "otp") inputs.current[0]?.focus()
  }, [step])

  // Listen for the virtual SMS simulator autofill event
  useEffect(() => {
    const handleAutofill = (e: Event) => {
      const customEvent = e as CustomEvent<{ otp: string; phone: string }>
      const { otp: autofilledOtp, phone: targetPhone } = customEvent.detail
      
      const cleanTarget = targetPhone.replace(/\D/g, "")
      const cleanCurrent = phone.replace(/\D/g, "")
      
      if (cleanTarget === cleanCurrent && step === "otp") {
        const digits = autofilledOtp.split("").slice(0, 4)
        setOtp(digits)
        verify(autofilledOtp)
      }
    }

    window.addEventListener("dev-otp-autofill", handleAutofill)
    return () => window.removeEventListener("dev-otp-autofill", handleAutofill)
  }, [phone, step])

  async function sendOtp() {
    if (phone.replace(/\D/g, "").length < 10) {
      toast.error("Enter a valid 10-digit mobile number")
      return
    }
    setLoading(true)
    try {
      const data = await api<{ devOtp?: string }>("/api/auth/send-otp", {
        method: "POST",
        body: JSON.stringify({ phone }),
      })
      setStep("otp")
      toast.success("OTP sent", {
        description: data.devOtp ? `Your code: ${data.devOtp}` : "Check your SMS",
      })
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to send OTP")
    } finally {
      setLoading(false)
    }
  }

  function handleOtpChange(i: number, val: string) {
    const digit = val.replace(/\D/g, "").slice(-1)
    const next = [...otp]
    next[i] = digit
    setOtp(next)
    if (digit && i < 3) inputs.current[i + 1]?.focus()
  }

  async function verify(codeOverride?: string) {
    const code = codeOverride || otp.join("")
    if (code.length < 4) {
      toast.error("Enter the 4-digit code")
      return
    }
    setLoading(true)
    try {
      await api("/api/auth/verify-otp", {
        method: "POST",
        body: JSON.stringify({ phone, otp: code, role, name: name || undefined }),
      })
      await refresh()
      toast.success("Verified!")
      router.push(meta.home)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Verification failed")
    } finally {
      setLoading(false)
    }
  }

  if (authLoading) {
    return (
      <div className="flex min-h-[200px] items-center justify-center text-sm text-muted-foreground">
        Loading...
      </div>
    )
  }

  if (user && user.role !== meta.prismaRole) {
    const roleLabel =
      user.role === "CUSTOMER" ? "customer" : user.role === "MILL_OWNER" ? "mill owner" : "delivery partner"
    return (
      <div className="w-full max-w-sm rounded-3xl border border-border bg-card p-7 text-center shadow-xl shadow-foreground/5">
        <p className="text-sm text-muted-foreground">
          You are logged in as a <strong className="text-foreground">{roleLabel}</strong> (+91 {user.phone}).
        </p>
        <p className="mt-2 text-sm text-muted-foreground">
          Log out first to sign in as a {role === "mill" ? "mill owner" : role === "delivery" ? "delivery partner" : "customer"}.
        </p>
        <Button
          className="mt-5 w-full gap-2"
          variant="outline"
          onClick={async () => {
            await logout()
            toast.success("Logged out — enter your number below")
          }}
        >
          <LogOut className="size-4" /> Log out & switch account
        </Button>
      </div>
    )
  }

  return (
    <div className="w-full max-w-sm rounded-3xl border border-border bg-card p-7 shadow-xl shadow-foreground/5">
      <div className="mb-6 flex flex-col items-center text-center">
        <div className="mb-4 flex size-14 items-center justify-center rounded-2xl bg-primary/15 text-primary">
          {step === "phone" ? <Phone className="size-7" /> : <ShieldCheck className="size-7" />}
        </div>
        <h2 className="text-xl font-bold tracking-tight">{meta.title}</h2>
        <p className="mt-1 text-sm text-muted-foreground text-pretty">
          {step === "phone"
            ? "We'll send a one-time code to verify your number."
            : `Enter the 4-digit code sent to +91 ${phone}`}
        </p>
      </div>

      {step === "phone" ? (
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="phone">Mobile number</Label>
            <div className="flex items-center gap-2 rounded-xl border border-input bg-background px-3 focus-within:ring-2 focus-within:ring-ring">
              <span className="text-sm font-medium text-muted-foreground">+91</span>
              <Input
                id="phone"
                inputMode="numeric"
                placeholder="98765 43210"
                value={phone}
                onChange={(e) => setPhone(e.target.value.replace(/\D/g, "").slice(0, 10))}
                className="border-0 bg-transparent px-0 shadow-none focus-visible:ring-0"
                onKeyDown={(e) => e.key === "Enter" && sendOtp()}
              />
            </div>
          </div>
          {role !== "customer" && (
            <div className="space-y-2">
              <Label htmlFor="name">Your name</Label>
              <Input id="name" placeholder="Full name" value={name} onChange={(e) => setName(e.target.value)} />
            </div>
          )}
          <Button onClick={sendOtp} disabled={loading} className="w-full gap-2" size="lg">
            {loading ? <Loader2 className="size-4 animate-spin" /> : <ArrowRight className="size-4" />}
            Send OTP
          </Button>
          <p className="text-center text-xs text-muted-foreground">
            Demo: customer <strong>9876543210</strong> · mill <strong>9111111111</strong> · rider <strong>9876511223</strong>
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex justify-center gap-3">
            {otp.map((d, i) => (
              <input
                key={i}
                ref={(el) => {
                  inputs.current[i] = el
                }}
                inputMode="numeric"
                maxLength={1}
                value={d}
                onChange={(e) => handleOtpChange(i, e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Backspace" && !otp[i] && i > 0) inputs.current[i - 1]?.focus()
                  if (e.key === "Enter") verify()
                }}
                className="size-14 rounded-xl border border-input bg-background text-center text-2xl font-semibold outline-none focus:ring-2 focus:ring-ring"
                aria-label={`Digit ${i + 1}`}
              />
            ))}
          </div>
          <Button onClick={verify} disabled={loading} className="w-full gap-2" size="lg">
            {loading ? <Loader2 className="size-4 animate-spin" /> : <ShieldCheck className="size-4" />}
            {meta.cta}
          </Button>
          <button
            onClick={() => setStep("phone")}
            className="w-full text-center text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            Change number
          </button>
        </div>
      )}
    </div>
  )
}
