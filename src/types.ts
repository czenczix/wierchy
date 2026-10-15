// Typy opisują kształt danych. TypeScript pilnuje, żeby każdy szczyt miał wszystkie pola
// i żeby np. wysokość była liczbą, a nie tekstem.

/** Punkt do zdobycia: szczyt albo przełęcz. */
export type Point = {
  id: string // używany w adresie, np. /szczyt/rysy
  name: string
  type: 'peak' | 'pass'
  elevation: number // m n.p.m.
  lat: number // szerokość geograficzna (°N)
  lon: number // długość geograficzna (°E)
  range: string // id pasma z src/data/ranges.ts, np. 'tatry-wysokie'
  osmId: number // id punktu w OpenStreetMap, skąd wzięliśmy współrzędne (0 = współrzędne przybliżone)
}

/** Pasmo górskie (albo jego część). Dzięki temu dodanie np. Beskidów to tylko nowy wpis. */
export type Range = {
  id: string
  name: string
  group: string // większa całość, np. 'Tatry'; po niej grupujemy na ekranie postępu
}

/**
 * Kolekcja to lista punktów do "skompletowania", np. Szczyty Tatr albo Korona Gór Polskich.
 * Jeden punkt może być w wielu kolekcjach: Rysy są i w Tatrach, i (wkrótce) w Koronie.
 */
export type Collection = {
  id: string
  name: string
  icon: string
  description: string
  pointIds: string[]
}

/** Jedno wejście na szczyt. Na ten sam szczyt można wejść wiele razy. */
export type Ascent = {
  id?: number // nadaje baza przy zapisie, dlatego przed zapisem go nie ma
  peakId: string // który punkt (Point.id); nazwa pola została z czasów, gdy były same szczyty
  date: string // dzień wejścia w formacie RRRR-MM-DD
  note: string
  photoId?: number // zdjęcie w tabeli photos (opcjonalne)
  gpsVerified: boolean // true, jeśli zrobiono check-in GPS na szczycie
  gpsDistance?: number // odległość od wierzchołka przy check-inie (m)
  gpsAccuracy?: number // dokładność pomiaru GPS (m)
  createdAt: number // kiedy wpis powstał (ms od 1970), do sortowania
}

/** Zdjęcie trzymamy osobno od wejścia, bo jest duże, a listy wejść ładujemy często. */
export type Photo = {
  id?: number
  blob: Blob // sam obrazek (zmniejszony JPEG)
}
