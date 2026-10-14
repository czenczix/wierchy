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
