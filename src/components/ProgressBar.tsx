type Props = { done: number; total: number; label?: string }

// Pasek postępu: szary prostokąt, a w nim zielony o szerokości proporcjonalnej do wyniku.
export default function ProgressBar({ done, total, label }: Props) {
  const pct = total ? Math.round((done / total) * 100) : 0
  return (
    <div className="progress">
      {label && (
        <div className="progress-label">
          <span>{label}</span>
          <span>{done} / {total}</span>
        </div>
      )}
      <div className="progress-track" role="progressbar" aria-valuenow={done} aria-valuemin={0} aria-valuemax={total}>
        <div className="progress-fill" style={{ width: `${pct}%` }} />
      </div>
    </div>
  )
}
