// Pobiera dokładne położenie tatrzańskich przełęczy (tych na szlakach) z OpenStreetMap
// i zapisuje je do src/data/passes.json.
//
// Uruchomienie: node scripts/fetch-passes.mjs
//
// Przełęcze w OSM mają różne nazwy ("Przełęcz Kondracka" albo "Kondracka Przełęcz"),
// więc oprócz nazwy sprawdzamy też odległość od naszego przybliżonego położenia:
// trafienie dalej niż 1,5 km uznajemy za pomyłkę i zostawiamy współrzędne przybliżone.

import { mkdirSync, writeFileSync } from 'node:fs'
import { distanceM, namesOf, printJson, runQuery } from './overpass.mjs'

// id, nazwa, inne nazwy w OSM, wysokość, pasmo, przybliżone [lat, lon]
const PASSES = [
  ['zawrat', 'Zawrat', [], 2159, 'tatry-wysokie', [49.2189, 20.0164]],
  ['kozia-przelecz', 'Kozia Przełęcz', [], 2137, 'tatry-wysokie', [49.2186, 20.0237]],
  ['krzyzne', 'Krzyżne', ['Przełęcz Krzyżne'], 2112, 'tatry-wysokie', [49.2236, 20.0497]],
  ['szpiglasowa-przelecz', 'Szpiglasowa Przełęcz', ['Przełęcz Szpiglasowa'], 2110, 'tatry-wysokie', [49.1972, 20.0437]],
  ['swinicka-przelecz', 'Świnicka Przełęcz', ['Przełęcz Świnicka'], 2051, 'tatry-wysokie', [49.2213, 20.0029]],
  ['wrota-chalubinskiego', 'Wrota Chałubińskiego', [], 2022, 'tatry-wysokie', [49.1884, 20.0406]],
  ['liliowe', 'Liliowe', ['Przełęcz Liliowe'], 1952, 'tatry-zachodnie', [49.2265, 19.9923]],
  ['przelecz-pod-kopa-kondracka', 'Przełęcz pod Kopą Kondracką', [], 1863, 'tatry-zachodnie', [49.2367, 19.9451]],
  ['karb', 'Karb', ['Przełęcz Karb'], 1853, 'tatry-wysokie', [49.2281, 20.0154]],
  ['siwa-przelecz', 'Siwa Przełęcz', ['Przełęcz Siwa'], 1812, 'tatry-zachodnie', [49.2132, 19.8361]],
  ['przelecz-kondracka', 'Przełęcz Kondracka', ['Kondracka Przełęcz'], 1725, 'tatry-zachodnie', [49.2405, 19.9440]],
  ['przelecz-miedzy-kopami', 'Przełęcz między Kopami', [], 1499, 'tatry-wysokie', [49.2561, 20.0049]],
  ['przelecz-iwaniacka', 'Przełęcz Iwaniacka', ['Iwaniacka Przełęcz'], 1459, 'tatry-zachodnie', [49.2295, 19.8641]],
  ['przelecz-w-grzybowcu', 'Przełęcz w Grzybowcu', [], 1311, 'tatry-zachodnie', [49.2601, 19.9478]],
]

const BBOX = '49.15,19.70,49.31,20.20'
// Przełęcz w OSM to zwykle punkt natural=saddle albo punkt na ścieżce z mountain_pass=yes.
const query = `[out:json][timeout:25];(node["natural"="saddle"](${BBOX});node["mountain_pass"="yes"](${BBOX}););out body;`

const nodes = (await runQuery(query)).filter((n) => n.tags)
const MAX_DISTANCE_M = 1500

const passes = []
const problems = []
for (const [id, name, aliases, elevation, range, [lat, lon]] of PASSES) {
  const wanted = [name, ...aliases]
  const dist = (n) => distanceM(lat, lon, n.lat, n.lon)
  const best = nodes
    .filter((n) => namesOf(n).some((x) => wanted.includes(x)))
    .sort((a, b) => dist(a) - dist(b))[0]

  const point = { id, name, type: 'pass', elevation, lat, lon, range, osmId: 0 }
  if (!best) problems.push(`${name}: brak w OSM, zostają współrzędne przybliżone`)
  else if (dist(best) > MAX_DISTANCE_M) problems.push(`${name}: OSM ${Math.round(dist(best))} m dalej, zostają przybliżone`)
  else Object.assign(point, { lat: Number(best.lat.toFixed(5)), lon: Number(best.lon.toFixed(5)), osmId: best.id })
  passes.push(point)
}

mkdirSync('src/data', { recursive: true })
writeFileSync('src/data/passes.json', JSON.stringify(passes, null, 2) + '\n')
console.log(`Dokładne położenie z OSM: ${passes.filter((p) => p.osmId).length} z ${passes.length} przełęczy.`)
if (problems.length) console.log('Do sprawdzenia:\n- ' + problems.join('\n- '))
printJson('PASSES', passes)
