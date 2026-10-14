import { useState, type FormEvent } from 'react'
import { db, today } from '../db'
import { shrinkImage } from '../photos'

type Props = { peakId: string; onDone: () => void }

export default function AscentForm({ peakId, onDone }: Props) {
  // "Kontrolowany formularz": wartości pól trzymamy w stanie Reacta,
  // a pola tylko je pokazują i zgłaszają zmiany.
  const [date, setDate] = useState(today())
  const [note, setNote] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<string>()
  const [saving, setSaving] = useState(false)

  // Po wyborze pliku robimy adres do podglądu (i zwalniamy poprzedni).
  function pickFile(f: File | null) {
    if (preview) URL.revokeObjectURL(preview)
    setFile(f)
    setPreview(f ? URL.createObjectURL(f) : undefined)
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault() // bez tego przeglądarka przeładowałaby stronę
    setSaving(true)
    try {
      const photoId = file ? await db.photos.add({ blob: await shrinkImage(file) }) : undefined
      await db.ascents.add({
        peakId,
        date,
        note: note.trim(),
        photoId,
        gpsVerified: false,
        createdAt: Date.now(),
      })
      onDone()
    } catch (err) {
      alert('Nie udało się zapisać: ' + (err as Error).message)
      setSaving(false)
    }
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
      <label>
        Zdjęcie (opcjonalnie)
        <input type="file" accept="image/*" onChange={(e) => pickFile(e.target.files?.[0] ?? null)} />
      </label>
      {preview && <img src={preview} alt="Podgląd" className="ascent-photo" />}
      <div className="form-buttons">
        <button type="button" className="secondary" onClick={onDone}>Anuluj</button>
        <button type="submit" className="primary" disabled={saving}>{saving ? 'Zapisuję…' : 'Zapisz'}</button>
      </div>
    </form>
  )
}
