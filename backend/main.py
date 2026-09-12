from fastapi import FastAPI
from routes.parcels import router

app = FastAPI(
    title="LandGov GIS API",
    description="Backend API for Parcel-Centric Land Governance Platform",
    version="1.0.0"
)
app.include_router(router)

@app.get("/api/health")
def health_check():
    return {
        "status": "ok",
        "project": "LandGov GIS"
    }