import { Link, useLocation } from 'react-router-dom'
import './Sidebar.css'

export default function Sidebar() {
  const location = useLocation()

  return (
    <aside className="sidebar">
      <nav>
        <ul>
          <li className={location.pathname === '/' ? 'active' : ''}>
            <Link to="/">
              <span className="icon">🏠</span>
              <span className="label">Home</span>
            </Link>
          </li>
          <li className={location.pathname === '/list' ? 'active' : ''}>
            <Link to="/list">
              <span className="icon">📋</span>
              <span className="label">Liste des Employés</span>
            </Link>
          </li>
        </ul>
      </nav>
    </aside>
  )
}
