import { useLiveQuery } from 'dexie-react-hooks'
import { Link, useSearchParams } from 'react-router-dom'
import PeakRow from '../components/PeakRow'
import ProgressBar from '../components/ProgressBar'
import { crowns } from '../data/collections'
import { getPoint } from '../data/points'
import { getRange } from '../data/ranges'
import { db } from '../db'

// Tatry to część Karpat, więc na tym ekranie Rysy lądują w grupie Karpaty.
const groupLabel = (rangeId: string) => {
  const g = getRange(rangeId)?.group ?? ''
  return g === 'Tatry' ? 'Karpaty' : g
}
const GROUPS = ['Karpaty', 'Sudety', 'Góry Świętokrzyskie']

export default function CrownPage() {
  // Która korona jest wybrana, trzymamy w adresie (/korona?k=kbp), więc działa też "Wróć".
  const [params, setParams] = useSearchParams()
  const crown = crowns.find((c) => c.id === params.get('k')) ?? crowns[0]
  // Zamieniamy listę id na pełne dane szczytów, od najwyższego.
  const crownPeaks = crown.pointIds.map((id) => getPoint(id)!).sort((a, b) => b.elevation - a.elevation)

  const doneIds = useLiveQuery(async () => new Set((await db.ascents.orderBy('peakId').uniqueKeys()) as string[]))
  const done = crownPeaks.filter((p) => doneIds?.has(p.id)).length
  const complete = done === crownPeaks.length
  const groups = GROUPS.filter((g) => crownPeaks.some((p) => groupLabel(p.range) === g))

  return (
    <section>
      <div className="chips" role="group" aria-label="Korona">
        {crowns.map((c) => (
          <button
            key={c.id}
            className={c.id === crown.id ? 'chip active' : 'chip'}
            onClick={() => setParams({ k: c.id }, { replace: true })}
          >
            {c.icon} {c.name.replace('Korona ', '')}
          </button>
        ))}
      </div>

      <div className={complete ? 'crown-hero complete' : 'crown-hero'}>
        <div className="crown-icon" aria-hidden="true">{crown.icon}</div>
        <h1>{crown.name}</h1>
        <p className="muted">{crown.description}</p>
        <div className="progress-big">{done} / {crownPeaks.length}</div>
        <ProgressBar done={done} total={crownPeaks.length} />
        {complete && <p><strong>Cała korona zdobyta. Gratulacje!</strong></p>}
        {crown.source && <p className="muted small">Odznaka: {crown.source}</p>}
      </div>

      <Link to={`/mapa?kolekcja=${crown.id}`} className="secondary">Pokaż na mapie</Link>

      {groups.map((group) => {
        const list = crownPeaks.filter((p) => groupLabel(p.range) === group)
        const doneHere = list.filter((p) => doneIds?.has(p.id)).length
        return (
          <div key={group}>
            {groups.length > 1 && (
              <h2 className="group-head">
                <span>{group}</span>
                <span className="muted">{doneHere} / {list.length}</span>
              </h2>
            )}
            <ul className="list">
              {list.map((p) => (
                <PeakRow key={p.id} peak={p} done={doneIds?.has(p.id) ?? false} sub={getRange(p.range)?.name} />
              ))}
            </ul>
          </div>
        )
      })}
    </section>
  )
}
