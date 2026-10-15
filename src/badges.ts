import { peaks } from './data/peaks'
import type { Ascent } from './types'

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

const ids = (filter: (p: (typeof peaks)[number]) => boolean) => peaks.filter(filter).map((p) => p.id)
const count = (p: Progress, list: string[]) => list.filter((id) => p.doneIds.has(id)).length

const RED_PEAKS = ['kopa-kondracka', 'malolaczniak', 'krzesanica', 'ciemniak'] // Czerwone Wierchy
const WEST = ids((p) => p.range === 'zachodnie')
const ALL = ids(() => true)
const TWO_THOUSANDERS = ids((p) => p.elevation >= 2000)

export const BADGES: BadgeDef[] = [
  { id: 'first', icon: '🥾', name: 'Pierwszy szczyt', description: 'Zdobądź dowolny szczyt',
    measure: (p) => [Math.min(p.doneIds.size, 1), 1] },
  { id: 'five', icon: '🖐️', name: 'Piątka', description: 'Zdobądź 5 szczytów',
    measure: (p) => [Math.min(p.doneIds.size, 5), 5] },
  { id: 'ten', icon: '🔟', name: 'Dziesiątka', description: 'Zdobądź 10 szczytów',
    measure: (p) => [Math.min(p.doneIds.size, 10), 10] },
  { id: '2000', icon: '⛰️', name: 'Dwutysięcznik', description: 'Wejdź na szczyt powyżej 2000 m',
    measure: (p) => [Math.min(count(p, TWO_THOUSANDERS), 1), 1] },
  { id: 'rysy', icon: '👑', name: 'Dach Polski', description: 'Zdobądź Rysy (2499 m)',
    measure: (p) => [count(p, ['rysy']), 1] },
  { id: 'red', icon: '🟥', name: 'Czerwone Wierchy', description: 'Wszystkie 4 szczyty Czerwonych Wierchów',
    measure: (p) => [count(p, RED_PEAKS), RED_PEAKS.length] },
  { id: 'gps', icon: '📍', name: 'Zweryfikowany', description: 'Zrób pierwszy check-in GPS na szczycie',
    measure: (p) => [p.gps ? 1 : 0, 1] },
  { id: 'west', icon: '🌄', name: 'Komplet Zachodnich', description: 'Wszystkie szczyty Tatr Zachodnich z listy',
    measure: (p) => [count(p, WEST), WEST.length] },
  { id: 'all', icon: '🏆', name: 'Cała kolekcja', description: 'Wszystkie szczyty z listy',
    measure: (p) => [count(p, ALL), ALL.length] },
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
