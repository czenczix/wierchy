import 'leaflet/dist/leaflet.css'
import { CircleMarker, MapContainer, Popup, TileLayer } from 'react-leaflet'
import { Link, useSearchParams } from 'react-router-dom'
import { getPeak, peaks } from '../data/peaks'

// Mapa składa się z kafelków: małych obrazków 256×256 px, które Leaflet dociąga
// z serwera OpenTopoMap dla widocznego fragmentu i poziomu przybliżenia.
const TILES = 'https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png'
const ATTRIBUTION =
  '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>, ' +
  '<a href="https://opentopomap.org">OpenTopoMap</a> (CC-BY-SA)'

// Prostokąt obejmujący wszystkie nasze szczyty: od niego startuje mapa.
const allBounds: [number, number][] = peaks.map((p) => [p.lat, p.lon])

export default function MapPage() {
  // Adres /mapa?szczyt=rysy otwiera mapę przybliżoną na konkretny szczyt.
  const [params] = useSearchParams()
  const focus = getPeak(params.get('szczyt') ?? '')

  return (
    <div className="map-wrap">
      <MapContainer
        {...(focus ? { center: [focus.lat, focus.lon], zoom: 15 } : { bounds: allBounds, boundsOptions: { padding: [24, 24] } })}
        maxZoom={17}
        className="map"
      >
        <TileLayer url={TILES} attribution={ATTRIBUTION} maxZoom={17} />
        {peaks.map((peak) => (
          // CircleMarker to kółko rysowane przez przeglądarkę, więc nie potrzebuje plików z ikonami.
          <CircleMarker
            key={peak.id}
            center={[peak.lat, peak.lon]}
            radius={peak.id === focus?.id ? 10 : 7}
            pathOptions={{ color: '#ffffff', weight: 2, fillColor: '#1f4d3a', fillOpacity: 1 }}
          >
            <Popup>
              <strong>{peak.name}</strong>
              <br />
              {peak.elevation} m n.p.m.
              <br />
              <Link to={`/szczyt/${peak.id}`}>Karta szczytu →</Link>
            </Popup>
          </CircleMarker>
        ))}
      </MapContainer>
    </div>
  )
}
