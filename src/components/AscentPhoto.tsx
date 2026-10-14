import { useLiveQuery } from 'dexie-react-hooks'
import { useEffect, useMemo } from 'react'
import { db } from '../db'

// Pokazuje zdjęcie zapisane w bazie. Blob z bazy trzeba zamienić na adres,
// który <img> umie wyświetlić: robi to URL.createObjectURL.
export default function AscentPhoto({ photoId }: { photoId: number }) {
  const photo = useLiveQuery(() => db.photos.get(photoId), [photoId])
  const url = useMemo(() => (photo ? URL.createObjectURL(photo.blob) : undefined), [photo])

  // Sprzątanie: gdy zdjęcie zniknie z ekranu, zwalniamy pamięć zajętą przez adres.
  useEffect(() => () => { if (url) URL.revokeObjectURL(url) }, [url])

  if (!url) return null
  return (
    <a href={url} target="_blank" rel="noreferrer">
      <img src={url} alt="" className="ascent-photo" />
    </a>
  )
}
