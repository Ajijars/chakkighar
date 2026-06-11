import Pusher from "pusher"

let _pusher: Pusher | null = null

export function getPusher(): Pusher | null {
  if (
    !process.env.PUSHER_APP_ID ||
    !process.env.PUSHER_KEY ||
    !process.env.PUSHER_SECRET ||
    !process.env.PUSHER_CLUSTER
  ) {
    return null // graceful no-op in dev without Pusher configured
  }

  if (!_pusher) {
    _pusher = new Pusher({
      appId: process.env.PUSHER_APP_ID,
      key: process.env.PUSHER_KEY,
      secret: process.env.PUSHER_SECRET,
      cluster: process.env.PUSHER_CLUSTER,
      useTLS: true,
    })
  }
  return _pusher
}

export async function triggerOrderEvent(
  orderId: string,
  event: string,
  data: Record<string, unknown>,
) {
  const pusher = getPusher()
  if (!pusher) return
  try {
    await pusher.trigger(`order-${orderId}`, event, data)
  } catch {
    // non-critical — polling is the fallback
  }
}
