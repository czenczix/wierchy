import { Link } from 'react-router-dom'
import type { Point } from '../types'

// Komponent dostaje dane przez "propsy" (tu: punkt i czy jest zdobyty) i tylko je wyświetla.
// Ten sam komponent rysuje każdy wiersz listy, raz dla Rysów, raz dla Zawratu itd.
// "sub" to opcjonalny podpis pod nazwą, np. nazwa pasma na liście Korony.
type Props = { peak: Point; done: boolean; sub?: string }

export default function PeakRow({ peak, done, sub }: Props) {
  return (
    <li className={done ? 'done' : undefined}>
      <Link to={`/szczyt/${peak.id}`} className="peak-row">
        <span className="peak-name">
          {done && <span className="done-mark" aria-label="zdobyty">✓ </span>}
          {peak.name}
          {peak.type === 'pass' && <span className="tag">przełęcz</span>}
          {sub && <span className="peak-sub">{sub}</span>}
        </span>
        <span className="peak-ele">{peak.elevation} m</span>
      </Link>
    </li>
  )
}
