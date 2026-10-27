// Pobiera sieć szlaków turystycznych Tatr z OpenStreetMap, dokłada wysokości punktów
// i zapisuje gotowy "graf" do src/data/trails.json. Z tego pliku apka sama (offline)
// wyznacza trasy, np. z Morskiego Oka na Rysy.
//
// Uruchomienie: node scripts/fetch-trails.mjs
//
// Jak to działa:
// 1. Z OSM bierzemy relacje route=hiking (to są szlaki, np. "czerwony: Palenica – Rysy")
//    i drogi (ways), z których się składają. Kolor szlaku jest w tagu osmc:symbol.
// 2. Drogi tniemy na odcinki między skrzyżowaniami. Skrzyżowanie to punkt wspólny dla kilku dróg.
// 3. Upraszczamy kształt odcinków (zostawiamy co kilka metrów punkt), żeby plik był mały.
// 4. Dla każdego punktu pobieramy wysokość z Open-Meteo (model terenu Copernicus 90 m),
//    żeby apka mogła liczyć podejścia, zejścia i czas przejścia.

import { mkdirSync, writeFileSync } from 'node:fs'
import { distanceM, runQuery } from './overpass.mjs'

// Polskie Tatry z małym zapasem na szlaki graniczne.
const BBOX = [49.16, 19.72, 49.31, 20.16]
const bbox = BBOX.join(',')
const inBox = ([lat, lon]) => lat >= BBOX[0] && lat <= BBOX[2] && lon >= BBOX[1] && lon <= BBOX[3]

const query = `[out:json][timeout:180];
relation["route"="hiking"](${bbox})->.r;
.r out body;
way(r.r)->.w;
.w out body;
node(w.w);
out skel qt;
(node["tourism"~"alpine_hut|wilderness_hut"](${bbox}););
out body;`

const elements = await runQuery(query)
const rels = elements.filter((e) => e.type === 'relation')
const ways = new Map(elements.filter((e) => e.type === 'way').map((w) => [w.id, w]))
const coords = new Map(elements.filter((e) => e.type === 'node').map((n) => [n.id, [n.lat, n.lon]]))
const huts = elements.filter((e) => e.type === 'node' && e.tags?.tourism && e.tags?.name)
console.log(`OSM: ${rels.length} relacji, ${ways.size} dróg, ${coords.size} punktów, ${huts.length} schronisk`)

// --- Kolory szlaków ---
const COLORS = ['red', 'blue', 'green', 'yellow', 'black']
// Jednoliterowe skróty do pliku: k = czarny (b jest już zajęte przez niebieski)
const SHORT = { red: 'r', blue: 'b', green: 'g', yellow: 'y', black: 'k' }
function colorOf(tags) {
  const raw = (tags['osmc:symbol'] ?? tags.colour ?? '').split(':')[0].toLowerCase()
  return COLORS.includes(raw) ? raw : null
}
const wayColors = new Map() // id drogi -> zbiór kolorów
for (const r of rels) {
  const c = colorOf(r.tags ?? {})
  if (!c) continue
  for (const m of r.members) {
    if (m.type !== 'way' || !ways.has(m.ref)) continue
    if (!wayColors.has(m.ref)) wayColors.set(m.ref, new Set())
    wayColors.get(m.ref).add(c)
  }
}

// Bierzemy tylko kolorowe drogi, które choć jednym punktem są w Tatrach.
const trailWays = [...ways.values()].filter(
  (w) => wayColors.has(w.id) && w.nodes.some((id) => coords.has(id) && inBox(coords.get(id))),
)

// --- Skrzyżowania: punkty używane przez więcej niż jedną drogę albo końce dróg ---
const uses = new Map()
for (const w of trailWays) for (const id of w.nodes) uses.set(id, (uses.get(id) ?? 0) + 1)
const isJunction = (w, i) => i === 0 || i === w.nodes.length - 1 || uses.get(w.nodes[i]) > 1

// --- Uproszczenie kształtu (algorytm Douglasa-Peuckera) ---
const TOLERANCE_M = 8
function simplify(ids) {
  if (ids.length <= 2) return ids
  const [a, b] = [coords.get(ids[0]), coords.get(ids[ids.length - 1])]
  // odległość punktu od odcinka a-b, w metrach (przybliżenie płaskie, wystarcza na małych odległościach)
  const kx = 111320 * Math.cos((a[0] * Math.PI) / 180)
  const ky = 110540
  const dist = (p) => {
    const [x, y] = [(p[1] - a[1]) * kx, (p[0] - a[0]) * ky]
    const [dx, dy] = [(b[1] - a[1]) * kx, (b[0] - a[0]) * ky]
    const len2 = dx * dx + dy * dy
    const t = len2 ? Math.max(0, Math.min(1, (x * dx + y * dy) / len2)) : 0
    return Math.hypot(x - t * dx, y - t * dy)
  }
  let maxD = 0
  let maxI = 0
  for (let i = 1; i < ids.length - 1; i++) {
    const d = dist(coords.get(ids[i]))
    if (d > maxD) [maxD, maxI] = [d, i]
  }
  if (maxD < TOLERANCE_M) return [ids[0], ids[ids.length - 1]]
  return [...simplify(ids.slice(0, maxI + 1)).slice(0, -1), ...simplify(ids.slice(maxI))]
}

// --- Cięcie dróg na odcinki między skrzyżowaniami ---
const edges = [] // { ids: [...osm node ids], colors: 'rb' }
for (const w of trailWays) {
  if (!w.nodes.every((id) => coords.has(id))) continue
  const colors = [...wayColors.get(w.id)].map((c) => SHORT[c]).join('')
  let start = 0
  for (let i = 1; i < w.nodes.length; i++) {
    if (isJunction(w, i)) {
      edges.push({ ids: simplify(w.nodes.slice(start, i + 1)), colors })
      start = i
    }
  }
}

// --- Numeracja punktów, które zostały ---
const index = new Map()
const nodes = []
for (const e of edges) {
  e.n = e.ids.map((id) => {
    if (!index.has(id)) {
      index.set(id, nodes.length)
      const [lat, lon] = coords.get(id)
      nodes.push([Number(lat.toFixed(5)), Number(lon.toFixed(5))])
    }
    return index.get(id)
  })
}
console.log(`Graf: ${nodes.length} punktów, ${edges.length} odcinków`)

// --- Wysokości z Open-Meteo (do 100 punktów na zapytanie) ---
async function elevations(list) {
  const out = []
  for (let i = 0; i < list.length; i += 100) {
    const chunk = list.slice(i, i + 100)
    const url =
      'https://api.open-meteo.com/v1/elevation?latitude=' +
      chunk.map((p) => p[0]).join(',') +
      '&longitude=' +
      chunk.map((p) => p[1]).join(',')
    for (let attempt = 1; ; attempt++) {
      const res = await fetch(url)
      if (res.ok) {
        out.push(...(await res.json()).elevation)
        break
      }
      if (attempt >= 5) throw new Error(`Open-Meteo: HTTP ${res.status}`)
      await new Promise((r) => setTimeout(r, 2000 * attempt))
    }
    await new Promise((r) => setTimeout(r, 150)) // nie zasypujemy serwera
  }
  return out.map((e) => Math.round(e))
}
const eles = await elevations(nodes)
nodes.forEach((p, i) => p.push(eles[i]))

// --- Punkty startowe: schroniska z OSM i najpopularniejsze wejścia na szlaki ---
const TRAILHEADS = [
  ['palenica', 'Palenica Białczańska (parking)', 49.2547, 20.1034],
  ['lysa-polana', 'Łysa Polana', 49.2654, 20.1152],
  ['kuznice', 'Kuźnice', 49.2697, 19.9805],
  ['siwa-polana', 'Siwa Polana (Dolina Chochołowska)', 49.2757, 19.8139],
  ['kiry', 'Kiry (Dolina Kościeliska)', 49.2795, 19.8655],
  ['strazyska', 'Wejście do Doliny Strążyskiej', 49.2827, 19.9436],
  ['brzeziny', 'Brzeziny', 49.2946, 20.0442],
  ['zazadnia', 'Zazadnia', 49.2889, 20.0811],
]
const nearestNode = (lat, lon) => {
  let best = -1
  let bestD = Infinity
  nodes.forEach((p, i) => {
    const d = distanceM(lat, lon, p[0], p[1])
    if (d < bestD) [best, bestD] = [i, d]
  })
  return [best, bestD]
}
const starts = []
for (const [id, name, lat, lon] of TRAILHEADS) {
  const [node, d] = nearestNode(lat, lon)
  if (d <= 800) starts.push({ id, name, node, kind: 'start' })
  else console.log(`Pomijam ${name}: najbliższy szlak ${Math.round(d)} m`)
}
for (const h of huts) {
  const [node, d] = nearestNode(h.lat, h.lon)
  if (d <= 400 && inBox([h.lat, h.lon])) {
    const id = 'osm-' + h.id
    starts.push({ id, name: h.tags.name, node, kind: 'hut' })
  }
}
console.log(`Punkty startowe: ${starts.length}`)

const data = {
  // [szerokość, długość, wysokość]
  nodes,
  // n: kolejne numery punktów, c: kolory (r czerwony, b niebieski, g zielony, y żółty, k czarny)
  edges: edges.map((e) => ({ n: e.n, c: e.colors })),
  starts,
  source: 'OpenStreetMap (ODbL), wysokości: Open-Meteo / Copernicus DEM',
  fetched: new Date().toISOString().slice(0, 10),
}
mkdirSync('src/data', { recursive: true })
const json = JSON.stringify(data)
writeFileSync('src/data/trails.json', json + '\n')
console.log(`Zapisano src/data/trails.json (${Math.round(json.length / 1024)} KB)`)
