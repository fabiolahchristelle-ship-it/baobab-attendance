import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import './Login.css'

const API_BASE = process.env.REACT_APP_API_BASE || 'http://localhost:8000'

export default function Login() {
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const navigate = useNavigate()

  const validateLogin = async () => {
    alert("🔍 Bouton cliqué !");
    console.log("Tentative de connexion...");
    console.log("Mot de passe:", password);
    console.log("API:", `${API_BASE}/api/login`);
    setError('')

    if (!password.trim()) {
      alert("⚠️ Mot de passe vide !");
      setError('Veuillez entrer le mot de passe.')
      return
    }

    try {
      alert("📤 Envoi vers API...");
      const res = await fetch(`${API_BASE}/api/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password })
      })

      alert("📡 Statut HTTP: " + res.status)

      if (!res.ok) {
        if (res.status === 401) {
          alert("❌ Mot de passe incorrect !");
          setError('Mot de passe incorrect.')
        } else {
          alert("❌ Erreur serveur: " + res.status)
          setError(`Erreur serveur (${res.status})`)
        }
        return
      }

      const json = await res.json()
      alert("📥 Réponse reçue: " + JSON.stringify(json))
      console.log("Réponse backend:", json)

      if (json.status === 'ok') {
        sessionStorage.setItem('admin_password', 'valide')
        localStorage.setItem('API_BASE', API_BASE)
        localStorage.setItem('sessionStart', Date.now())
        alert("✅ Connexion réussie ! Redirection...")
        navigate('/index')
      } else {
        alert("❓ Réponse inattendue du serveur.")
        setError('Réponse inattendue du serveur.')
      }
    } catch (err) {
      alert("❌ Erreur réseau: " + err.message)
      console.error("Erreur réseau:", err)
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
