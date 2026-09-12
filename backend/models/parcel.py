from pydantic import BaseModel


class Parcel(BaseModel):
    parcel_id: str
    survey_number: str
    khasra_number: str
    owner_id: str
    owner_name: str
    area: float
    land_use: str
    registration_status: str
    mutation_status: str
    tax_status: str
    zoning: str
    building_permission: str
    dispute_status: str
    latitude: float
    longitude: float
    