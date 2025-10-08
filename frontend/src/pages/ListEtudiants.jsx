import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import './ListEtudiants.css'

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:8000'
const INACTIVITY_LIMIT = 30 * 60 * 1000 // 30 minutes

export default function ListEtudiants() {
  const navigate = useNavigate()
  const [students, setStudents] = useState([])
  const [searchTerm, setSearchTerm] = useState('')
  const [classFilter, setClassFilter] = useState('')
  const [lastActivity, setLastActivity] = useState(Date.now())

  useEffect(() => {
    if (!sessionStorage.getItem('admin_password')) navigate('/login')
    loadStudents()
    const interval = setInterval(checkInactivity, 60000)
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    const resetTimer = () => setLastActivity(Date.now())
    ['click', 'mousemove', 'keydown', 'touchstart'].forEach(evt =>
      document.addEventListener(evt, resetTimer)
    )
    return () => {
      ['click', 'mousemove', 'keydown', 'touchstart'].forEach(evt =>
        document.removeEventListener(evt, resetTimer)
      )
    }
  }, [])

  const checkInactivity = () => {
    if (Date.now() - lastActivity > INACTIVITY_LIMIT) {
      alert('Session expirée. Veuillez vous reconnecter.')
      logout()
    }
  }

  const logout = () => {
    sessionStorage.removeItem('admin_password')
    navigate('/login')
  }

  const loadStudents = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/students/full`)
      const json = await res.json()
      setStudents(json.data || [])
    } catch (err) {
      alert('Erreur de chargement : ' + err)
    }
  }

  const filteredStudents = students.filter((stu) => {
    const matchesSearch =
      stu.Matricule.toString().includes(searchTerm) ||
      stu.Nom.toLowerCase().includes(searchTerm) ||
      stu.Prenom.toLowerCase().includes(searchTerm)
    const matchesClass = classFilter === '' || stu.Emploi === classFilter
    return matchesSearch && matchesClass
  })

  return (
    <div className="list-page">
      <div className="top-bar">
        <button className="back-btn" onClick={() => navigate('/index')}>← Retour</button>
        <div className="content1">
          <img src="/static/Baobab.png" alt="Baobab Banque" />
        </div>
        <button className="logout-btn" onClick={logout}>🔓 Déconnexion</button>
      </div>

      <div className="main-content fade-in-up">
        <h1>📋 Liste des Employés</h1>

        <div className="filters">
          <input
            type="text"
            placeholder="🔍 Rechercher par nom ou Matricule"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value.toLowerCase())}
          />
          <select value={classFilter} onChange={(e) => setClassFilter(e.target.value)}>
            <option value="">Toutes les postes</option>
            {[...new Set(students.map((s) => s.Emploi))].sort().map((cl) => (
              <option key={cl} value={cl}>{cl}</option>
            ))}
          </select>
          <button onClick={loadStudents}>🔄 Rafraîchir</button>
        </div>

        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>Matricule</th>
                <th>Nom</th>
                <th>Prénom</th>
                <th>Emploi</th>
                <th>Affectation</th>
                <th>Numéro Téléphone</th>
                <th>Mail</th>
              </tr>
            </thead>
            <tbody>
              {filteredStudents.length === 0 ? (
                <tr><td colSpan="7">Aucun employé trouvé</td></tr>
              ) : (
                filteredStudents.map((stu) => (
                  <tr key={stu.Matricule}>
                    <td>{stu.Matricule}</td>
                    <td>{stu.Nom}</td>
                    <td>{stu.Prenom}</td>
                    <td>{stu.Emploi}</td>
                    <td>{stu.Affectation}</td>
                    <td>{stu.Numero}</td>
                    <td>{stu.Mail}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
