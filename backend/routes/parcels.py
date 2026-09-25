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
    if not os.path.exists(DATA_FILE):
        raise HTTPException(
            status_code=500,
            detail="Parcel database file not found."
        )

    try:
        with open(
            DATA_FILE,
            "r",
            encoding="utf-8"
        ) as file:
            return json.load(file)

    except json.JSONDecodeError:
        raise HTTPException(
            status_code=500,
            detail="Parcel database contains invalid JSON."
        )


@router.get("/")
def get_parcels():

    parcels = load_parcels()

    return {
        "count": len(parcels),
        "parcels": parcels
    }


@router.get("/search")
def search_parcels(
    q: str = Query(..., min_length=1)
):

    parcels = load_parcels()

    query = q.strip().lower()

    results = []

    for parcel in parcels:

        searchable_values = [
            parcel.get("parcel_id", ""),
            parcel.get("survey_number", ""),
            parcel.get("khasra_number", ""),
            parcel.get("owner_name", ""),
            parcel.get("owner_id", "")
        ]

        if any(
            query in str(value).lower()
            for value in searchable_values
        ):
            results.append(parcel)

    return {
        "count": len(results),
        "parcels": results
    }


@router.get("/{parcel_id}")
def get_parcel(parcel_id: str):

    parcels = load_parcels()

    parcel_id = parcel_id.strip().lower()

    for parcel in parcels:

        if (
            str(
                parcel.get("parcel_id", "")
            ).lower()
            == parcel_id
        ):
            return parcel

    raise HTTPException(
        status_code=404,
        detail="Parcel not found"
    )