// Pobiera położenie szczytów spoza Tatr (na razie Korona Gór Polskich) z OpenStreetMap
// i zapisuje je do src/data/peaks-pl.json.
//
// Uruchomienie: node scripts/fetch-peaks-pl.mjs
//
// Szukamy w okolicy naszego przybliżonego położenia i sprawdzamy nazwę oraz wysokość.
// Wysokości bierzemy z oficjalnej listy KGP.

import { mkdirSync, writeFileSync } from 'node:fs'
import { distanceM, namesOf, printJson, runQuery } from './overpass.mjs'

// id, nazwa, inne nazwy w OSM, wysokość, pasmo, przybliżone [lat, lon]
const PEAKS = [
  ['babia-gora', 'Babia Góra', ['Diablak'], 1725, 'beskid-zywiecki', [49.5731, 19.5294]],
  ['sniezka', 'Śnieżka', ['Sněžka'], 1603, 'karkonosze', [50.736, 15.7398]],
  ['snieznik', 'Śnieżnik', ['Králický Sněžník', 'Kralicky Sneznik'], 1425, 'masyw-snieznika', [50.2075, 16.8478]],
  ['tarnica', 'Tarnica', [], 1346, 'bieszczady', [49.0748, 22.7264]],
  ['turbacz', 'Turbacz', [], 1310, 'gorce', [49.5431, 20.1114]],
  ['radziejowa', 'Radziejowa', [], 1266, 'beskid-sadecki', [49.4494, 20.6044]],
  ['skrzyczne', 'Skrzyczne', [], 1257, 'beskid-slaski', [49.6847, 19.03]],
  ['mogielica', 'Mogielica', [], 1170, 'beskid-wyspowy', [49.6553, 20.2764]],
  ['wysoka-kopa', 'Wysoka Kopa', [], 1126, 'gory-izerskie', [50.85, 15.42]],
  ['rudawiec', 'Rudawiec', ['Rudný vrch'], 1106, 'gory-bialskie', [50.244, 16.975]],
  ['orlica', 'Orlica', ['Vrchmezí'], 1084, 'gory-orlickie', [50.353, 16.36]],
  ['wysoka', 'Wysoka', ['Wysokie Skałki', 'Wysoka (Wysokie Skałki)', 'Vysoké skalky'], 1050, 'pieniny', [49.38, 20.555]],
  ['wielka-sowa', 'Wielka Sowa', [], 1015, 'gory-sowie', [50.68, 16.485]],
  ['lackowa', 'Lackowa', [], 997, 'beskid-niski', [49.428, 21.096]],
  ['kowadlo', 'Kowadło', [], 989, 'gory-zlote', [50.265, 17.01]],
  ['jagodna', 'Jagodna', [], 977, 'gory-bystrzyckie', [50.255, 16.565]],
  ['skalnik', 'Skalnik', [], 945, 'rudawy-janowickie', [50.808, 15.9]],
  ['waligora', 'Waligóra', [], 936, 'gory-kamienne', [50.683, 16.275]],
  ['czupel', 'Czupel', [], 930, 'beskid-maly', [49.766, 19.16]],
  ['szczeliniec-wielki', 'Szczeliniec Wielki', [], 919, 'gory-stolowe', [50.485, 16.34]],
  ['lubomir', 'Lubomir', [], 904, 'beskid-makowski', [49.768, 20.06]],
  ['biskupia-kopa', 'Biskupia Kopa', ['Biskupská kupa'], 890, 'gory-opawskie', [50.256, 17.429]],
  ['chelmiec', 'Chełmiec', [], 851, 'gory-walbrzyskie', [50.778, 16.21]],
  ['klodzka-gora', 'Kłodzka Góra', [], 765, 'gory-bardzkie', [50.442, 16.75]],
  ['skopiec', 'Skopiec', [], 724, 'gory-kaczawskie', [50.945, 15.858]],
  ['sleza', 'Ślęża', [], 718, 'masyw-slezy', [50.865, 16.709]],
  ['lysica', 'Łysica', [], 614, 'gory-swietokrzyskie', [50.892, 20.895]],
]

// Szukamy szczytów w promieniu 4 km od każdego przybliżonego położenia (jedno zbiorcze zapytanie).
// Nazwy w OSM bywają dwujęzyczne, np. "Sněžka / Śnieżka", dlatego porównujemy fragmenty nazw.
const RADIUS_M = 4000
const query =
  '[out:json][timeout:90];(' +
  PEAKS.map(([, , , , , [lat, lon]]) => `node["natural"="peak"](around:${RADIUS_M},${lat},${lon});`).join('') +
  ');out body;'

const nodes = (await runQuery(query)).filter((n) => n.tags)
const norm = (x) => x.toLocaleLowerCase('pl')

const peaks = []
const problems = []
for (const [id, name, aliases, elevation, range, [lat, lon]] of PEAKS) {
  const wanted = [name, ...aliases].map(norm)
  const dist = (n) => distanceM(lat, lon, n.lat, n.lon)
  const eleDiff = (n) => {
    const d = Math.abs(parseFloat(n.tags.ele) - elevation)
    return Number.isNaN(d) ? 999 : d
  }
  // Kandydaci: blisko nas i z pasującą nazwą. Najlepszy ma wysokość najbliższą naszej.
  const best = nodes
    .filter((n) => dist(n) <= RADIUS_M && namesOf(n).some((x) => wanted.some((w) => norm(x).includes(w))))
    .sort((a, b) => eleDiff(a) - eleDiff(b) || dist(a) - dist(b))[0]

  const point = { id, name, type: 'peak', elevation, lat, lon, range, osmId: 0 }
  if (!best) problems.push(`${name}: brak w OSM w promieniu ${RADIUS_M / 1000} km, zostają przybliżone`)
  else if (eleDiff(best) > 30)
    problems.push(`${name}: najlepszy kandydat "${best.tags.name}" ma ${best.tags.ele ?? '?'} m (my ${elevation} m), zostają przybliżone`)
  else Object.assign(point, { lat: Number(best.lat.toFixed(5)), lon: Number(best.lon.toFixed(5)), osmId: best.id })
  peaks.push(point)
}

mkdirSync('src/data', { recursive: true })
writeFileSync('src/data/peaks-pl.json', JSON.stringify(peaks, null, 2) + '\n')
console.log(`Dokładne położenie z OSM: ${peaks.filter((p) => p.osmId).length} z ${peaks.length} szczytów.`)
if (problems.length) console.log('Do sprawdzenia:\n- ' + problems.join('\n- '))
printJson('PEAKS_PL', peaks)
