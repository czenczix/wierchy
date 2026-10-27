import 'leaflet/dist/leaflet.css'
import { CircleMarker, MapContainer, Popup, TileLayer } from 'react-leaflet'
import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import TrailLines from '../components/TrailLines'
import { loadGraph, type Graph } from '../routing'
import { getCollection } from '../data/collections'
import { TYPE_LABEL, getPoint, points } from '../data/points'

// Mapa składa się z kafelków: małych obrazków 256×256 px, które Leaflet dociąga
// z serwera OpenTopoMap dla widocznego fragmentu i poziomu przybliżenia.
const TILES = 'https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png'
const ATTRIBUTION =
  '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>, ' +
  '<a href="https://opentopomap.org">OpenTopoMap</a> (CC-BY-SA)'

// Prostokąt obejmujący podane punkty: od niego startuje mapa.
const boundsOf = (list: typeof points): [number, number][] => list.map((p) => [p.lat, p.lon])

// Szczyty zielone, przełęcze pomarańczowe (te same kolory co na liście), Korona złota.
const KGP = new Set(getCollection('kgp').pointIds)
const fillOf = (p: (typeof points)[number]) => (KGP.has(p.id) ? '#c99a06' : p.type === 'pass' ? '#c56a1f' : '#1f4d3a')

export default function MapPage() {
  // Adres /mapa?szczyt=rysy otwiera mapę przybliżoną na konkretny szczyt.
  const [params] = useSearchParams()
  // Szlaki Tatr dociągamy w tle; mapa działa też, zanim się załadują.
  const [graph, setGraph] = useState<Graph | null>(null)
  useEffect(() => {
    loadGraph().then(setGraph)
  }, [])
  const focus = getPoint(params.get('szczyt') ?? '')
  // /mapa?kolekcja=kgp pokazuje całą Koronę; bez parametru widać wszystkie punkty w Polsce.
  const collectionId = params.get('kolekcja')
  const startPoints = collectionId
    ? points.filter((p) => getCollection(collectionId).pointIds.includes(p.id))
    : points

  return (
    <div className="map-wrap">
      <MapContainer
        {...(focus ? { center: [focus.lat, focus.lon], zoom: 15 } : { bounds: boundsOf(startPoints), boundsOptions: { padding: [24, 24] } })}
        maxZoom={17}
        className="map"
      >
        <TileLayer url={TILES} attribution={ATTRIBUTION} maxZoom={17} />
        {graph && <TrailLines graph={graph} />}
        {points.map((peak) => (
          // CircleMarker to kółko rysowane przez przeglądarkę, więc nie potrzebuje plików z ikonami.
          <CircleMarker
            key={peak.id}
            center={[peak.lat, peak.lon]}
            radius={(peak.id === focus?.id ? 10 : 7) - (peak.type === 'pass' ? 1 : 0)}
            pathOptions={{ color: '#ffffff', weight: 2, fillColor: fillOf(peak), fillOpacity: 1 }}
          >
            <Popup>
              <strong>{peak.name}</strong>
              <br />
              {peak.elevation} m n.p.m.
              <br />
              <Link to={`/szczyt/${peak.id}`}>Karta: {TYPE_LABEL[peak.type].toLowerCase()} →</Link>
              {peak.range.startsWith('tatry-') && (
                <>
                  <br />
                  <Link to={`/trasa?do=${peak.id}`}>🥾 Wyznacz trasę →</Link>
                </>
              )}
            </Popup>
          </CircleMarker>
        ))}
      </MapContainer>
    </div>
  )
}
