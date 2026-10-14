import Dexie, { type EntityTable } from 'dexie'
import type { Ascent } from './types'

// IndexedDB to baza danych wbudowana w przeglądarkę. Dane zostają w telefonie
// po zamknięciu apki i działają bez internetu. Dexie to nakładka, która
// pozwala z niej korzystać prostszym kodem.
export const db = new Dexie('wierchy') as Dexie & {
  ascents: EntityTable<Ascent, 'id'>
}

// Wersja 1 schematu. "++id" = numer nadawany automatycznie,
// peakId i date to pola, po których będziemy szukać (indeksy).
// Gdy kiedyś zmienimy strukturę, dodamy db.version(2) zamiast zmieniać tę linijkę.
db.version(1).stores({
  ascents: '++id, peakId, date',
})

/** Dzisiejsza data w formacie RRRR-MM-DD według czasu lokalnego (nie UTC). */
export function today(): string {
  const d = new Date()
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}
