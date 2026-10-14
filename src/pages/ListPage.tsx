import { Link } from 'react-router-dom'

// Tymczasowo dwa przykładowe szczyty. W kroku 2 zastąpi je plik peaks.json.
export default function ListPage() {
  return (
    <section>
      <h1>Szczyty</h1>
      <p className="muted">Tu będzie lista wszystkich szczytów z postępem.</p>
      <ul className="list">
        <li><Link to="/szczyt/rysy">Rysy</Link></li>
        <li><Link to="/szczyt/giewont">Giewont</Link></li>
      </ul>
    </section>
  )
}
