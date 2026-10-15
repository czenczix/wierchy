import { useEffect, useState } from 'react'

// Przeglądarka wie, czy jest połączenie (navigator.onLine) i wysyła zdarzenia
// "online"/"offline", gdy to się zmienia. Nasłuchujemy ich i pokazujemy pasek.
export default function OfflineBanner() {
  const [online, setOnline] = useState(navigator.onLine)

  useEffect(() => {
    const on = () => setOnline(true)
    const off = () => setOnline(false)
    window.addEventListener('online', on)
    window.addEventListener('offline', off)
    // Sprzątanie: przestajemy nasłuchiwać, gdy komponent znika.
    return () => {
      window.removeEventListener('online', on)
      window.removeEventListener('offline', off)
    }
  }, [])

  if (online) return null
  return <div className="offline-banner">Jesteś offline. Wpisy zapisują się w telefonie, mapa pokaże obejrzane wcześniej obszary.</div>
}
