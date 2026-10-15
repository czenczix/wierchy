import { useLiveQuery } from 'dexie-react-hooks'
import { Link } from 'react-router-dom'
import PeakRow from '../components/PeakRow'
import ProgressBar from '../components/ProgressBar'
import { getCollection } from '../data/collections'
import { getPoint } from '../data/points'
import { getRange } from '../data/ranges'
import { db } from '../db'

const KGP = getCollection('kgp')
// Zamieniamy listę id na pełne dane szczytów, od najwyższego.
const crownPeaks = KGP.pointIds.map((id) => getPoint(id)!).sort((a, b) => b.elevation - a.elevation)

// Tatry to część Karpat, więc na tym ekranie Rysy lądują w grupie Karpaty.
const groupLabel = (rangeId: string) => {
  const g = getRange(rangeId)?.group ?? ''
  return g === 'Tatry' ? 'Karpaty' : g
}
const GROUPS = ['Karpaty', 'Sudety', 'Góry Świętokrzyskie']

export default function CrownPage() {
  const doneIds = useLiveQuery(async () => new Set((await db.ascents.orderBy('peakId').uniqueKeys()) as string[]))
  const done = crownPeaks.filter((p) => doneIds?.has(p.id)).length
  const complete = done === crownPeaks.length

  return (
    <section>
      <div className={complete ? 'crown-hero complete' : 'crown-hero'}>
        <div className="crown-icon" aria-hidden="true">👑</div>
        <h1>{KGP.name}</h1>
        <p className="muted">{KGP.description}</p>
        <div className="progress-big">{done} / {crownPeaks.length}</div>
        <ProgressBar done={done} total={crownPeaks.length} />
        {complete && <p><strong>Cała Korona zdobyta. Gratulacje!</strong></p>}
      </div>

      <Link to="/mapa?kolekcja=kgp" className="secondary">Pokaż Koronę na mapie</Link>

      {GROUPS.map((group) => {
        const list = crownPeaks.filter((p) => groupLabel(p.range) === group)
        const doneHere = list.filter((p) => doneIds?.has(p.id)).length
        return (
          <div key={group}>
            <h2 className="group-head">
              <span>{group}</span>
              <span className="muted">{doneHere} / {list.length}</span>
            </h2>
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
