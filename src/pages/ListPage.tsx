import { useLiveQuery } from 'dexie-react-hooks'
import { useState } from 'react'
import PeakRow from '../components/PeakRow'
import { peaks } from '../data/peaks'
import { db } from '../db'
import type { Peak } from '../types'

type Filter = 'wszystkie' | Peak['range']

const FILTERS: { value: Filter; label: string }[] = [
  { value: 'wszystkie', label: 'Wszystkie' },
  { value: 'wysokie', label: 'Wysokie' },
  { value: 'zachodnie', label: 'Zachodnie' },
]

export default function ListPage() {
  // useState to "pamięć" komponentu. Gdy wywołamy setFilter, React
  // przerysuje ekran z nową wartością i lista sama się przefiltruje.
  const [filter, setFilter] = useState<Filter>('wszystkie')

  // Zbiór id zdobytych szczytów. uniqueKeys zwraca każde peakId tylko raz,
  // nawet jeśli na Rysy wszedłeś trzy razy.
  const doneIds = useLiveQuery(async () => new Set((await db.ascents.orderBy('peakId').uniqueKeys()) as string[]))

  const visible = peaks
    .filter((p) => filter === 'wszystkie' || p.range === filter)
    .sort((a, b) => b.elevation - a.elevation)

  return (
    <section>
      <h1>Szczyty</h1>
      <p className="muted">
        Zdobyte: {doneIds?.size ?? 0} z {peaks.length}
      </p>

      <div className="chips" role="group" aria-label="Część Tatr">
        {FILTERS.map((f) => (
          <button
            key={f.value}
            className={f.value === filter ? 'chip active' : 'chip'}
            onClick={() => setFilter(f.value)}
          >
            {f.label}
          </button>
        ))}
      </div>

      <ul className="list">
        {visible.map((peak) => (
          <PeakRow key={peak.id} peak={peak} done={doneIds?.has(peak.id) ?? false} />
        ))}
      </ul>
    </section>
  )
}
