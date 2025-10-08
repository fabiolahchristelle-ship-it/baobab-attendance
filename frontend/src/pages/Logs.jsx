import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import html2canvas from 'html2canvas'
import jsPDF from 'jspdf'
import './Logs.css'

const API_BASE = process.env.REACT_APP_API_BASE || 'http://localhost:8000'

export default function Logs() {
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const studentId = params.get('id')
  const [logs, setLogs] = useState([])
  const [timezone, setTimezone] = useState('Etc/GMT-3')
  const [title, setTitle] = useState('')
  const [stats, setStats] = useState({ count: 0, totalHS: '0H00', totalAmount: '0 Ar' })

  useEffect(() => {
    if (!sessionStorage.getItem('admin_password')) navigate('/login')
    if (!studentId) navigate('/login')
    loadLogs()
  }, [timezone])

  const logout = () => {
    sessionStorage.removeItem('admin_password')
    navigate('/login')
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
      const iso = utcString.replace(' ', 'T') + 'Z'
      const dt = new Date(iso)
      return dt.toLocaleString('fr-FR', {
        timeZone: timezone,
        hour12: false,
        timeZoneName: 'short'
      })
    } catch {
      return utcString
    }
  }

  const loadLogs = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/logs/${studentId}`)
      const json = await res.json()
      const data = json.data || []
      setLogs(data)

      if (data.length) {
        setTitle(`📋 Historique de présence – ${data[0].Nom} ${data[0].Prenom}`)
      } else {
        setTitle(`📋 Historique de présence – ID ${studentId}`)
      }

      let totalMinutes = 0
      let totalAmount = 0
      data.forEach(log => {
        if (log.overtime) {
          const [h, m] = log.overtime.replace('H', ':').split(':').map(v => parseInt(v) || 0)
          totalMinutes += h * 60 + m
        }
        totalAmount += log.overtime_amount || 0
      })

      const hTot = Math.floor(totalMinutes / 60)
      const mTot = totalMinutes % 60
      setStats({
        count: data.length,
        totalHS: `${hTot}H${mTot.toString().padStart(2, '0')}`,
        totalAmount: `${totalAmount.toLocaleString('fr-FR')} Ar`
      })
    } catch (err) {
      alert('Erreur chargement logs : ' + err)
    }
  }

  const downloadAsPDF = async () => {
    const pdf = new jsPDF('p', 'mm', 'a4')
    const tableElem = document.querySelector('.table-container')
    const statsElem = document.getElementById('statsContainer')

    const canvasTable = await html2canvas(tableElem, { scale: 2 })
    const canvasStats = await html2canvas(statsElem, { scale: 2 })

    const imgTable = canvasTable.toDataURL('image/jpeg', 1.0)
    const imgStats = canvasStats.toDataURL('image/jpeg', 1.0)

    const pageWidth = pdf.internal.pageSize.getWidth()
    const tableHeight = (canvasTable.height * pageWidth) / canvasTable.width
    const statsHeight = (canvasStats.height * pageWidth) / canvasStats.width

    pdf.addImage(imgTable, 'JPEG', 0, 10, pageWidth, tableHeight)
    pdf.addPage()
    pdf.addImage(imgStats, 'JPEG', 0, 10, pageWidth, statsHeight)

    pdf.save(`logs_${studentId}.pdf`)
  }

  return (
    <div className="logs-page">
      <div className="top-bar">
        <button className="back-btn" onClick={() => navigate('/index')}>← Retour</button>
        <div className="content1">
          <img src={`${process.env.PUBLIC_URL}/static/Baobab.png`} alt="Baobab Banque" />
        </div>
        <button className="logout-btn" onClick={logout}>🔓 Déconnexion</button>
      </div>

      <div className="main-content fade-in-up">
        <h2>{title}</h2>

        <div style={{ textAlign: 'center' }}>
          <button onClick={downloadAsPDF} className="print-btn">📄 Télécharger PDF</button>
        </div>

        <div style={{ textAlign: 'center' }}>
          <label htmlFor="timezoneSelector" className="fuseauH">Fuseau horaire :</label>
          <select id="timezoneSelector" value={timezone} onChange={(e) => setTimezone(e.target.value)}>
            {populateTimezoneSelector().map((tz) => (
              <option key={tz.value} value={tz.value}>{tz.label}</option>
            ))}
          </select>
        </div>

        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>Matricule</th>
                <th>Nom</th>
                <th>Prénom</th>
                <th>Emploi</th>
                <th>Entrée</th>
                <th>Sortie</th>
              </tr>
            </thead>
            <tbody>
              {logs.length === 0 ? (
                <tr><td colSpan="6">Aucun log trouvé</td></tr>
              ) : (
                logs.map((log, i) => (
                  <tr key={i}>
                    <td>{log.Matricule}</td>
                    <td>{log.Nom}</td>
                    <td>{log.Prenom}</td>
                    <td>{log.Emploi}</td>
                    <td>{formatToLocalTime(log.entry_time)}</td>
                    <td>{formatToLocalTime(log.exit_time)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div id="statsContainer">
          <h3>📊 Statistiques de présence</h3>
          <p>Présences enregistrées : {stats.count}</p>
          <p>Total HS cumulées : {stats.totalHS}</p>
          <p>Montant total HS : {stats.totalAmount}</p>
        </div>
      </div>
    </div>
  )
}
