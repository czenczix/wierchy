// Typy opisują kształt danych. TypeScript pilnuje, żeby każdy szczyt miał wszystkie pola
// i żeby np. wysokość była liczbą, a nie tekstem.

/** Punkt do zdobycia. Na razie same szczyty; przełęcze dojdą później jako type: 'pass'. */
export type Peak = {
  id: string // używany w adresie, np. /szczyt/rysy
  name: string
  type: 'peak' | 'pass'
  elevation: number // m n.p.m.
  lat: number // szerokość geograficzna (°N)
  lon: number // długość geograficzna (°E)
  range: 'zachodnie' | 'wysokie' // część Tatr
  osmId: number // id punktu w OpenStreetMap, skąd wzięliśmy współrzędne (0 = współrzędne przybliżone)
}

/** Jedno wejście na szczyt. Na ten sam szczyt można wejść wiele razy. */
export type Ascent = {
  id?: number // nadaje baza przy zapisie, dlatego przed zapisem go nie ma
  peakId: string // który szczyt (Peak.id)
  date: string // dzień wejścia w formacie RRRR-MM-DD
  note: string
  gpsVerified: boolean // ustawi check-in GPS w kroku 7
  createdAt: number // kiedy wpis powstał (ms od 1970), do sortowania
}
