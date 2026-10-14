import { Link } from 'react-router-dom'
import type { Peak } from '../types'

// Komponent dostaje dane przez "propsy" (tu: jeden szczyt) i tylko je wyświetla.
// Ten sam komponent rysuje każdy wiersz listy, raz dla Rysów, raz dla Giewontu itd.
type Props = { peak: Peak }

export default function PeakRow({ peak }: Props) {
  return (
    <li>
      <Link to={`/szczyt/${peak.id}`} className="peak-row">
        <span className="peak-name">{peak.name}</span>
        <span className="peak-ele">{peak.elevation} m</span>
      </Link>
    </li>
  )
}
