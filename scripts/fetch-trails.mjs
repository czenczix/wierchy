// Pobiera sieć szlaków turystycznych jednego regionu z OpenStreetMap, dokłada wysokości punktów
// i zapisuje gotowy "graf" do src/data/trails/<region>.json. Z tego pliku apka sama (offline)
// wyznacza trasy, np. z Morskiego Oka na Rysy albo z Krowiarek na Babią Górę.
//
// Uruchomienie: node scripts/fetch-trails.mjs <region>   (regiony: src/data/trail-regions.json)
//
// Jak to działa:
// 1. Z OSM bierzemy relacje route=hiking (to są szlaki, np. "czerwony: Palenica – Rysy")
//    i drogi (ways), z których się składają. Kolor szlaku jest w tagu osmc:symbol.
// 2. Drogi tniemy na odcinki między skrzyżowaniami. Skrzyżowanie to punkt wspólny dla kilku dróg.
// 3. Upraszczamy kształt odcinków (zostawiamy co kilka metrów punkt), żeby plik był mały.
// 4. Dla każdego punktu pobieramy wysokość z Open-Meteo (model terenu Copernicus 90 m),
//    żeby apka mogła liczyć podejścia, zejścia i czas przejścia.

import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { distanceM, runQuery } from './overpass.mjs'

const REGION = process.argv[2] ?? 'tatry'
const regions = JSON.parse(readFileSync('src/data/trail-regions.json', 'utf8'))
if (!regions[REGION]) throw new Error(`Nie znam regionu ${REGION}`)
const TATRY = REGION === 'tatry'
const points = ['peaks', 'passes', 'peaks-pl', 'peaks-diadem']
  .flatMap((f) => JSON.parse(readFileSync(`src/data/${f}.json`, 'utf8')))
  .filter((p) => regions[REGION].ranges.includes(p.range))
console.log(`Region ${REGION}: ${points.length} punktów z apki`)

// Obszar: Tatry to jeden prostokąt (polskie Tatry z zapasem na szlaki graniczne).
// Gdzie indziej góry są rozrzucone, więc bierzemy koła o promieniu 15 km wokół każdego
// szczytu z apki: wystarczy, żeby dojść z doliny, a plik nie puchnie od szlaków w miastach.
const BBOX = [49.16, 19.72, 49.31, 20.16]
const RADIUS_M = 15_000
const inArea = ([lat, lon]) =>
  TATRY
    ? lat >= BBOX[0] && lat <= BBOX[2] && lon >= BBOX[1] && lon <= BBOX[3]
    : points.some((p) => distanceM(lat, lon, p.lat, p.lon) <= RADIUS_M)
const area = TATRY
  ? [`relation["route"="hiking"](${BBOX.join(',')});`]
  : points.map((p) => `relation["route"="hiking"](around:${RADIUS_M},${p.lat},${p.lon});`)
// Prostokąt obejmujący cały obszar: w nim szukamy schronisk, parkingów itd.
const pad = RADIUS_M / 111_000
const box = TATRY
  ? BBOX
  : [
      Math.min(...points.map((p) => p.lat)) - pad,
      Math.min(...points.map((p) => p.lon)) - pad * 1.5,
      Math.max(...points.map((p) => p.lat)) + pad,
      Math.max(...points.map((p) => p.lon)) + pad * 1.5,
    ].map((x) => x.toFixed(3))

// Oprócz szlaków bierzemy to, co leży przy nich: schroniska, a poza Tatrami także parkingi,
// stacje kolejowe i miejscowości, z których zrobimy punkty startowe.
const HUT_NAME = '^(Schronisko|Bacówka|Studencka Baza|Chatka|Chata (pod|na|w) )'
const query = `[out:json][timeout:300];
(
${area.join('\n')}
)->.r;
.r out body;
way(r.r)->.w;
.w out body;
node(w.w);
out skel qt;
(
  nwr["tourism"="alpine_hut"](${box});
  nwr["tourism"]["name"~"${HUT_NAME}"](${box});
${TATRY ? '' : `  nwr["amenity"="parking"](${box});
  node["railway"~"^(station|halt)$"](${box});
  node["place"~"^(city|town|village|hamlet)$"](${box});`}
);
out center tags;`

const elements = await runQuery(query)
const rels = elements.filter((e) => e.type === 'relation')
const ways = new Map(elements.filter((e) => e.type === 'way' && e.nodes).map((w) => [w.id, w]))
const coords = new Map(elements.filter((e) => e.type === 'node').map((n) => [n.id, [n.lat, n.lon]]))
// Schroniska bywają w OSM punktem albo obrysem budynku; dla obrysu Overpass podaje środek (center).
const pois = elements
  .filter((e) => e.tags && e.type !== 'relation' && !(e.type === 'way' && e.nodes))
  .map((e) => ({ ...e, lat: e.lat ?? e.center?.lat, lon: e.lon ?? e.center?.lon }))
  .filter((e) => e.lat !== undefined && inArea([e.lat, e.lon]))
const huts = pois.filter(
  (e) => e.tags.name && (e.tags.tourism === 'alpine_hut' || (e.tags.tourism && new RegExp(HUT_NAME).test(e.tags.name))),
)
console.log(`OSM: ${rels.length} relacji, ${ways.size} dróg, ${coords.size} punktów, ${huts.length} schronisk, ${pois.length} miejsc`)

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

// Bierzemy tylko kolorowe drogi, które choć jednym punktem są w obszarze.
const trailWays = [...ways.values()].filter(
  (w) => wayColors.has(w.id) && w.nodes.some((id) => coords.has(id) && inArea(coords.get(id))),
)

// --- Skrzyżowania: punkty używane przez więcej niż jedną drogę albo końce dróg ---
const uses = new Map()
for (const w of trailWays) for (const id of w.nodes) uses.set(id, (uses.get(id) ?? 0) + 1)
const isJunction = (w, i) => i === 0 || i === w.nodes.length - 1 || uses.get(w.nodes[i]) > 1

// --- Uproszczenie kształtu (algorytm Douglasa-Peuckera) ---
// W Tatrach szlaki są krótsze i bardziej kręte, więc trzymamy więcej szczegółów.
const TOLERANCE_M = TATRY ? 8 : 12
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

// --- Wysokości (do 100 punktów na zapytanie) ---
// Najpierw Open-Meteo, a gdy nie odpowiada, OpenTopoData. Oba korzystają z modeli terenu ok. 30–90 m.
const SERVICES = [
  (chunk) =>
    'https://api.open-meteo.com/v1/elevation?latitude=' + chunk.map((p) => p[0]).join(',') +
    '&longitude=' + chunk.map((p) => p[1]).join(','),
  (chunk) => 'https://api.opentopodata.org/v1/eudem25m?locations=' + chunk.map((p) => `${p[0]},${p[1]}`).join('|'),
]
const parse = [(j) => j.elevation, (j) => j.results.map((r) => r.elevation)]

async function elevationChunk(chunk) {
  for (let attempt = 1; attempt <= 4; attempt++) {
    for (let s = 0; s < SERVICES.length; s++) {
      try {
        const res = await fetch(SERVICES[s](chunk), { signal: AbortSignal.timeout(30_000) })
        if (res.ok) {
          const list = parse[s](await res.json())
          if (list.length === chunk.length && list.every((e) => typeof e === 'number')) return list
        }
        console.log(`wysokości, serwis ${s + 1}: HTTP ${res.status}`)
        if (res.status === 429) await new Promise((r) => setTimeout(r, 60_000)) // za dużo zapytań: czekamy minutę
      } catch (err) {
        console.log(`wysokości, serwis ${s + 1}: ${err.message}`)
      }
      await new Promise((r) => setTimeout(r, 1100)) // OpenTopoData pozwala na 1 zapytanie na sekundę
    }
    await new Promise((r) => setTimeout(r, 5000 * attempt))
  }
  throw new Error('Nie udało się pobrać wysokości')
}

async function elevations(list) {
  const out = []
  for (let i = 0; i < list.length; i += 100) {
    out.push(...(await elevationChunk(list.slice(i, i + 100))))
    await new Promise((r) => setTimeout(r, 250)) // nie zasypujemy serwera
    if (i % 5000 === 0) console.log(`wysokości: ${i} / ${list.length}`)
  }
  return out.map((e) => Math.round(e))
}
const eles = await elevations(nodes)
nodes.forEach((p, i) => p.push(eles[i]))

// --- Punkty startowe ---
// W Tatrach to ręcznie wybrane, najpopularniejsze wejścia na szlaki. W innych górach
// robimy je automatycznie: parking albo stacja przy szlaku, albo miejscowość, przez którą
// szlak przechodzi. Do tego schroniska (z nich też można zacząć).
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
// Siatka kratek ok. 1 km: żeby znaleźć najbliższy punkt szlaku, sprawdzamy tylko kratki
// dookoła, a nie wszystkie punkty (parkingów są tysiące, punktów szlaku dziesiątki tysięcy).
const CELL = 0.01
const cellKey = (a, b) => `${a},${b}`
const grid = new Map()
nodes.forEach((p, i) => {
  const k = cellKey(Math.floor(p[0] / CELL), Math.floor(p[1] / CELL))
  if (!grid.has(k)) grid.set(k, [])
  grid.get(k).push(i)
})
/** Najbliższy punkt szlaku w promieniu ok. 1,4 km: [numer, odległość] albo [-1, Infinity]. */
const nearestNode = (lat, lon) => {
  let best = -1
  let bestD = Infinity
  const [ci, cj] = [Math.floor(lat / CELL), Math.floor(lon / CELL)]
  for (let di = -1; di <= 1; di++)
    for (let dj = -2; dj <= 2; dj++)
      for (const i of grid.get(cellKey(ci + di, cj + dj)) ?? []) {
        const d = distanceM(lat, lon, nodes[i][0], nodes[i][1])
        if (d < bestD) [best, bestD] = [i, d]
      }
  return [best, bestD]
}
const starts = []
if (TATRY) {
  for (const [id, name, lat, lon] of TRAILHEADS) {
    const [node, d] = nearestNode(lat, lon)
    if (d <= 800) starts.push({ id, name, node, kind: 'start' })
    else console.log(`Pomijam ${name}: najbliższy szlak ${Math.round(d)} m`)
  }
} else {
  const places = pois.filter((e) => e.tags.place && e.tags.name)
  const placeNear = (lat, lon) => {
    let best = null
    let bestD = 3000
    for (const p of places) {
      const d = distanceM(lat, lon, p.lat, p.lon)
      if (d < bestD) [best, bestD] = [p.tags.name, d]
    }
    return best
  }
  // Kandydaci od najlepszych: stacja, parking, miejscowość. Bliżej niż 800 m od już
  // wybranego startu nie dokładamy kolejnego, żeby lista nie była za długa.
  const candidates = []
  for (const e of pois) {
    const t = e.tags
    let rank, name, max
    if (t.railway) [rank, name, max] = [0, t.name && `${t.name} (stacja)`, 300]
    else if (t.amenity === 'parking') {
      const place = placeNear(e.lat, e.lon)
      // Nazwy w stylu "Parking płatny" nic nie mówią, wtedy lepsza jest nazwa miejscowości.
      const useful = t.name && !/parking|postoj|płatny|bezpłatny/i.test(t.name)
      ;[rank, name, max] = [1, useful ? t.name : place && `${place} (parking)`, 150]
      if (t.access && !['yes', 'customers', 'permissive'].includes(t.access)) continue
    } else if (t.place) [rank, name, max] = [2, t.name, 400]
    else continue
    if (!name) continue
    const [node, d] = nearestNode(e.lat, e.lon)
    if (d <= max) candidates.push({ id: `osm-${e.type[0]}${e.id}`, name, node, rank })
  }
  candidates.sort((a, b) => a.rank - b.rank)
  for (const c of candidates) {
    const [lat, lon] = nodes[c.node]
    // Za blisko innego startu albo ta sama nazwa kawałek dalej (np. trzy parkingi w jednej wsi).
    const near = (s, m) => distanceM(lat, lon, nodes[s.node][0], nodes[s.node][1]) < m
    if (starts.some((s) => near(s, 800) || (s.name === c.name && near(s, 4000)))) continue
    starts.push({ id: c.id, name: c.name, node: c.node, kind: 'start' })
  }
}
for (const h of huts) {
  const [node, d] = nearestNode(h.lat, h.lon)
  if (d <= 400) starts.push({ id: 'osm-' + h.id, name: h.tags.name, node, kind: 'hut' })
}
console.log(`Punkty startowe: ${starts.filter((s) => s.kind === 'start').length}, schroniska: ${starts.filter((s) => s.kind === 'hut').length}`)

const data = {
  // [szerokość, długość, wysokość]
  nodes,
  // n: kolejne numery punktów, c: kolory (r czerwony, b niebieski, g zielony, y żółty, k czarny)
  edges: edges.map((e) => ({ n: e.n, c: e.colors })),
  starts,
  source: 'OpenStreetMap (ODbL), wysokości: Open-Meteo / Copernicus DEM',
  fetched: new Date().toISOString().slice(0, 10),
}
mkdirSync('src/data/trails', { recursive: true })
const json = JSON.stringify(data)
writeFileSync(`src/data/trails/${REGION}.json`, json + '\n')
console.log(`Zapisano src/data/trails/${REGION}.json (${Math.round(json.length / 1024)} KB)`)
