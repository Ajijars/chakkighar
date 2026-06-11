"use client"

import { useRef, useState } from "react"
import { cn } from "@/lib/utils"
import { ChevronRight } from "lucide-react"

export function SlideConfirm({
  label,
  onConfirm,
  className,
}: {
  label: string
  onConfirm: () => void
  className?: string
}) {
  const track = useRef<HTMLDivElement>(null)
  const [offset, setOffset] = useState(0)
  const [done, setDone] = useState(false)

  function onMove(clientX: number) {
    if (done || !track.current) return
    const rect = track.current.getBoundingClientRect()
    const max = rect.width - 48
    setOffset(Math.max(0, Math.min(clientX - rect.left - 24, max)))
  }

  function onEnd() {
    if (!track.current) return
    const max = track.current.clientWidth - 48
    if (offset >= max * 0.85) {
      setDone(true)
      setOffset(max)
      onConfirm()
    } else {
      setOffset(0)
    }
  }

  return (
    <div
      ref={track}
      className={cn(
        "relative h-12 select-none overflow-hidden rounded-full bg-primary/15",
        done && "bg-accent/20",
        className,
      )}
      onPointerMove={(e) => e.buttons === 1 && onMove(e.clientX)}
      onPointerUp={onEnd}
      onPointerLeave={onEnd}
    >
      <span className="pointer-events-none absolute inset-0 flex items-center justify-center text-sm font-semibold text-primary">
        {done ? "Confirmed" : label}
      </span>
      <div
        className="absolute top-1 left-1 flex size-10 cursor-grab items-center justify-center rounded-full bg-primary text-primary-foreground shadow active:cursor-grabbing"
        style={{ transform: `translateX(${offset}px)` }}
        onPointerDown={(e) => e.currentTarget.setPointerCapture(e.pointerId)}
        onPointerMove={(e) => onMove(e.clientX)}
      >
        <ChevronRight className="size-5" />
      </div>
    </div>
  )
}
