import { getCollection } from './data/collections'
import { getPoint, points } from './data/points'
import { groupOf } from './data/ranges'
import { plural } from './plural'
import type { Ascent, Point } from './types'

// Odznaki NIE są zapisywane w bazie. Za każdym razem wyliczamy je z listy wejść.
// Dzięki temu nie mogą się "rozjechać" z danymi: usuniesz wejście, odznaka sama zniknie.
//
// Każda odznaka ma jedną miarę (np. "ile zimowych wejść") i progi, czyli poziomy.
// Odznaka z jednym progiem jest zwykła (zdobyta albo nie), z kilkoma ma poziomy:
// brąz, srebro, złoto i dla najtrudniejszych diament.

/** Wszystko, co wiemy o użytkowniku w danym momencie historii. */
type Stats = {
  doneIds: Set<string> // zdobyte punkty (każdy raz)
  ascents: number // wszystkie wejścia, z powtórkami
  gps: number // wejścia z check-inem GPS
  winter: number // wejścia zimowe (21 grudnia – 20 marca)
  seasons: Set<string> // pory roku, w których był choć jeden wpis
  visits: Map<string, number> // ile razy na każdym punkcie
  perYear: Map<string, number> // ile wejść w każdym roku
}

export type Category = 'Kolekcje' | 'Wędrówki' | 'Wyzwania'

type BadgeDef = {
  id: string
  icon: string
  name: string
  category: Category
  /** Opis celu dla danego progu, np. "Zdobądź 10 szczytów". */
  goal: (n: number) => string
  /** Aktualna wartość miary. */
  value: (s: Stats) => number
  /** Progi poziomów, rosnąco. */
  tiers: number[]
}

export const TIER_NAMES = ['Brąz', 'Srebro', 'Złoto', 'Diament']

// --- Listy punktów, z których liczymy miary ---
const ids = (filter: (p: Point) => boolean) => points.filter(filter).map((p) => p.id)
const PEAKS = ids((p) => p.type === 'peak')
const TATRA_PEAKS = getCollection('tatry-szczyty').pointIds
const PASSES = getCollection('tatry-przelecze').pointIds
const KGP = getCollection('kgp').pointIds
const KBP = getCollection('kbp').pointIds
const DIADEM = getCollection('diadem').pointIds
const RED_PEAKS = ['kopa-kondracka', 'malolaczniak', 'krzesanica', 'ciemniak'] // Czerwone Wierchy
const WEST = ids((p) => p.type === 'peak' && p.range === 'tatry-zachodnie')
const TWO_THOUSANDERS = ids((p) => p.type === 'peak' && p.elevation >= 2000)
const kgpIn = (...groups: string[]) => KGP.filter((id) => groups.includes(groupOf(getPoint(id)!.range)))
const KGP_SUDETY = kgpIn('Sudety')
const KGP_KARPATY = kgpIn('Karpaty', 'Tatry') // Tatry też są częścią Karpat

// --- Pomocnicze miary ---
const count = (s: Stats, list: string[]) => list.filter((id) => s.doneIds.has(id)).length
const doneSet = (s: Stats, key: (p: Point) => string) => new Set([...s.doneIds].map((id) => key(getPoint(id)!)))
const metres = (s: Stats) => [...s.doneIds].reduce((sum, id) => sum + getPoint(id)!.elevation, 0)
const maxOf = (m: Map<string, number>) => Math.max(0, ...m.values())

const szczytow = (n: number) => plural(n, 'szczyt', 'szczyty', 'szczytów')

export const BADGES: BadgeDef[] = [
  // Kolekcje: postęp w konkretnych listach szczytów
  { id: 'kgp', icon: '👑', name: 'Korona Gór Polskich', category: 'Kolekcje', tiers: [7, 14, 21, 28],
    goal: (n) => `${szczytow(n)} Korony Gór Polskich`, value: (s) => count(s, KGP) },
  { id: 'diadem', icon: '💎', name: 'Diadem Polskich Gór', category: 'Kolekcje', tiers: [20, 40, 60, 80],
    goal: (n) => `${szczytow(n)} Diademu`, value: (s) => count(s, DIADEM) },
  { id: 'kbp', icon: '🌲', name: 'Korona Beskidów', category: 'Kolekcje', tiers: [3, 6, 9],
    goal: (n) => `${szczytow(n)} Korony Beskidów Polskich`, value: (s) => count(s, KBP) },
  { id: 'tatry', icon: '⛰️', name: 'Szczyty Tatr', category: 'Kolekcje', tiers: [5, 13, TATRA_PEAKS.length],
    goal: (n) => `${szczytow(n)} Tatr z listy`, value: (s) => count(s, TATRA_PEAKS) },
  { id: 'passes', icon: '🪨', name: 'Przełęcze Tatr', category: 'Kolekcje', tiers: [3, 7, PASSES.length],
    goal: (n) => plural(n, 'przełęcz', 'przełęcze', 'przełęczy') + ' Tatr', value: (s) => count(s, PASSES) },
  { id: 'rysy', icon: '🏔️', name: 'Dach Polski', category: 'Kolekcje', tiers: [1],
    goal: () => 'Zdobądź Rysy (2499 m)', value: (s) => count(s, ['rysy']) },
  { id: 'red', icon: '🟥', name: 'Czerwone Wierchy', category: 'Kolekcje', tiers: [RED_PEAKS.length],
    goal: () => 'Wszystkie 4 szczyty Czerwonych Wierchów', value: (s) => count(s, RED_PEAKS) },
  { id: 'west', icon: '🌄', name: 'Komplet Zachodnich', category: 'Kolekcje', tiers: [WEST.length],
    goal: () => 'Wszystkie szczyty Tatr Zachodnich z listy', value: (s) => count(s, WEST) },
  { id: 'kgp-sudety', icon: '🏰', name: 'Sudecka Korona', category: 'Kolekcje', tiers: [KGP_SUDETY.length],
    goal: () => 'Wszystkie szczyty Korony w Sudetach', value: (s) => count(s, KGP_SUDETY) },
  { id: 'kgp-karpaty', icon: '🌿', name: 'Karpacka Korona', category: 'Kolekcje', tiers: [KGP_KARPATY.length],
    goal: () => 'Wszystkie szczyty Korony w Karpatach', value: (s) => count(s, KGP_KARPATY) },

  // Wędrówki: ile i gdzie chodzisz
  { id: 'first', icon: '🥾', name: 'Pierwszy szczyt', category: 'Wędrówki', tiers: [1],
    goal: () => 'Zdobądź dowolny szczyt', value: (s) => count(s, PEAKS) },
  { id: 'peaks', icon: '🧗', name: 'Zdobywca', category: 'Wędrówki', tiers: [10, 25, 50, 100],
    goal: (n) => `Zdobądź ${szczytow(n)}`, value: (s) => count(s, PEAKS) },
  { id: 'metres', icon: '📏', name: 'Kolekcjoner metrów', category: 'Wędrówki', tiers: [10000, 30000, 60000, 100000],
    goal: (n) => `Suma wysokości zdobytych miejsc: ${n.toLocaleString('pl-PL')} m`, value: metres },
  { id: 'ranges', icon: '🗺️', name: 'Pasmo po paśmie', category: 'Wędrówki', tiers: [5, 15, 30],
    goal: (n) => plural(n, 'pasmo górskie', 'pasma górskie', 'pasm górskich'), value: (s) => doneSet(s, (p) => p.range).size },
  { id: 'groups', icon: '🧭', name: 'Od Sudetów po Bieszczady', category: 'Wędrówki', tiers: [4],
    goal: () => 'Tatry, Karpaty, Sudety i Góry Świętokrzyskie', value: (s) => doneSet(s, (p) => groupOf(p.range)).size },
  { id: '2000', icon: '⛰️', name: 'Dwutysięcznik', category: 'Wędrówki', tiers: [1, 5, TWO_THOUSANDERS.length],
    goal: (n) => `${szczytow(n)} powyżej 2000 m`, value: (s) => count(s, TWO_THOUSANDERS) },
  { id: 'ascents', icon: '🔁', name: 'Na szlaku', category: 'Wędrówki', tiers: [10, 50, 100],
    goal: (n) => plural(n, 'wejście', 'wejścia', 'wejść') + ' łącznie (z powtórkami)', value: (s) => s.ascents },
  { id: 'regular', icon: '🏡', name: 'Stały bywalec', category: 'Wędrówki', tiers: [3, 5, 10],
    goal: (n) => `${n} razy na tym samym szczycie`, value: (s) => maxOf(s.visits) },

  // Wyzwania: jak i kiedy
  { id: 'winter', icon: '❄️', name: 'Zimowe wejścia', category: 'Wyzwania', tiers: [1, 5, 15],
    goal: (n) => plural(n, 'wejście', 'wejścia', 'wejść') + ' zimą (21.12–20.03)', value: (s) => s.winter },
  { id: 'seasons', icon: '🍂', name: 'Cztery pory roku', category: 'Wyzwania', tiers: [4],
    goal: () => 'Wejścia wiosną, latem, jesienią i zimą', value: (s) => s.seasons.size },
  { id: 'year', icon: '📅', name: 'Rok w górach', category: 'Wyzwania', tiers: [10, 25, 50],
    goal: (n) => plural(n, 'wejście', 'wejścia', 'wejść') + ' w jednym roku', value: (s) => maxOf(s.perYear) },
  { id: 'gps', icon: '📍', name: 'Zweryfikowany', category: 'Wyzwania', tiers: [1, 10, 25],
    goal: (n) => plural(n, 'check-in', 'check-iny', 'check-inów') + ' GPS na szczycie', value: (s) => s.gps },
]

/** Pora roku z daty RRRR-MM-DD (astronomiczna, tak jak liczy się wejścia zimowe). */
function seasonOf(date: string): string {
  const md = date.slice(5, 7) + date.slice(8, 10) // np. "0115"
  if (md >= '1221' || md <= '0320') return 'zima'
  if (md <= '0621') return 'wiosna'
  if (md <= '0922') return 'lato'
  return 'jesień'
}

export type BadgeState = BadgeDef & {
  current: number // aktualna wartość miary
  level: number // ile progów osiągnięto (0 = jeszcze nic)
  tierDates: string[] // data osiągnięcia każdego progu
  next?: number // następny próg, jeśli jest
}

/**
 * "Odtwarzamy" historię: przechodzimy po wejściach od najstarszego i po każdym
 * sprawdzamy progi. Pierwsza data, w której próg jest spełniony, to data jego zdobycia.
 */
export function computeBadges(ascents: Ascent[]): BadgeState[] {
  const sorted = [...ascents].sort((a, b) => a.date.localeCompare(b.date) || a.createdAt - b.createdAt)
  const s: Stats = { doneIds: new Set(), ascents: 0, gps: 0, winter: 0, seasons: new Set(), visits: new Map(), perYear: new Map() }
  const tierDates: Record<string, string[]> = Object.fromEntries(BADGES.map((b) => [b.id, []]))

  for (const a of sorted) {
    if (!getPoint(a.peakId)) continue // wpis o punkcie, którego już nie ma w danych
    s.doneIds.add(a.peakId)
    s.ascents++
    if (a.gpsVerified) s.gps++
    const season = seasonOf(a.date)
    if (season === 'zima') s.winter++
    s.seasons.add(season)
    s.visits.set(a.peakId, (s.visits.get(a.peakId) ?? 0) + 1)
    const year = a.date.slice(0, 4)
    s.perYear.set(year, (s.perYear.get(year) ?? 0) + 1)

    for (const b of BADGES) {
      const dates = tierDates[b.id]
      const v = b.value(s)
      while (dates.length < b.tiers.length && v >= b.tiers[dates.length]) dates.push(a.date)
    }
  }

  return BADGES.map((b) => {
    const dates = tierDates[b.id]
    return { ...b, current: b.value(s), level: dates.length, tierDates: dates, next: b.tiers[dates.length] }
  })
}

/** Nazwa poziomu (Brąz, Srebro...) dla odznak z kilkoma progami. */
export function tierName(b: BadgeState, level = b.level): string | undefined {
  if (b.tiers.length < 2 || level < 1) return undefined
  // Odznaka z 3 progami: brąz, srebro, złoto. Z 4: dochodzi diament.
  return TIER_NAMES[level - 1]
}
