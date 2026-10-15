import { useLiveQuery } from 'dexie-react-hooks'
import { computeBadges } from '../badges'
import BackupSection from '../components/BackupSection'
import ProgressBar from '../components/ProgressBar'
import { collections } from '../data/collections'
import { points } from '../data/points'
import { ranges } from '../data/ranges'
import { db } from '../db'
import { ascentsLabel } from '../plural'

const formatDate = (iso: string) =>
  new Date(iso + 'T12:00').toLocaleDateString('pl-PL', { day: 'numeric', month: 'short', year: 'numeric' })

export default function ProgressPage() {
  const ascents = useLiveQuery(() => db.ascents.toArray())
  if (!ascents) return null // baza jeszcze nie odpowiedziała

  const doneIds = new Set(ascents.map((a) => a.peakId))
  const doneOf = (ids: string[]) => ids.filter((id) => doneIds.has(id)).length
  const doneAll = doneOf(points.map((p) => p.id))
  const pct = Math.round((doneAll / points.length) * 100)
  const badges = computeBadges(ascents)
  const earned = badges.filter((b) => b.earnedOn).length

  return (
    <section>
      <h1>Postęp</h1>

      <div className="progress-hero">
        <div className="progress-big">{pct}%</div>
        <div className="muted">{doneAll} z {points.length} miejsc · {ascentsLabel(ascents.length)}</div>
        <ProgressBar done={doneAll} total={points.length} />
      </div>

      <h2>Kolekcje</h2>
      {collections.map((c) => (
        <ProgressBar key={c.id} label={`${c.icon} ${c.name}`} done={doneOf(c.pointIds)} total={c.pointIds.length} />
      ))}

      <h2>Pasma</h2>
      {ranges.map((r) => {
        const ids = points.filter((p) => p.range === r.id).map((p) => p.id)
        return <ProgressBar key={r.id} label={r.name} done={doneOf(ids)} total={ids.length} />
      })}

      <h2>Odznaki ({earned} z {badges.length})</h2>
      <ul className="badges">
        {badges.map((b) => (
          <li key={b.id} className={b.earnedOn ? 'badge earned' : 'badge'}>
            <span className="badge-icon" aria-hidden="true">{b.icon}</span>
            <strong>{b.name}</strong>
            <span className="badge-desc">{b.description}</span>
            {b.earnedOn ? (
              <span className="badge-date">{formatDate(b.earnedOn)}</span>
            ) : (
              b.needed > 1 && <span className="badge-date">{b.done} / {b.needed}</span>
            )}
          </li>
        ))}
      </ul>

      <BackupSection />
    </section>
  )
}
