# 📷 Baobab Attendance – Gestion de Présence QR

Plateforme complète de gestion de présence par QR code pour les employés de Baobab, avec interface React, backend FastAPI, base SQLite, et déploiement Dockerisé.

---

## 🚀 Fonctionnalités

- Scanner QR pour marquer entrée/sortie
- Calcul automatique des heures supplémentaires
- Tableau dynamique des employés
- Historique de présence et export PDF
- Interface responsive et mobile-ready
- Authentification admin sécurisée

---

## 📦 Installation locale

```bash
git clone https://github.com/tonrepo/baobab-attendance.git
cd baobab-attendance
npm install --prefix frontend
npm run dev --prefix frontend
uvicorn backend.main:app --reload
