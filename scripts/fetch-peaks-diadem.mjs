// Pobiera położenie szczytów Diademu Polskich Gór, których nie było jeszcze w apce,
// i zapisuje je do src/data/peaks-diadem.json.
//
// Uruchomienie: node scripts/fetch-peaks-diadem.mjs
//
// Tu nasze przybliżone położenie bywa mało dokładne, więc szukamy inaczej niż dla Korony:
// po fragmencie nazwy w całej południowej Polsce, a potem wybieramy kandydata z wysokością
// zgodną z listą (±15 m). Położenie przybliżone rozstrzyga tylko, gdy pasuje kilka.

import { mkdirSync, writeFileSync } from 'node:fs'
import { distanceM, namesOf, printJson, runQuery } from './overpass.mjs'

// id, nazwa, fragmenty nazw do szukania w OSM, wysokość (lista PTTK), pasmo, przybliżone [lat, lon]
const PEAKS = [
  ['wielka-czantoria', 'Wielka Czantoria', ['Czantoria'], 995, 'beskid-slaski', [49.679, 18.806]],
  ['klimczok', 'Klimczok', ['Klimczok'], 1117, 'beskid-slaski', [49.733, 19.006]],
  ['lamana-skala', 'Łamana Skała', ['Łamana Skała', 'Madohora'], 929, 'beskid-maly', [49.774, 19.355]],
  ['wielka-racza', 'Wielka Racza', ['Racza'], 1236, 'beskid-zywiecki', [49.417, 18.99]],
  ['pilsko', 'Pilsko (Góra Pięciu Kopców)', ['Pięciu Kopców', 'Pilsko'], 1534, 'beskid-zywiecki', [49.544, 19.325]],
  ['jalowiec', 'Jałowiec', ['Jałowiec'], 1111, 'beskid-zywiecki', [49.665, 19.49]],
  ['polica', 'Polica', ['Polica'], 1369, 'beskid-zywiecki', [49.623, 19.626]],
  ['bukowinski-wierch', 'Bukowiński Wierch', ['Bukowiński'], 940, 'beskid-zywiecki', [49.585, 19.86]],
  ['lasek', 'Lasek (Łosek)', ['Lasek', 'Łosek'], 868, 'beskid-makowski', [49.73, 19.66]],
  ['babica', 'Babica', ['Babica'], 728, 'beskid-makowski', [49.83, 19.75]],
  ['koskowa-gora', 'Koskowa Góra', ['Koskowa'], 867, 'beskid-makowski', [49.74, 19.77]],
  ['lubon-wielki', 'Luboń Wielki', ['Luboń Wielki'], 1022, 'beskid-wyspowy', [49.65, 19.99]],
  ['cwilin', 'Ćwilin', ['Ćwilin'], 1072, 'beskid-wyspowy', [49.68, 20.23]],
  ['modyn', 'Modyń', ['Modyń'], 1029, 'beskid-wyspowy', [49.66, 20.41]],
  ['jaworz', 'Jaworz', ['Jaworz'], 918, 'beskid-wyspowy', [49.7, 20.48]],
  ['luban', 'Lubań', ['Lubań'], 1225, 'gorce', [49.47, 20.33]],
  ['jaworzyna-krynicka', 'Jaworzyna Krynicka', ['Jaworzyna Krynicka', 'Jaworzyna'], 1114, 'beskid-sadecki', [49.42, 20.89]],
  ['kraczonik', 'Kraczonik', ['Kraczonik'], 934, 'beskid-sadecki', [49.43, 20.98]],
  ['jaworze', 'Jaworze', ['Jaworze'], 882, 'beskid-niski', [49.62, 21.25]],
  ['watkowa', 'Wątkowa', ['Wątkowa'], 846, 'beskid-niski', [49.58, 21.31]],
  ['baranie', 'Baranie', ['Baranie'], 754, 'beskid-niski', [49.49, 21.46]],
  ['kamien-jasliska', 'Kamień', ['Kamień'], 857, 'beskid-niski', [49.4, 21.8]],
  ['tokarnia', 'Tokarnia', ['Tokarnia'], 778, 'beskid-niski', [49.52, 21.8]],
  ['zar-branisko', 'Żar (Branisko)', ['Żar', 'Branisko'], 883, 'pieniny', [49.42, 20.25]],
  ['trzy-korony', 'Trzy Korony', ['Trzy Korony', 'Okrąglica'], 982, 'pieniny', [49.414, 20.41]],
  ['slonny', 'Słonny', ['Słonny', 'Słonne'], 668, 'gory-sanocko-turczanskie', [49.58, 22.33]],
  ['slonny-wierch', 'Słonny Wierch (wsch.)', ['Słonny', 'Słonne'], 668, 'gory-sanocko-turczanskie', [49.57, 22.4]],
  ['jaworniki', 'Jaworniki', ['Jaworniki'], 908, 'gory-sanocko-turczanskie', [49.55, 22.45]],
  ['trohaniec', 'Trohaniec', ['Trohaniec'], 939, 'bieszczady', [49.3, 22.27]],
  ['lopiennik', 'Łopiennik', ['Łopiennik'], 1069, 'bieszczady', [49.23, 22.39]],
  ['wolosan', 'Wołosań', ['Wołosań'], 1071, 'bieszczady', [49.2, 22.3]],
  ['wielka-rawka', 'Wielka Rawka', ['Wielka Rawka', 'Rawka'], 1307, 'bieszczady', [49.093, 22.585]],
  ['skalny-stol', 'Skalny Stół', ['Skalny Stół'], 1282, 'karkonosze', [50.765, 15.85]],
  ['lysocina', 'Łysocina', ['Łysocina'], 1188, 'karkonosze', [50.72, 15.97]],
  ['okole', 'Okole', ['Okole'], 721, 'gory-kaczawskie', [50.97, 15.95]],
  ['maslak', 'Maślak (Folwarczna)', ['Maślak', 'Folwarczna'], 723, 'gory-kaczawskie', [51.0, 15.78]],
  ['baraniec', 'Baraniec', ['Baraniec'], 720, 'gory-kaczawskie', [50.95, 15.8]],
  ['poreba', 'Poręba', ['Poręba'], 671, 'gory-kaczawskie', [51.02, 15.83]],
  ['krzyzna-gora', 'Krzyżna Góra', ['Krzyżna'], 654, 'rudawy-janowickie', [50.83, 15.85]],
  ['trojgarb', 'Trójgarb', ['Trójgarb'], 778, 'gory-walbrzyskie', [50.82, 16.2]],
  ['borowa', 'Borowa', ['Borowa'], 853, 'gory-walbrzyskie', [50.73, 16.3]],
  ['lesista-wielka', 'Lesista Wielka', ['Lesista'], 851, 'gory-kamienne', [50.68, 16.19]],
  ['szeroka', 'Szeroka', ['Szeroka'], 842, 'gory-kamienne', [50.65, 16.33]],
  ['janski-wierch', 'Jański Wierch', ['Jański'], 697, 'gory-jastrzebie', [50.58, 16.33]],
  ['rog', 'Róg', ['Róg'], 715, 'gory-stolowe', [50.43, 16.48]],
  ['jagodna-polnocna', 'Jagodna Północna', ['Jagodna'], 985, 'gory-bystrzyckie', [50.27, 16.56]],
  ['wlodarz', 'Włodarz', ['Włodarz'], 811, 'gory-sowie', [50.68, 16.4]],
  ['szeroka-gora', 'Szeroka Góra', ['Szeroka'], 766, 'gory-bardzkie', [50.48, 16.7]],
  ['postawna', 'Postawna', ['Postawna'], 1117, 'gory-bialskie', [50.3, 16.97]],
  ['suchon', 'Suchoń', ['Suchoń'], 960, 'masyw-snieznika', [50.27, 16.83]],
]

const BBOX = '48.95,14.8,51.15,23.0'
const fragments = [...new Set(PEAKS.flatMap(([, , frags]) => frags))]
const query = `[out:json][timeout:120];node["natural"="peak"]["name"~"${fragments.join('|')}",i](${BBOX});out body;`

const nodes = (await runQuery(query)).filter((n) => n.tags)
const norm = (x) => x.toLocaleLowerCase('pl')
const MAX_ELE_DIFF = 15
const usedIds = new Set()

const peaks = []
const problems = []
for (const [id, name, frags, elevation, range, [lat, lon]] of PEAKS) {
  const dist = (n) => distanceM(lat, lon, n.lat, n.lon)
  const eleDiff = (n) => {
    const d = Math.abs(parseFloat(n.tags.ele) - elevation)
    return Number.isNaN(d) ? 999 : d
  }
  const named = nodes.filter((n) => !usedIds.has(n.id) && namesOf(n).some((x) => frags.some((f) => norm(x).includes(norm(f)))))
  // Najpierw kandydaci z zgodną wysokością (najbliżsi nam), a gdy brak takich, najbliższy w promieniu 3 km.
  const byEle = named.filter((n) => eleDiff(n) <= MAX_ELE_DIFF).sort((a, b) => dist(a) - dist(b))
  const near = named.filter((n) => dist(n) <= 3000).sort((a, b) => dist(a) - dist(b))
  const best = byEle[0] ?? near[0]

  const point = { id, name, type: 'peak', elevation, lat, lon, range, osmId: 0 }
  if (!best) problems.push(`${name}: brak w OSM, zostają przybliżone`)
  else {
    usedIds.add(best.id) // dwa Słonne nie mogą trafić w ten sam punkt
    Object.assign(point, { lat: Number(best.lat.toFixed(5)), lon: Number(best.lon.toFixed(5)), osmId: best.id })
    const note = `"${best.tags.name}" ${best.tags.ele ?? '?'} m, ${Math.round(dist(best) / 1000)} km od przybliżonego`
    if (!byEle[0]) problems.push(`${name}: wysokość się nie zgadza, wzięty najbliższy: ${note}`)
    else if (dist(best) > 10000) problems.push(`${name}: daleko od przybliżonego, sprawdź: ${note}`)
    if (byEle.length > 1) problems.push(`${name}: ${byEle.length} kandydatów z tą wysokością, wzięty najbliższy (${note})`)
  }
  peaks.push(point)
}

mkdirSync('src/data', { recursive: true })
writeFileSync('src/data/peaks-diadem.json', JSON.stringify(peaks, null, 2) + '\n')
console.log(`Dokładne położenie z OSM: ${peaks.filter((p) => p.osmId).length} z ${peaks.length} szczytów.`)
if (problems.length) console.log('Do sprawdzenia:\n- ' + problems.join('\n- '))
printJson('DIADEM', peaks)
