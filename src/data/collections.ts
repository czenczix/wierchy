import type { Collection, Point } from '../types'
import { points } from './points'

const idsWhere = (filter: (p: Point) => boolean) => points.filter(filter).map((p) => p.id)
const inTatry = (p: Point) => p.range.startsWith('tatry-')

// Kolekcje "do skompletowania". Postęp i odznaki liczą się osobno dla każdej.
export const collections: Collection[] = [
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

export function getCollection(id: string): Collection {
  const c = collections.find((c) => c.id === id)
  if (!c) throw new Error(`Nie ma kolekcji ${id}`)
  return c
}
