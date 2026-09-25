import json
import os
import random


first_names = [
    "Raj", "Amit", "Rahul", "Suresh", "Ravi",
    "Sunita", "Priya", "Neha", "Pooja", "Anita",
    "Vikas", "Manoj", "Kavita", "Arjun", "Rohit"
]


last_names = [
    "Kumar", "Sharma", "Singh", "Verma", "Gupta",
    "Yadav", "Patel", "Mehta", "Agarwal", "Devi"
]


land_uses = [
    "Residential",
    "Agricultural",
    "Commercial",
    "Industrial"
]


registration_statuses = [
    "Verified",
    "Pending"
]


mutation_statuses = [
    "Completed",
    "Pending"
]


tax_statuses = [
    "Paid",
    "Pending"
]


zoning_types = [
    "Residential",
    "Agricultural",
    "Commercial",
    "Industrial"
]


building_permissions = [
    "Approved",
    "Pending",
    "Not Required"
]


dispute_statuses = [
    "None",
    "Pending"
]


parcels = []


for i in range(1, 201):

    parcel_number = 100 + i

    parcel = {

        "parcel_id":
            f"P-{parcel_number}",

        "survey_number":
            str(parcel_number),

        "khasra_number":
            str(parcel_number),

        "owner_id":
            f"OWN-{parcel_number}",

        "owner_name":
            f"{random.choice(first_names)} "
            f"{random.choice(last_names)}",

        "area":
            random.randint(500, 5000),

        "land_use":
            random.choice(land_uses),

        "registration_status":
            random.choice(
                registration_statuses
            ),

        "mutation_status":
            random.choice(
                mutation_statuses
            ),

        "tax_status":
            random.choice(
                tax_statuses
            ),

        "zoning":
            random.choice(
                zoning_types
            ),

        "building_permission":
            random.choice(
                building_permissions
            ),

        "dispute_status":
            random.choice(
                dispute_statuses
            ),

        "latitude":
            round(
                27.1700 +
                random.uniform(
                    0,
                    0.0200
                ),
                6
            ),

        "longitude":
            round(
                78.0000 +
                random.uniform(
                    0,
                    0.0200
                ),
                6
            )
    }

    parcels.append(parcel)


base_dir = os.path.dirname(
    os.path.abspath(__file__)
)

data_folder = os.path.join(
    base_dir,
    "data"
)

os.makedirs(
    data_folder,
    exist_ok=True
)


file_path = os.path.join(
    data_folder,
    "parcels.json"
)


with open(
    file_path,
    "w",
    encoding="utf-8"
) as file:

    json.dump(
        parcels,
        file,
        indent=2
    )


print(
    f"✅ {len(parcels)} sample parcels generated successfully!"
)

print(
    f"📁 File: {file_path}"
)