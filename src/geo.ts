// Progi check-inu GPS. Łatwo je tu zmienić w jednym miejscu.
export const CHECKIN_RADIUS_M = 100 // jak blisko wierzchołka trzeba być
export const MAX_ACCURACY_M = 50 // jak dokładny musi być pomiar GPS

/**
 * Odległość w metrach między dwoma punktami na kuli ziemskiej (wzór haversine).
 * Ziemia nie jest płaska, więc nie wystarczy Pitagoras na stopniach:
 * 1° długości geograficznej w Tatrach to ok. 73 km, a 1° szerokości ok. 111 km.
 */
export function distanceM(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6_371_000 // promień Ziemi w metrach
  const rad = (deg: number) => (deg * Math.PI) / 180
  const dLat = rad(lat2 - lat1)
  const dLon = rad(lon2 - lon1)
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(rad(lat1)) * Math.cos(rad(lat2)) * Math.sin(dLon / 2) ** 2
  return 2 * R * Math.asin(Math.sqrt(a))
}

/** Pobiera bieżącą pozycję z GPS telefonu. Przeglądarka sama zapyta o zgodę. */
export function getPosition(): Promise<GeolocationPosition> {
  return new Promise((resolve, reject) => {
    if (!('geolocation' in navigator)) return reject(new Error('Ta przeglądarka nie obsługuje GPS'))
    navigator.geolocation.getCurrentPosition(resolve, reject, {
      enableHighAccuracy: true, // prosimy o prawdziwy GPS, nie przybliżenie z sieci
      timeout: 30_000,
      maximumAge: 0, // nie chcemy starej pozycji z pamięci
    })
  })
}

export function formatDistance(m: number): string {
  return m < 1000 ? `${Math.round(m)} m` : `${(m / 1000).toFixed(1).replace('.', ',')} km`
}
