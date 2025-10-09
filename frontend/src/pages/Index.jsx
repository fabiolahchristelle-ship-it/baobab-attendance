import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Html5Qrcode } from 'html5-qrcode'
import SHA256 from 'crypto-js/sha256'
import './Index.css'

const API_BASE = process.env.REACT_APP_API_BASE || 'http://localhost:8000'

export default function Index() {
  const navigate = useNavigate()
  const [students, setStudents] = useState([])
  const [searchTerm, setSearchTerm] = useState('')
  const [classFilter, setClassFilter] = useState('')
  const [timezone, setTimezone] = useState('Etc/GMT-3')
  const [clock, setClock] = useState({ time: '', date: '', label: '' })
  const [lastScan, setLastScan] = useState('')
  const [scanTimeout, setScanTimeout] = useState(null)

  useEffect(() => {
    if (!sessionStorage.getItem('admin_password')) navigate('/login')
  }, [])

  useEffect(() => {
    loadStudents()
    updateClock()
    const interval = setInterval(updateClock, 1000)
    return () => clearInterval(interval)
  }, [timezone])

  const updateClock = () => {
    const now = new Date()
    const timeStr = now.toLocaleTimeString('fr-FR', { timeZone: timezone, hour12: false })
    const dateStr = now.toLocaleDateString('fr-FR', {
      timeZone: timezone,
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
    const label = timezone.replace('Etc/', '')
    setClock({ time: timeStr, date: dateStr, label })
  }

  const populateTimezoneSelector = () => {
    const options = []
    for (let offset = -12; offset <= 12; offset++) {
      const label = offset >= 0 ? `GMT+${offset}` : `GMT${offset}`
      const value = offset === 0 ? 'Etc/GMT-3' : offset > 0 ? `Etc/GMT-${offset}` : `Etc/GMT+${-offset}`
      options.push({ label, value })
    }
    return options
  }

  const formatToLocalTime = (utcString) => {
    if (!utcString) return ''
    try {
      const utcDate = new Date(utcString + 'Z')
      return utcDate.toLocaleString('fr-FR', {
        timeZone: timezone,
        hour12: false,
        timeZoneName: 'short'
      })
    } catch {
      return utcString
    }
  }

  const loadStudents = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/students`)
      const json = await res.json()
      console.log("📦 Étudiants reçus :", json.data)
      setStudents(json.data || [])
      console.log("📦 Exemple étudiant :", json.data[0])
    } catch (err) {
      alert('Erreur : ' + err)
    }
  }

  const resetPresence = async () => {
    const pwd = prompt('🔐 Entrez le mot de passe admin')
    if (!pwd) return
    try {
      const res = await fetch(`${API_BASE}/api/reset_presence`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: pwd })
      })
      const json = await res.json()
      if (json.status === 'ok') {
        alert('✅ ' + json.message)
        loadStudents()
      } else {
        alert('❌ ' + (json.message || 'Erreur inconnue'))
      }
    } catch (e) {
      alert('❌ Erreur réseau : ' + e.message)
    }
  }

  const resetEntryExit = async () => {
    if (!confirm('Réinitialiser toutes les entrées et sorties ?')) return
    try {
      const res = await fetch(`${API_BASE}/api/reset_entry_exit`, { method: 'POST' })
      const json = await res.json()
      if (json.status === 'ok') {
        alert('✅ ' + json.message)
        loadStudents()
      } else {
        alert('❌ ' + (json.message || 'Erreur inconnue'))
      }
    } catch (err) {
      alert('Erreur réseau : ' + err.message)
    }
  }

  const logout = () => {
    sessionStorage.removeItem('admin_password')
    navigate('/login')
  }

  const startScanner = async () => {
    const reader = document.getElementById('qr-reader')
    reader.innerHTML = ''
    reader.style.display = 'block'
    const qr = new Html5Qrcode('qr-reader')
    await qr.start(
      { facingMode: 'environment' },
      { fps: 10, qrbox: 350 },
      (decodedText) => {
        if (decodedText === lastScan) return
        setLastScan(decodedText)
        clearTimeout(scanTimeout)
        const timeout = setTimeout(() => {
          qr.stop().then(() => {
            reader.style.display = 'none'
            handleScan(decodedText)
          })
        }, 2000)
        setScanTimeout(timeout)
      },
      (err) => console.warn('Erreur scan :', err)
    )
  }

  const handleScan = async (decodedText) => {
    const parts = decodedText.split(';')
    const p = parts.find((p) => p.trim().toLowerCase().startsWith('matricule:'))
    if (!p) return alert('❌ QR invalide : Matricule non trouvé')
    const rawMatricule = p.split(':')[1]?.trim()
    if (!rawMatricule) return alert('❌ Matricule vide ou non détecté')
  
    const studentId = SHA256(rawMatricule).toString()
  
    try {
      const res = await fetch(`${API_BASE}/api/mark_presence/${studentId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ timezone })
      })
      const json = await res.json()
  
      if (json.status === 'ok') {
        alert(`✅ Entrée : ${formatToLocalTime(json.entry_time)}\nSortie : ${formatToLocalTime(json.exit_time)}`)
  
        // ⏱️ Attendre 500ms avant de recharger les données
        setTimeout(() => {
          loadStudents()
        }, 500)
      } else {
        alert('❌ Erreur API : ' + (json.message || 'Réponse inconnue'))
      }
    } catch (err) {
      alert('❌ Erreur réseau : ' + err.message)
    }
  }

  
  const filteredStudents = students.filter((s) => {
    const matchText =
      s.Matricule.toString().includes(searchTerm) ||
      s.Nom.toLowerCase().includes(searchTerm) ||
      s.Prenom.toLowerCase().includes(searchTerm)
    const matchCls = !classFilter || s.Emploi === classFilter
    return matchText && matchCls
  })

  return (
    <div className="index-page">
      <header>📷 Application de Présence QR</header>

      <div className="controls">
        <button onClick={startScanner}>📷 Scanner QR</button>
        <button onClick={loadStudents}>🔄 Rafraîchir</button>
        <button onClick={resetPresence}>♻️ Réinitialiser</button>
        <button onClick={resetEntryExit}>🧹 Réinit Entrée/Sortie</button>
        <button onClick={logout}>🔓 Déconnexion</button>
      </div>

      <div className="filters">
        <input
          type="text"
          placeholder="🔍 Rechercher…"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value.toLowerCase())}
        />
        <select value={classFilter} onChange={(e) => setClassFilter(e.target.value)}>
          <option value="">Toutes les postes</option>
          {[...new Set(students.map((s) => s.Emploi))].sort().map((cl) => (
            <option key={cl} value={cl}>{cl}</option>
          ))}
        </select>
        <select value={timezone} onChange={(e) => setTimezone(e.target.value)}>
          {populateTimezoneSelector().map((tz) => (
            <option key={tz.value} value={tz.value}>{tz.label}</option>
          ))}
        </select>
      </div>

      <div id="qr-reader" style={{ display: 'none' }}>
        <div className="qr-overlay"></div>
      </div>

      <div className="clock">
        <div className="pulse-time">{clock.time}</div>
        <div className="date-style">{clock.date}</div>
        <div className="tz-style">🕒 Fuseau horaire : {clock.label}</div>
      </div>

      <div className="table-container">
        <table>
          <thead>
            <tr>
              <th>MATRICULE</th>
              <th>NOM</th>
              <th>PRENOM(S)</th>
              <th>EMPLOI</th>
              <th>Présence</th>
              <th>Entrée</th>
              <th>Sortie</th>
              <th>HS (h:m)</th>
              <th>Montant HS</th>
              <th>Total HS</th>
              <th>Total Montant</th>
              <th>Logs</th>
              <th>Fuseau</th>
            </tr>
          </thead>
          <tbody>
            {filteredStudents.length === 0 ? (
              <tr><td colSpan="13">Aucun employé trouvé</td></tr>
            ) : (
              filteredStudents.map((stu) => {
                const today = new Date().toISOString().slice(0, 10)
                const entryDate = stu.entry_time?.slice(0, 10)
                const presence = entryDate === today ? 'Présent' : 'Absent'
                const dailyHS = stu.entry_time && stu.exit_time ? stu.daily_overtime || 'Sans Heure Sup' : 'Sans Heure Sup'
                const dailyAmount = stu.entry_time && stu.exit_time ? stu.daily_amount || 'Sans Heure Sup' : 'Sans Heure Sup'
                const totalHS = stu.overtime || '0H00'
                const montantAffiche = stu.overtime_amount > 0 ? `${stu.overtime_amount.toLocaleString('fr-FR')} Ar` : '0 Ar'

                return (
                  <tr key={stu.Matricule}>
                    <td>{stu.Matricule}</td>
                    <td>{stu.Nom}</td>
                    <td>{stu.Prenom}</td>
                    <td>{stu.Emploi}</td>
                    <td>{presence}</td>
                    <td>{formatToLocalTime(stu.entry_time)}</td>
                    <td>{formatToLocalTime(stu.exit_time)}</td>
                    <td>{dailyHS}</td>
                    <td>{dailyAmount}</td>
                    <td>{totalHS}</td>
                    <td>{montantAffiche}</td>
                    <td>
                      <button className="action-btn" onClick={() => navigate(`/logs?id=${stu.Matricule}`)}>
                        📄 Voir logs
                      </button>
                    </td>
                    <td>🕒 {clock.label}</td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
