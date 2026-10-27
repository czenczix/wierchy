import 'leaflet/dist/leaflet.css'
import { Fragment, useEffect, useMemo, useState } from 'react'
import { CircleMarker, MapContainer, Polyline, TileLayer, Tooltip, useMap } from 'react-leaflet'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import TrailLines from '../components/TrailLines'
import { getPoint, points } from '../data/points'
import { groupOf } from '../data/ranges'
import { distanceM, formatDistance, getPosition } from '../geo'
import { TRAIL_COLORS, findRoute, formatHours, loadGraph, nearestNode, type Graph, type Route } from '../routing'

const TILES = 'https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png'
const ATTRIBUTION =
  '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>, ' +
  '<a href="https://opentopomap.org">OpenTopoMap</a> (CC-BY-SA)'

// Trasy liczymy na razie tylko w Tatrach, bo tylko dla nich mamy sieć szlaków.
const tatraPoints = points.filter((p) => groupOf(p.range) === 'Tatry').sort((a, b) => a.name.localeCompare(b.name, 'pl'))
const SNAP_MAX_M = 600 // dalej od szlaku niż tyle uznajemy, że punktu nie da się podpiąć

/** Znak szlaku jak na drzewach: biały-kolor-biały. Dwa kolory = dwa szlaki razem. */
export function TrailMark({ colors }: { colors: string }) {
  return (
    <span className="trail-marks">
      {[...colors].map((c) => (
        <span key={c} className="trail-mark" style={{ ['--c' as string]: TRAIL_COLORS[c].hex }} title={TRAIL_COLORS[c].name} />
      ))}
    </span>
  )
}

export default function RoutePage() {
  const [params, setParams] = useSearchParams()
  const navigate = useNavigate()
  const [graph, setGraph] = useState<Graph | null>(null)
  const [gps, setGps] = useState<{ node: number } | null>(null)
  const [gpsMsg, setGpsMsg] = useState('')

  useEffect(() => {
    loadGraph().then(setGraph)
  }, [])

  const target = getPoint(params.get('do') ?? '') ?? getPoint('rysy')!
  const startCode = params.get('z') ?? ''

  // Punkt docelowy podpinamy do najbliższego miejsca na szlaku.
  const targetSnap = useMemo(() => (graph ? nearestNode(graph, target.lat, target.lon) : null), [graph, target])

  // Gdy nie wybrano startu, szukamy najszybszego z popularnych wejść na szlaki.
  const autoStart = useMemo(() => {
    if (!graph || !targetSnap) return null
    let best: { id: string; time: number } | null = null
    for (const s of graph.data.starts.filter((s) => s.kind === 'start')) {
      const r = findRoute(graph, s.node, targetSnap.node)
      if (r && (!best || r.time < best.time)) best = { id: s.id, time: r.time }
    }
    return best?.id ?? null
  }, [graph, targetSnap])

  const code = startCode || (autoStart ? `s:${autoStart}` : '')

  // Zamiana wybranego startu na punkt sieci szlaków.
  const startNode = useMemo(() => {
    if (!graph) return null
    if (code === 'gps') return gps?.node ?? null
    if (code.startsWith('s:')) return graph.data.starts.find((s) => s.id === code.slice(2))?.node ?? null
    if (code.startsWith('p:')) {
      const p = getPoint(code.slice(2))
      if (!p) return null
      const snap = nearestNode(graph, p.lat, p.lon)
      return snap.dist <= SNAP_MAX_M ? snap.node : null
    }
    return null
  }, [graph, code, gps])

  const route: Route | null = useMemo(() => {
    if (!graph || !targetSnap || startNode === null || targetSnap.dist > SNAP_MAX_M) return null
    return findRoute(graph, startNode, targetSnap.node)
  }, [graph, targetSnap, startNode])

  const setParam = (k: string, v: string) => {
    const next = new URLSearchParams(params)
    next.set(k, v)
    setParams(next, { replace: true })
  }

  async function locate() {
    if (!graph) return
    setGpsMsg('Szukam Cię…')
    try {
      const { coords } = await getPosition()
      const snap = nearestNode(graph, coords.latitude, coords.longitude)
      if (snap.dist > 2000) {
        setGpsMsg(`Jesteś ${formatDistance(snap.dist)} od najbliższego szlaku w Tatrach.`)
        return
      }
      setGps({ node: snap.node })
      setGpsMsg('')
      setParam('z', 'gps')
    } catch {
      setGpsMsg('Nie udało się pobrać pozycji GPS.')
    }
  }

  // Nazwa miejsca przy danym punkcie szlaku (schronisko, szczyt, przełęcz), jeśli jest blisko.
  const placeAt = (node: number): string | undefined => {
    if (!graph) return undefined
    const [lat, lon] = graph.data.nodes[node]
    const hut = graph.data.starts.find((s) => s.node === node)
    if (hut) return hut.name
    const p = tatraPoints.find((p) => distanceM(lat, lon, p.lat, p.lon) < 150)
    return p?.name
  }

  const back = (e: React.MouseEvent) => {
    if (window.history.length > 1) {
      e.preventDefault()
      navigate(-1)
    }
  }

  if (!graph) {
    return (
      <section>
        <Link to="/" className="back" onClick={back}>← Wróć</Link>
        <h1>Trasa</h1>
        <p className="muted">Ładuję szlaki…</p>
      </section>
    )
  }

  const nodes = graph.data.nodes
  const line = (ids: number[]) => ids.map((k) => [nodes[k][0], nodes[k][1]] as [number, number])
  const huts = graph.data.starts.filter((s) => s.kind === 'hut').sort((a, b) => a.name.localeCompare(b.name, 'pl'))
  const heads = graph.data.starts.filter((s) => s.kind === 'start')

  return (
    <section>
      <Link to="/" className="back" onClick={back}>← Wróć</Link>
      <h1>Trasa: {target.name}</h1>

      <label className="field">
        <span>Dokąd</span>
        <select value={target.id} onChange={(e) => setParam('do', e.target.value)}>
          {tatraPoints.map((p) => (
            <option key={p.id} value={p.id}>{p.name} ({p.elevation} m)</option>
          ))}
        </select>
      </label>

      <label className="field">
        <span>Skąd</span>
        <select value={code} onChange={(e) => (e.target.value === 'gps' ? locate() : setParam('z', e.target.value))}>
          <option value="gps">📍 Moja lokalizacja</option>
          <optgroup label="Wejścia na szlaki">
            {heads.map((s) => (
              <option key={s.id} value={`s:${s.id}`}>{s.name}{s.id === autoStart ? ' (najszybciej)' : ''}</option>
            ))}
          </optgroup>
          <optgroup label="Schroniska">
            {huts.map((s) => <option key={s.id} value={`s:${s.id}`}>{s.name}</option>)}
          </optgroup>
          <optgroup label="Szczyty i przełęcze">
            {tatraPoints.filter((p) => p.id !== target.id).map((p) => (
              <option key={p.id} value={`p:${p.id}`}>{p.name}</option>
            ))}
          </optgroup>
        </select>
      </label>
      {gpsMsg && <p className="muted">{gpsMsg}</p>}

      {targetSnap && targetSnap.dist > SNAP_MAX_M && (
        <p className="warn">Na {target.name} nie prowadzi znakowany szlak, więc nie wyznaczę trasy.</p>
      )}
      {!route && startNode !== null && targetSnap && targetSnap.dist <= SNAP_MAX_M && (
        <p className="warn">Nie znalazłem połączenia szlakami między tymi miejscami.</p>
      )}

      {route && (
        <>
          <div className="route-summary">
            <div><strong>{formatHours(route.time)}</strong><span>czas</span></div>
            <div><strong>{formatDistance(route.dist)}</strong><span>długość</span></div>
            <div><strong>↑ {Math.round(route.up)} m</strong><span>podejścia</span></div>
            <div><strong>↓ {Math.round(route.down)} m</strong><span>zejścia</span></div>
          </div>

          <div className="route-map">
            <MapContainer bounds={line(route.nodes)} boundsOptions={{ padding: [28, 28] }} maxZoom={17} className="map">
              <TileLayer url={TILES} attribution={ATTRIBUTION} maxZoom={17} />
              <FitTo positions={line(route.nodes)} />
              <TrailLines graph={graph} faded />
              {route.legs.map((leg, i) => (
                <Fragment key={i}>
                  {/* Biała obwódka pod spodem wyciąga trasę ponad resztę szlaków. */}
                  <Polyline positions={line(leg.nodes)} interactive={false} pathOptions={{ color: '#fff', weight: 10, opacity: 1 }} />
                  <Polyline positions={line(leg.nodes)} interactive={false} pathOptions={{ color: TRAIL_COLORS[leg.colors[0]].hex, weight: 6, opacity: 1 }} />
                  {leg.colors[1] && (
                    <Polyline
                      positions={line(leg.nodes)}
                      interactive={false}
                      pathOptions={{ color: TRAIL_COLORS[leg.colors[1]].hex, weight: 6, opacity: 1, dashArray: '10 12' }}
                    />
                  )}
                </Fragment>
              ))}
              <CircleMarker center={line([route.nodes[0]])[0]} radius={8} pathOptions={{ color: '#fff', weight: 3, fillColor: '#1f4d3a', fillOpacity: 1 }}>
                <Tooltip permanent direction="top">Start</Tooltip>
              </CircleMarker>
              <CircleMarker center={[target.lat, target.lon]} radius={9} pathOptions={{ color: '#fff', weight: 3, fillColor: '#c99a06', fillOpacity: 1 }}>
                <Tooltip permanent direction="top">{target.name}</Tooltip>
              </CircleMarker>
            </MapContainer>
          </div>

          <Profile graph={graph} route={route} />

          <h2>Po kolei</h2>
          <ol className="legs">
            {route.legs.map((leg, i) => {
              const end = placeAt(leg.nodes[leg.nodes.length - 1])
              // Miejsca mijane po drodze (schroniska, szczyty), żeby łatwiej się orientować.
              const via = [...new Set(leg.nodes.slice(1, -1).map(placeAt).filter((x): x is string => !!x && x !== end))]
              return (
                <li key={i}>
                  <TrailMark colors={leg.colors} />
                  <div>
                    <strong>
                      Szlak {[...leg.colors].map((c) => TRAIL_COLORS[c].name).join(' + ')}
                      {end && <> do: {end}</>}
                    </strong>
                    {via.length > 0 && <span className="small">przez: {via.join(', ')}</span>}
                    <span className="muted">
                      {formatDistance(leg.dist)} · ↑ {Math.round(leg.up)} m · ↓ {Math.round(leg.down)} m · ok. {formatHours(leg.time)}
                    </span>
                  </div>
                </li>
              )
            })}
          </ol>
          <p className="muted small">
            Czas liczony orientacyjnie (norma DIN: 4 km/h, 300 m/h w górę, 500 m/h w dół), bez przerw.
            Zawsze sprawdź warunki i komunikaty TPN. Dane: {graph.data.source}, stan na {graph.data.fetched}.
          </p>
        </>
      )}
    </section>
  )
}

/** Przybliża mapę do trasy za każdym razem, gdy trasa się zmieni (np. inny start). */
function FitTo({ positions }: { positions: [number, number][] }) {
  const map = useMap()
  const key = positions.length + ':' + positions[0]?.join() + ':' + positions[positions.length - 1]?.join()
  useEffect(() => {
    map.fitBounds(positions, { padding: [28, 28], animate: false })
    // eslint-disable-next-line react-hooks/exhaustive-deps -- przeliczamy tylko, gdy zmieni się sama trasa
  }, [map, key])
  return null
}

/** Pary [odległość od startu, wysokość] dla każdego punktu trasy. */
function profilePoints(graph: Graph, route: Route): [number, number][] {
  const nodes = graph.data.nodes
  const out: [number, number][] = []
  let acc = 0
  route.nodes.forEach((k, i) => {
    if (i) {
      const [a, b] = [nodes[route.nodes[i - 1]], nodes[k]]
      acc += distanceM(a[0], a[1], b[0], b[1])
    }
    out.push([acc, nodes[k][2]])
  })
  return out
}

/** Profil wysokości trasy: jak bardzo pod górę i gdzie. */
function Profile({ graph, route }: { graph: Graph; route: Route }) {
  const pts = profilePoints(graph, route)
  const acc = pts[pts.length - 1][0]
  const eles = pts.map((p) => p[1])
  const [min, max] = [Math.min(...eles), Math.max(...eles)]
  const W = 300
  const H = 80
  const x = (d: number) => (d / (acc || 1)) * W
  const y = (e: number) => H - ((e - min) / (max - min || 1)) * (H - 8) - 4
  const path = pts.map(([d, e], i) => `${i ? 'L' : 'M'}${x(d).toFixed(1)},${y(e).toFixed(1)}`).join(' ')
  return (
    <figure className="profile">
      <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" role="img" aria-label="Profil wysokości trasy">
        <path d={`${path} L${W},${H} L0,${H} Z`} className="profile-area" />
        <path d={path} className="profile-line" />
      </svg>
      <figcaption className="muted small">
        <span>{min} m</span>
        <span>profil wysokości</span>
        <span>{max} m</span>
      </figcaption>
    </figure>
  )
}
