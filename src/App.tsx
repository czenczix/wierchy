import { Route, Routes } from 'react-router-dom'
import OfflineBanner from './components/OfflineBanner'
import TabBar from './components/TabBar'
import CrownPage from './pages/CrownPage'
import ListPage from './pages/ListPage'
import MapPage from './pages/MapPage'
import PeakPage from './pages/PeakPage'
import ProgressPage from './pages/ProgressPage'
import RoutePage from './pages/RoutePage'

// Układ całej apki: treść ekranu na górze, pasek zakładek na dole.
// <Routes> wybiera, który ekran pokazać na podstawie adresu.
export default function App() {
  return (
    <div className="app">
      <OfflineBanner />
      <main className="screen">
        <Routes>
          <Route path="/" element={<ListPage />} />
          <Route path="/korona" element={<CrownPage />} />
          <Route path="/mapa" element={<MapPage />} />
          <Route path="/postep" element={<ProgressPage />} />
          <Route path="/trasa" element={<RoutePage />} />
          <Route path="/szczyt/:id" element={<PeakPage />} />
        </Routes>
      </main>
      <TabBar />
    </div>
  )
}
