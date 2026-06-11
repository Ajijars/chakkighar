const EARTH_RADIUS_KM = 6371
export const MAX_RADIUS_KM = 10

export function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const toRad = (d: number) => (d * Math.PI) / 180
  const dLat = toRad(lat2 - lat1)
  const dLng = toRad(lng2 - lng1)
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2
  return EARTH_RADIUS_KM * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

export function etaMins(distanceKm: number): number {
  return Math.max(15, Math.round(distanceKm * 12 + 15))
}

export function isWithinRadius(
  userLat: number,
  userLng: number,
  targetLat: number,
  targetLng: number,
  radiusKm = MAX_RADIUS_KM,
): boolean {
  return haversineKm(userLat, userLng, targetLat, targetLng) <= radiusKm
}
