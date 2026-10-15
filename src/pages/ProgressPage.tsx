import { useLiveQuery } from 'dexie-react-hooks'
import { computeBadges } from '../badges'
import BackupSection from '../components/BackupSection'
import ProgressBar from '../components/ProgressBar'
import { peaks } from '../data/peaks'
import { db } from '../db'
import { ascentsLabel } from '../plural'

const formatDate = (iso: string) =>
  new Date(iso + 'T12:00').toLocaleDateString('pl-PL', { day: 'numeric', month: 'short', year: 'numeric' })

export default function ProgressPage() {
  const ascents = useLiveQuery(() => db.ascents.toArray())
  if (!ascents) return null // baza jeszcze nie odpowiedziała

  const doneIds = new Set(ascents.map((a) => a.peakId))
  const countIn = (range: string) => peaks.filter((p) => p.range === range)
  const doneIn = (range: string) => countIn(range).filter((p) => doneIds.has(p.id)).length
  const pct = Math.round((doneIds.size / peaks.length) * 100)
  const badges = computeBadges(ascents)
  const earned = badges.filter((b) => b.earnedOn).length

  return (
    <section>
      <h1>Postęp</h1>

      <div className="progress-hero">
        <div className="progress-big">{pct}%</div>
        <div className="muted">{doneIds.size} z {peaks.length} szczytów · {ascentsLabel(ascents.length)}</div>
        <ProgressBar done={doneIds.size} total={peaks.length} />
      </div>

      <ProgressBar label="Tatry Wysokie" done={doneIn('wysokie')} total={countIn('wysokie').length} />
      <ProgressBar label="Tatry Zachodnie" done={doneIn('zachodnie')} total={countIn('zachodnie').length} />

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
