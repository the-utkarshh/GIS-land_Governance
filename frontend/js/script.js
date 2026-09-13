/* =========================================================
   LANDGOV GIS — DYNAMIC 200 PARCEL GIS
   ========================================================= */

const API_BASE = "https://gis-bhunexus-backend.onrender.com/api";

let PARCELS = {};
let ALL_IDS = [];
let selectedParcelId = null;

let zoomLevel = 1;

/* =========================================================
   DOM
   ========================================================= */

const navToggle = document.getElementById("navToggle");
const navLinks = document.getElementById("navLinks");

const searchInput = document.getElementById("parcelSearch");
const searchBtn = document.getElementById("searchBtn");
const autocompleteList = document.getElementById("autocompleteList");

const mapContainer = document.getElementById("mapContainer");
const parcelOverlay = document.getElementById("parcelOverlay");

const tooltip = document.getElementById("parcelTooltip");
const tooltipClose = document.getElementById("tooltipClose");

const tooltipId = document.getElementById("tooltipId");
const tooltipOwner = document.getElementById("tooltipOwner");
const tooltipArea = document.getElementById("tooltipArea");
const tooltipLandUse = document.getElementById("tooltipLandUse");
const tooltipStatus = document.getElementById("tooltipStatus");

const moreInfoBtn = document.getElementById("moreInfoBtn");

const zoomIn = document.getElementById("zoomIn");
const zoomOut = document.getElementById("zoomOut");

const SVG_NS = "http://www.w3.org/2000/svg";


/* =========================================================
   HELPERS
   ========================================================= */

function text(value) {
    return String(value ?? "").trim();
}

function normalize(value) {
    return text(value)
        .toUpperCase()
        .replace(/\s+/g, "");
}

function seededRandom(seed) {
    const x = Math.sin(seed * 9999.91) * 43758.5453;
    return x - Math.floor(x);
}


/* =========================================================
   CREATE PARCEL
   ========================================================= */

function createParcelPolygon(id, index, x, y, width, height) {

    const r1 = seededRandom(index * 13 + 1);
    const r2 = seededRandom(index * 13 + 2);
    const r3 = seededRandom(index * 13 + 3);
    const r4 = seededRandom(index * 13 + 4);
    const r5 = seededRandom(index * 13 + 5);
    const r6 = seededRandom(index * 13 + 6);

    const points = [
        `${x + width * (0.05 + r1 * 0.12)},${y + height * (0.05 + r2 * 0.08)}`,

        `${x + width * (0.42 + r3 * 0.20)},${y + height * (0.02 + r4 * 0.08)}`,

        `${x + width * (0.88 + r5 * 0.08)},${y + height * (0.12 + r6 * 0.12)}`,

        `${x + width * (0.96 - r1 * 0.07)},${y + height * (0.60 + r2 * 0.18)}`,

        `${x + width * (0.65 + r3 * 0.16)},${y + height * (0.94 - r4 * 0.08)}`,

        `${x + width * (0.18 + r5 * 0.10)},${y + height * (0.90 - r6 * 0.10)}`,

        `${x + width * (0.03 + r1 * 0.08)},${y + height * (0.38 + r2 * 0.18)}`
    ];

    /* Group */
    const group = document.createElementNS(SVG_NS, "g");

    group.setAttribute("class", "parcel");
    group.dataset.id = id;

    group.setAttribute("tabindex", "0");
    group.setAttribute("role", "button");
    group.setAttribute("aria-label", `Parcel ${id}`);
    group.setAttribute("aria-pressed", "false");


    /* Polygon */
    const polygon = document.createElementNS(SVG_NS, "polygon");

    polygon.setAttribute("class", "parcel-poly");
    polygon.setAttribute("points", points.join(" "));

    group.appendChild(polygon);


    /* Label */
    const label = document.createElementNS(SVG_NS, "text");

    label.textContent = id;

    label.setAttribute(
        "x",
        x + width / 2
    );

    label.setAttribute(
        "y",
        y + height / 2
    );

    label.setAttribute(
        "class",
        "parcel-label"
    );

    label.setAttribute(
        "text-anchor",
        "middle"
    );

    label.setAttribute(
        "dominant-baseline",
        "middle"
    );

    label.style.pointerEvents = "none";

    group.appendChild(label);


    /* Click */
    group.addEventListener("click", () => {
        selectParcel(id);
    });


    /* Keyboard */
    group.addEventListener("keydown", event => {

        if (
            event.key === "Enter" ||
            event.key === " "
        ) {

            event.preventDefault();

            selectParcel(id);
        }
    });


    parcelOverlay.appendChild(group);
}


/* =========================================================
   GIS BACKGROUND
   ========================================================= */

function createGISBackground(
    width,
    height,
    cellWidth,
    cellHeight
) {

    /* Base */
    const background =
        document.createElementNS(
            SVG_NS,
            "rect"
        );

    background.setAttribute("x", "0");
    background.setAttribute("y", "0");
    background.setAttribute("width", width);
    background.setAttribute("height", height);

    background.setAttribute(
        "fill",
        "#87936a"
    );

    background.style.pointerEvents = "none";

    parcelOverlay.appendChild(background);


    /* Field lines */
    for (
        let x = 0;
        x <= width;
        x += cellWidth
    ) {

        const line =
            document.createElementNS(
                SVG_NS,
                "line"
            );

        line.setAttribute("x1", x);
        line.setAttribute("y1", 0);
        line.setAttribute("x2", x);
        line.setAttribute("y2", height);

        line.setAttribute(
            "stroke",
            "rgba(65,75,45,0.28)"
        );

        line.setAttribute(
            "stroke-width",
            "2"
        );

        line.style.pointerEvents = "none";

        parcelOverlay.appendChild(line);
    }


    for (
        let y = 0;
        y <= height;
        y += cellHeight
    ) {

        const line =
            document.createElementNS(
                SVG_NS,
                "line"
            );

        line.setAttribute("x1", 0);
        line.setAttribute("y1", y);
        line.setAttribute("x2", width);
        line.setAttribute("y2", y);

        line.setAttribute(
            "stroke",
            "rgba(65,75,45,0.28)"
        );

        line.setAttribute(
            "stroke-width",
            "2"
        );

        line.style.pointerEvents = "none";

        parcelOverlay.appendChild(line);
    }


    /* Horizontal roads */
    for (
        let row = 4;
        row < 20;
        row += 5
    ) {

        const road =
            document.createElementNS(
                SVG_NS,
                "rect"
            );

        road.setAttribute(
            "x",
            "0"
        );

        road.setAttribute(
            "y",
            row * cellHeight - 12
        );

        road.setAttribute(
            "width",
            width
        );

        road.setAttribute(
            "height",
            "24"
        );

        road.setAttribute(
            "fill",
            "#d5d0c4"
        );

        road.setAttribute(
            "stroke",
            "#aaa495"
        );

        road.setAttribute(
            "stroke-width",
            "2"
        );

        road.style.pointerEvents = "none";

        parcelOverlay.appendChild(road);
    }


    /* Vertical roads */
    for (
        let column = 3;
        column < 10;
        column += 4
    ) {

        const road =
            document.createElementNS(
                SVG_NS,
                "rect"
            );

        road.setAttribute(
            "x",
            column * cellWidth - 12
        );

        road.setAttribute(
            "y",
            "0"
        );

        road.setAttribute(
            "width",
            "24"
        );

        road.setAttribute(
            "height",
            height
        );

        road.setAttribute(
            "fill",
            "#d5d0c4"
        );

        road.setAttribute(
            "stroke",
            "#aaa495"
        );

        road.setAttribute(
            "stroke-width",
            "2"
        );

        road.style.pointerEvents = "none";

        parcelOverlay.appendChild(road);
    }


    /* Water body */
    const water =
        document.createElementNS(
            SVG_NS,
            "path"
        );

    water.setAttribute(
        "d",
        `
        M 0 ${height - 130}
        C 180 ${height - 210},
          330 ${height - 70},
          500 ${height - 125}
        C 650 ${height - 175},
          760 ${height - 70},
          900 ${height - 105}
        L 900 ${height}
        L 0 ${height}
        Z
        `
    );

    water.setAttribute(
        "fill",
        "#b9dce4"
    );

    water.setAttribute(
        "stroke",
        "#79b8c5"
    );

    water.setAttribute(
        "stroke-width",
        "3"
    );

    water.style.pointerEvents = "none";

    parcelOverlay.appendChild(water);
}


/* =========================================================
   BUILD MAP
   ========================================================= */

function buildGISMap() {

    if (!parcelOverlay) {

        console.error(
            "parcelOverlay not found"
        );

        return;
    }


    parcelOverlay.innerHTML = "";


    const columns = 10;
    const rows = 20;

    const mapWidth = 1600;
    const mapHeight = 1100;

    const cellWidth =
        mapWidth / columns;

    const cellHeight =
        mapHeight / rows;


    parcelOverlay.setAttribute(
        "viewBox",
        `0 0 ${mapWidth} ${mapHeight}`
    );


    createGISBackground(
        mapWidth,
        mapHeight,
        cellWidth,
        cellHeight
    );


    ALL_IDS.forEach(
        (id, index) => {

            const row =
                Math.floor(
                    index / columns
                );

            const column =
                index % columns;


            const x =
                column * cellWidth;

            const y =
                row * cellHeight;


            createParcelPolygon(
                id,
                index,

                x + 7,
                y + 7,

                cellWidth - 14,
                cellHeight - 14
            );
        }
    );


    /* IMPORTANT:
       map was hidden by CSS */
    if (mapContainer) {

        requestAnimationFrame(() => {

            mapContainer.classList.add(
                "map-ready"
            );
        });
    }
}


/* =========================================================
   LOAD PARCELS
   ========================================================= */

async function loadParcels() {

    try {

        console.log(
            "Loading parcels..."
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


        const result =
            await response.json();


        console.log(
            "API response:",
            result
        );


        /* Support multiple response formats */
        const records =
            Array.isArray(result)
                ? result
                : Array.isArray(result.parcels)
                    ? result.parcels
                    : Array.isArray(result.data)
                        ? result.data
                        : [];


        if (!records.length) {

            throw new Error(
                "No parcels received from API"
            );
        }


        PARCELS = {};


        records.forEach(parcel => {

            if (
                parcel &&
                parcel.parcel_id
            ) {

                PARCELS[
                    text(parcel.parcel_id)
                ] = parcel;
            }
        });


        ALL_IDS =
            Object.keys(PARCELS);


        console.log(
            `Loaded ${ALL_IDS.length} parcels`
        );


        /* Build map */
        buildGISMap();


        /* Default selection */
        if (
            PARCELS["P-103"]
        ) {

            selectParcel(
                "P-103"
            );
        }


    } catch (error) {

        console.error(
            "Parcel loading error:",
            error
        );


        if (mapContainer) {

            mapContainer.classList.add(
                "map-ready"
            );
        }


        alert(
            "Parcel data load nahi hua.\n\n" +
            "FastAPI server check karo:\n\n" +
            "https://gis-bhunexus-backend.onrender.com/api/parcels/"
        );
    }
}


/* =========================================================
   SEARCH
   ========================================================= */

function getMatches(query) {

    const q =
        normalize(query);


    if (!q) {
        return [];
    }


    return ALL_IDS.filter(id => {

        const p =
            PARCELS[id];


        if (!p) {
            return false;
        }


        return (

            normalize(
                p.parcel_id
            ).includes(q)

            ||

            normalize(
                p.survey_number
            ).includes(q)

            ||

            normalize(
                p.khasra_number
            ).includes(q)

            ||

            normalize(
                p.owner_name
            ).includes(q)

        );
    });
}


/* =========================================================
   AUTOCOMPLETE
   ========================================================= */

if (searchInput) {

    searchInput.addEventListener(
        "input",
        () => {

            const query =
                searchInput.value.trim();


            if (!autocompleteList) {
                return;
            }


            autocompleteList.innerHTML = "";


            if (!query) {

                autocompleteList.classList.remove(
                    "open"
                );

                return;
            }


            const matches =
                getMatches(query);


            if (!matches.length) {

                autocompleteList.classList.remove(
                    "open"
                );

                return;
            }


            matches
                .slice(0, 8)
                .forEach(id => {

                    const data =
                        PARCELS[id];


                    const li =
                        document.createElement(
                            "li"
                        );


                    li.className =
                        "autocomplete-item";


                    li.innerHTML = `
                        <div class="suggestion-main">
                            <span class="suggestion-id">
                                ${text(data.parcel_id)}
                            </span>

                            <span class="suggestion-owner">
                                ${text(data.owner_name)}
                            </span>
                        </div>

                        <span class="suggestion-arrow">
                            →
                        </span>
                    `;


                    li.addEventListener(
                        "click",
                        () => {

                            searchInput.value =
                                data.parcel_id;

                            autocompleteList.classList.remove(
                                "open"
                            );

                            selectParcel(
                                data.parcel_id
                            );
                        }
                    );


                    autocompleteList.appendChild(
                        li
                    );
                });


            autocompleteList.classList.add(
                "open"
            );
        }
    );
}


/* =========================================================
   SEARCH BUTTON
   ========================================================= */

function triggerSearch() {

    if (!searchInput) {
        return;
    }


    const query =
        searchInput.value.trim();


    const matches =
        getMatches(query);


    if (!matches.length) {

        alert(
            "Parcel not found"
        );

        return;
    }


    const id =
        matches[0];


    searchInput.value =
        id;


    if (autocompleteList) {

        autocompleteList.classList.remove(
            "open"
        );
    }


    selectParcel(id);
}


if (searchBtn) {

    searchBtn.addEventListener(
        "click",
        triggerSearch
    );
}


if (searchInput) {

    searchInput.addEventListener(
        "keydown",
        event => {

            if (
                event.key === "Enter"
            ) {

                event.preventDefault();

                triggerSearch();
            }
        }
    );
}


/* =========================================================
   SELECT PARCEL
   ========================================================= */

function selectParcel(id) {

    const data =
        PARCELS[id];


    if (!data) {

        console.warn(
            "Parcel not found:",
            id
        );

        return;
    }


    selectedParcelId =
        id;


    /* Remove old selection */
    document
        .querySelectorAll(
            "#parcelOverlay .parcel"
        )
        .forEach(parcel => {

            parcel.classList.remove(
                "parcel--selected"
            );

            parcel.setAttribute(
                "aria-pressed",
                "false"
            );
        });


    /* Select target */
    const target =
        document.querySelector(
            `#parcelOverlay .parcel[data-id="${CSS.escape(id)}"]`
        );


    if (target) {

        target.classList.add(
            "parcel--selected"
        );

        target.setAttribute(
            "aria-pressed",
            "true"
        );


        /* Flash effect */
        target.classList.remove(
            "parcel--flash"
        );


        void target.offsetWidth;


        target.classList.add(
            "parcel--flash"
        );
    }


    /* Tooltip data */

    if (tooltipId) {

        tooltipId.textContent =
            text(data.parcel_id);
    }


    if (tooltipOwner) {

        tooltipOwner.textContent =
            text(data.owner_name);
    }


    if (tooltipArea) {

        tooltipArea.textContent =
            `${Number(data.area || 0).toLocaleString()} m²`;
    }


    if (tooltipLandUse) {

        tooltipLandUse.textContent =
            text(data.land_use);
    }


    if (tooltipStatus) {

        tooltipStatus.textContent =
            text(data.registration_status);
    }


    if (tooltip) {

        tooltip.hidden =
            false;
    }


    /* Details page */
    if (moreInfoBtn) {

        moreInfoBtn.href =
            `parcel-details.html?id=${encodeURIComponent(id)}`;
    }
}


/* =========================================================
   TOOLTIP CLOSE
   ========================================================= */

if (tooltipClose) {

    tooltipClose.addEventListener(
        "click",
        () => {

            if (tooltip) {

                tooltip.hidden =
                    true;
            }


            document
                .querySelectorAll(
                    "#parcelOverlay .parcel"
                )
                .forEach(parcel => {

                    parcel.classList.remove(
                        "parcel--selected"
                    );

                    parcel.setAttribute(
                        "aria-pressed",
                        "false"
                    );
                });


            selectedParcelId =
                null;
        }
    );
}


/* =========================================================
   NAVIGATION
   ========================================================= */

if (
    navToggle &&
    navLinks
) {

    navToggle.addEventListener(
        "click",
        () => {

            const open =
                navLinks.classList.toggle(
                    "open"
                );


            navToggle.setAttribute(
                "aria-expanded",
                open
                    ? "true"
                    : "false"
            );
        }
    );
}


/* =========================================================
   ZOOM
   ========================================================= */

function updateZoom() {

    if (!mapContainer) {
        return;
    }


    mapContainer.style.setProperty(
        "--map-zoom",
        zoomLevel
    );
}


if (zoomIn) {

    zoomIn.addEventListener(
        "click",
        () => {

            zoomLevel =
                Math.min(
                    zoomLevel + 0.15,
                    2.5
                );

            updateZoom();
        }
    );
}


if (zoomOut) {

    zoomOut.addEventListener(
        "click",
        () => {

            zoomLevel =
                Math.max(
                    zoomLevel - 0.15,
                    0.6
                );

            updateZoom();
        }
    );
}


/* =========================================================
   MAP MOUSE MOVEMENT
   ========================================================= */

if (mapContainer) {

    mapContainer.addEventListener(
        "mousemove",
        event => {

            const rect =
                mapContainer.getBoundingClientRect();


            const x =
                (
                    event.clientX -
                    (
                        rect.left +
                        rect.width / 2
                    )
                ) * 0.02;


            const y =
                (
                    event.clientY -
                    (
                        rect.top +
                        rect.height / 2
                    )
                ) * 0.02;


            mapContainer.style.setProperty(
                "--map-x",
                `${x}px`
            );


            mapContainer.style.setProperty(
                "--map-y",
                `${y}px`
            );
        }
    );


    mapContainer.addEventListener(
        "mouseleave",
        () => {

            mapContainer.style.setProperty(
                "--map-x",
                "0px"
            );


            mapContainer.style.setProperty(
                "--map-y",
                "0px"
            );
        }
    );
}


/* =========================================================
   MAP ACTION BUTTONS
   ========================================================= */

document
    .querySelectorAll(
        ".map-action-btn"
    )
    .forEach(button => {

        button.addEventListener(
            "click",
            () => {

                document
                    .querySelectorAll(
                        ".map-action-btn"
                    )
                    .forEach(btn => {

                        btn.classList.remove(
                            "active"
                        );
                    });


                button.classList.add(
                    "active"
                );
            }
        );
    });


/* =========================================================
   INITIALIZE
   ========================================================= */

updateZoom();

loadParcels();