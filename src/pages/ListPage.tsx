import { useLiveQuery } from 'dexie-react-hooks'
import { useState } from 'react'
import PeakRow from '../components/PeakRow'
import { points } from '../data/points'
import { ranges } from '../data/ranges'
import { db } from '../db'
import type { Point } from '../types'

type TypeFilter = 'all' | Point['type']

const TYPE_FILTERS: { value: TypeFilter; label: string }[] = [
  { value: 'all', label: 'Wszystko' },
  { value: 'peak', label: 'Szczyty' },
  { value: 'pass', label: 'Przełęcze' },
]

// Rząd przycisków-filtrów. Wydzielony, bo na ekranie są dwa takie rzędy.
function Chips<T extends string>(props: {
  label: string
  options: { value: T; label: string }[]
  value: T
  onChange: (v: T) => void
}) {
  return (
    <div className="chips" role="group" aria-label={props.label}>
      {props.options.map((o) => (
        <button
          key={o.value}
          className={o.value === props.value ? 'chip active' : 'chip'}
          onClick={() => props.onChange(o.value)}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}

export default function ListPage() {
  // useState to "pamięć" komponentu. Gdy wywołamy setType albo setRange, React
  // przerysuje ekran z nową wartością i lista sama się przefiltruje.
  const [type, setType] = useState<TypeFilter>('all')
  const [range, setRange] = useState('all')

  // Zbiór id zdobytych punktów. uniqueKeys zwraca każde peakId tylko raz,
  // nawet jeśli na Rysy wszedłeś trzy razy.
  const doneIds = useLiveQuery(async () => new Set((await db.ascents.orderBy('peakId').uniqueKeys()) as string[]))

  const visible = points
    .filter((p) => type === 'all' || p.type === type)
    .filter((p) => range === 'all' || p.range === range)
    .sort((a, b) => b.elevation - a.elevation)
  const doneVisible = visible.filter((p) => doneIds?.has(p.id)).length

  return (
    <section>
      <h1>Tatry</h1>
      <p className="muted">
        Zdobyte: {doneVisible} z {visible.length}
      </p>

      <Chips label="Rodzaj" options={TYPE_FILTERS} value={type} onChange={setType} />
      <Chips
        label="Pasmo"
        options={[{ value: 'all', label: 'Całe Tatry' }, ...ranges.map((r) => ({ value: r.id, label: r.name.replace('Tatry ', '') }))]}
        value={range}
        onChange={setRange}
      />

      <ul className="list">
        {visible.map((p) => (
          <PeakRow key={p.id} peak={p} done={doneIds?.has(p.id) ?? false} />
        ))}
      </ul>
    </section>
  )
}
