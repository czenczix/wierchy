import { useState, type FormEvent } from 'react'
import { db, today } from '../db'

type Props = { peakId: string; onDone: () => void }

export default function AscentForm({ peakId, onDone }: Props) {
  // "Kontrolowany formularz": wartości pól trzymamy w stanie Reacta,
  // a pola tylko je pokazują i zgłaszają zmiany.
  const [date, setDate] = useState(today())
  const [note, setNote] = useState('')

  async function handleSubmit(e: FormEvent) {
    e.preventDefault() // bez tego przeglądarka przeładowałaby stronę
    await db.ascents.add({
      peakId,
      date,
      note: note.trim(),
      gpsVerified: false,
      createdAt: Date.now(),
    })
    onDone()
  }

  return (
    <form className="ascent-form" onSubmit={handleSubmit}>
      <label>
        Data wejścia
        <input type="date" value={date} max={today()} required onChange={(e) => setDate(e.target.value)} />
      </label>
      <label>
        Notatka
        <textarea
          value={note}
          rows={3}
          placeholder="Z kim, jaka pogoda, którędy…"
          onChange={(e) => setNote(e.target.value)}
        />
      </label>
      <div className="form-buttons">
        <button type="button" className="secondary" onClick={onDone}>Anuluj</button>
        <button type="submit" className="primary">Zapisz</button>
      </div>
    </form>
  )
}
