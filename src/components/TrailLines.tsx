import L from 'leaflet'
import { useMemo } from 'react'
import { Polyline } from 'react-leaflet'
import { TRAIL_COLORS, type Graph } from '../routing'

// Wszystkie szlaki jako cienkie kolorowe linie. Odcinek, którym idzie kilka szlaków
// (np. czerwony i niebieski), rysujemy pierwszym kolorem, a drugi kreskami na wierzchu.
// Odcinków są tysiące, więc łączymy je w jedną linię na kolor i rysujemy na płótnie
// (canvas) zamiast osobnego elementu SVG dla każdego odcinka. Dzięki temu mapa nie muli.
export default function TrailLines({ graph, faded = false }: { graph: Graph; faded?: boolean }) {
  const renderer = useMemo(() => L.canvas({ padding: 0.5 }), [])
  const layers = useMemo(() => {
    const { nodes, edges } = graph.data
    const solid: Record<string, [number, number][][]> = {}
    const dashed: Record<string, [number, number][][]> = {}
    for (const e of edges) {
      const line = e.n.map((k) => [nodes[k][0], nodes[k][1]] as [number, number])
      const [first, second] = e.c
      ;(solid[first] ??= []).push(line)
      if (second) (dashed[second] ??= []).push(line)
    }
    return { solid, dashed }
  }, [graph])
  const opacity = faded ? 0.35 : 0.8
  return (
    <>
      {Object.entries(layers.solid).map(([c, lines]) => (
        <Polyline key={c} positions={lines} interactive={false} pathOptions={{ renderer, color: TRAIL_COLORS[c].hex, weight: 3, opacity }} />
      ))}
      {Object.entries(layers.dashed).map(([c, lines]) => (
        <Polyline
          key={'-' + c}
          positions={lines}
          interactive={false}
          pathOptions={{ renderer, color: TRAIL_COLORS[c].hex, weight: 3, opacity, dashArray: '6 8' }}
        />
      ))}
    </>
  )
}
