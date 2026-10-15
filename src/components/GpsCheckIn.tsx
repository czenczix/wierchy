import { useState } from 'react'
import { db, today } from '../db'
import { CHECKIN_RADIUS_M, MAX_ACCURACY_M, distanceM, formatDistance, getPosition } from '../geo'
import type { Point } from '../types'

type Status =
  | { kind: 'idle' }
  | { kind: 'locating' }
  | { kind: 'ok'; distance: number }
  | { kind: 'too-far'; distance: number }
  | { kind: 'inaccurate'; accuracy: number }
  | { kind: 'error'; message: string }

export default function GpsCheckIn({ peak }: { peak: Point }) {
  const [status, setStatus] = useState<Status>({ kind: 'idle' })

  async function checkIn() {
    setStatus({ kind: 'locating' })
    try {
      const { coords } = await getPosition()
      const distance = distanceM(coords.latitude, coords.longitude, peak.lat, peak.lon)

      if (coords.accuracy > MAX_ACCURACY_M) return setStatus({ kind: 'inaccurate', accuracy: coords.accuracy })
      if (distance > CHECKIN_RADIUS_M) return setStatus({ kind: 'too-far', distance })

      // Jesteśmy na szczycie. Jeśli dzisiaj już jest wpis (np. dodany ręcznie),
      // oznaczamy go jako zweryfikowany. Jeśli nie, tworzymy nowy wpis z dzisiejszą datą.
      const gps = { gpsVerified: true, gpsDistance: Math.round(distance), gpsAccuracy: Math.round(coords.accuracy) }
      const todays = await db.ascents.where('peakId').equals(peak.id).filter((a) => a.date === today()).first()
      if (todays) await db.ascents.update(todays.id!, gps)
      else await db.ascents.add({ peakId: peak.id, date: today(), note: '', createdAt: Date.now(), ...gps })
      setStatus({ kind: 'ok', distance })
    } catch (err) {
      // GeolocationPositionError ma kod: 1 = brak zgody, 2 = brak sygnału, 3 = za długo.
      const code = (err as GeolocationPositionError).code
      const message =
        code === 1 ? 'Brak zgody na lokalizację. Włącz ją w ustawieniach przeglądarki.'
        : code === 3 ? 'GPS nie złapał pozycji na czas. Spróbuj jeszcze raz.'
        : (err as Error).message || 'Nie udało się ustalić pozycji.'
      setStatus({ kind: 'error', message })
    }
  }

  return (
    <div className="checkin">
      <button className="secondary" onClick={checkIn} disabled={status.kind === 'locating'}>
        {status.kind === 'locating' ? 'Szukam sygnału GPS…' : '📍 Check-in GPS na szczycie'}
      </button>
      {status.kind === 'ok' && <p className="msg ok">Zweryfikowano! Jesteś {formatDistance(status.distance)} od wierzchołka.</p>}
      {status.kind === 'too-far' && (
        <p className="msg">
          Jesteś {formatDistance(status.distance)} od wierzchołka. Check-in działa do {CHECKIN_RADIUS_M} m.
        </p>
      )}
      {status.kind === 'inaccurate' && (
        <p className="msg">
          Pomiar jest za mało dokładny (±{Math.round(status.accuracy)} m). Poczekaj chwilę na otwartym terenie i spróbuj ponownie.
        </p>
      )}
      {status.kind === 'error' && <p className="msg">{status.message}</p>}
    </div>
  )
}
