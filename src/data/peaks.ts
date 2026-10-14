import type { Peak } from '../types'
import rawPeaks from './peaks.json'

// Jedno miejsce, z którego reszta apki bierze szczyty.
// "as Peak[]" mówi TypeScriptowi: ufamy, że JSON ma kształt typu Peak.
export const peaks = rawPeaks as Peak[]

export function getPeak(id: string): Peak | undefined {
  return peaks.find((p) => p.id === id)
}
