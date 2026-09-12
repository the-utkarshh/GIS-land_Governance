/* =========================================================
   LANDGOV — INTERACTIVE GIS FRONTEND
   ========================================================= */


/* =========================================================
   MOCK DATA
   Later this will come from FastAPI
   ========================================================= */

const PARCELS = {

  "P-101": {
    area: "1,140 m²",
    owner: "Ramesh Kumar",
    landUse: "Residential",
    registration: "Verified",
    mutation: "Completed",
    tax: "Paid",
    zoning: "Residential",
    building: "Approved",
    dispute: "None",
    status: "Registered"
  },

  "P-102": {
    area: "980 m²",
    owner: "Sunita Devi",
    landUse: "Agricultural",
    registration: "Verified",
    mutation: "Completed",
    tax: "Paid",
    zoning: "Agricultural",
    building: "Not Applicable",
    dispute: "None",
    status: "Registered"
  },

  "P-103": {
    area: "1,250 m²",
    owner: "Raj Kumar",
    landUse: "Residential",
    registration: "Verified",
    mutation: "Completed",
    tax: "Paid",
    zoning: "Residential",
    building: "Approved",
    dispute: "None",
    status: "Registered"
  },

  "P-104": {
    area: "1,080 m²",
    owner: "Hari Prasad",
    landUse: "Commercial",
    registration: "Under Review",
    mutation: "Pending",
    tax: "Paid",
    zoning: "Commercial",
    building: "Under Review",
    dispute: "None",
    status: "Under Review"
  },

  "P-105": {
    area: "1,320 m²",
    owner: "Meena Sharma",
    landUse: "Residential",
    registration: "Verified",
    mutation: "Completed",
    tax: "Paid",
    zoning: "Residential",
    building: "Approved",
    dispute: "None",
    status: "Registered"
  },

  "P-106": {
    area: "1,750 m²",
    owner: "District Board",
    landUse: "Government",
    registration: "Verified",
    mutation: "Completed",
    tax: "Paid",
    zoning: "Public / Institutional",
    building: "Not Applicable",
    dispute: "None",
    status: "Govt. Land"
  }

};


/* =========================================================
   DOM
   ========================================================= */

const navToggle =
  document.getElementById("navToggle");

const navLinks =
  document.getElementById("navLinks");

const searchInput =
  document.getElementById("parcelSearch");

const searchBtn =
  document.getElementById("searchBtn");

const autocompleteList =
  document.getElementById("autocompleteList");

const mapContainer =
  document.getElementById("mapContainer");

const parcelOverlay =
  document.getElementById("parcelOverlay");

const tooltip =
  document.getElementById("parcelTooltip");

const tooltipClose =
  document.getElementById("tooltipClose");

const tooltipId =
  document.getElementById("tooltipId");

const tooltipOwner =
  document.getElementById("tooltipOwner");

const tooltipArea =
  document.getElementById("tooltipArea");

const tooltipLandUse =
  document.getElementById("tooltipLandUse");

const tooltipStatus =
  document.getElementById("tooltipStatus");

const moreInfoBtn =
  document.getElementById("moreInfoBtn");

const parcelElements =
  Array.from(
    document.querySelectorAll(".parcel")
  );

const ALL_IDS =
  Object.keys(PARCELS);

let zoomLevel = 1;

let selectedParcelId = null;


/* =========================================================
   MOBILE NAV
   ========================================================= */

if (navToggle) {

  navToggle.addEventListener("click", () => {

    const opened =
      navLinks.classList.toggle("open");

    navToggle.setAttribute(
      "aria-expanded",
      String(opened)
    );

  });

}


/* =========================================================
   SEARCH AUTOCOMPLETE
   IMPORTANT:
   Supports:
   101
   P-101
   p101
   survey number
   ========================================================= */

function normalizeSearch(value) {

  return value
    .trim()
    .toUpperCase()
    .replace(/\s+/g, "");

}


function getMatches(query) {

  const normalized =
    normalizeSearch(query);

  if (!normalized) {
    return [];
  }

  return ALL_IDS.filter(id => {

    const cleanId =
      id.replace("-", "");

    return (
      id.includes(normalized) ||
      cleanId.includes(normalized) ||
      id.replace("P-", "").includes(normalized)
    );

  });

}


if (searchInput) {

  searchInput.addEventListener(
    "input",
    () => {

      const query =
        searchInput.value;

      autocompleteList.innerHTML = "";

      if (!query.trim()) {

        autocompleteList.classList.remove(
          "show"
        );

        return;
      }


      const matches =
        getMatches(query);


      if (!matches.length) {

        autocompleteList.classList.remove(
          "show"
        );

        return;
      }


      matches.forEach(id => {

        const li =
          document.createElement("li");

        li.className =
          "autocomplete-item";


        const data =
          PARCELS[id];


        li.innerHTML = `
          <div class="suggestion-main">
            <span class="suggestion-id">${id}</span>
            <span class="suggestion-owner">
              ${data.owner}
            </span>
          </div>

          <span class="suggestion-arrow">→</span>
        `;


        li.addEventListener(
          "click",
          () => {

            searchInput.value = id;

            autocompleteList.classList.remove(
              "show"
            );

            selectParcel(id);

          }
        );


        autocompleteList.appendChild(li);

      });


      autocompleteList.classList.add(
        "show"
      );

    }
  );

}


/* =========================================================
   SEARCH BUTTON
   ========================================================= */

function triggerSearch() {

  const matches =
    getMatches(searchInput.value);


  if (!searchInput.value.trim()) {

    searchInput.focus();

    return;

  }


  if (matches.length) {

    selectParcel(matches[0]);

    return;

  }


  alert(
    "No parcel found. Try P-101, P-102, P-103..."
  );

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

      if (event.key === "Enter") {

        event.preventDefault();

        triggerSearch();

      }

    }
  );

}


/* =========================================================
   UPDATE QUICK INFO
   ========================================================= */

function updateQuickInfo(id) {

  const data =
    PARCELS[id];

  if (!data) return;


  tooltipId.textContent =
    id;

  tooltipOwner.textContent =
    data.owner;

  tooltipArea.textContent =
    data.area;

  tooltipLandUse.textContent =
    data.landUse;

  tooltipStatus.textContent =
    data.status;


  tooltipStatus.classList.remove(
    "status-good",
    "status-warning",
    "status-government"
  );


  if (
    data.status === "Registered"
  ) {

    tooltipStatus.classList.add(
      "status-good"
    );

  }

  else if (
    data.status === "Under Review"
  ) {

    tooltipStatus.classList.add(
      "status-warning"
    );

  }

  else {

    tooltipStatus.classList.add(
      "status-government"
    );

  }

}


/* =========================================================
   SELECT PARCEL
   ========================================================= */

function selectParcel(id) {

  const target =
    document.querySelector(
      `.parcel[data-id="${id}"]`
    );


  if (!target) return;


  selectedParcelId =
    id;


  /* Remove old selection */

  parcelElements.forEach(
    parcel => {

      parcel.classList.remove(
        "parcel--selected"
      );

      parcel.classList.remove(
        "parcel--flash"
      );

      parcel.setAttribute(
        "aria-pressed",
        "false"
      );

    }
  );


  /* Select new parcel */

  target.classList.add(
    "parcel--selected"
  );

  target.classList.add(
    "parcel--flash"
  );

  target.setAttribute(
    "aria-pressed",
    "true"
  );


  /* Update compact information */

  updateQuickInfo(id);


  /* Open card */

  tooltip.hidden = false;


  /* Update details page link */

  if (moreInfoBtn) {

    moreInfoBtn.href =
      `parcel-details.html?id=${encodeURIComponent(id)}`;

  }


  /* Remove flash after animation */

  setTimeout(
    () => {

      target.classList.remove(
        "parcel--flash"
      );

    },
    800
  );

}


/* =========================================================
   PARCEL CLICK
   ========================================================= */

parcelElements.forEach(
  parcel => {

    parcel.addEventListener(
      "click",
      () => {

        selectParcel(
          parcel.dataset.id
        );

      }
    );


    parcel.addEventListener(
      "keydown",
      event => {

        if (
          event.key === "Enter" ||
          event.key === " "
        ) {

          event.preventDefault();

          selectParcel(
            parcel.dataset.id
          );

        }

      }
    );

  }
);


/* =========================================================
   CLOSE CARD
   ========================================================= */

if (tooltipClose) {

  tooltipClose.addEventListener(
    "click",
    () => {

      tooltip.hidden = true;

      selectedParcelId = null;


      parcelElements.forEach(
        parcel => {

          parcel.classList.remove(
            "parcel--selected"
          );

          parcel.classList.remove(
            "parcel--flash"
          );

          parcel.setAttribute(
            "aria-pressed",
            "false"
          );

        }
      );

    }
  );

}


/* =========================================================
   MAP ENTRANCE
   ========================================================= */

window.addEventListener(
  "load",
  () => {

    setTimeout(
      () => {

        mapContainer.classList.add(
          "map-ready"
        );

      },
      120
    );

  }
);


/* =========================================================
   CURSOR MAP MOVEMENT
   More noticeable than previous version
   ========================================================= */

if (mapContainer) {

  mapContainer.addEventListener(
    "mousemove",
    event => {

      const rect =
        mapContainer.getBoundingClientRect();


      const x =
        event.clientX - rect.left;

      const y =
        event.clientY - rect.top;


      const percentX =
        (x / rect.width) - 0.5;

      const percentY =
        (y / rect.height) - 0.5;


      /*
        Increased from previous version.

        Horizontal:
        approx ±14px

        Vertical:
        approx ±10px
      */

      const moveX =
        percentX * 28;

      const moveY =
        percentY * 20;


      mapContainer.style.setProperty(
        "--map-x",
        `${-moveX}px`
      );

      mapContainer.style.setProperty(
        "--map-y",
        `${-moveY}px`
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
   ZOOM
   ========================================================= */

const zoomIn =
  document.getElementById("zoomIn");

const zoomOut =
  document.getElementById("zoomOut");


function updateZoom() {

  parcelOverlay.style.setProperty(
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
          2,
          zoomLevel + 0.1
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
          0.7,
          zoomLevel - 0.1
        );

      updateZoom();

    }
  );

}


/* =========================================================
   DEFAULT
   ========================================================= */

document.addEventListener(
  "DOMContentLoaded",
  () => {

    updateZoom();

    /*
      Keep default parcel selected.
      This can be removed later if desired.
    */

    selectParcel("P-103");

  }
);


/* =========================================================
   ACTION BUTTONS
   ========================================================= */

const actionButtons =
  document.querySelectorAll(
    ".map-action-btn"
  );


actionButtons.forEach(
  button => {

    button.addEventListener(
      "click",
      () => {

        actionButtons.forEach(
          btn => {

            btn.classList.remove(
              "active"
            );

          }
        );


        button.classList.add(
          "active"
        );

      }
    );

  }
);


/* =========================================================
   SEARCH PARCEL BUTTON
   ========================================================= */

const btnSearchParcel =
  document.getElementById(
    "btnSearchParcel"
  );


if (btnSearchParcel) {

  btnSearchParcel.addEventListener(
    "click",
    () => {

      document
        .querySelector(".hero")
        ?.scrollIntoView({
          behavior: "smooth"
        });


      setTimeout(
        () => {

          searchInput?.focus();

        },
        500
      );

    }
  );

}