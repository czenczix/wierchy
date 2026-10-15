import { useLiveQuery } from 'dexie-react-hooks'
import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import AscentForm from '../components/AscentForm'
import AscentPhoto from '../components/AscentPhoto'
import GpsCheckIn from '../components/GpsCheckIn'
import { TYPE_LABEL, getPoint } from '../data/points'
import { getRange } from '../data/ranges'
import { db } from '../db'
import type { Ascent } from '../types'

const formatDate = (iso: string) =>
  new Date(iso + 'T12:00').toLocaleDateString('pl-PL', { day: 'numeric', month: 'long', year: 'numeric' })

export default function PeakPage() {
  // useParams odczytuje zmienną część adresu: dla /szczyt/rysy zwraca { id: 'rysy' }.
  const { id = '' } = useParams()
  const peak = getPoint(id)
  const [formOpen, setFormOpen] = useState(false)

  // useLiveQuery pyta bazę i sam odświeża ekran, gdy dane w bazie się zmienią
  // (np. po zapisaniu nowego wejścia). Dopóki baza nie odpowie, zwraca undefined.
  const ascents = useLiveQuery(
    () => db.ascents.where('peakId').equals(id).reverse().sortBy('date'),
    [id],
  )

  // Ktoś mógł wpisać zły adres, np. /szczyt/everest. Wtedy pokazujemy komunikat zamiast błędu.
  if (!peak) {
    return (
      <section>
        <Link to="/" className="back">← Lista</Link>
        <h1>Nie ma takiego miejsca</h1>
      </section>
    )
  }

  async function remove(a: Ascent) {
    if (!confirm('Usunąć to wejście?')) return
    await db.ascents.delete(a.id!)
    if (a.photoId) await db.photos.delete(a.photoId) // razem z wejściem usuwamy jego zdjęcie
  }

  return (
    <section>
      <Link to="/" className="back">← Lista</Link>
      <h1>
        {peak.name} {ascents && ascents.length > 0 && <span className="done-mark" title="Zdobyty">✓</span>}
      </h1>
      <p className="peak-big-ele">{peak.elevation} m n.p.m.</p>

      <dl className="facts">
        <dt>Rodzaj</dt>
        <dd>{TYPE_LABEL[peak.type]}</dd>
        <dt>Pasmo</dt>
        <dd>{getRange(peak.range)?.name ?? peak.range}</dd>
        <dt>Współrzędne</dt>
        <dd>
          {peak.lat.toFixed(5)}° N, {peak.lon.toFixed(5)}° E
          {peak.osmId === 0 && <span className="muted"> (przybliżone)</span>}
        </dd>
      </dl>

      <Link to={`/mapa?szczyt=${peak.id}`} className="secondary">Pokaż na mapie</Link>

      {formOpen ? (
        <AscentForm peakId={peak.id} onDone={() => setFormOpen(false)} />
      ) : (
        <button className="primary" onClick={() => setFormOpen(true)}>
          {ascents && ascents.length > 0 ? 'Dodaj kolejne wejście' : 'Oznacz zdobycie'}
        </button>
      )}

      <GpsCheckIn peak={peak} />

      {ascents && ascents.length > 0 && (
        <>
          <h2>Twoje wejścia ({ascents.length})</h2>
          <ul className="list">
            {ascents.map((a) => (
              <li key={a.id} className="ascent">
                <div className="ascent-head">
                  <strong>
                    {formatDate(a.date)}
                    {a.gpsVerified && <span className="gps-badge" title={`Check-in GPS, ${a.gpsDistance} m od wierzchołka`}>📍 GPS</span>}
                  </strong>
                  <button className="link-button" onClick={() => remove(a)} aria-label="Usuń wejście">Usuń</button>
                </div>
                {a.note && <p className="ascent-note">{a.note}</p>}
                {a.photoId && <AscentPhoto photoId={a.photoId} />}
              </li>
            ))}
          </ul>
        </>
      )}
    </section>
  )
}
