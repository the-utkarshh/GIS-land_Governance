from fastapi import APIRouter, HTTPException, Query
import json
import os

router = APIRouter(
    prefix="/api/parcels",
    tags=["Parcels"]
)


DATA_FILE = os.path.join(
    os.path.dirname(os.path.dirname(__file__)),
    "data",
    "parcels.json"
)


def load_parcels():
    with open(DATA_FILE, "r", encoding="utf-8") as file:
        return json.load(file)


@router.get("/")
def get_parcels():
    parcels = load_parcels()

    return {
        "count": len(parcels),
        "parcels": parcels
    }


# SEARCH — this must come before /{parcel_id}
@router.get("/search")
def search_parcels(q: str = Query(..., min_length=1)):
    parcels = load_parcels()

    query = q.lower()

    results = []

    for parcel in parcels:
        if (
            query in parcel["parcel_id"].lower()
            or query in parcel["survey_number"].lower()
            or query in parcel["khasra_number"].lower()
            or query in parcel["owner_name"].lower()
        ):
            results.append(parcel)

    return {
        "count": len(results),
        "parcels": results
    }


@router.get("/{parcel_id}")
def get_parcel(parcel_id: str):
    parcels = load_parcels()

    for parcel in parcels:
        if parcel["parcel_id"].lower() == parcel_id.lower():
            return parcel

    raise HTTPException(
        status_code=404,
        detail="Parcel not found"
    )