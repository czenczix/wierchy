import { distanceM } from './geo'

// Wyznaczanie trasy po szlakach. Wszystko liczy się w telefonie, bez internetu.
//
// Sieć szlaków to graf: punkty (z wysokością) połączone krótkimi odcinkami.
// Szukamy najszybszej drogi algorytmem Dijkstry: od startu rozchodzimy się po sąsiadach,
// zawsze rozwijając punkt, do którego dotarliśmy najszybciej, aż trafimy do celu.

export type TrailData = {
  nodes: [number, number, number][] // [szerokość, długość, wysokość]
  edges: { n: number[]; c: string }[] // n: kolejne punkty, c: kolory (r b g y k)
  starts: { id: string; name: string; node: number; kind: 'start' | 'hut' }[]
  source: string
  fetched: string
}

/** Kolory szlaków: skrót z pliku -> nazwa i kolor na mapie. */
export const TRAIL_COLORS: Record<string, { name: string; hex: string }> = {
  r: { name: 'czerwony', hex: '#d6262b' },
  b: { name: 'niebieski', hex: '#1f6fd1' },
  g: { name: 'zielony', hex: '#1d9a48' },
  y: { name: 'żółty', hex: '#e8b800' },
  k: { name: 'czarny', hex: '#222222' },
}

const ORDER = 'rbgyk'

type Arc = { to: number; edge: number; dist: number; up: number; down: number; time: number }

export type Graph = { data: TrailData; arcs: Arc[][] }

/**
 * Czas przejścia odcinka wg normy DIN 33466 (używanej też na szlakowskazach w Alpach):
 * 4 km/h po płaskim, 300 m/h w górę, 500 m/h w dół; dłuższa część liczy się w całości,
 * krótsza w połowie. Wynik w godzinach.
 */
export function hikingHours(dist: number, up: number, down: number): number {
  const h = dist / 4000
  const v = up / 300 + down / 500
  return Math.max(h, v) + Math.min(h, v) / 2
}

/** Zamienia plik ze szlakami na listę sąsiadów dla każdego punktu (w obie strony). */
export function buildGraph(data: TrailData): Graph {
  const arcs: Arc[][] = data.nodes.map(() => [])
  data.edges.forEach((e, edge) => {
    for (let i = 1; i < e.n.length; i++) {
      const [a, b] = [e.n[i - 1], e.n[i]]
      const [pa, pb] = [data.nodes[a], data.nodes[b]]
      const dist = distanceM(pa[0], pa[1], pb[0], pb[1])
      const climb = pb[2] - pa[2]
      const up = Math.max(0, climb)
      const down = Math.max(0, -climb)
      arcs[a].push({ to: b, edge, dist, up, down, time: hikingHours(dist, up, down) })
      arcs[b].push({ to: a, edge, dist, up: down, down: up, time: hikingHours(dist, down, up) })
    }
  })
  return { data, arcs }
}

/** Najbliższy punkt sieci szlaków i odległość do niego w metrach. */
export function nearestNode(g: Graph, lat: number, lon: number): { node: number; dist: number } {
  let node = -1
  let dist = Infinity
  g.data.nodes.forEach((p, i) => {
    const d = distanceM(lat, lon, p[0], p[1])
    if (d < dist) [node, dist] = [i, d]
  })
  return { node, dist }
}

/** Fragment trasy idący jednym szlakiem (tym samym kolorem). */
export type Leg = { colors: string; nodes: number[]; dist: number; up: number; down: number; time: number }

export type Route = { nodes: number[]; legs: Leg[]; dist: number; up: number; down: number; time: number }

/** Algorytm Dijkstry: najszybsza trasa z punktu from do punktu to. */
export function findRoute(g: Graph, from: number, to: number): Route | null {
  const n = g.data.nodes.length
  const best = new Float64Array(n).fill(Infinity)
  const prev = new Int32Array(n).fill(-1)
  const prevArc: (Arc | null)[] = new Array(n).fill(null)
  best[from] = 0
  const heap = new MinHeap()
  heap.push(from, 0)

  while (heap.size) {
    const [u, t] = heap.pop()
    if (t > best[u]) continue // ten wpis jest nieaktualny, mamy już lepszy czas
    if (u === to) break
    for (const arc of g.arcs[u]) {
      const nt = t + arc.time
      if (nt < best[arc.to]) {
        best[arc.to] = nt
        prev[arc.to] = u
        prevArc[arc.to] = arc
        heap.push(arc.to, nt)
      }
    }
  }
  if (best[to] === Infinity) return null

  // Odtwarzamy trasę od końca i sklejamy kolejne odcinki tego samego szlaku w "etapy".
  const path: number[] = []
  const pathArcs: Arc[] = []
  for (let v = to; v !== -1; v = prev[v]) {
    path.push(v)
    if (prevArc[v]) pathArcs.push(prevArc[v]!)
  }
  path.reverse()
  pathArcs.reverse()

  // Etap trwa, dopóki idziemy choć jednym wspólnym szlakiem. Np. odcinki "czerwony",
  // "czerwony + niebieski", "czerwony" to jeden etap czerwonym szlakiem.
  const legs: Leg[] = []
  pathArcs.forEach((arc, i) => {
    const colors = g.data.edges[arc.edge].c
    let leg = legs[legs.length - 1]
    const shared = leg ? [...leg.colors].filter((c) => colors.includes(c)).join('') : ''
    if (!leg || !shared) {
      leg = { colors, nodes: [path[i]], dist: 0, up: 0, down: 0, time: 0 }
      legs.push(leg)
    } else {
      leg.colors = shared
    }
    leg.nodes.push(arc.to)
    leg.dist += arc.dist
    leg.up += arc.up
    leg.down += arc.down
    leg.time += arc.time
  })
  const sum = (k: 'dist' | 'up' | 'down' | 'time') => legs.reduce((s, l) => s + l[k], 0)
  return { nodes: path, legs, dist: sum('dist'), up: sum('up'), down: sum('down'), time: sum('time') }
}

/** "3 h 15 min" z liczby godzin, zaokrąglone do 5 minut jak na szlakowskazach. */
export function formatHours(h: number): string {
  const total = Math.max(5, Math.round((h * 60) / 5) * 5)
  const hours = Math.floor(total / 60)
  const min = total % 60
  if (!hours) return `${min} min`
  return min ? `${hours} h ${min} min` : `${hours} h`
}

/** Kopiec binarny: szybko oddaje element o najmniejszym czasie. */
class MinHeap {
  private items: [number, number][] = []
  get size() {
    return this.items.length
  }
  push(node: number, t: number) {
    const a = this.items
    a.push([node, t])
    let i = a.length - 1
    while (i > 0) {
      const p = (i - 1) >> 1
      if (a[p][1] <= a[i][1]) break
      ;[a[p], a[i]] = [a[i], a[p]]
      i = p
    }
  }
  pop(): [number, number] {
    const a = this.items
    const top = a[0]
    const last = a.pop()!
    if (a.length) {
      a[0] = last
      let i = 0
      for (;;) {
        const [l, r] = [2 * i + 1, 2 * i + 2]
        let m = i
        if (l < a.length && a[l][1] < a[m][1]) m = l
        if (r < a.length && a[r][1] < a[m][1]) m = r
        if (m === i) break
        ;[a[m], a[i]] = [a[i], a[m]]
        i = m
      }
    }
    return top
  }
}

// Plik ze szlakami jest duży, więc ładujemy go dopiero, gdy jest potrzebny (osobny plik JS),
// i tylko raz na całe działanie apki.
let graphPromise: Promise<Graph> | null = null
export function loadGraph(): Promise<Graph> {
  graphPromise ??= import('./data/trails.json').then((m) => {
    const data = m.default as unknown as TrailData
    // Kolory zawsze w tej samej kolejności, żeby "bg" i "gb" znaczyły to samo.
    for (const e of data.edges) e.c = [...e.c].sort((a, b) => ORDER.indexOf(a) - ORDER.indexOf(b)).join('')
    return buildGraph(data)
  })
  return graphPromise
}
