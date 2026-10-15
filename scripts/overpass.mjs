// Wspólne narzędzia dla skryptów pobierających punkty z OpenStreetMap (Overpass API).

// Publiczne serwery Overpass bywają przeciążone, więc próbujemy kilku po kolei.
const SERVERS = [
  'https://overpass-api.de/api/interpreter',
  'https://overpass.private.coffee/api/interpreter',
  'https://overpass.kumi.systems/api/interpreter',
]

/** Wysyła zapytanie Overpass i zwraca listę znalezionych elementów. */
export async function runQuery(query) {
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

/** Wszystkie nazwy, pod którymi punkt występuje w OSM. */
export const namesOf = (n) =>
  [n.tags.name, n.tags['name:pl'], n.tags.alt_name, n.tags.official_name].filter(Boolean)

/** Odległość w metrach między dwoma punktami (wzór haversine). */
export function distanceM(lat1, lon1, lat2, lon2) {
  const rad = (d) => (d * Math.PI) / 180
  const a =
    Math.sin(rad(lat2 - lat1) / 2) ** 2 +
    Math.cos(rad(lat1)) * Math.cos(rad(lat2)) * Math.sin(rad(lon2 - lon1) / 2) ** 2
  return 2 * 6371000 * Math.asin(Math.sqrt(a))
}

/** Wypisuje wynik w logu między znacznikami, żeby dało się go skopiować z GitHub Actions. */
export function printJson(tag, data) {
  console.log(`${tag}_JSON_START`)
  console.log(JSON.stringify(data))
  console.log(`${tag}_JSON_END`)
}
