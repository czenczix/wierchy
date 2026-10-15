import type { Collection, Point } from '../types'
import { points } from './points'
import { groupOf } from './ranges'

const idsWhere = (filter: (p: Point) => boolean) => points.filter(filter).map((p) => p.id)
const inTatry = (p: Point) => groupOf(p.range) === 'Tatry'

// Kolekcje "do skompletowania". Postęp i odznaki liczą się osobno dla każdej.
export const collections: Collection[] = [
  {
    id: 'kgp',
    name: 'Korona Gór Polskich',
    icon: '👑',
    description: 'Najwyższe szczyty 28 pasm górskich Polski',
    crown: true,
    source: 'Klub Zdobywców KGP',
    // Rysy są i tu, i w Szczytach Tatr: jedno wejście liczy się do obu kolekcji.
    pointIds: [
      'rysy', 'babia-gora', 'sniezka', 'snieznik', 'tarnica', 'turbacz', 'radziejowa', 'skrzyczne',
      'mogielica', 'wysoka-kopa', 'rudawiec', 'orlica', 'wysoka', 'wielka-sowa', 'lackowa', 'kowadlo',
      'jagodna', 'skalnik', 'waligora', 'czupel', 'szczeliniec-wielki', 'lubomir', 'biskupia-kopa',
      'chelmiec', 'klodzka-gora', 'skopiec', 'sleza', 'lysica',
    ],
  },
  {
    id: 'kbp',
    name: 'Korona Beskidów Polskich',
    icon: '🌲',
    description: 'Najwyższe szczyty 9 pasm Beskidów i Gorców',
    crown: true,
    source: 'PTT (część Wielkiej Korony Beskidów)',
    // Wszystkie 9 są też w Koronie Gór Polskich, więc wejścia liczą się podwójnie.
    pointIds: ['babia-gora', 'tarnica', 'turbacz', 'radziejowa', 'skrzyczne', 'mogielica', 'lackowa', 'czupel', 'lubomir'],
  },
  {
    id: 'tatry-szczyty',
    name: 'Szczyty Tatr',
    icon: '⛰️',
    description: 'Szczyty polskich Tatr dostępne szlakiem',
    pointIds: idsWhere((p) => inTatry(p) && p.type === 'peak'),
  },
  {
    id: 'tatry-przelecze',
    name: 'Przełęcze Tatr',
    icon: '🪨',
    description: 'Przełęcze na tatrzańskich szlakach',
    pointIds: idsWhere((p) => inTatry(p) && p.type === 'pass'),
  },
]

/** Kolekcje, do których należy dany punkt (np. Rysy: Korona i Szczyty Tatr). */
export const collectionsOf = (pointId: string) => collections.filter((c) => c.pointIds.includes(pointId))

/** Korony do zakładki Korona, w kolejności z listy wyżej. */
export const crowns = collections.filter((c) => c.crown)

export function getCollection(id: string): Collection {
  const c = collections.find((c) => c.id === id)
  if (!c) throw new Error(`Nie ma kolekcji ${id}`)
  return c
}
