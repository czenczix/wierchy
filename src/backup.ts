import { db, today } from './db'
import type { Ascent } from './types'

// Kopia zapasowa to jeden plik JSON ze wszystkimi wejściami i zdjęciami.
// Zdjęcia (binarne bloby) zapisujemy jako tekst w formacie data URL (base64),
// bo JSON umie przechowywać tylko tekst i liczby.

const FORMAT = 'wierchy-backup'
const VERSION = 1

type BackupFile = {
  format: typeof FORMAT
  version: number
  exportedAt: string
  ascents: Ascent[]
  photos: { id: number; dataUrl: string }[]
}

const blobToDataUrl = (blob: Blob) =>
  new Promise<string>((resolve, reject) => {
    const r = new FileReader()
    r.onload = () => resolve(r.result as string)
    r.onerror = () => reject(r.error)
    r.readAsDataURL(blob)
  })

const dataUrlToBlob = async (dataUrl: string) => (await fetch(dataUrl)).blob()

/** Tworzy plik kopii i pobiera go na urządzenie. Zwraca liczbę wejść. */
export async function exportBackup(): Promise<number> {
  const ascents = await db.ascents.toArray()
  const photos = await db.photos.toArray()
  const file: BackupFile = {
    format: FORMAT,
    version: VERSION,
    exportedAt: new Date().toISOString(),
    ascents,
    photos: await Promise.all(photos.map(async (p) => ({ id: p.id!, dataUrl: await blobToDataUrl(p.blob) }))),
  }
  const blob = new Blob([JSON.stringify(file)], { type: 'application/json' })

  // Pobieranie pliku: tworzymy niewidoczny link do bloba i "klikamy" go z kodu.
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `wierchy-kopia-${today()}.json`
  a.click()
  setTimeout(() => URL.revokeObjectURL(url), 10_000)
  return ascents.length
}

/** Wczytuje plik kopii i ZASTĘPUJE nim obecne dane. Zwraca liczbę wejść. */
export async function importBackup(file: File): Promise<number> {
  let data: BackupFile
  try {
    data = JSON.parse(await file.text())
  } catch {
    throw new Error('To nie jest plik kopii Wierchów (zły format).')
  }
  if (data.format !== FORMAT) throw new Error('To nie jest plik kopii Wierchów.')
  if (data.version > VERSION) throw new Error('Ta kopia pochodzi z nowszej wersji apki. Zaktualizuj apkę.')

  // Najpierw zamieniamy zdjęcia na bloby (poza transakcją, bo to wolne operacje).
  const photos = await Promise.all(data.photos.map(async (p) => ({ id: p.id, blob: await dataUrlToBlob(p.dataUrl) })))

  // Transakcja: albo wszystko się uda, albo nic się nie zmieni.
  // Jeśli import padnie w połowie, stare dane zostają nietknięte.
  await db.transaction('rw', db.ascents, db.photos, async () => {
    await db.ascents.clear()
    await db.photos.clear()
    await db.photos.bulkAdd(photos)
    await db.ascents.bulkAdd(data.ascents)
  })
  return data.ascents.length
}
