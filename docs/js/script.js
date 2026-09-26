/* =========================================================
   BhuNexus GIS
   REALISTIC PARCEL MAP ENGINE
   ========================================================= */

const API_BASE =
    "https://gis-bhunexus-backend.onrender.com/api";


/* =========================================================
   DOM
   ========================================================= */

const svg =
    document.getElementById("parcelOverlay");

const mapContainer =
    document.getElementById("mapContainer");

const searchInput =
    document.getElementById("parcelSearch");

const searchButton =
    document.getElementById("searchBtn");

const tooltip =
    document.getElementById("parcelTooltip");

const tooltipClose =
    document.getElementById("tooltipClose");

const SVG_NS =
    "http://www.w3.org/2000/svg";


/* =========================================================
   MAP SIZE
   ========================================================= */

const VIEW_W = 1200;
const VIEW_H = 620;

const WORLD_W = 3600;
const WORLD_H = 2300;


/* =========================================================
   STATE
   ========================================================= */

let world = null;
let parcelLayer = null;

let parcels = [];

let selectedParcelId = null;

let zoom = 1;
let panX = 0;
let panY = 0;

let minZoom = 0.22;
const MAX_ZOOM = 4;


/* =========================================================
   DRAG STATE
   ========================================================= */

let dragging = false;
let dragged = false;
let activePointerId = null;

let startX = 0;
let startY = 0;

let startPanX = 0;
let startPanY = 0;


/* =========================================================
   SVG HELPER
   ========================================================= */

function svgEl(tag, attrs = {}) {

    const el =
        document.createElementNS(
            SVG_NS,
            tag
        );

    Object.entries(attrs).forEach(
        ([key, value]) => {

            el.setAttribute(
                key,
                value
            );
        }
    );

    return el;
}


/* =========================================================
   NORMALIZE SEARCH
   ========================================================= */

function normalize(value) {

    return String(value ?? "")
        .toUpperCase()
        .replace(/[\s\-_/]/g, "");
}


/* =========================================================
   HASH
   ========================================================= */

function hashString(str) {

    let h = 2166136261;

    for (
        let i = 0;
        i < str.length;
        i++
    ) {

        h ^= str.charCodeAt(i);

        h =
            Math.imul(
                h,
                16777619
            );
    }

    return h >>> 0;
}


/* =========================================================
   DETERMINISTIC RANDOM
   ========================================================= */

function random(seed) {

    const x =
        Math.sin(
            seed * 12.9898
        ) *
        43758.5453123;

    return (
        x -
        Math.floor(x)
    );
}


/* =========================================================
   CLEAR SVG
   ========================================================= */

function clearSVG() {

    while (svg.firstChild) {

        svg.removeChild(
            svg.firstChild
        );
    }
}


/* =========================================================
   CREATE WORLD
   ========================================================= */

function createWorld() {

    world =
        svgEl(
            "g",
            {
                id: "bnMapWorld"
            }
        );

    svg.appendChild(world);
}


/* =========================================================
   BACKGROUND
   ========================================================= */

function createBackground() {

    world.appendChild(
        svgEl(
            "rect",
            {
                x: -500,
                y: -500,
                width: WORLD_W + 1000,
                height: WORLD_H + 1000,
                fill: "#dce7d4"
            }
        )
    );


    /*
       Soft terrain patches.
    */

    const terrain = [

        "M0 0 C400 80 620 40 920 0 L920 420 C650 470 340 430 0 500 Z",

        "M2500 0 C2800 80 3200 30 3600 120 L3600 560 C3250 500 2950 540 2600 430 Z",

        "M0 1500 C380 1430 620 1500 950 1600 L900 2300 L0 2300 Z",

        "M2500 1500 C2850 1430 3250 1500 3600 1580 L3600 2300 L2520 2300 Z"
    ];


    terrain.forEach(
        (d, index) => {

            world.appendChild(
                svgEl(
                    "path",
                    {
                        d,
                        fill:
                            index % 2 === 0
                                ? "#d7e4cd"
                                : "#e2eadb",
                        opacity: "0.8"
                    }
                )
            );
        }
    );


    /*
       Subtle map texture dots.
    */

    for (
        let i = 0;
        i < 140;
        i++
    ) {

        const x =
            random(i * 17 + 2) *
            WORLD_W;

        const y =
            random(i * 31 + 9) *
            WORLD_H;

        world.appendChild(
            svgEl(
                "circle",
                {
                    cx: x,
                    cy: y,
                    r: 2 + random(i + 90) * 3,
                    fill: "#9db28d",
                    opacity: "0.16"
                }
            )
        );
    }
}


/* =========================================================
   ROAD DRAWER
   ========================================================= */

function drawRoad(
    d,
    width,
    inner = "#ddd9cf",
    outer = "#aaa79e"
) {

    /*
       Road shadow / border
    */

    world.appendChild(
        svgEl(
            "path",
            {
                d,
                fill: "none",
                stroke: outer,
                "stroke-width": width + 12,
                "stroke-linecap": "round",
                "stroke-linejoin": "round",
                opacity: "0.75"
            }
        )
    );


    /*
       Main road
    */

    world.appendChild(
        svgEl(
            "path",
            {
                d,
                fill: "none",
                stroke: inner,
                "stroke-width": width,
                "stroke-linecap": "round",
                "stroke-linejoin": "round"
            }
        )
    );


    /*
       Very subtle center highlight.
    */

    if (width >= 50) {

        world.appendChild(
            svgEl(
                "path",
                {
                    d,
                    fill: "none",
                    stroke: "#eeeae1",
                    "stroke-width": Math.max(2, width * 0.08),
                    "stroke-linecap": "round",
                    opacity: "0.7"
                }
            )
        );
    }
}


/* =========================================================
   ROADS
   ========================================================= */

function createRoads() {

    /*
       ==============================================
       PRIMARY ROAD
       ==============================================
    */

    drawRoad(
        "M -150 760 C 260 610, 470 690, 760 575 C 1040 465, 1260 560, 1510 490 C 1770 420, 1990 470, 2210 590 C 2460 725, 2670 700, 2930 585 C 3180 475, 3400 505, 3750 390",
        82,
        "#d7d2c8",
        "#9f9b92"
    );


    /*
       ==============================================
       SECONDARY CURVED ROAD
       ==============================================
    */

    drawRoad(
        "M -150 1450 C 180 1320, 430 1380, 690 1260 C 940 1140, 1160 1190, 1400 1290 C 1660 1400, 1880 1370, 2100 1250 C 2350 1110, 2600 1160, 2830 1280 C 3100 1430, 3370 1400, 3750 1260",
        66,
        "#ddd8ce",
        "#aaa69d"
    );


    /*
       ==============================================
       LOWER ROAD
       ==============================================
    */

    drawRoad(
        "M -150 1990 C 210 1880, 470 1950, 720 1840 C 980 1720, 1180 1770, 1450 1870 C 1700 1970, 1920 1930, 2170 1810 C 2440 1680, 2670 1730, 2910 1870 C 3190 2020, 3420 1990, 3750 1860",
        58,
        "#e0dbd2",
        "#b0aca3"
    );


    /*
       ==============================================
       LEFT DIAGONAL ROAD
       ==============================================
    */

    drawRoad(
        "M 300 -100 C 380 220, 340 440, 420 690 C 500 930, 440 1110, 520 1350 C 600 1590, 570 1800, 650 2420",
        48,
        "#e0dbd2",
        "#b0aca3"
    );


    /*
       ==============================================
       CENTRAL DIAGONAL ROAD
       ==============================================
    */

    drawRoad(
        "M 1740 -100 C 1630 220, 1780 450, 1680 700 C 1570 960, 1740 1150, 1650 1390 C 1550 1640, 1700 1850, 1600 2420",
        52,
        "#ddd8ce",
        "#aaa69d"
    );


    /*
       ==============================================
       RIGHT DIAGONAL ROAD
       ==============================================
    */

    drawRoad(
        "M 3000 -100 C 2890 220, 3040 450, 2930 720 C 2820 980, 3000 1170, 2890 1430 C 2780 1680, 2960 1900, 2860 2420",
        50,
        "#dfdad0",
        "#aca89f"
    );


    /*
       ==============================================
       NATURAL LOCAL ROADS
       ==============================================
    */

    const localRoads = [

        "M 80 290 C 240 250, 390 280, 540 230 C 660 190, 780 220, 850 270",

        "M 780 360 C 930 300, 1080 330, 1210 280 C 1340 230, 1470 250, 1570 310",

        "M 1830 300 C 1980 250, 2130 290, 2260 240 C 2390 190, 2500 230, 2620 300",

        "M 3040 320 C 3180 260, 3340 290, 3520 240",


        "M 60 1020 C 210 970, 370 1010, 500 950 C 620 900, 760 930, 850 990",

        "M 760 1110 C 900 1040, 1050 1080, 1180 1030 C 1320 970, 1450 1010, 1570 1070",

        "M 1810 1040 C 1950 980, 2100 1030, 2240 970 C 2380 920, 2500 950, 2630 1010",

        "M 3020 1030 C 3170 960, 3330 1010, 3500 950",


        "M 70 1690 C 220 1630, 370 1670, 500 1600 C 630 1540, 750 1580, 850 1640",

        "M 760 1770 C 920 1700, 1060 1750, 1190 1680 C 1320 1620, 1450 1660, 1560 1720",

        "M 1810 1700 C 1960 1640, 2110 1690, 2240 1620 C 2380 1560, 2510 1600, 2630 1660",

        "M 3010 1700 C 3160 1640, 3320 1690, 3500 1620"
    ];


    localRoads.forEach(
        d => {

            drawRoad(
                d,
                22,
                "#e5e1d8",
                "#c0bbb1"
            );
        }
    );
}


/* =========================================================
   WATER + PARKS + TREES
   ========================================================= */

function createEnvironment() {

    /*
       Water body
    */

    world.appendChild(
        svgEl(
            "path",
            {
                d:
                    "M 3120 790 C 3270 700, 3470 750, 3650 850 L 3650 1200 C 3490 1270, 3310 1230, 3150 1150 C 3050 1050, 3040 900, 3120 790 Z",
                fill: "#c3dfe5",
                stroke: "#9fcbd3",
                "stroke-width": 6
            }
        )
    );


    /*
       Park
    */

    world.appendChild(
        svgEl(
            "path",
            {
                d:
                    "M 2040 1540 C 2190 1450, 2390 1470, 2520 1580 C 2590 1700, 2490 1840, 2310 1880 C 2140 1880, 2010 1780, 1980 1660 C 1980 1600, 2000 1560, 2040 1540 Z",
                fill: "#c5ddba",
                stroke: "#a5c697",
                "stroke-width": 6
            }
        )
    );


    /*
       Park paths
    */

    const parkPaths = [

        "M 2070 1660 C 2200 1610, 2350 1620, 2480 1670",

        "M 2170 1530 C 2240 1640, 2260 1740, 2220 1840",

        "M 2370 1530 C 2320 1640, 2330 1760, 2400 1840"
    ];


    parkPaths.forEach(
        d => {

            world.appendChild(
                svgEl(
                    "path",
                    {
                        d,
                        fill: "none",
                        stroke: "#9ebc91",
                        "stroke-width": 5,
                        "stroke-linecap": "round"
                    }
                )
            );
        }
    );


    /*
       Trees
    */

    const trees = [

        [2070, 1580],
        [2140, 1535],
        [2240, 1585],
        [2350, 1545],
        [2440, 1600],
        [2490, 1710],
        [2390, 1780],
        [2110, 1740],

        [3190, 860],
        [3280, 820],
        [3370, 900],
        [3450, 850],
        [3160, 1080],
        [3280, 1110],
        [3400, 1060],

        [150, 1700],
        [220, 1760],
        [290, 1690],
        [360, 1760],

        [980, 430],
        [1060, 390],
        [1140, 450]
    ];


    trees.forEach(
        ([cx, cy], index) => {

            const group =
                svgEl("g", {
                    opacity: "0.88"
                });


            group.appendChild(
                svgEl(
                    "circle",
                    {
                        cx,
                        cy,
                        r:
                            13 +
                            (index % 3) * 4,
                        fill: "#6f9060",
                        stroke: "#527346",
                        "stroke-width": 3
                    }
                )
            );


            group.appendChild(
                svgEl(
                    "circle",
                    {
                        cx: cx - 5,
                        cy: cy - 5,
                        r: 5,
                        fill: "#8cab77"
                    }
                )
            );


            world.appendChild(group);
        }
    );
}


/* =========================================================
   LOCALITY LABELS
   ========================================================= */

function createLabels() {

    const labels = [

        [150, 110, "North Village"],

        [1150, 110, "Green Fields"],

        [2050, 110, "Central Zone"],

        [3000, 110, "River Side"],

        [120, 1210, "East Farms"],

        [1050, 1180, "New Settlement"],

        [1840, 1190, "BhuNexus Zone"],

        [3020, 1370, "Waterfront"],

        [120, 2130, "South Fields"],

        [1120, 2110, "Agri Belt"]
    ];


    labels.forEach(
        ([x, y, text]) => {

            world.appendChild(
                svgEl(
                    "text",
                    {
                        x,
                        y,
                        fill: "#708066",
                        "font-size": 22,
                        "font-weight": 600,
                        opacity: 0.72,
                        "letter-spacing": 0.5
                    }
                )
            ).textContent = text;
        }
    );
}


/* =========================================================
   PARCEL SIZE
   ========================================================= */

function getParcelSize(
    area,
    seed
) {

    let numericArea =
        Number(area);


    if (
        !Number.isFinite(numericArea) ||
        numericArea <= 0
    ) {

        numericArea = 1000;
    }


    const base =
        Math.sqrt(numericArea);


    const aspect =
        0.72 +
        random(seed + 20) * 0.85;


    let width =
        base *
        Math.sqrt(aspect) *
        3.05;


    let height =
        base /
        Math.sqrt(aspect) *
        3.05;


    width =
        Math.max(
            68,
            Math.min(
                width,
                225
            )
        );


    height =
        Math.max(
            55,
            Math.min(
                height,
                170
            )
        );


    return {
        width,
        height
    };
}


/* =========================================================
   IRREGULAR PARCEL POLYGON
   ========================================================= */

function makePolygon(
    x,
    y,
    w,
    h,
    seed
) {

    const r =
        n =>
            random(
                seed + n * 13
            );


    /*
       Deliberately irregular
       agricultural-style polygon.
    */

    const points = [

        [
            x + w * (0.03 + r(1) * 0.08),
            y + h * (0.10 + r(2) * 0.08)
        ],

        [
            x + w * (0.30 + r(3) * 0.12),
            y + h * (0.01 + r(4) * 0.07)
        ],

        [
            x + w * (0.66 + r(5) * 0.15),
            y + h * (0.04 + r(6) * 0.08)
        ],

        [
            x + w * (0.95 + r(7) * 0.04),
            y + h * (0.18 + r(8) * 0.15)
        ],

        [
            x + w * (0.97 + r(9) * 0.025),
            y + h * (0.55 + r(10) * 0.18)
        ],

        [
            x + w * (0.82 + r(11) * 0.12),
            y + h * (0.91 + r(12) * 0.07)
        ],

        [
            x + w * (0.52 + r(13) * 0.17),
            y + h * (0.98 - r(14) * 0.05)
        ],

        [
            x + w * (0.20 + r(15) * 0.15),
            y + h * (0.93 - r(16) * 0.08)
        ],

        [
            x + w * (0.05 + r(17) * 0.07),
            y + h * (0.68 + r(18) * 0.14)
        ],

        [
            x + w * (0.01 + r(19) * 0.05),
            y + h * (0.30 + r(20) * 0.12)
        ]
    ];


    return points
        .map(
            ([px, py]) =>
                `${px.toFixed(1)},${py.toFixed(1)}`
        )
        .join(" ");
}


/* =========================================================
   PARCEL REGIONS
   =========================================================

   Instead of the old rigid 20 rectangles,
   these are offset organic districts.
   ========================================================= */

const regions = [

    { x: 60,   y: 70,   w: 720, h: 410, cols: 5, rows: 2 },
    { x: 870,  y: 60,   w: 720, h: 400, cols: 5, rows: 2 },
    { x: 1680, y: 60,   w: 700, h: 410, cols: 5, rows: 2 },
    { x: 2470, y: 70,   w: 600, h: 400, cols: 5, rows: 2 },

    { x: 60,   y: 850,  w: 720, h: 410, cols: 5, rows: 2 },
    { x: 870,  y: 810,  w: 720, h: 420, cols: 5, rows: 2 },
    { x: 1680, y: 820,  w: 700, h: 400, cols: 5, rows: 2 },

    { x: 60,   y: 1450, w: 720, h: 400, cols: 5, rows: 2 },
    { x: 870,  y: 1430, w: 720, h: 420, cols: 5, rows: 2 },

    { x: 2700, y: 1430, w: 650, h: 400, cols: 5, rows: 2 },

    { x: 60,   y: 1930, w: 720, h: 270, cols: 5, rows: 1 },
    { x: 870,  y: 1930, w: 720, h: 270, cols: 5, rows: 1 },
    { x: 1680, y: 1930, w: 700, h: 270, cols: 5, rows: 1 },
    { x: 2700, y: 1930, w: 650, h: 270, cols: 5, rows: 1 }
];


/* =========================================================
   CREATE PARCELS
   ========================================================= */

function createParcels() {

    parcelLayer =
        svgEl(
            "g",
            {
                id: "bnParcelLayer"
            }
        );


    world.appendChild(
        parcelLayer
    );


    if (!parcels.length) {
        return;
    }


    /*
       Distribute parcels through regions.

       No fixed P-101..P-106 geometry.
    */

    parcels.forEach(
        (parcel, index) => {

            const region =
                regions[
                    index %
                    regions.length
                ];


            const seed =
                hashString(
                    String(
                        parcel.parcel_id ??
                        parcel.khasra_number ??
                        index
                    )
                );


            const localIndex =
                Math.floor(
                    index /
                    regions.length
                );


            const capacity =
                region.cols *
                region.rows;


            const slot =
                localIndex %
                capacity;


            const col =
                slot %
                region.cols;


            const row =
                Math.floor(
                    slot /
                    region.cols
                );


            const cellW =
                region.w /
                region.cols;


            const cellH =
                region.h /
                region.rows;


            const size =
                getParcelSize(
                    parcel.area,
                    seed
                );


            /*
               Leave natural gaps between parcels.
            */

            let w =
                Math.min(
                    size.width,
                    cellW - 22
                );


            let h =
                Math.min(
                    size.height,
                    cellH - 22
                );


            /*
               Different parcels sit at
               slightly different angles.
            */

            let x =
                region.x +
                col * cellW +
                (cellW - w) / 2;


            let y =
                region.y +
                row * cellH +
                (cellH - h) / 2;


            x +=
                (
                    random(seed + 41) -
                    0.5
                ) * 30;


            y +=
                (
                    random(seed + 51) -
                    0.5
                ) * 24;


            /*
               Keep inside region.
            */

            x =
                Math.max(
                    region.x + 8,
                    Math.min(
                        x,
                        region.x +
                        region.w -
                        w -
                        8
                    )
                );


            y =
                Math.max(
                    region.y + 8,
                    Math.min(
                        y,
                        region.y +
                        region.h -
                        h -
                        8
                    )
                );


            /*
               Slight rotation gives a much
               more natural cadastral appearance.
            */

            const rotation =
                (
                    random(seed + 80) -
                    0.5
                ) * 7;


            const cx =
                x + w / 2;

            const cy =
                y + h / 2;


            const group =
                svgEl(
                    "g",
                    {
                        class: "bn-parcel",

                        "data-id":
                            String(
                                parcel.parcel_id
                            ),

                        tabindex: "0",

                        role: "button",

                        "aria-label":
                            `Parcel ${parcel.parcel_id}`
                    }
                );


            group.setAttribute(
                "transform",
                `rotate(${rotation.toFixed(2)} ${cx.toFixed(1)} ${cy.toFixed(1)})`
            );


            const polygon =
                svgEl(
                    "polygon",
                    {
                        points:
                            makePolygon(
                                x,
                                y,
                                w,
                                h,
                                seed
                            ),

                        fill:
                            index % 4 === 0
                                ? "#d5e5c5"
                                : index % 4 === 1
                                    ? "#deead1"
                                    : index % 4 === 2
                                        ? "#d9e8ca"
                                        : "#e2ecd7",

                        stroke:
                            "#607854",

                        "stroke-width":
                            2.6,

                        "stroke-linejoin":
                            "round",

                        class:
                            "bn-parcel-poly"
                    }
                );


            /*
               Inner field line makes
               large parcels look more real.
            */

            const innerLine =
                svgEl(
                    "path",
                    {
                        d:
                            `M ${x + w * 0.12} ${y + h * 0.72}
                             C ${x + w * 0.35} ${y + h * 0.62},
                               ${x + w * 0.62} ${y + h * 0.78},
                               ${x + w * 0.90} ${y + h * 0.66}`,

                        fill: "none",

                        stroke: "#a5b995",

                        "stroke-width": 1.4,

                        opacity: 0.45,

                        "pointer-events":
                            "none"
                    }
                );


            /*
               Parcel label.
            */

            const label =
                svgEl(
                    "text",
                    {
                        x:
                            cx,

                        y:
                            cy,

                        "text-anchor":
                            "middle",

                        "dominant-baseline":
                            "middle",

                        class:
                            "bn-parcel-label",

                        "pointer-events":
                            "none"
                    }
                );


            const displayNumber =
                parcel.khasra_number ??
                parcel.survey_number ??
                parcel.parcel_id;


            label.textContent =
                String(
                    displayNumber
                );


            group.appendChild(
                polygon
            );

            group.appendChild(
                innerLine
            );

            group.appendChild(
                label
            );


            parcelLayer.appendChild(
                group
            );


            /*
               Click / keyboard.
            */

            group.addEventListener(
                "keydown",
                event => {

                    if (
                        event.key === "Enter" ||
                        event.key === " "
                    ) {

                        event.preventDefault();

                        selectParcel(
                            parcel.parcel_id,
                            true
                        );
                    }
                }
            );
        }
    );
}


/* =========================================================
   BUILDINGS
   ========================================================= */

function createBuildings() {

    const layer =
        svgEl(
            "g",
            {
                id: "bnBuildings"
            }
        );


    world.appendChild(layer);


    const buildings = [

        [170, 180, 90, 56],
        [500, 320, 105, 62],
        [700, 170, 78, 52],

        [970, 150, 105, 60],
        [1300, 290, 90, 54],
        [1480, 170, 80, 48],

        [1800, 170, 105, 62],
        [2110, 300, 95, 55],
        [2320, 180, 82, 50],

        [2600, 150, 100, 58],
        [2920, 310, 92, 55],

        [150, 920, 100, 60],
        [470, 1110, 90, 52],

        [980, 900, 110, 62],
        [1320, 1080, 90, 54],

        [1810, 900, 105, 60],
        [2160, 1080, 95, 54],

        [150, 1510, 105, 62],
        [470, 1730, 90, 54],

        [970, 1510, 110, 60],
        [1300, 1730, 95, 55],

        [2780, 1520, 105, 60],
        [3120, 1710, 90, 52]
    ];


    buildings.forEach(
        ([x, y, w, h]) => {

            const group =
                svgEl("g", {
                    opacity: 0.82
                });


            group.appendChild(
                svgEl(
                    "rect",
                    {
                        x,
                        y,
                        width: w,
                        height: h,
                        rx: 9,
                        fill: "#b8b4aa",
                        stroke: "#858177",
                        "stroke-width": 3
                    }
                )
            );


            group.appendChild(
                svgEl(
                    "rect",
                    {
                        x: x + 9,
                        y: y + 9,
                        width: w - 18,
                        height: h - 18,
                        rx: 5,
                        fill: "#ddd9cf"
                    }
                )
            );


            group.appendChild(
                svgEl(
                    "line",
                    {
                        x1: x + 18,
                        y1: y + h / 2,
                        x2: x + w - 18,
                        y2: y + h / 2,
                        stroke: "#aaa59b",
                        "stroke-width": 2
                    }
                )
            );


            layer.appendChild(group);
        }
    );
}


/* =========================================================
   MAP SCALE / COMPASS
   ========================================================= */

function createMapDecorations() {

    const decor =
        svgEl(
            "g",
            {
                id: "bnMapDecorations"
            }
        );


    /*
       North compass
    */

    decor.appendChild(
        svgEl(
            "circle",
            {
                cx: 1100,
                cy: 90,
                r: 34,
                fill: "rgba(255,255,255,0.82)",
                stroke: "#a5aea0",
                "stroke-width": 2
            }
        )
    );


    const north =
        svgEl(
            "text",
            {
                x: 1100,
                y: 76,
                "text-anchor": "middle",
                "font-size": 16,
                "font-weight": 800,
                fill: "#40513b"
            }
        );

    north.textContent = "N";

    decor.appendChild(north);


    decor.appendChild(
        svgEl(
            "path",
            {
                d: "M1100 82 L1090 106 L1100 101 L1110 106 Z",
                fill: "#40513b"
            }
        )
    );


    /*
       Scale bar
    */

    decor.appendChild(
        svgEl(
            "rect",
            {
                x: 55,
                y: 560,
                width: 120,
                height: 7,
                rx: 3,
                fill: "#52624c"
            }
        )
    );


    const scaleText =
        svgEl(
            "text",
            {
                x: 55,
                y: 550,
                fill: "#52624c",
                "font-size": 15,
                "font-weight": 600
            }
        );

    scaleText.textContent =
        "Approx. 500 m";

    decor.appendChild(scaleText);


    world.appendChild(decor);
}


/* =========================================================
   CAMERA
   ========================================================= */

function applyTransform() {

    if (!world) {
        return;
    }


    world.setAttribute(
        "transform",
        `translate(${panX} ${panY}) scale(${zoom})`
    );
}


/* =========================================================
   PAN LIMIT
   ========================================================= */

function clampPan() {

    const scaledW =
        WORLD_W * zoom;

    const scaledH =
        WORLD_H * zoom;


    const minX =
        Math.min(
            0,
            VIEW_W - scaledW
        );

    const maxX =
        Math.max(
            0,
            VIEW_W - scaledW
        );


    const minY =
        Math.min(
            0,
            VIEW_H - scaledH
        );

    const maxY =
        Math.max(
            0,
            VIEW_H - scaledH
        );


    panX =
        Math.max(
            minX,
            Math.min(
                panX,
                maxX
            )
        );


    panY =
        Math.max(
            minY,
            Math.min(
                panY,
                maxY
            )
        );
}


/* =========================================================
   CENTER MAP
   ========================================================= */

function centerMap() {

    const fitX =
        VIEW_W /
        WORLD_W;

    const fitY =
        VIEW_H /
        WORLD_H;

    // Normal initial view
    const fitZoom =
        Math.max(
            fitX,
            fitY
        );

    // Allow zooming farther out than the initial fit
    minZoom =
        Math.max(
            0.22,
            fitZoom * 0.72
        );

    zoom =
        fitZoom * 1.08;

    panX =
        (
            VIEW_W -
            WORLD_W * zoom
        ) / 2;

    panY =
        (
            VIEW_H -
            WORLD_H * zoom
        ) / 2;

    clampPan();

    applyTransform();
}

/* =========================================================
   FOCUS PARCEL
   ========================================================= */

function focusParcel(
    group,
    zoomLevel = 2.15
) {

    if (!group) {
        return;
    }


    const polygon =
        group.querySelector(
            ".bn-parcel-poly"
        );


    if (!polygon) {
        return;
    }


    const points =
        polygon
            .getAttribute("points")
            .trim()
            .split(/\s+/)
            .map(
                point =>
                    point
                        .split(",")
                        .map(Number)
            );


    if (!points.length) {
        return;
    }


    let minX = Infinity;
    let maxX = -Infinity;

    let minY = Infinity;
    let maxY = -Infinity;


    points.forEach(
        ([x, y]) => {

            minX =
                Math.min(
                    minX,
                    x
                );

            maxX =
                Math.max(
                    maxX,
                    x
                );

            minY =
                Math.min(
                    minY,
                    y
                );

            maxY =
                Math.max(
                    maxY,
                    y
                );
        }
    );


    const cx =
        (minX + maxX) / 2;

    const cy =
        (minY + maxY) / 2;


    zoom =
        Math.max(
            minZoom,
            Math.min(
                MAX_ZOOM,
                zoomLevel
            )
        );


    panX =
        VIEW_W / 2 -
        cx * zoom;


    panY =
        VIEW_H / 2 -
        cy * zoom;


    clampPan();

    applyTransform();


    group.classList.remove(
        "bn-parcel-flash"
    );


    void group.offsetWidth;


    group.classList.add(
        "bn-parcel-flash"
    );
}


/* =========================================================
   PAN + TOUCH
   ========================================================= */

function setupPan() {

    svg.style.touchAction = "none";

    // Parcel on which pointer started
    let pointerParcel = null;


    svg.addEventListener(
        "pointerdown",
        event => {

            if (
                event.button !== undefined &&
                event.button !== 0
            ) {
                return;
            }

            dragging = true;
            dragged = false;

            activePointerId =
                event.pointerId;

            startX =
                event.clientX;

            startY =
                event.clientY;

            startPanX =
                panX;

            startPanY =
                panY;


            /*
             * IMPORTANT:
             * Save the parcel at pointer-down.
             *
             * setPointerCapture() changes the target
             * of pointerup, so checking event.target
             * during pointerup is unreliable.
             */

            pointerParcel =
                event.target.closest?.(
                    ".bn-parcel"
                ) || null;


            try {

                svg.setPointerCapture(
                    event.pointerId
                );

            } catch (_) {}


            mapContainer?.classList.add(
                "map-dragging"
            );
        }
    );


    svg.addEventListener(
        "pointermove",
        event => {

            if (
                !dragging ||
                event.pointerId !==
                    activePointerId
            ) {
                return;
            }


            const dx =
                event.clientX -
                startX;

            const dy =
                event.clientY -
                startY;


            if (
                Math.abs(dx) > 4 ||
                Math.abs(dy) > 4
            ) {

                dragged = true;

                /*
                 * Once user starts dragging,
                 * don't treat it as a parcel click.
                 */
                pointerParcel = null;
            }


            panX =
                startPanX +
                dx;

            panY =
                startPanY +
                dy;


            clampPan();

            applyTransform();
        }
    );


    function stopDrag(event) {

        if (
            !dragging ||
            event.pointerId !==
                activePointerId
        ) {
            return;
        }


        const wasDragged =
            dragged;

        const clickedParcel =
            pointerParcel;


        dragging = false;

        activePointerId = null;

        pointerParcel = null;


        mapContainer?.classList.remove(
            "map-dragging"
        );


        try {

            svg.releasePointerCapture(
                event.pointerId
            );

        } catch (_) {}


        /*
         * If there was NO movement,
         * this was a click.
         */
        if (
            !wasDragged &&
            clickedParcel
        ) {

            const id =
                clickedParcel.dataset.id;

            if (id) {

                selectParcel(id);
            }
        }
    }


    svg.addEventListener(
        "pointerup",
        stopDrag
    );


    svg.addEventListener(
        "pointercancel",
        stopDrag
    );
}

/* =========================================================
   WHEEL ZOOM
   ========================================================= */

function setupZoom() {

    svg.addEventListener(
        "wheel",
        event => {

            event.preventDefault();


            const rect =
                svg.getBoundingClientRect();


            const sx =
                (
                    event.clientX -
                    rect.left
                ) /
                rect.width *
                VIEW_W;


            const sy =
                (
                    event.clientY -
                    rect.top
                ) /
                rect.height *
                VIEW_H;


            const oldZoom =
                zoom;


            const factor =
                event.deltaY < 0
                    ? 1.18
                    : 0.847;


            const newZoom =
                Math.max(
                    minZoom,
                    Math.min(
                        MAX_ZOOM,
                        oldZoom * factor
                    )
                );


            const worldX =
                (
                    sx - panX
                ) / oldZoom;


            const worldY =
                (
                    sy - panY
                ) / oldZoom;


            zoom =
                newZoom;


            panX =
                sx -
                worldX * zoom;


            panY =
                sy -
                worldY * zoom;


            clampPan();

            applyTransform();
        },
        {
            passive: false
        }
    );
}


/* =========================================================
   ZOOM CONTROLS
   ========================================================= */

function setupZoomButtons() {

    /*
       Existing controls are not present
       in the supplied HTML.

       Create them automatically.
    */

    let controls =
        document.getElementById(
            "bnZoomControls"
        );


    if (!controls) {

        controls =
            document.createElement(
                "div"
            );

        controls.id =
            "bnZoomControls";


        controls.innerHTML = `

            <button
                type="button"
                id="zoomIn"
                aria-label="Zoom in"
            >
                +
            </button>

            <button
                type="button"
                id="zoomOut"
                aria-label="Zoom out"
            >
                −
            </button>

            <button
                type="button"
                id="zoomReset"
                aria-label="Reset map"
            >
                ⌂
            </button>
        `;


        mapContainer.appendChild(
            controls
        );
    }


    const zoomIn =
        document.getElementById(
            "zoomIn"
        );


    const zoomOut =
        document.getElementById(
            "zoomOut"
        );


    const zoomReset =
        document.getElementById(
            "zoomReset"
        );


    zoomIn?.addEventListener(
        "click",
        () => {

            zoom =
                Math.min(
                    MAX_ZOOM,
                    zoom * 1.2
                );

            clampPan();

            applyTransform();
        }
    );


    zoomOut?.addEventListener(
        "click",
        () => {

            zoom =
                Math.max(
                    minZoom,
                    zoom * 0.833
                );

            clampPan();

            applyTransform();
        }
    );


    zoomReset?.addEventListener(
        "click",
        () => {

            centerMap();
        }
    );
}


/* =========================================================
   SELECTION
   ========================================================= */

function clearSelection() {

    document
        .querySelectorAll(
            ".bn-parcel-selected"
        )
        .forEach(
            element => {

                element.classList.remove(
                    "bn-parcel-selected"
                );

                element.setAttribute(
                    "aria-pressed",
                    "false"
                );
            }
        );
}


/* =========================================================
   SELECT PARCEL
   ========================================================= */

function selectParcel(
    id,
    focus = false
) {

    const idText =
        String(id);


    const parcel =
        parcels.find(
            p =>
                String(
                    p.parcel_id
                ) === idText
        );


    if (!parcel) {

        console.warn(
            "Parcel not found:",
            idText
        );

        return;
    }


    selectedParcelId =
        idText;


    clearSelection();


    const groups =
        document.querySelectorAll(
            ".bn-parcel"
        );


    let selectedGroup = null;


    groups.forEach(
        group => {

            if (
                String(
                    group.dataset.id
                ) === idText
            ) {

                selectedGroup =
                    group;
            }
        }
    );


    if (selectedGroup) {

        selectedGroup.classList.add(
            "bn-parcel-selected"
        );

        selectedGroup.setAttribute(
            "aria-pressed",
            "true"
        );


        if (focus) {

            focusParcel(
                selectedGroup
            );
        }
    }


    showParcelInfo(
        parcel
    );
}


/* =========================================================
   TOOLTIP
   ========================================================= */

function showParcelInfo(
    parcel
) {

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
   CLOSE TOOLTIP
   ========================================================= */

function setupTooltip() {

    tooltipClose?.addEventListener(
        "click",
        () => {

            tooltip.hidden =
                true;

            clearSelection();

            selectedParcelId =
                null;
        }
    );
}


/* =========================================================
   SEARCH
   ========================================================= */

function findParcel(query) {

    const q =
        normalize(query);


    if (!q) {
        return null;
    }


    /*
       Exact matching first.
       This makes "105" reliable.
    */

    const exact =
        parcels.find(
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
                        ) === q
                );
            }
        );


    if (exact) {
        return exact;
    }


    /*
       Partial matching second.
    */

    return (
        parcels.find(
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
                        ).includes(q)
                );
            }
        ) || null
    );
}


/* =========================================================
   SEARCH AUTOCOMPLETE
   ========================================================= */

function setupAutocomplete() {

    const list =
        document.getElementById(
            "autocompleteList"
        );


    if (!searchInput || !list) {
        return;
    }


    function renderSuggestions() {

        const query =
            normalize(
                searchInput.value
            );


        list.innerHTML = "";


        if (
            query.length < 1
        ) {

            list.style.display =
                "none";

            return;
        }


        const results =
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
                                ).includes(query)
                        );
                    }
                )
                .slice(
                    0,
                    6
                );


        if (!results.length) {

            list.style.display =
                "none";

            return;
        }


        results.forEach(
            parcel => {

                const item =
                    document.createElement(
                        "li"
                    );


                item.className =
                    "autocomplete-item";


                item.innerHTML = `

                    <strong>
                        ${escapeHTML(
                            parcel.parcel_id ?? "-"
                        )}
                    </strong>

                    <span>
                        Khasra:
                        ${escapeHTML(
                            parcel.khasra_number ?? "-"
                        )}
                    </span>
                `;


                item.addEventListener(
                    "mousedown",
                    event => {

                        event.preventDefault();

                        searchInput.value =
                            parcel.parcel_id;

                        list.style.display =
                            "none";

                        selectParcel(
                            parcel.parcel_id,
                            true
                        );
                    }
                );


                list.appendChild(item);
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
        event => {

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
   HTML ESCAPE
   ========================================================= */

function escapeHTML(value) {

    return String(
        value ?? ""
    )
        .replace(
            /&/g,
            "&amp;"
        )
        .replace(
            /</g,
            "&lt;"
        )
        .replace(
            />/g,
            "&gt;"
        )
        .replace(
            /"/g,
            "&quot;"
        )
        .replace(
            /'/g,
            "&#039;"
        );
}


/* =========================================================
   SEARCH SETUP
   ========================================================= */

function setupSearch() {

    if (!searchInput) {

        console.warn(
            "BhuNexus: #parcelSearch not found."
        );

        return;
    }


    function runSearch() {

        const query =
            searchInput.value.trim();


        const parcel =
            findParcel(query);


        if (!parcel) {

            searchInput.classList.add(
                "search-error"
            );


            setTimeout(
                () => {

                    searchInput.classList.remove(
                        "search-error"
                    );
                },
                700
            );


            console.warn(
                "No parcel found for:",
                query
            );


            return;
        }


        searchInput.classList.remove(
            "search-error"
        );


        searchInput.value =
            parcel.parcel_id;


        selectParcel(
            parcel.parcel_id,
            true
        );
    }


    searchInput.addEventListener(
        "keydown",
        event => {

            if (
                event.key === "Enter"
            ) {

                event.preventDefault();

                runSearch();
            }
        }
    );


    searchButton?.addEventListener(
        "click",
        event => {

            event.preventDefault();

            runSearch();
        }
    );
}


/* =========================================================
   MAP ACTION BUTTONS
   ========================================================= */

function setupMapActions() {

    const btnSearch =
        document.getElementById(
            "btnSearchParcel"
        );


    const btnBrowse =
        document.getElementById(
            "btnBrowseMap"
        );


    const btnApps =
        document.getElementById(
            "btnMyApps"
        );


    btnSearch?.addEventListener(
        "click",
        () => {

            searchInput?.focus();

            window.scrollTo({
                top:
                    searchInput
                        ?.getBoundingClientRect()
                        .top +
                    window.scrollY -
                    120,
                behavior: "smooth"
            });
        }
    );


    btnBrowse?.addEventListener(
        "click",
        () => {

            centerMap();

            clearSelection();

            if (tooltip) {
                tooltip.hidden =
                    true;
            }
        }
    );


    btnApps?.addEventListener(
        "click",
        () => {

            /*
               Placeholder until applications
               backend is connected.
            */

            console.info(
                "My Applications clicked"
            );
        }
    );
}


/* =========================================================
   RENDER MAP
   ========================================================= */

function renderMap() {

    if (!svg) {

        console.error(
            "BhuNexus: #parcelOverlay not found."
        );

        return;
    }


    clearSVG();


    svg.setAttribute(
        "viewBox",
        `0 0 ${VIEW_W} ${VIEW_H}`
    );


    svg.setAttribute(
        "preserveAspectRatio",
        "xMidYMid slice"
    );


    createWorld();

    createBackground();

    createRoads();

    createEnvironment();

    createLabels();

    createParcels();

    createBuildings();

    createMapDecorations();


    centerMap();

    setupPan();

    setupZoom();

    setupZoomButtons();

    setupSearch();

    setupAutocomplete();

    setupTooltip();

    setupMapActions();


    /*
       Select first parcel if available,
       but don't zoom into it initially.
    */

    const defaultParcel =
        parcels.find(
            parcel =>
                normalize(
                    parcel.parcel_id
                ) === "P103"
        );


    if (defaultParcel) {

        selectParcel(
            defaultParcel.parcel_id,
            false
        );
    }


    if (mapContainer) {

        requestAnimationFrame(
            () => {

                mapContainer.classList.add(
                    "map-ready"
                );
            }
        );
    }


    console.log(
        `BhuNexus: realistic GIS map rendered with ${parcels.length} parcels`
    );
}


/* =========================================================
   LOAD API
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


        if (
            Array.isArray(data)
        ) {

            parcels =
                data;

        } else if (
            data &&
            Array.isArray(
                data.parcels
            )
        ) {

            parcels =
                data.parcels;

        } else if (
            data &&
            Array.isArray(
                data.data
            )
        ) {

            parcels =
                data.data;

        } else {

            throw new Error(
                "Unexpected API response format."
            );
        }


        parcels =
            parcels.filter(
                parcel =>
                    parcel &&
                    parcel.parcel_id
            );


        console.log(
            `BhuNexus: ${parcels.length} valid parcels loaded`
        );


        if (!parcels.length) {

            throw new Error(
                "No parcels received from backend."
            );
        }


        renderMap();


    } catch (error) {

        console.error(
            "BhuNexus map error:",
            error
        );


        /*
           Show a useful error instead of
           silently leaving a blank map.
        */

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
   START
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

} else {

    loadParcels();
}