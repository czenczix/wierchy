import { useLiveQuery } from 'dexie-react-hooks'
import { computeBadges, tierName, type BadgeState, type Category } from '../badges'
import BackupSection from '../components/BackupSection'
import ProgressBar from '../components/ProgressBar'
import { collections } from '../data/collections'
import { points } from '../data/points'
import { ranges } from '../data/ranges'
import { db } from '../db'
import { ascentsLabel } from '../plural'

const formatDate = (iso: string) =>
  new Date(iso + 'T12:00').toLocaleDateString('pl-PL', { day: 'numeric', month: 'short', year: 'numeric' })

const CATEGORIES: Category[] = ['Kolekcje', 'Wędrówki', 'Wyzwania']

// Jedna odznaka: ikona, poziom (brąz/srebro/...), cel i postęp do następnego progu.
function BadgeCard({ b }: { b: BadgeState }) {
  const complete = b.next === undefined
  const tier = tierName(b)
  const classes = ['badge', b.level > 0 && 'earned', tier && `tier-${b.level}`, complete && 'complete'].filter(Boolean).join(' ')
  const unit = b.id === 'metres' ? ' m' : ''
  return (
    <li className={classes}>
      <span className="badge-icon" aria-hidden="true">{b.icon}</span>
      <strong>{b.name}</strong>
      {tier && <span className="badge-tier">{tier}</span>}
      <span className="badge-desc">{complete ? b.goal(b.tiers[b.tiers.length - 1]) : b.goal(b.next!)}</span>
      {b.level > 0 && <span className="badge-date">{formatDate(b.tierDates[b.level - 1])}</span>}
      {!complete && b.next! > 1 && (
        <>
          <span className="badge-count">
            {b.current.toLocaleString('pl-PL')}{unit} / {b.next!.toLocaleString('pl-PL')}{unit}
          </span>
          <span className="badge-track"><span style={{ width: `${Math.min(100, (b.current / b.next!) * 100)}%` }} /></span>
        </>
      )}
    </li>
  )
}

export default function ProgressPage() {
  const ascents = useLiveQuery(() => db.ascents.toArray())
  if (!ascents) return null // baza jeszcze nie odpowiedziała

  const doneIds = new Set(ascents.map((a) => a.peakId))
  const doneOf = (ids: string[]) => ids.filter((id) => doneIds.has(id)).length
  const doneAll = doneOf(points.map((p) => p.id))
  const pct = Math.round((doneAll / points.length) * 100)
  const badges = computeBadges(ascents)
  const levels = badges.reduce((sum, b) => sum + b.level, 0)
  const allLevels = badges.reduce((sum, b) => sum + b.tiers.length, 0)

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
        // Pasma z jednym punktem (np. Ślęża) pomijamy, bo pasek 0/1 nic nie mówi.
        if (ids.length < 2) return null
        return <ProgressBar key={r.id} label={r.name} done={doneOf(ids)} total={ids.length} />
      })}

      <h2>Odznaki</h2>
      <p className="muted">Zdobyte poziomy: {levels} z {allLevels}</p>
      {CATEGORIES.map((cat) => (
        <div key={cat}>
          <h3>{cat}</h3>
          <ul className="badges">
            {badges.filter((b) => b.category === cat).map((b) => <BadgeCard key={b.id} b={b} />)}
          </ul>
        </div>
      ))}

      <BackupSection />
    </section>
  )
}
