import type { Point } from '../types'
import rawPasses from './passes.json'
import rawPeaksDiadem from './peaks-diadem.json'
import rawPeaksPl from './peaks-pl.json'
import rawPeaks from './peaks.json'

// Jedno miejsce, z którego reszta apki bierze punkty. Każdy rodzaj ma swój plik JSON
// (bo każdy ma swój skrypt pobierający z OSM), a tu łączymy je w jedną listę.
// "as Point[]" mówi TypeScriptowi: ufamy, że JSON ma kształt typu Point.
export const points = [...rawPeaks, ...rawPasses, ...rawPeaksPl, ...rawPeaksDiadem] as Point[]

export function getPoint(id: string): Point | undefined {
  return points.find((p) => p.id === id)
}

export const TYPE_LABEL: Record<Point['type'], string> = { peak: 'Szczyt', pass: 'Przełęcz' }
