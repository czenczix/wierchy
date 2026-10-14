import { Link } from 'react-router-dom'
import type { Peak } from '../types'

// Komponent dostaje dane przez "propsy" (tu: szczyt i czy jest zdobyty) i tylko je wyświetla.
// Ten sam komponent rysuje każdy wiersz listy, raz dla Rysów, raz dla Giewontu itd.
type Props = { peak: Peak; done: boolean }

export default function PeakRow({ peak, done }: Props) {
  return (
    <li className={done ? 'done' : undefined}>
      <Link to={`/szczyt/${peak.id}`} className="peak-row">
        <span className="peak-name">
          {done && <span className="done-mark" aria-label="zdobyty">✓ </span>}
          {peak.name}
        </span>
        <span className="peak-ele">{peak.elevation} m</span>
      </Link>
    </li>
  )
}
