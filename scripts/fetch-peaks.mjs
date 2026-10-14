// Pobiera dokładne współrzędne naszych szczytów z OpenStreetMap (przez Overpass API)
// i zapisuje je do src/data/peaks.json.
//
// Uruchomienie: node scripts/fetch-peaks.mjs
//
// Wysokości bierzemy z naszej zatwierdzonej listy (polskie źródła),
// a z OSM tylko położenie wierzchołka. OSM bywa niespójny co do wysokości.

import { mkdirSync, writeFileSync } from 'node:fs'

// Nasza lista: id (do adresu URL), nazwa, możliwe nazwy w OSM, wysokość, część Tatr.
const PEAKS = [
  ['rysy', 'Rysy', [], 2499, 'wysokie'],
  ['swinica', 'Świnica', ['Svinica'], 2301, 'wysokie'],
  ['kozi-wierch', 'Kozi Wierch', [], 2291, 'wysokie'],
  ['zadni-granat', 'Zadni Granat', [], 2240, 'wysokie'],
  ['starorobocianski-wierch', 'Starorobociański Wierch', ['Klin', 'Klin Starorobociański'], 2176, 'zachodnie'],
  ['szpiglasowy-wierch', 'Szpiglasowy Wierch', [], 2172, 'wysokie'],
  ['koscielec', 'Kościelec', [], 2155, 'wysokie'],
  ['jarzabczy-wierch', 'Jarząbczy Wierch', ['Jarabý vrch'], 2137, 'zachodnie'],
  ['krzesanica', 'Krzesanica', [], 2122, 'zachodnie'],
  ['ciemniak', 'Ciemniak', [], 2096, 'zachodnie'],
  ['malolaczniak', 'Małołączniak', [], 2096, 'zachodnie'],
  ['wolowiec', 'Wołowiec', ['Volovec'], 2064, 'zachodnie'],
  ['beskid', 'Beskid', [], 2012, 'zachodnie'],
  ['kopa-kondracka', 'Kopa Kondracka', [], 2005, 'zachodnie'],
  ['konczysty-wierch', 'Kończysty Wierch', ['Končistá'], 2002, 'zachodnie'],
  ['kasprowy-wierch', 'Kasprowy Wierch', [], 1987, 'zachodnie'],
  ['giewont', 'Giewont', ['Wielki Giewont'], 1894, 'zachodnie'],
  ['rakon', 'Rakoń', [], 1879, 'zachodnie'],
  ['ornak', 'Ornak', [], 1854, 'zachodnie'],
  ['kominiarski-wierch', 'Kominiarski Wierch', [], 1829, 'zachodnie'],
  ['trzydniowianski-wierch', 'Trzydniowiański Wierch', [], 1758, 'zachodnie'],
  ['grzes', 'Grześ', ['Lúčna'], 1653, 'zachodnie'],
  ['gesia-szyja', 'Gęsia Szyja', [], 1489, 'wysokie'],
  ['sarnia-skala', 'Sarnia Skała', [], 1377, 'zachodnie'],
  ['wielki-kopieniec', 'Wielki Kopieniec', ['Kopieniec Wielki'], 1328, 'wysokie'],
  ['nosal', 'Nosal', [], 1206, 'wysokie'],
]

// Prostokąt obejmujący polskie Tatry (z zapasem na szczyty graniczne).
const BBOX = '49.15,19.70,49.31,20.20'
const query = `[out:json][timeout:25];node["natural"="peak"](${BBOX});out body;`

// Publiczne serwery Overpass bywają przeciążone, więc próbujemy kilku po kolei.
const SERVERS = [
  'https://overpass-api.de/api/interpreter',
  'https://overpass.private.coffee/api/interpreter',
  'https://overpass.kumi.systems/api/interpreter',
]

async function runQuery() {
  for (let attempt = 1; attempt <= 3; attempt++) {
    for (const url of SERVERS) {
      try {
        const res = await fetch(url, {
          method: 'POST',
          // Overpass odrzuca zapytania bez przedstawienia się (HTTP 406), więc podajemy nazwę apki.
          headers: { 'User-Agent': 'wierchy/0.1 (https://github.com/czenczix/wierchy)', Accept: 'application/json' },
          body: new URLSearchParams({ data: query }),
        })
        if (res.ok) return (await res.json()).elements
        console.log(`${url}: HTTP ${res.status}`)
      } catch (err) {
        console.log(`${url}: ${err.message}`)
      }
    }
    await new Promise((r) => setTimeout(r, 10_000))
  }
  throw new Error('Żaden serwer Overpass nie odpowiedział')
}

const nodes = await runQuery()

const namesOf = (n) =>
  [n.tags.name, n.tags['name:pl'], n.tags.alt_name, n.tags.official_name].filter(Boolean)

const peaks = []
const problems = []
for (const [id, name, aliases, elevation, range] of PEAKS) {
  const wanted = [name, ...aliases]
  const candidates = nodes.filter((n) => namesOf(n).some((x) => wanted.includes(x)))
  if (candidates.length === 0) {
    problems.push(`${name}: brak w OSM`)
    continue
  }
  // Kilka trafień (np. Rysy mają wierzchołek polski i słowacki):
  // wybieramy ten, którego wysokość w OSM jest najbliższa naszej.
  const diff = (n) => Math.abs(parseFloat(n.tags.ele ?? 'NaN') - elevation) || 9999
  candidates.sort((a, b) => diff(a) - diff(b))
  const best = candidates[0]
  if (diff(best) > 15) problems.push(`${name}: OSM ma ${best.tags.ele ?? '?'} m, my ${elevation} m`)
  peaks.push({
    id,
    name,
    type: 'peak',
    elevation,
    lat: Number(best.lat.toFixed(5)),
    lon: Number(best.lon.toFixed(5)),
    range,
    osmId: best.id,
  })
}

mkdirSync('src/data', { recursive: true })
writeFileSync('src/data/peaks.json', JSON.stringify(peaks, null, 2) + '\n')
console.log(`Zapisano ${peaks.length} z ${PEAKS.length} szczytów.`)
if (problems.length) console.log('Do sprawdzenia:\n- ' + problems.join('\n- '))
console.log('PEAKS_JSON_START')
console.log(JSON.stringify(peaks))
console.log('PEAKS_JSON_END')
