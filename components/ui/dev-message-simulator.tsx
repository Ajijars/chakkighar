"use client"

import { useState, useEffect, useRef } from "react"
import { getPusherClient } from "@/lib/pusher-client"
import {
  MessageSquare,
  Smartphone,
  X,
  Trash2,
  Volume2,
  VolumeX,
  Wifi,
  Battery,
  Send,
  ChevronRight,
  ArrowLeft,
  Terminal,
} from "lucide-react"
import { toast } from "sonner"
import { api } from "@/lib/api-client"

interface Message {
  id: string
  phone: string
  body: string
  createdAt: string
}

export function DevMessageSimulator() {
  const [isOpen, setIsOpen] = useState(false)
  const [messages, setMessages] = useState<Message[]>([])
  const [activeChat, setActiveChat] = useState<string | null>(null)
  const [soundEnabled, setSoundEnabled] = useState(true)
  const [time, setTime] = useState("")
  const [hasNew, setHasNew] = useState(false)
  const lastMsgId = useRef<string | null>(null)

  // Update simulated phone status bar clock
  useEffect(() => {
    const updateTime = () => {
      const d = new Date()
      let hrs = d.getHours()
      const mins = String(d.getMinutes()).padStart(2, "0")
      const ampm = hrs >= 12 ? "PM" : "AM"
      hrs = hrs % 12 || 12
      setTime(`${hrs}:${mins} ${ampm}`)
    }
    updateTime()
    const timer = setInterval(updateTime, 60000)
    return () => clearInterval(timer)
  }, [])

  // Notification chime generator using Web Audio API
  const playChime = () => {
    if (!soundEnabled) return
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext
      if (!AudioCtx) return
      const ctx = new AudioCtx()
      const now = ctx.currentTime

      // Double-chime note 1: D5 (587.33 Hz)
      const osc1 = ctx.createOscillator()
      const gain1 = ctx.createGain()
      osc1.type = "sine"
      osc1.frequency.setValueAtTime(587.33, now)
      gain1.gain.setValueAtTime(0.12, now)
      gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.15)
      osc1.connect(gain1)
      gain1.connect(ctx.destination)
      osc1.start(now)
      osc1.stop(now + 0.15)

      // Double-chime note 2: A5 (880 Hz) after a short delay
      const osc2 = ctx.createOscillator()
      const gain2 = ctx.createGain()
      osc2.type = "sine"
      osc2.frequency.setValueAtTime(880, now + 0.08)
      gain2.gain.setValueAtTime(0.12, now + 0.08)
      gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.3)
      osc2.connect(gain2)
      gain2.connect(ctx.destination)
      osc2.start(now + 0.08)
      osc2.stop(now + 0.3)
    } catch (e) {
      console.error("Audio chime error:", e)
    }
  }

  // Load initial messages
  const loadMessages = async (isPoll = false) => {
    try {
      const res = await api<{ messages: Message[] }>("/api/dev/messages")
      if (res.messages && res.messages.length > 0) {
        setMessages(res.messages)
        const newest = res.messages[0]
        if (lastMsgId.current && newest.id !== lastMsgId.current) {
          playChime()
          setHasNew(true)
          toast.info("💬 New simulated message received!")
        }
        lastMsgId.current = newest.id
      } else {
        setMessages([])
      }
    } catch {
      // ignore silently in background
    }
  }

  // Effect: Setup Pusher subscriptions and fallback polling
  useEffect(() => {
    loadMessages()

    // 1. Setup real-time Pusher listener if configured
    const pusher = getPusherClient()
    let channel: any = null

    if (pusher) {
      channel = pusher.subscribe("dev-sms-channel")
      channel.bind("sms-received", (data: any) => {
        loadMessages()
      })
    }

    // 2. Setup short-polling fallback (every 3s)
    const pollTimer = setInterval(() => {
      loadMessages(true)
    }, 3000)

    return () => {
      clearInterval(pollTimer)
      if (pusher && channel) {
        channel.unbind_all()
        pusher.unsubscribe("dev-sms-channel")
      }
    }
  }, [soundEnabled])

  // Clear messages list
  const clearAll = async () => {
    if (!confirm("Clear all dev messages?")) return
    try {
      await api("/api/dev/messages", { method: "DELETE" })
      setMessages([])
      setActiveChat(null)
      toast.success("Messages cleared")
    } catch (e) {
      toast.error("Failed to clear messages")
    }
  }

  // Extract OTP code (4 digit numbers) from message body
  const extractCode = (body: string) => {
    const match = body.match(/\b\d{4}\b/)
    return match ? match[0] : null
  }

  // Autofill triggering dispatching a custom event
  const triggerAutofill = (body: string, phone: string) => {
    const code = extractCode(body)
    if (!code) return
    
    // Dispatch custom window event
    const event = new CustomEvent("dev-otp-autofill", {
      detail: { otp: code, phone },
    })
    window.dispatchEvent(event)
    toast.success(`Autofilling code: ${code}`)
  }

  // Group messages by phone number
  const chatGroups = messages.reduce((acc, m) => {
    if (!acc[m.phone]) {
      acc[m.phone] = []
    }
    acc[m.phone].push(m)
    return acc
  }, {} as Record<string, Message[]>)

  // Don't render simulator in production environments
  if (process.env.NODE_ENV === "production") return null

  return (
    <div className="fixed bottom-5 right-5 z-50 font-sans">
      {/* Floating Toggle Button */}
      {!isOpen && (
        <button
          onClick={() => {
            setIsOpen(true)
            setHasNew(false)
          }}
          className={`flex h-14 items-center gap-2.5 rounded-full bg-slate-900 px-5 text-white shadow-xl hover:bg-slate-800 border border-slate-700/50 transition-all hover:scale-105 active:scale-95 ${
            hasNew ? "animate-bounce ring-2 ring-primary" : ""
          }`}
        >
          <div className="relative">
            <MessageSquare className="size-5 text-primary animate-pulse" />
            {hasNew && (
              <span className="absolute -top-1.5 -right-1.5 flex size-2.5 rounded-full bg-destructive" />
            )}
          </div>
          <span className="text-xs font-semibold tracking-wide uppercase">Dev Messages</span>
          <span className="flex items-center gap-1 rounded bg-slate-800 px-1.5 py-0.5 text-[10px] font-mono text-slate-400">
            <Terminal className="size-3" /> Sandbox
          </span>
        </button>
      )}

      {/* Glassmorphism Phone Shell */}
      {isOpen && (
        <div className="w-[360px] h-[640px] rounded-[48px] border-[6px] border-slate-900 bg-slate-950 p-2 shadow-2xl ring-2 ring-slate-800/80 flex flex-col relative text-white animate-in slide-in-from-bottom-5 duration-300">
          
          {/* Dynamic Island / Camera Notch */}
          <div className="absolute top-4 left-1/2 -translate-x-1/2 w-28 h-6 rounded-full bg-black z-20 flex items-center justify-center border border-slate-800/60 shadow-inner">
            <div className="size-2 rounded-full bg-slate-900/80 ml-auto mr-4" />
          </div>

          {/* Phone Screen Container */}
          <div className="w-full h-full rounded-[40px] bg-slate-900/90 border border-slate-800/60 overflow-hidden flex flex-col relative">
            
            {/* Status Bar */}
            <div className="h-10 px-6 flex justify-between items-center text-[11px] font-medium tracking-tight text-slate-300 bg-slate-950/30 backdrop-blur-md select-none shrink-0 z-10">
              <span>{time}</span>
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] text-slate-400">LTE</span>
                <Wifi className="size-3 text-slate-300" />
                <Battery className="size-3.5 text-slate-300" />
              </div>
            </div>

            {/* Screen Header */}
            <div className="border-b border-slate-800/50 bg-slate-950/40 px-4 py-3 flex items-center justify-between backdrop-blur-md shrink-0">
              <div className="flex items-center gap-2">
                {activeChat ? (
                  <button
                    onClick={() => setActiveChat(null)}
                    className="size-8 flex items-center justify-center rounded-full hover:bg-slate-800 text-slate-300 transition-colors"
                  >
                    <ArrowLeft className="size-4" />
                  </button>
                ) : (
                  <Smartphone className="size-4 text-primary" />
                )}
                <div>
                  <h3 className="text-xs font-bold text-slate-100 uppercase tracking-wider">
                    {activeChat ? `Chat: ${activeChat}` : "Virtual Messages"}
                  </h3>
                  <p className="text-[10px] text-slate-400">
                    {activeChat ? "SMS Conversation" : "Dev Messaging Hub"}
                  </p>
                </div>
              </div>

              {/* Utility Panel */}
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setSoundEnabled(!soundEnabled)}
                  title={soundEnabled ? "Mute chimes" : "Enable chimes"}
                  className="size-8 flex items-center justify-center rounded-full hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition-colors"
                >
                  {soundEnabled ? <Volume2 className="size-4" /> : <VolumeX className="size-4" />}
                </button>
                <button
                  onClick={clearAll}
                  title="Clear inbox"
                  className="size-8 flex items-center justify-center rounded-full hover:bg-slate-800 text-slate-400 hover:text-destructive transition-colors"
                >
                  <Trash2 className="size-4" />
                </button>
                <button
                  onClick={() => setIsOpen(false)}
                  className="size-8 flex items-center justify-center rounded-full hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition-colors"
                >
                  <X className="size-4" />
                </button>
              </div>
            </div>

            {/* Simulated Phone Desktop / Conversations List */}
            <div className="flex-1 overflow-y-auto px-4 py-3 bg-slate-900/50">
              {Object.keys(chatGroups).length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center gap-3 p-6">
                  <div className="size-14 rounded-full bg-slate-800/80 flex items-center justify-center border border-slate-700/50">
                    <MessageSquare className="size-6 text-slate-500" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-300">Your virtual inbox is empty</p>
                    <p className="text-[10px] text-slate-500 mt-1 max-w-[200px] mx-auto text-balance">
                      Trigger an OTP send or action to see simulated SMS logs arrive here in real-time.
                    </p>
                  </div>
                </div>
              ) : activeChat ? (
                /* Active Conversation View */
                <div className="flex flex-col gap-3.5 min-h-full justify-end py-2">
                  <div className="text-center text-[10px] font-semibold text-slate-500 select-none py-1">
                    SMS Conversation Started
                  </div>
                  {chatGroups[activeChat]
                    .slice()
                    .reverse()
                    .map((msg) => {
                      const code = extractCode(msg.body)
                      return (
                        <div key={msg.id} className="flex flex-col gap-1 max-w-[85%] self-start">
                          {/* Chat bubble */}
                          <div className="rounded-2xl rounded-tl-none bg-slate-800 border border-slate-700/60 p-3.5 shadow-md">
                            <p className="text-xs text-slate-200 font-medium leading-relaxed break-words whitespace-pre-wrap">
                              {msg.body}
                            </p>
                            
                            {/* Autofill Trigger */}
                            {code && (
                              <button
                                onClick={() => triggerAutofill(msg.body, msg.phone)}
                                className="mt-3 w-full py-1.5 px-3 rounded-lg bg-primary hover:bg-primary/95 text-primary-foreground text-[10px] font-bold tracking-wide uppercase flex items-center justify-center gap-1 shadow-sm transition-all hover:scale-[1.02] active:scale-95"
                              >
                                <Send className="size-3" /> Autofill Code: {code}
                              </button>
                            )}
                          </div>
                          {/* Time */}
                          <span className="text-[9px] text-slate-500 px-1 self-start select-none">
                            {new Date(msg.createdAt).toLocaleTimeString([], {
                              hour: "2-digit",
                              minute: "2-digit",
                              second: "2-digit",
                            })}
                          </span>
                        </div>
                      )
                    })}
                </div>
              ) : (
                /* Inbox Contacts List */
                <div className="flex flex-col gap-2">
                  {Object.entries(chatGroups).map(([phone, msgs]) => {
                    const latest = msgs[0]
                    const hasCode = !!extractCode(latest.body)
                    return (
                      <button
                        key={phone}
                        onClick={() => setActiveChat(phone)}
                        className="w-full flex items-center gap-3 bg-slate-950/40 hover:bg-slate-950/80 border border-slate-800/60 rounded-2xl p-3.5 text-left transition-all hover:border-slate-700/50"
                      >
                        <div className="size-10 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center font-bold text-xs text-slate-300">
                          {phone.slice(-4)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex justify-between items-baseline mb-0.5">
                            <span className="text-xs font-bold text-slate-100 truncate">
                              +91 {phone.replace(/(\d{5})(\d{5})/, "$1 $2")}
                            </span>
                            <span className="text-[9px] text-slate-500 shrink-0">
                              {new Date(latest.createdAt).toLocaleTimeString([], {
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </span>
                          </div>
                          <p className="text-[10.5px] text-slate-400 truncate pr-4">
                            {latest.body}
                          </p>
                        </div>
                        <div className="flex flex-col items-center gap-1.5">
                          {hasCode && (
                            <span className="size-2 rounded-full bg-primary animate-ping" />
                          )}
                          <ChevronRight className="size-3.5 text-slate-500" />
                        </div>
                      </button>
                    )
                  })}
                </div>
              )}
            </div>

            {/* iPhone Home Indicator bar */}
            <div className="h-6 w-full flex justify-center items-center shrink-0 bg-slate-950/20">
              <div className="w-28 h-1 rounded-full bg-slate-700/60" />
            </div>

          </div>
        </div>
      )}
    </div>
  )
}
