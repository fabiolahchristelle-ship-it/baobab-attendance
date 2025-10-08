from fastapi import FastAPI, Request, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import os

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"]
)

@app.get("/")
def root():
    return {"status": "ok"}

@app.get("/api/status")
def status():
    return {"status": "ok"}

@app.post("/api/login")
async def login(request: Request):
    data = await request.json()
    password = data.get("password")
    if password == os.getenv("ADMIN_PASSWORD", "baobab123"):
        return {"status": "ok", "message": "Connexion réussie"}
    else:
        raise HTTPException(status_code=401, detail="Mot de passe incorrect")
