from fastapi import FastAPI, Request, HTTPException, Path
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import HTMLResponse, FileResponse
from fastapi.templating import Jinja2Templates
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
from zoneinfo import ZoneInfo
from datetime import datetime, timezone, timedelta
import sqlite3
import os

# 🔐 Mot de passe admin via variable d’environnement
admin_password = os.getenv("ADMIN_PASSWORD", "default123")

# 🚀 Initialisation FastAPI
app = FastAPI(
    title="Baobab Attendance API",
    description="API pour la gestion des présences",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc"
)

# 📁 Templates et fichiers statiques
templates = Jinja2Templates(directory="templates")
app.mount("/static", StaticFiles(directory="static"), name="static")

# 🌐 CORS pour APK, navigateur, etc.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"]
)

# 📂 Chemin vers la base SQLite
BASE_DIR = os.path.dirname(__file__)
DB_FILE = os.path.join(BASE_DIR, "SystemManagement.db")

# 🎯 Création et migration des tables au démarrage
@app.on_event("startup")
def init_db():
    conn = sqlite3.connect(DB_FILE)
    cursor = conn.cursor()

    cursor.execute("""
      CREATE TABLE IF NOT EXISTS gestion_employe (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        Matricule INTEGER UNIQUE,
        Nom TEXT,
        Prenom TEXT,
        Emploi TEXT,
        Affectation TEXT,
        Numero TEXT,
        Mail TEXT
      )
    """)
    cols = [c[1] for c in cursor.execute("PRAGMA table_info(gestion_employe)").fetchall()]
    if "Presence" not in cols:
        cursor.execute("ALTER TABLE gestion_employe ADD COLUMN Presence INTEGER DEFAULT 0")
    if "entry_time" not in cols:
        cursor.execute("ALTER TABLE gestion_employe ADD COLUMN entry_time TEXT")
    if "exit_time" not in cols:
        cursor.execute("ALTER TABLE gestion_employe ADD COLUMN exit_time TEXT")
    if "overtime" not in cols:
        cursor.execute("ALTER TABLE gestion_employe ADD COLUMN overtime TEXT DEFAULT '0H00'")
    if "overtime_amount" not in cols:
        cursor.execute("ALTER TABLE gestion_employe ADD COLUMN overtime_amount INTEGER DEFAULT 0")

    cursor.execute("""
      CREATE TABLE IF NOT EXISTS presence_log (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        Matricule INTEGER,
        date_heure TEXT
      )
    """)

    conn.commit()
    conn.close()

# 📦 Modèle Pydantic
class Etudiant(BaseModel):
    Matricule: int
    Nom: str
    Prenom: str
    Emploi: str
    Affectation: str
    Numero: str
    Mail: str

# 🔐 API : connexion admin
@app.post("/api/login")
async def login(request: Request):
    data = await request.json()
    password = data.get("password")

    if password == admin_password:
        return {"status": "ok", "message": "Connexion réussie"}
    else:
        raise HTTPException(status_code=401, detail="Mot de passe incorrect")

# ♻️ API : réinitialiser présences et logs
@app.post("/api/reset_presence")
async def reset_presence(request: Request):
    data = await request.json()
    if data.get("password") != admin_password:
        raise HTTPException(status_code=401, detail="Mot de passe admin incorrect")

    conn = sqlite3.connect(DB_FILE)
    cursor = conn.cursor()
    try:
        cursor.execute("""
            UPDATE gestion_employe
            SET Presence = 0,
                entry_time = NULL,
                exit_time = NULL,
                overtime = '0H00',
                overtime_amount = 0
        """)
        cursor.execute("DELETE FROM presence_log")
        cursor.execute("DELETE FROM presence_journaliere")
        conn.commit()
        return {"status": "ok", "message": "Présences, HS et logs réinitialisés"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erreur SQL : {e}")
    finally:
        conn.close()
# 📡 API : marquer la présence, gérer entrée/sortie et heures sup.
@app.post("/api/mark_presence/{student_id}")
def mark_presence(student_id: str):
    conn = sqlite3.connect(DB_FILE)
    cursor = conn.cursor()

    now_dt = datetime.now()
    now_str = now_dt.strftime("%Y-%m-%d %H:%M:%S")
    today = now_dt.strftime("%Y-%m-%d")

    cursor.execute(
        "SELECT entry_time, overtime, overtime_amount FROM gestion_employe WHERE Matricule = ?",
        (student_id,)
    )
    row = cursor.fetchone()
    if not row:
        conn.close()
        raise HTTPException(status_code=404, detail="Employé introuvable")

    entry_time_str, old_ot_str, old_ot_amt = row
    old_ot_str = old_ot_str or "0H00"
    old_ot_amt = old_ot_amt or 0

    if not entry_time_str or not entry_time_str.startswith(today):
        cursor.execute(
            "UPDATE gestion_employe SET entry_time = ? WHERE Matricule = ?",
            (now_str, student_id)
        )
        message = "Entrée enregistrée"
        exit_time = ""
        new_ot_str = old_ot_str
        new_ot_amt = old_ot_amt
    else:
        cursor.execute(
            "UPDATE gestion_employe SET exit_time = ? WHERE Matricule = ?",
            (now_str, student_id)
        )

        gmt_plus_3 = timezone(timedelta(hours=3))
        now_dt = datetime.now(gmt_plus_3)
        seuil = now_dt.replace(hour=16, minute=0, second=0, microsecond=0)
        overtime_minutes = max(0, int((now_dt - seuil).total_seconds() // 60))

        if overtime_minutes > 0:
            h_day, m_day = divmod(overtime_minutes, 60)
            daily_ot_str = f"{h_day}H{m_day:02d}"
            daily_ot_amount = int((overtime_minutes / 60) * 10000)

            try:
                h_old, m_old = map(int, old_ot_str.replace("H", ":").split(":"))
            except:
                h_old, m_old = 0, 0

            total_min = h_old * 60 + m_old + overtime_minutes
            h_tot, m_tot = divmod(total_min, 60)
            new_ot_str = f"{h_tot}H{m_tot:02d}"
            new_ot_amt = old_ot_amt + daily_ot_amount

            cursor.execute("""
                UPDATE gestion_employe
                SET overtime = ?, overtime_amount = ?
                WHERE Matricule = ?
            """, (new_ot_str, new_ot_amt, student_id))

            cursor.execute("""
                INSERT INTO presence_journaliere
                (Matricule, date, entry_time, exit_time, overtime, overtime_amount)
                VALUES (?, ?, ?, ?, ?, ?)
            """, (
                student_id, today,
                entry_time_str, now_str,
                daily_ot_str, daily_ot_amount
            ))

            message = f"Sortie enregistrée – HS du jour : {daily_ot_str} ({daily_ot_amount} Ar)"
        else:
            message = "Sortie enregistrée – Pas d'heure sup"
            new_ot_str = old_ot_str
            new_ot_amt = old_ot_amt
        exit_time = now_str

    cursor.execute("UPDATE gestion_employe SET Presence = Presence + 1 WHERE Matricule = ?", (student_id,))
    cursor.execute("INSERT INTO presence_log (Matricule, date_heure) VALUES (?, ?)", (student_id, now_str))

    conn.commit()
    conn.close()

    return {
        "status": "ok",
        "message": message,
        "entry_time": entry_time_str or now_str,
        "exit_time": exit_time,
        "overtime": new_ot_str,
        "overtime_amount": new_ot_amt
    }

# 📄 API : logs d’un employé
@app.get("/api/logs/{student_id}")
def get_logs_by_student(student_id: str):
    conn = sqlite3.connect(DB_FILE)
    cursor = conn.cursor()
    cursor.execute("""
        SELECT pj.Matricule, g.Nom, g.Prenom, g.Emploi,
               pj.entry_time, pj.exit_time, pj.overtime, pj.overtime_amount
        FROM presence_journaliere pj
        JOIN gestion_employe g ON pj.Matricule = g.Matricule
        WHERE pj.Matricule = ?
        ORDER BY pj.entry_time DESC
    """, (student_id,))
    rows = cursor.fetchall()
    conn.close()
    return {"data": [
        {
            "Matricule": r[0],
            "Nom": r[1],
            "Prenom": r[2],
            "Emploi": r[3],
            "entry_time": r[4],
            "exit_time": r[5],
            "overtime": r[6],
            "overtime_amount": r[7]
        } for r in rows
    ]}

# 🧨 API : suppression totale des données
@app.post("/api/wipe_all")
async def wipe_all(request: Request):
    data = await request.json()
    if data.get("password") != admin_password:
        raise HTTPException(status_code=401, detail="Mot de passe admin incorrect")
    conn = sqlite3.connect(DB_FILE)
    cursor = conn.cursor()
    try:
        for table in ["gestion_employe", "presence_log", "presence_journaliere"]:
            cursor.execute(f"DELETE FROM {table}")
        conn.commit()
        return {"status": "ok", "message": "Toutes les données ont été effacées"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erreur SQL : {e}")
    finally:
        conn.close()
