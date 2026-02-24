import json
import os
from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
from typing import Dict, List

app = FastAPI()

DATA_FILE = "checkin_data.json"

class CheckinData(BaseModel):
    habits: List[str]
    records: Dict[str, List[str]]

def load_data():
    if not os.path.exists(DATA_FILE):
        return {"habits": [], "records": {}}
    try:
        with open(DATA_FILE, "r", encoding="utf-8") as f:
            return json.load(f)
    except Exception:
        return {"habits": [], "records": {}}

def save_data(data):
    with open(DATA_FILE, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)

@app.get("/api/data")
async def get_data():
    return load_data()

@app.post("/api/data")
async def update_data(data: CheckinData):
    save_data(data.model_dump())
    return {"status": "success"}

# Serve static files (index.html, manifest, etc.)
# html=True allows serving index.html at root /
app.mount("/", StaticFiles(directory="checkin", html=True), name="static")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)