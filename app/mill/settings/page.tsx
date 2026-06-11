"use client"

import { useState, useEffect } from "react"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { useMill } from "@/lib/mill-context"
import { useAuth } from "@/lib/auth-context"
import { api } from "@/lib/api-client"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Star, MapPin, Clock, IndianRupee, LogOut, Pencil, Check, X } from "lucide-react"

function EditableField({
  label,
  value,
  onSave,
  icon: Icon,
  type = "text",
  placeholder,
}: {
  label: string
  value: string
  onSave: (v: string) => void
  icon: React.ElementType
  type?: string
  placeholder?: string
}) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(value)

  useEffect(() => { setDraft(value) }, [value])

  function commit() {
    if (draft.trim() && draft !== value) onSave(draft.trim())
    setEditing(false)
  }

  return (
    <div className="flex items-center gap-3 p-4">
      <Icon className="size-5 text-muted-foreground shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-foreground">{label}</p>
        {editing ? (
          <Input
            autoFocus
            type={type}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") commit(); if (e.key === "Escape") setEditing(false) }}
            placeholder={placeholder}
            className="mt-1 h-8 text-xs"
          />
        ) : (
          <p className="text-xs text-muted-foreground truncate">{value || "—"}</p>
        )}
      </div>
      {editing ? (
        <div className="flex gap-1 shrink-0">
          <button onClick={commit} className="flex size-7 items-center justify-center rounded-full bg-primary text-primary-foreground">
            <Check className="size-3.5" />
          </button>
          <button onClick={() => setEditing(false)} className="flex size-7 items-center justify-center rounded-full bg-muted">
            <X className="size-3.5" />
          </button>
        </div>
      ) : (
        <button onClick={() => setEditing(true)} className="shrink-0 text-muted-foreground hover:text-primary transition-colors">
          <Pencil className="size-4" />
        </button>
      )}
    </div>
  )
}

export default function MillSettingsPage() {
  const { isOpen, setIsOpen, mill, refresh } = useMill()
  const { user, logout } = useAuth()
  const router = useRouter()
  const qc = useQueryClient()

  const updateMut = useMutation({
    mutationFn: (body: Record<string, unknown>) =>
      api("/api/mill/me", { method: "PATCH", body: JSON.stringify(body) }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["mill-me"] })
      qc.invalidateQueries({ queryKey: ["mill-orders"] })
      refresh()
      toast.success("Settings saved")
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed to save"),
  })

  if (!mill) {
    return <p className="p-5 text-muted-foreground">Loading settings...</p>
  }

  const initials = user?.name?.slice(0, 2).toUpperCase() ?? mill.owner.slice(0, 2).toUpperCase()

  return (
    <div className="px-4 py-5">
      <h1 className="text-2xl font-bold text-foreground text-balance">Settings</h1>

      {/* Profile card */}
      <Card className="mt-4 flex-row items-center gap-3 p-4">
        <Avatar className="size-14">
          <AvatarFallback className="bg-primary/15 text-lg text-primary">{initials}</AvatarFallback>
        </Avatar>
        <div className="flex-1">
          <p className="font-semibold text-foreground">{mill.name}</p>
          <p className="text-sm text-muted-foreground">{mill.owner}</p>
          <div className="mt-1 flex items-center gap-1 text-sm">
            <Star className="size-3.5 fill-chart-4 text-chart-4" />
            <span className="font-medium text-foreground">{mill.rating}</span>
            <span className="text-muted-foreground">· {mill.reviews} reviews</span>
          </div>
        </div>
      </Card>

      {/* Open / Closed toggle */}
      <Card className="mt-3 flex-row items-center gap-3 p-4">
        <div className="flex-1">
          <p className="font-medium text-foreground">Shop Status</p>
          <p className="text-sm text-muted-foreground">
            {isOpen ? "Accepting new orders" : "Closed — not accepting orders"}
          </p>
        </div>
        <Badge className={isOpen ? "bg-accent/15 text-accent" : "bg-muted text-muted-foreground"}>
          {isOpen ? "Open" : "Closed"}
        </Badge>
        <Switch checked={isOpen} onCheckedChange={setIsOpen} />
      </Card>

      {/* Editable info */}
      <Card className="mt-3 gap-0 p-0 overflow-hidden">
        <EditableField
          label="Shop Address"
          value={mill.address}
          icon={MapPin}
          onSave={(v) => updateMut.mutate({ address: v })}
          placeholder="Street, area, city"
        />
        <Separator />
        <EditableField
          label="Opens at"
          value={mill.hoursOpen ?? "07:00"}
          icon={Clock}
          type="time"
          onSave={(v) => updateMut.mutate({ hoursOpen: v })}
        />
        <Separator />
        <EditableField
          label="Closes at"
          value={mill.hoursClose ?? "21:00"}
          icon={Clock}
          type="time"
          onSave={(v) => updateMut.mutate({ hoursClose: v })}
        />
        <Separator />
        <EditableField
          label="Delivery Fee (₹)"
          value={String(mill.deliveryFee)}
          icon={IndianRupee}
          type="number"
          onSave={(v) => updateMut.mutate({ deliveryFee: Number(v) })}
          placeholder="e.g. 20"
        />
      </Card>

      <p className="mt-2 px-1 text-xs text-muted-foreground">
        Tap the pencil icon on any field to edit. Press Enter or ✓ to save.
      </p>

      <Button
        variant="outline"
        className="mt-5 w-full text-destructive hover:text-destructive bg-transparent"
        onClick={async () => { await logout(); router.push("/") }}
      >
        <LogOut className="size-4" /> Log out
      </Button>
    </div>
  )
}
