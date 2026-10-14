// Zdjęcie z telefonu ma często 4000×3000 px i kilka MB. Zanim je zapiszemy,
// zmniejszamy je do max 1600 px na dłuższym boku i kompresujemy do JPEG.
// Wtedy ma ok. 200–400 KB i setki zdjęć zmieszczą się w pamięci przeglądarki.
const MAX_SIDE = 1600

export async function shrinkImage(file: File): Promise<Blob> {
  // createImageBitmap dekoduje plik i od razu obraca go zgodnie z orientacją z aparatu.
  const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' })
  const scale = Math.min(1, MAX_SIDE / Math.max(bitmap.width, bitmap.height))
  const canvas = document.createElement('canvas')
  canvas.width = Math.round(bitmap.width * scale)
  canvas.height = Math.round(bitmap.height * scale)
  canvas.getContext('2d')!.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
  bitmap.close()
  return new Promise((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('Nie udało się zapisać zdjęcia'))), 'image/jpeg', 0.82),
  )
}
