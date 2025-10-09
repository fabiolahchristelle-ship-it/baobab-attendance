import { Link, useLocation } from 'react-router-dom'
import './Sidebar.css'

export default function Sidebar() {
  const location = useLocation()

  return (
    <aside className="sidebar">
      <nav>
        <ul>
          <li className={location.pathname === '/Index' ? 'active' : ''}>
            <Link to="/Index">
              <span className="icon">🏠</span>
              <span className="label">Home</span>
            </Link>
          </li>
          <li className={location.pathname === '/ListEtudiants' ? 'active' : ''}>
            <Link to="/ListEtudiants">
              <span className="icon">📋</span>
              <span className="label">Liste des Employés</span>
            </Link>
          </li>
        </ul>
      </nav>
    </aside>
  )
}
