import { useRef, useState } from 'react'
import { exportBackup, importBackup } from '../backup'
import { ascentsLabel } from '../plural'

export default function BackupSection() {
  const [msg, setMsg] = useState('')
  const fileInput = useRef<HTMLInputElement>(null) // "uchwyt" do ukrytego pola wyboru pliku

  async function handleExport() {
    try {
      const n = await exportBackup()
      setMsg(`Zapisano kopię: ${ascentsLabel(n)}.`)
    } catch (err) {
      setMsg('Błąd eksportu: ' + (err as Error).message)
    }
  }

  async function handleImport(file: File | undefined) {
    if (!file) return
    if (!confirm('Import zastąpi wszystkie obecne wejścia danymi z pliku. Kontynuować?')) return
    try {
      const n = await importBackup(file)
      setMsg(`Wczytano kopię: ${ascentsLabel(n)}.`)
    } catch (err) {
      setMsg((err as Error).message)
    } finally {
      if (fileInput.current) fileInput.current.value = '' // żeby dało się wybrać ten sam plik ponownie
    }
  }

  return (
    <div className="backup">
      <h2>Kopia zapasowa</h2>
      <p className="muted small">
        Dane są tylko w tym telefonie. Zrób kopię co jakiś czas i trzymaj plik np. na Dysku Google.
        Kopią przeniesiesz też dane na inne urządzenie.
      </p>
      <div className="form-buttons">
        <button className="secondary" onClick={handleExport}>Zapisz kopię</button>
        <button className="secondary" onClick={() => fileInput.current?.click()}>Wczytaj kopię</button>
      </div>
      <input
        ref={fileInput}
        type="file"
        accept="application/json,.json"
        hidden
        onChange={(e) => handleImport(e.target.files?.[0])}
      />
      {msg && <p className="msg">{msg}</p>}
    </div>
  )
}
