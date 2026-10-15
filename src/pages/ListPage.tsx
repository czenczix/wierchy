import { useLiveQuery } from 'dexie-react-hooks'
import { useSearchParams } from 'react-router-dom'
import PeakRow from '../components/PeakRow'
import { points } from '../data/points'
import { getRange, groupOf, ranges } from '../data/ranges'
import { db } from '../db'

const GROUPS = ['Tatry', 'Karpaty', 'Sudety', 'Góry Świętokrzyskie']
const TYPES = [
  { value: '', label: 'Wszystko' },
  { value: 'peak', label: 'Szczyty' },
  { value: 'pass', label: 'Przełęcze' },
]

/** Do wyszukiwania: małe litery i bez polskich znaków, żeby "snieznik" znalazł Śnieżnik. */
const simplify = (s: string) =>
  s.toLocaleLowerCase('pl').replace(/ł/g, 'l').normalize('NFD').replace(/\p{Diacritic}/gu, '')

// Rząd przycisków-filtrów.
function Chips(props: { label: string; options: { value: string; label: string }[]; value: string; onChange: (v: string) => void }) {
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
  // Filtry trzymamy w adresie (np. /?g=Sudety&q=sow). Dzięki temu po wejściu w kartę
  // szczytu i "Wróć" lista wygląda tak samo jak przed chwilą.
  const [params, setParams] = useSearchParams()
  const group = params.get('g') ?? ''
  const range = params.get('p') ?? ''
  const type = params.get('t') ?? ''
  const query = params.get('q') ?? ''

  const set = (changes: Record<string, string>) => {
    const next = new URLSearchParams(params)
    for (const [k, v] of Object.entries(changes)) {
      if (v) next.set(k, v)
      else next.delete(k)
    }
    setParams(next, { replace: true })
  }

  // Zbiór id zdobytych punktów. uniqueKeys zwraca każde peakId tylko raz.
  const doneIds = useLiveQuery(async () => new Set((await db.ascents.orderBy('peakId').uniqueKeys()) as string[]))

  const groupRanges = ranges.filter((r) => r.group === group)
  const q = simplify(query.trim())
  const visible = points
    .filter((p) => !group || groupOf(p.range) === group)
    .filter((p) => !range || p.range === range)
    .filter((p) => !type || p.type === type)
    .filter((p) => !q || simplify(p.name).includes(q) || simplify(getRange(p.range)?.name ?? '').includes(q))
    .sort((a, b) => b.elevation - a.elevation)
  const doneVisible = visible.filter((p) => doneIds?.has(p.id)).length

  return (
    <section>
      <h1>Góry</h1>

      <input
        type="search"
        className="search"
        placeholder="Szukaj szczytu, przełęczy albo pasma"
        value={query}
        onChange={(e) => set({ q: e.target.value })}
      />

      <Chips
        label="Region"
        options={[{ value: '', label: 'Cała Polska' }, ...GROUPS.map((g) => ({ value: g, label: g === 'Góry Świętokrzyskie' ? 'Świętokrzyskie' : g }))]}
        value={group}
        onChange={(g) => set({ g, p: '' })}
      />

      {/* Pasm w Sudetach jest kilkanaście, więc zamiast przycisków jest lista rozwijana. */}
      {groupRanges.length > 1 && (
        <select className="range-select" value={range} onChange={(e) => set({ p: e.target.value })} aria-label="Pasmo">
          <option value="">Wszystkie pasma ({groupRanges.length})</option>
          {groupRanges.map((r) => (
            <option key={r.id} value={r.id}>{r.name}</option>
          ))}
        </select>
      )}

      <Chips label="Rodzaj" options={TYPES} value={type} onChange={(t) => set({ t })} />

      <p className="muted">
        Zdobyte: {doneVisible} z {visible.length}
      </p>

      <ul className="list">
        {visible.map((p) => (
          <PeakRow key={p.id} peak={p} done={doneIds?.has(p.id) ?? false} sub={range ? undefined : getRange(p.range)?.name} />
        ))}
      </ul>
      {visible.length === 0 && <p className="muted">Nic nie pasuje do wyszukiwania.</p>}
    </section>
  )
}
