import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import './Login.css'

const API_BASE = process.env.REACT_APP_API_BASE || 'http://localhost:8000'

export default function Login() {
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const navigate = useNavigate()

  const validateLogin = async () => {
    setError('')
    if (!password.trim()) {
      setError('Veuillez entrer le mot de passe.')
      return
    }

    try {
      const res = await fetch(`${API_BASE}/api/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password })
      })
      if (!res.ok) {
        throw new Error("Erreur réseau");
      }
      const json = await res.json()
      if (json.status === 'ok') {
        sessionStorage.setItem('admin_password', 'valide')
        localStorage.setItem('API_BASE', API_BASE)
        localStorage.setItem('sessionStart', Date.now())
        navigate('/index')
      } else {
        setError('Mot de passe incorrect.')
      }
    } catch (err) {
      console.error(err)
      setError('Erreur de connexion au serveur.')
    }
  }

  return (
    <div className="login-page">
      <div className="splash">
        <img src={`${process.env.PUBLIC_URL}/static/Baobab_blanc.png`} alt="Baobab Banque" />
      </div>
      <div className="login-container">
        <img src={`${process.env.PUBLIC_URL}/static/Baobab_blanc.png`} alt="Baobab Banque" />
        <h2>🔐 Connexion Admin</h2>
        <input
          type="password"
          placeholder="Mot de passe admin"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        <button onClick={validateLogin}>Connexion</button>
        <div className="error">{error}</div>
      </div>
    </div>
  )
}
