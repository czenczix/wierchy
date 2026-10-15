import { getCollection } from './data/collections'
import { points } from './data/points'
import { groupOf } from './data/ranges'
import type { Ascent, Point } from './types'

// Odznaki NIE są zapisywane w bazie. Za każdym razem wyliczamy je z listy wejść.
// Dzięki temu nie mogą się "rozjechać" z danymi: usuniesz wejście, odznaka sama zniknie.

/** Co wiemy o użytkowniku w danym momencie historii. */
type Progress = { doneIds: Set<string>; gps: boolean }

type BadgeDef = {
  id: string
  icon: string
  name: string
  description: string
  /** Ile już zrobione i ile trzeba (do paska postępu odznaki). */
  measure: (p: Progress) => [number, number]
}

const ids = (filter: (p: Point) => boolean) => points.filter(filter).map((p) => p.id)
const count = (p: Progress, list: string[]) => list.filter((id) => p.doneIds.has(id)).length
/** Odznaka "zdobądź n punktów z listy" (n domyślnie = cała lista). */
const atLeast = (list: string[], n = list.length) => (p: Progress): [number, number] => [Math.min(count(p, list), n), n]

const ALL_PEAKS = ids((p) => p.type === 'peak')
const TATRA_PEAKS = getCollection('tatry-szczyty').pointIds
const PASSES = getCollection('tatry-przelecze').pointIds
const KGP = getCollection('kgp').pointIds
const KBP = getCollection('kbp').pointIds
const DIADEM = getCollection('diadem').pointIds
const kgpIn = (group: string) => KGP.filter((id) => groupOf(points.find((p) => p.id === id)!.range) === group)
const KGP_SUDETY = kgpIn('Sudety')
const KGP_KARPATY = kgpIn('Karpaty').concat(kgpIn('Tatry')) // Tatry też są częścią Karpat
const RED_PEAKS = ['kopa-kondracka', 'malolaczniak', 'krzesanica', 'ciemniak'] // Czerwone Wierchy
const WEST = ids((p) => p.type === 'peak' && p.range === 'tatry-zachodnie')
const TWO_THOUSANDERS = ids((p) => p.type === 'peak' && p.elevation >= 2000)

export const BADGES: BadgeDef[] = [
  { id: 'first', icon: '🥾', name: 'Pierwszy szczyt', description: 'Zdobądź dowolny szczyt', measure: atLeast(ALL_PEAKS, 1) },
  { id: 'five', icon: '🖐️', name: 'Piątka', description: 'Zdobądź 5 szczytów', measure: atLeast(ALL_PEAKS, 5) },
  { id: 'ten', icon: '🔟', name: 'Dziesiątka', description: 'Zdobądź 10 szczytów', measure: atLeast(ALL_PEAKS, 10) },
  { id: '2000', icon: '⛰️', name: 'Dwutysięcznik', description: 'Wejdź na szczyt powyżej 2000 m', measure: atLeast(TWO_THOUSANDERS, 1) },
  { id: 'rysy', icon: '🏔️', name: 'Dach Polski', description: 'Zdobądź Rysy (2499 m)', measure: atLeast(['rysy']) },
  { id: 'red', icon: '🟥', name: 'Czerwone Wierchy', description: 'Wszystkie 4 szczyty Czerwonych Wierchów', measure: atLeast(RED_PEAKS) },
  { id: 'gps', icon: '📍', name: 'Zweryfikowany', description: 'Zrób pierwszy check-in GPS',
    measure: (p) => [p.gps ? 1 : 0, 1] },
  { id: 'west', icon: '🌄', name: 'Komplet Zachodnich', description: 'Wszystkie szczyty Tatr Zachodnich z listy', measure: atLeast(WEST) },
  { id: 'all', icon: '🏆', name: 'Szczyty Tatr', description: 'Wszystkie szczyty Tatr z listy', measure: atLeast(TATRA_PEAKS) },
  { id: 'pass-first', icon: '🪨', name: 'Pierwsza przełęcz', description: 'Przejdź dowolną przełęcz', measure: atLeast(PASSES, 1) },
  { id: 'pass-five', icon: '🧭', name: 'Przełęczowy wędrowiec', description: 'Przejdź 5 przełęczy', measure: atLeast(PASSES, 5) },
  { id: 'kgp-7', icon: '🥉', name: 'Ćwierć Korony', description: '7 szczytów Korony Gór Polskich', measure: atLeast(KGP, 7) },
  { id: 'kgp-14', icon: '🥈', name: 'Pół Korony', description: '14 szczytów Korony Gór Polskich', measure: atLeast(KGP, 14) },
  { id: 'kgp-21', icon: '🥇', name: 'Trzy czwarte Korony', description: '21 szczytów Korony Gór Polskich', measure: atLeast(KGP, 21) },
  { id: 'kgp', icon: '👑', name: 'Korona Gór Polskich', description: 'Wszystkie 28 szczytów Korony', measure: atLeast(KGP) },
  { id: 'kgp-sudety', icon: '🏰', name: 'Sudecka Korona', description: 'Wszystkie szczyty Korony w Sudetach', measure: atLeast(KGP_SUDETY) },
  { id: 'kbp', icon: '🌲', name: 'Korona Beskidów Polskich', description: 'Wszystkie 9 szczytów Korony Beskidów', measure: atLeast(KBP) },
  { id: 'diadem-20', icon: '💠', name: 'Pierwsze kamienie', description: '20 szczytów Diademu Polskich Gór', measure: atLeast(DIADEM, 20) },
  { id: 'diadem-40', icon: '🔷', name: 'Pół Diademu', description: '40 szczytów Diademu Polskich Gór', measure: atLeast(DIADEM, 40) },
  { id: 'diadem-60', icon: '🔶', name: 'Szlifowanie Diademu', description: '60 szczytów Diademu Polskich Gór', measure: atLeast(DIADEM, 60) },
  { id: 'diadem', icon: '💎', name: 'Diadem Polskich Gór', description: 'Wszystkie 80 szczytów Diademu', measure: atLeast(DIADEM) },
  { id: 'kgp-karpaty', icon: '🌲', name: 'Karpacka Korona', description: 'Wszystkie szczyty Korony w Karpatach', measure: atLeast(KGP_KARPATY) },
  { id: 'pass-all', icon: '🎖️', name: 'Przełęcze Tatr', description: 'Wszystkie przełęcze z listy', measure: atLeast(PASSES) },
]

export type BadgeState = BadgeDef & { done: number; needed: number; earnedOn?: string }

/**
 * "Odtwarzamy" historię: przechodzimy po wejściach od najstarszego i po każdym
 * sprawdzamy odznaki. Pierwsza data, w której odznaka jest spełniona, to data jej zdobycia.
 */
export function computeBadges(ascents: Ascent[]): BadgeState[] {
  const sorted = [...ascents].sort((a, b) => a.date.localeCompare(b.date) || a.createdAt - b.createdAt)
  const progress: Progress = { doneIds: new Set(), gps: false }
  const earnedOn: Record<string, string> = {}

  for (const a of sorted) {
    progress.doneIds.add(a.peakId)
    if (a.gpsVerified) progress.gps = true
    for (const b of BADGES) {
      const [done, needed] = b.measure(progress)
      if (!earnedOn[b.id] && done >= needed) earnedOn[b.id] = a.date
    }
  }

  return BADGES.map((b) => {
    const [done, needed] = b.measure(progress)
    return { ...b, done, needed, earnedOn: earnedOn[b.id] }
  })
}
