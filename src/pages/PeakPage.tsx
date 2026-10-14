import { Link, useParams } from 'react-router-dom'

// useParams odczytuje zmienną część adresu: dla /szczyt/rysy zwraca { id: 'rysy' }.
export default function PeakPage() {
  const { id } = useParams()
  return (
    <section>
      <Link to="/" className="back">← Szczyty</Link>
      <h1>Szczyt: {id}</h1>
      <p className="muted">Tu będzie karta szczytu i formularz zdobycia (kroki 3 i 5).</p>
    </section>
  )
}
