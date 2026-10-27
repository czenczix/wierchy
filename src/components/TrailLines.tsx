import { Fragment } from 'react'
import { Polyline } from 'react-leaflet'
import { TRAIL_COLORS, type Graph } from '../routing'

// Wszystkie szlaki jako cienkie kolorowe linie. Odcinek, którym idzie kilka szlaków
// (np. czerwony i niebieski), rysujemy pierwszym kolorem, a drugi kreskami na wierzchu.
export default function TrailLines({ graph, faded = false }: { graph: Graph; faded?: boolean }) {
  const { nodes, edges } = graph.data
  return (
    <>
      {edges.map((e, i) => {
        const line = e.n.map((k) => [nodes[k][0], nodes[k][1]] as [number, number])
        const [first, second] = e.c
        return (
          <Fragment key={i}>
            <Polyline
              positions={line}
              interactive={false}
              pathOptions={{ color: TRAIL_COLORS[first].hex, weight: 3, opacity: faded ? 0.35 : 0.8 }}
            />
            {second && (
              <Polyline
                positions={line}
                interactive={false}
                pathOptions={{ color: TRAIL_COLORS[second].hex, weight: 3, opacity: faded ? 0.35 : 0.8, dashArray: '6 8' }}
              />
            )}
          </Fragment>
        )
      })}
    </>
  )
}
