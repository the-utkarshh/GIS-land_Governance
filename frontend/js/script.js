/* =========================================================
   BHUNEXUS - LEAFLET GIS MAP
   ========================================================= */

const API_BASE =
    "https://bhunexus-backend.onrender.com/api";

let parcels = [];
let leafletMap = null;
let parcelLayers = new Map();

let selectedParcelId = null;


/* =========================================================
   DOM
   ========================================================= */

const mapContainer =
    document.getElementById("mapContainer");

const mapElement =
    document.getElementById("parcelOverlay");

const searchInput =
    document.getElementById("parcelSearch");

const searchBtn =
    document.getElementById("searchBtn");

const tooltip =
    document.getElementById("parcelTooltip");

const tooltipClose =
    document.getElementById("tooltipClose");


/* =========================================================
   HELPERS
   ========================================================= */

function normalize(value) {

    return String(value ?? "")
        .trim()
        .toLowerCase();

}


function escapeHTML(value) {

    return String(value ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");

}


/* =========================================================
   PARCEL SEARCH
   ========================================================= */

function findParcel(query) {

    const q = normalize(query);

    if (!q) {
        return null;
    }


    /* Exact match first */

    const exact = parcels.find(parcel => {

        const values = [
            parcel.parcel_id,
            parcel.khasra_number,
            parcel.survey_number,
            parcel.owner_name
        ];

        return values.some(value =>
            normalize(value) === q
        );

    });


    if (exact) {
        return exact;
    }


    /* Partial match */

    return parcels.find(parcel => {

        const values = [
            parcel.parcel_id,
            parcel.khasra_number,
            parcel.survey_number,
            parcel.owner_name
        ];

        return values.some(value =>
            normalize(value).includes(q)
        );

    }) || null;

}


/* =========================================================
   COLORS
   ========================================================= */

function getParcelColor(parcel) {

    const status =
        normalize(parcel.registration_status);

    const landUse =
        normalize(parcel.land_use);


    if (
        status.includes("pending") ||
        status.includes("dispute")
    ) {
        return "#f59e0b";
    }


    if (
        landUse.includes("residential")
    ) {
        return "#78b978";
    }


    if (
        landUse.includes("commercial")
    ) {
        return "#d8a85c";
    }


    if (
        landUse.includes("agriculture") ||
        landUse.includes("agricultural")
    ) {
        return "#9acb72";
    }


    if (
        landUse.includes("industrial")
    ) {
        return "#a89bc9";
    }


    return "#82b5d8";

}


/* =========================================================
   GENERATE DEMO GIS COORDINATES
   =========================================================

   IMPORTANT:

   Your current API does NOT provide latitude/longitude.
   So this converts the existing parcel list into a
   clean demo GIS layout.

   When real polygon coordinates are added to backend,
   this function can be replaced directly.
   ========================================================= */

function generateParcelCoordinates(index, total) {

    /*
     * =========================================================
     * REALISTIC DEMO CADASTRAL LAYOUT
     * =========================================================
     *
     * Backend currently does not provide real latitude/longitude.
     *
     * So instead of a rigid grid, parcels are distributed
     * across different zones with irregular boundaries.
     *
     * This gives the map a more natural land-record / cadastral
     * appearance.
     * =========================================================
     */

    const baseLat = 28.4450;
    const baseLng = 77.4850;

    /*
     * Each zone contains parcels with different shapes.
     *
     * The map is intentionally spread out instead of placing
     * every parcel inside one square block.
     */

    const layouts = [

        // =========================
        // NORTH-WEST FARM ZONE
        // =========================

        [
            [0.012, -0.018],
            [0.014, -0.010],
            [0.009, -0.002],
            [0.016, 0.006],
            [0.011, 0.014],
            [0.004, -0.015],
            [0.006, -0.006],
            [0.003, 0.004],
            [0.007, 0.012]
        ],

        // =========================
        // NORTH-EAST ZONE
        // =========================

        [
            [0.013, 0.022],
            [0.011, 0.030],
            [0.006, 0.025],
            [0.004, 0.035],
            [0.001, 0.027],
            [-0.003, 0.032],
            [-0.006, 0.023],
            [-0.010, 0.030]
        ],

        // =========================
        // CENTRAL WEST
        // =========================

        [
            [0.001, -0.020],
            [-0.004, -0.013],
            [-0.009, -0.019],
            [-0.014, -0.011],
            [-0.019, -0.018],
            [-0.022, -0.007],
            [-0.014, -0.003],
            [-0.008, -0.006],
            [-0.002, -0.002]
        ],

        // =========================
        // CENTRAL EAST
        // =========================

        [
            [0.002, 0.010],
            [-0.003, 0.016],
            [-0.008, 0.011],
            [-0.013, 0.019],
            [-0.018, 0.012],
            [-0.023, 0.021],
            [-0.016, 0.028],
            [-0.010, 0.025],
            [-0.004, 0.029]
        ],

        // =========================
        // SOUTH-WEST ZONE
        // =========================

        [
            [-0.025, -0.025],
            [-0.030, -0.016],
            [-0.034, -0.007],
            [-0.039, -0.018],
            [-0.044, -0.009],
            [-0.048, -0.021],
            [-0.052, -0.012],
            [-0.055, -0.027]
        ],

        // =========================
        // SOUTH-EAST ZONE
        // =========================

        [
            [-0.028, 0.005],
            [-0.033, 0.013],
            [-0.038, 0.006],
            [-0.043, 0.016],
            [-0.048, 0.009],
            [-0.053, 0.020],
            [-0.057, 0.011],
            [-0.060, 0.024]
        ],

        // =========================
        // FAR EAST / OUTSKIRT ZONE
        // =========================

        [
            [0.020, 0.040],
            [0.014, 0.047],
            [0.008, 0.042],
            [0.002, 0.050],
            [-0.006, 0.044],
            [-0.013, 0.051],
            [-0.021, 0.045],
            [-0.029, 0.052]
        ],

        // =========================
        // FAR SOUTH OUTSKIRTS
        // =========================

        [
            [-0.065, -0.035],
            [-0.070, -0.026],
            [-0.074, -0.016],
            [-0.078, -0.005],
            [-0.082, 0.006],
            [-0.086, 0.017],
            [-0.090, 0.029]
        ]

    ];


    /*
     * Select a zone based on parcel index.
     */

    const zoneIndex =
        Math.floor(index / 9) % layouts.length;

    const zone =
        layouts[zoneIndex];


    /*
     * Position inside selected zone.
     */

    const position =
        zone[index % zone.length];


    const centerLat =
        baseLat + position[0];

    const centerLng =
        baseLng + position[1];


    /*
     * =========================================================
     * VARIABLE PARCEL SIZE
     * =========================================================
     *
     * Different parcel sizes make the map look less artificial.
     */

    const sizePattern =
        index % 6;

    let latSize;
    let lngSize;

    switch (sizePattern) {

        case 0:
            latSize = 0.0038;
            lngSize = 0.0055;
            break;

        case 1:
            latSize = 0.0045;
            lngSize = 0.0042;
            break;

        case 2:
            latSize = 0.0032;
            lngSize = 0.0062;
            break;

        case 3:
            latSize = 0.0050;
            lngSize = 0.0050;
            break;

        case 4:
            latSize = 0.0037;
            lngSize = 0.0048;
            break;

        default:
            latSize = 0.0042;
            lngSize = 0.0058;
            break;
    }


    /*
     * =========================================================
     * IRREGULAR POLYGON SHAPES
     * =========================================================
     *
     * Instead of perfect rectangles, every parcel gets a
     * slightly different cadastral-style boundary.
     */

    const shape =
        index % 8;


    switch (shape) {

        /*
         * Standard irregular quadrilateral
         */

        case 0:

            return [

                [
                    centerLat + latSize * 0.55,
                    centerLng - lngSize * 0.55
                ],

                [
                    centerLat + latSize * 0.48,
                    centerLng + lngSize * 0.45
                ],

                [
                    centerLat - latSize * 0.38,
                    centerLng + lngSize * 0.55
                ],

                [
                    centerLat - latSize * 0.55,
                    centerLng - lngSize * 0.40
                ]

            ];


        /*
         * Slightly angled parcel
         */

        case 1:

            return [

                [
                    centerLat + latSize * 0.45,
                    centerLng - lngSize * 0.60
                ],

                [
                    centerLat + latSize * 0.62,
                    centerLng + lngSize * 0.25
                ],

                [
                    centerLat - latSize * 0.25,
                    centerLng + lngSize * 0.58
                ],

                [
                    centerLat - latSize * 0.55,
                    centerLng - lngSize * 0.48
                ]

            ];


        /*
         * Five-sided agricultural parcel
         */

        case 2:

            return [

                [
                    centerLat + latSize * 0.50,
                    centerLng - lngSize * 0.50
                ],

                [
                    centerLat + latSize * 0.55,
                    centerLng + lngSize * 0.15
                ],

                [
                    centerLat + latSize * 0.18,
                    centerLng + lngSize * 0.58
                ],

                [
                    centerLat - latSize * 0.52,
                    centerLng + lngSize * 0.40
                ],

                [
                    centerLat - latSize * 0.48,
                    centerLng - lngSize * 0.55
                ]

            ];


        /*
         * Long narrow parcel
         */

        case 3:

            return [

                [
                    centerLat + latSize * 0.60,
                    centerLng - lngSize * 0.40
                ],

                [
                    centerLat + latSize * 0.48,
                    centerLng + lngSize * 0.60
                ],

                [
                    centerLat - latSize * 0.50,
                    centerLng + lngSize * 0.48
                ],

                [
                    centerLat - latSize * 0.60,
                    centerLng - lngSize * 0.32
                ]

            ];


        /*
         * Offset boundary
         */

        case 4:

            return [

                [
                    centerLat + latSize * 0.40,
                    centerLng - lngSize * 0.55
                ],

                [
                    centerLat + latSize * 0.62,
                    centerLng + lngSize * 0.38
                ],

                [
                    centerLat - latSize * 0.10,
                    centerLng + lngSize * 0.60
                ],

                [
                    centerLat - latSize * 0.58,
                    centerLng + lngSize * 0.05
                ],

                [
                    centerLat - latSize * 0.42,
                    centerLng - lngSize * 0.60
                ]

            ];


        /*
         * Irregular five-sided parcel
         */

        case 5:

            return [

                [
                    centerLat + latSize * 0.58,
                    centerLng - lngSize * 0.42
                ],

                [
                    centerLat + latSize * 0.30,
                    centerLng + lngSize * 0.60
                ],

                [
                    centerLat - latSize * 0.30,
                    centerLng + lngSize * 0.50
                ],

                [
                    centerLat - latSize * 0.60,
                    centerLng - lngSize * 0.10
                ],

                [
                    centerLat - latSize * 0.20,
                    centerLng - lngSize * 0.62
                ]

            ];


        /*
         * Slight trapezoid
         */

        case 6:

            return [

                [
                    centerLat + latSize * 0.60,
                    centerLng - lngSize * 0.40
                ],

                [
                    centerLat + latSize * 0.42,
                    centerLng + lngSize * 0.50
                ],

                [
                    centerLat - latSize * 0.55,
                    centerLng + lngSize * 0.35
                ],

                [
                    centerLat - latSize * 0.48,
                    centerLng - lngSize * 0.58
                ]

            ];


        /*
         * Natural irregular field
         */

        default:

            return [

                [
                    centerLat + latSize * 0.52,
                    centerLng - lngSize * 0.50
                ],

                [
                    centerLat + latSize * 0.60,
                    centerLng + lngSize * 0.20
                ],

                [
                    centerLat + latSize * 0.15,
                    centerLng + lngSize * 0.62
                ],

                [
                    centerLat - latSize * 0.48,
                    centerLng + lngSize * 0.42
                ],

                [
                    centerLat - latSize * 0.58,
                    centerLng - lngSize * 0.35
                ]

            ];

    }

}

/* =========================================================
   INITIALIZE LEAFLET
   ========================================================= */

function initializeLeafletMap() {

    if (!mapElement) {

        console.error(
            "BhuNexus: #parcelOverlay not found."
        );

        return;

    }


    if (
        typeof L === "undefined"
    ) {

        console.error(
            "Leaflet library not loaded."
        );

        return;

    }


    if (leafletMap) {

        leafletMap.remove();

        leafletMap = null;

    }


    leafletMap = L.map(
        "parcelOverlay",
        {
            zoomControl: true,
            attributionControl: true,
            preferCanvas: true
        }
    );


    /*
       OpenStreetMap base layer
    */

    L.tileLayer(
        "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
        {
            maxZoom: 20,
            attribution:
                '&copy; OpenStreetMap contributors'
        }
    ).addTo(leafletMap);


    /*
       Initial view
    */

    leafletMap.setView(
        [28.445, 77.485],
        13
    );


    /*
       Map click clears selection
    */

    leafletMap.on(
        "click",
        function () {

            clearParcelSelection();

        }
    );

}


/* =========================================================
   CREATE PARCELS
   ========================================================= */

function createLeafletParcels() {

    if (!leafletMap) {
        return;
    }


    parcelLayers.clear();


    parcels.forEach(
        (parcel, index) => {

            const coordinates =
                generateParcelCoordinates(
                    index,
                    parcels.length
                );


            const polygon =
                L.polygon(
                    coordinates,
                    {
                        color:
                            "#ffffff",

                        weight:
                            1.5,

                        opacity:
                            0.95,

                        fillColor:
                            getParcelColor(parcel),

                        fillOpacity:
                            0.62
                    }
                );


            /*
               Hover effect
            */

            polygon.on(
                "mouseover",
                function () {

                    if (
                        selectedParcelId !==
                        parcel.parcel_id
                    ) {

                        polygon.setStyle({

                            weight: 3,

                            color:
                                "#14532d",

                            fillOpacity:
                                0.78

                        });

                    }

                }
            );


            polygon.on(
                "mouseout",
                function () {

                    if (
                        selectedParcelId !==
                        parcel.parcel_id
                    ) {

                        polygon.setStyle({

                            weight: 1.5,

                            color:
                                "#ffffff",

                            fillOpacity:
                                0.62

                        });

                    }

                }
            );


            /*
               Click parcel
            */

            polygon.on(
                "click",
                function (event) {

                    L.DomEvent.stopPropagation(
                        event
                    );

                    selectParcel(
                        parcel
                    );

                }
            );


            /*
               Popup
            */

            polygon.bindPopup(
                createPopupHTML(
                    parcel
                ),
                {
                    maxWidth: 300
                }
            );


            /*
               Parcel label
            */

            polygon.bindTooltip(
                escapeHTML(
                    parcel.parcel_id
                ),
                {
                    permanent: true,
                    direction: "center",
                    className:
                        "bn-parcel-label",
                    opacity: 0.9
                }
            );


            polygon.addTo(
                leafletMap
            );


            parcelLayers.set(
                parcel.parcel_id,
                polygon
            );

        }
    );

}


/* =========================================================
   POPUP
   ========================================================= */

function createPopupHTML(parcel) {

    const id =
        escapeHTML(
            parcel.parcel_id
        );

    const owner =
        escapeHTML(
            parcel.owner_name || "-"
        );

    const area =
        Number(
            parcel.area
        );


    const areaText =
        Number.isFinite(area)
            ? `${area.toLocaleString()} m²`
            : "-";


    const landUse =
        escapeHTML(
            parcel.land_use || "-"
        );


    const registration =
        escapeHTML(
            parcel.registration_status || "-"
        );


    return `

        <div class="bn-leaflet-popup">

            <h3>
                Parcel ${id}
            </h3>

            <p>
                <strong>Owner:</strong>
                ${owner}
            </p>

            <p>
                <strong>Area:</strong>
                ${areaText}
            </p>

            <p>
                <strong>Land Use:</strong>
                ${landUse}
            </p>

            <p>
                <strong>Status:</strong>
                ${registration}
            </p>

            <p style="margin-top:10px">

                <a
                    href="parcel-details.html?id=${encodeURIComponent(
                        parcel.parcel_id
                    )}"
                    style="
                        font-weight:700;
                        text-decoration:none;
                    "
                >
                    View Full Details →
                </a>

            </p>

        </div>

    `;

}


/* =========================================================
   SELECT PARCEL
   ========================================================= */

function selectParcel(parcel) {

    if (!parcel) {
        return;
    }


    clearParcelSelection();


    selectedParcelId =
        parcel.parcel_id;


    const layer =
        parcelLayers.get(
            parcel.parcel_id
        );


    if (layer) {

        layer.setStyle({

            color:
                "#0f5132",

            weight:
                4,

            fillColor:
                "#facc15",

            fillOpacity:
                0.85

        });


        layer.bringToFront();


        leafletMap.fitBounds(
            layer.getBounds(),
            {
                padding: [
                    80,
                    80
                ],
                maxZoom: 17
            }
        );


        layer.openPopup();

    }


    showParcelInfo(
        parcel
    );

}


/* =========================================================
   CLEAR SELECTION
   ========================================================= */

function clearParcelSelection() {

    if (
        selectedParcelId
    ) {

        const oldLayer =
            parcelLayers.get(
                selectedParcelId
            );


        if (oldLayer) {

            const parcel =
                parcels.find(
                    p =>
                        p.parcel_id ===
                        selectedParcelId
                );


            if (parcel) {

                oldLayer.setStyle({

                    color:
                        "#ffffff",

                    weight:
                        1.5,

                    fillColor:
                        getParcelColor(
                            parcel
                        ),

                    fillOpacity:
                        0.62

                });

            }

        }

    }


    selectedParcelId =
        null;

}


/* =========================================================
   TOOLTIP / INFO CARD
   ========================================================= */

function showParcelInfo(parcel) {

    if (!tooltip) {
        return;
    }


    tooltip.hidden =
        false;


    const id =
        document.getElementById(
            "tooltipId"
        );

    const owner =
        document.getElementById(
            "tooltipOwner"
        );

    const area =
        document.getElementById(
            "tooltipArea"
        );

    const landUse =
        document.getElementById(
            "tooltipLandUse"
        );

    const status =
        document.getElementById(
            "tooltipStatus"
        );


    if (id) {

        id.textContent =
            parcel.parcel_id ??
            "-";

    }


    if (owner) {

        owner.textContent =
            parcel.owner_name ??
            "-";

    }


    if (area) {

        const numericArea =
            Number(
                parcel.area
            );


        area.textContent =
            Number.isFinite(
                numericArea
            )
                ? `${numericArea.toLocaleString()} m²`
                : "-";

    }


    if (landUse) {

        landUse.textContent =
            parcel.land_use ??
            "-";

    }


    if (status) {

        status.textContent =
            parcel.registration_status ??
            "-";

    }


    const moreInfo =
        document.getElementById(
            "moreInfoBtn"
        );


    if (moreInfo) {

        moreInfo.href =
            `parcel-details.html?id=${encodeURIComponent(
                parcel.parcel_id
            )}`;

    }

}


/* =========================================================
   SEARCH
   ========================================================= */

function searchParcel() {

    if (!searchInput) {
        return;
    }


    const query =
        searchInput.value.trim();


    if (!query) {
        return;
    }


    const parcel =
        findParcel(query);


    if (!parcel) {

        alert(
            "Parcel not found."
        );

        return;

    }


    selectParcel(
        parcel
    );


    searchInput.blur();

}
/* =========================================================
   AUTO SELECT PARCEL FROM URL
   ========================================================= */

function autoSelectParcelFromURL() {

    const params =
        new URLSearchParams(window.location.search);

    const parcelId =
        params.get("parcel");

    if (!parcelId) {
        return;
    }

    const parcel =
        findParcel(parcelId);

    if (!parcel) {

        console.warn(
            `BhuNexus: Parcel "${parcelId}" was not found.`
        );

        return;
    }

    /* Put parcel ID into search box */

    if (searchInput) {

        searchInput.value =
            parcel.parcel_id;

    }

    /* Automatically select the parcel */

    selectParcel(parcel);

}


/* =========================================================
   SEARCH BUTTON
   ========================================================= */

if (searchBtn) {

    searchBtn.addEventListener(
        "click",
        searchParcel
    );

}


if (searchInput) {

    searchInput.addEventListener(
        "keydown",
        function (event) {

            if (
                event.key ===
                "Enter"
            ) {

                event.preventDefault();

                searchParcel();

            }

        }
    );

}


/* =========================================================
   AUTOCOMPLETE
   ========================================================= */

function setupAutocomplete() {

    const list =
        document.getElementById(
            "autocompleteList"
        );


    if (
        !searchInput ||
        !list
    ) {

        return;

    }


    function renderSuggestions() {

        const query =
            normalize(
                searchInput.value
            );


        list.innerHTML =
            "";


        if (
            query.length < 1
        ) {

            list.style.display =
                "none";

            return;

        }


        const matches =
            parcels
                .filter(
                    parcel => {

                        const values = [

                            parcel.parcel_id,

                            parcel.khasra_number,

                            parcel.survey_number,

                            parcel.owner_name

                        ];


                        return values.some(
                            value =>
                                normalize(
                                    value
                                ).includes(
                                    query
                                )
                        );

                    }
                )
                .slice(
                    0,
                    8
                );


        if (!matches.length) {

            list.style.display =
                "none";

            return;

        }


        matches.forEach(
            parcel => {

                const item =
                    document.createElement(
                        "div"
                    );


                item.className =
                    "autocomplete-item";


                item.innerHTML = `

                    <strong>
                        ${escapeHTML(
                            parcel.parcel_id
                        )}
                    </strong>

                    <span>
                        ${escapeHTML(
                            parcel.owner_name ||
                            "Unknown owner"
                        )}
                    </span>

                `;


                item.addEventListener(
                    "click",
                    function () {

                        searchInput.value =
                            parcel.parcel_id;


                        list.innerHTML =
                            "";


                        list.style.display =
                            "none";


                        selectParcel(
                            parcel
                        );

                    }
                );


                list.appendChild(
                    item
                );

            }
        );


        list.style.display =
            "block";

    }


    searchInput.addEventListener(
        "input",
        renderSuggestions
    );


    document.addEventListener(
        "click",
        function (event) {

            if (
                !searchInput.contains(
                    event.target
                ) &&
                !list.contains(
                    event.target
                )
            ) {

                list.style.display =
                    "none";

            }

        }
    );

}


/* =========================================================
   CLOSE TOOLTIP
   ========================================================= */

if (tooltipClose) {

    tooltipClose.addEventListener(
        "click",
        function () {

            tooltip.hidden =
                true;

            clearParcelSelection();

        }
    );

}


/* =========================================================
   LOAD PARCELS FROM BACKEND
   ========================================================= */

async function loadParcels() {

    try {

        console.log(
            "BhuNexus: loading parcel data..."
        );


        const response =
            await fetch(
                `${API_BASE}/parcels/`
            );


        if (!response.ok) {

            throw new Error(
                `HTTP ${response.status}`
            );

        }


        const data =
            await response.json();


        /*
           Support all existing API formats
        */

        if (
            Array.isArray(data)
        ) {

            parcels =
                data;

        }

        else if (
            data &&
            Array.isArray(
                data.parcels
            )
        ) {

            parcels =
                data.parcels;

        }

        else if (
            data &&
            Array.isArray(
                data.data
            )
        ) {

            parcels =
                data.data;

        }

        else {

            throw new Error(
                "Unexpected API response format."
            );

        }


        /*
           Remove invalid records
        */

        parcels =
            parcels.filter(
                parcel =>
                    parcel &&
                    parcel.parcel_id
            );


        console.log(
            `BhuNexus: ${parcels.length} valid parcels loaded`
        );


        if (
            !parcels.length
        ) {

            throw new Error(
                "No parcels received from backend."
            );

        }


        /*
           Start Leaflet
        */

        initializeLeafletMap();

createLeafletParcels();

setupAutocomplete();

/*
   If the map was opened with:
   index.html?parcel=P-124

   automatically select that parcel.
*/

autoSelectParcelFromURL();


        /*
           Fit complete parcel area
        */

        if (
            parcelLayers.size
        ) {

            const group =
                L.featureGroup(
                    Array.from(
                        parcelLayers.values()
                    )
                );


            leafletMap.fitBounds(
                group.getBounds(),
                {
                    padding: [
                        30,
                        30
                    ]
                }
            );

        }


    }

    catch (error) {

        console.error(
            "BhuNexus map error:",
            error
        );


        if (mapContainer) {

            const errorBox =
                document.createElement(
                    "div"
                );


            errorBox.className =
                "bn-map-error";


            errorBox.innerHTML = `

                <strong>
                    Parcel map could not be loaded
                </strong>

                <span>
                    Please check the backend connection.
                </span>

            `;


            mapContainer.appendChild(
                errorBox
            );

        }

    }

}


/* =========================================================
   START BHUNEXUS
   ========================================================= */

if (
    document.readyState ===
    "loading"
) {

    document.addEventListener(
        "DOMContentLoaded",
        loadParcels,
        {
            once: true
        }
    );

}

else {

    loadParcels();

}