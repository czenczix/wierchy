import { Route, Routes } from 'react-router-dom'
import TabBar from './components/TabBar'
import ListPage from './pages/ListPage'
import MapPage from './pages/MapPage'
import PeakPage from './pages/PeakPage'
import ProgressPage from './pages/ProgressPage'

// Układ całej apki: treść ekranu na górze, pasek zakładek na dole.
// <Routes> wybiera, który ekran pokazać na podstawie adresu.
export default function App() {
  return (
    <div className="app">
      <main className="screen">
        <Routes>
          <Route path="/" element={<ListPage />} />
          <Route path="/mapa" element={<MapPage />} />
          <Route path="/postep" element={<ProgressPage />} />
          <Route path="/szczyt/:id" element={<PeakPage />} />
        </Routes>
      </main>
      <TabBar />
    </div>
  )
}
