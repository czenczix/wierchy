import { NavLink } from 'react-router-dom'

// NavLink to link, który sam wie, czy jego ekran jest aktywny,
// i dodaje wtedy klasę "active" (podświetlenie zakładki).
const tabs = [
  { to: '/', label: 'Tatry', icon: '⛰️' },
  { to: '/korona', label: 'Korona', icon: '👑' },
  { to: '/mapa', label: 'Mapa', icon: '🗺️' },
  { to: '/postep', label: 'Postęp', icon: '🏅' },
]

export default function TabBar() {
  return (
    <nav className="tabbar">
      {tabs.map((tab) => (
        <NavLink key={tab.to} to={tab.to} end className="tab">
          <span className="tab-icon" aria-hidden="true">{tab.icon}</span>
          <span>{tab.label}</span>
        </NavLink>
      ))}
    </nav>
  )
}
