import { Link, useParams } from 'react-router-dom'
import { getPeak } from '../data/peaks'

const RANGE_LABEL = { wysokie: 'Tatry Wysokie', zachodnie: 'Tatry Zachodnie' }

export default function PeakPage() {
  // useParams odczytuje zmienną część adresu: dla /szczyt/rysy zwraca { id: 'rysy' }.
  const { id } = useParams()
  const peak = id ? getPeak(id) : undefined

  // Ktoś mógł wpisać zły adres, np. /szczyt/everest. Wtedy pokazujemy komunikat zamiast błędu.
  if (!peak) {
    return (
      <section>
        <Link to="/" className="back">← Szczyty</Link>
        <h1>Nie ma takiego szczytu</h1>
      </section>
    )
  }

  return (
    <section>
      <Link to="/" className="back">← Szczyty</Link>
      <h1>{peak.name}</h1>
      <p className="peak-big-ele">{peak.elevation} m n.p.m.</p>

      <dl className="facts">
        <dt>Część</dt>
        <dd>{RANGE_LABEL[peak.range]}</dd>
        <dt>Współrzędne</dt>
        <dd>
          {peak.lat.toFixed(5)}° N, {peak.lon.toFixed(5)}° E
          {peak.osmId === 0 && <span className="muted"> (przybliżone)</span>}
        </dd>
      </dl>

      <Link to={`/mapa?szczyt=${peak.id}`} className="secondary">Pokaż na mapie</Link>

      <button className="primary" disabled>Oznacz zdobycie</button>
      <p className="muted small">Zapisywanie zdobyć dojdzie w kroku 5.</p>
    </section>
  )
}
