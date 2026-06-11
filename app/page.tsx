import Link from "next/link"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { PlatformStats } from "@/components/platform-stats"
import { Wheat, ShoppingBasket, Store, Bike, ArrowRight } from "lucide-react"

const roles = [
  {
    href: "/login/customer",
    icon: ShoppingBasket,
    title: "I want to order flour",
    desc: "Discover nearby mills, customize your grind, and track delivery.",
    label: "Customer",
  },
  {
    href: "/login/mill",
    icon: Store,
    title: "I run a flour mill",
    desc: "Manage products, accept orders, and grow your local business.",
    label: "Mill Owner",
  },
  {
    href: "/login/delivery",
    icon: Bike,
    title: "I deliver orders",
    desc: "Pick up nearby jobs, navigate, and earn on every drop.",
    label: "Delivery Partner",
  },
]

export default function HomePage() {
  return (
    <main className="min-h-screen">
      {/* Header */}
      <header className="mx-auto flex max-w-6xl items-center justify-between px-5 py-5">
        <div className="flex items-center gap-2">
          <div className="flex size-9 items-center justify-center rounded-xl bg-primary text-primary-foreground">
            <Wheat className="size-5" />
          </div>
          <span className="text-lg font-bold tracking-tight">ChakkiGhar</span>
        </div>
        <Link href="/login/customer">
          <Button variant="ghost" size="sm" className="gap-1">
            Start ordering <ArrowRight className="size-4" />
          </Button>
        </Link>
      </header>

      {/* Hero */}
      <section className="mx-auto grid max-w-6xl items-center gap-10 px-5 py-8 md:grid-cols-2 md:py-16">
        <div className="flex flex-col gap-6">
          <span className="inline-flex w-fit items-center gap-2 rounded-full bg-accent/10 px-3 py-1 text-xs font-semibold text-accent">
            <span className="size-1.5 rounded-full bg-accent" /> Freshly ground, never stored
          </span>
          <h1 className="text-balance text-4xl font-extrabold leading-[1.05] tracking-tight md:text-6xl">
            Stone-ground flour from your <span className="text-primary">local chakki</span>, delivered fresh.
          </h1>
          <p className="max-w-md text-pretty text-base leading-relaxed text-muted-foreground">
            Choose your grains, pick a grind texture, and order from trusted neighborhood mills. Milled the moment you
            order, at your door within the hour.
          </p>
          <div className="flex flex-wrap gap-3">
            <Link href="/login/customer">
              <Button size="lg" className="gap-2">
                <ShoppingBasket className="size-4" /> Order now
              </Button>
            </Link>
            <Link href="/login/mill">
              <Button size="lg" variant="outline" className="gap-2 bg-transparent">
                <Store className="size-4" /> For mill owners
              </Button>
            </Link>
          </div>
          <PlatformStats />
        </div>
        <div className="relative aspect-[4/5] overflow-hidden rounded-3xl border border-border md:aspect-square">
          <Image src="/hero-mill.png" alt="Fresh flour pouring from a stone mill" fill className="object-cover" priority />
        </div>
      </section>

      {/* Role selection */}
      <section className="mx-auto max-w-6xl px-5 py-12">
        <div className="mb-8 text-center">
          <h2 className="text-2xl font-bold tracking-tight md:text-3xl">Choose how you want to use ChakkiGhar</h2>
          <p className="mt-2 text-muted-foreground">One platform, three experiences.</p>
        </div>
        <div className="grid gap-5 md:grid-cols-3">
          {roles.map((r) => (
            <Link
              key={r.href}
              href={r.href}
              className="group flex flex-col gap-4 rounded-3xl border border-border bg-card p-6 transition-all hover:border-primary/40 hover:shadow-lg hover:shadow-primary/5"
            >
              <div className="flex size-12 items-center justify-center rounded-2xl bg-primary/15 text-primary">
                <r.icon className="size-6" />
              </div>
              <div>
                <span className="text-xs font-semibold uppercase tracking-wide text-primary">{r.label}</span>
                <h3 className="mt-1 text-lg font-bold">{r.title}</h3>
                <p className="mt-1 text-sm leading-relaxed text-muted-foreground text-pretty">{r.desc}</p>
              </div>
              <span className="mt-auto inline-flex items-center gap-1 text-sm font-semibold text-foreground transition-colors group-hover:text-primary">
                Continue <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
              </span>
            </Link>
          ))}
        </div>
      </section>

      <footer className="border-t border-border py-8 text-center text-sm text-muted-foreground">
        <p>ChakkiGhar — fresh flour from your neighborhood mill.</p>
      </footer>
    </main>
  )
}
