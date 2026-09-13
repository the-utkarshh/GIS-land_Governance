from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from routes.parcels import router

app = FastAPI(
    title="LandGov GIS API",
    description="Backend API for Parcel-Centric Land Governance Platform",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "https://gis-bhunexus-frontend.onrender.com",
        "http://127.0.0.1:5500",
        "http://localhost:5500"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(router)


@app.get("/api/health")
def health_check():
    return {
        "status": "ok",
        "project": "LandGov GIS"
    }