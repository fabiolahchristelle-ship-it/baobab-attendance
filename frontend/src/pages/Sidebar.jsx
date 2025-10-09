import { Link, useLocation } from 'react-router-dom'
import './Sidebar.css'

export default function Sidebar() {
  const location = useLocation()

  return (
    <aside className="sidebar">
      <nav>
        <ul>
          <li className={location.pathname === '/' ? 'active' : ''}>
            <Link to="/">🏠 Home</Link>
          </li>
          <li className={location.pathname === '/list' ? 'active' : ''}>
            <Link to="/list">📋 Liste des Employés</Link>
          </li>
        </ul>
      </nav>
    </aside>
  )
}
