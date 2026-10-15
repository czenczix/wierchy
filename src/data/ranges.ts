import type { Range } from '../types'

// Lista pasm. Kolejne góry (Beskidy, Sudety...) dopisujemy tutaj.
export const ranges: Range[] = [
  { id: 'tatry-wysokie', name: 'Tatry Wysokie', group: 'Tatry' },
  { id: 'tatry-zachodnie', name: 'Tatry Zachodnie', group: 'Tatry' },
]

export function getRange(id: string): Range | undefined {
  return ranges.find((r) => r.id === id)
}
