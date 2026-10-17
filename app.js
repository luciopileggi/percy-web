(function () {
  const data = window.SHELLEY_ATLAS_DATA;
  if (!data) return;

  const mapNode = document.getElementById("atlasMap");
  const mapShell = document.getElementById("mapShell");
  const placesList = document.getElementById("placesList");
  const detailCard = document.getElementById("detailCard");
  const relationLegend = document.getElementById("relationLegend");
  const heroStats = document.getElementById("heroStats");
  const relationFilterGroup = document.getElementById("relationFilterGroup");
  const countryFilterGroup = document.getElementById("countryFilterGroup");
  const historicalStateFilterGroup = document.getElementById("historicalStateFilterGroup");
  const peopleFilterGroup = document.getElementById("peopleFilterGroup");
  const yearFromFilter = document.getElementById("yearFromFilter");
  const yearToFilter = document.getElementById("yearToFilter");
  const clearFiltersButton = document.getElementById("clearFilters");
  const fullscreenToggle = document.getElementById("fullscreenToggle");
  const collapsiblePanels = [...document.querySelectorAll(".panel--collapsible")];
  const journeyBack = document.getElementById("journeyBack");
  const journeyForward = document.getElementById("journeyForward");
  const journeyStepInput = document.getElementById("journeyStepInput");
  const journeyTotal = document.getElementById("journeyTotal");
  const journeyStepList = document.getElementById("journeyStepList");
  const activePassageBadge = document.getElementById("activePassageBadge");
  const journeyFilmstrip = document.getElementById("journeyFilmstrip");
  const journeyFilmstripLabel = document.getElementById("journeyFilmstripLabel");
  const mapPassageBadge = document.getElementById("mapPassageBadge");
  const peopleList = document.getElementById("peopleList");
  const sourcesList = document.getElementById("sourcesList");
  const placeSearch = document.getElementById("placeSearch");
  const searchClear = document.getElementById("searchClear");

  if (!window.maplibregl || !mapNode || !mapShell) {
    detailCard.innerHTML = `
      <p class="detail-kicker">Map unavailable</p>
      <h3>MapLibre GL is not loaded</h3>
      <p>Check the connection and reload the page to see the map.</p>
    `;
    return;
  }

  const relationOrder = ["born", "studied", "lived", "visited", "death", "memory"];

  const palette = {
    born: "#b67e2b",
    studied: "#7d5a50",
    lived: "#a44a3f",
    visited: "#446b7c",
    death: "#2d4558",
    memory: "#73844d"
  };

  const relationLabels = {
    born: "Birth and childhood",
    studied: "Study",
    lived: "Residences",
    visited: "Visits",
    death: "Death and aftermath",
    memory: "Plaques and memorials"
  };

  const relationDescriptions = {
    born: "Birthplaces, baptisms, and documented childhood settings",
    studied: "Schools, colleges, and places of education",
    lived: "Documented residences and sustained stays",
    visited: "Visits, travel stops, and related stops",
    death: "Death, recovery of the body, cremation, and burial",
    memory: "Monuments, plaques, and later commemorative places"
  };
  const monthShortFormatter = new Intl.DateTimeFormat("en", { month: "short", timeZone: "UTC" });
  const dayMonthFormatter = new Intl.DateTimeFormat("en", { day: "numeric", month: "short", timeZone: "UTC" });
  const dayMonthYearFormatter = new Intl.DateTimeFormat("en", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });
  const peopleData = data.people || {};
  const companionRegistry = peopleData.registry || {};
  const companionAliases = peopleData.aliases || {};
  const peopleMedia = (data.media && data.media.people) || {};
  const allRegistryPeople = Object.keys(companionRegistry)
    .map((personId) => personMeta(personId))
    .sort((a, b) => (a.label || a.id).localeCompare(b.label || b.id));

  const historicalStateOrder = [
    "Kingdom of Sardinia (Regno di Sardegna)",
    "Kingdom of Lombardy-Venetia (Regno Lombardo-Veneto, under Austrian rule)",
    "Duchy of Parma, Piacenza and Guastalla (Ducato di Parma, Piacenza e Guastalla)",
    "Grand Duchy of Tuscany (Granducato di Toscana)",
    "Duchy of Lucca (Ducato di Lucca)",
    "Papal States (Stato Pontificio)",
    "Kingdom of the Two Sicilies (Regno delle Due Sicilie)"
  ];
  const unitedKingdomCountries = new Set(["England", "Scotland", "Wales"]);

  const placeIndex = new Map(data.places.map((place) => [place.id, place]));
  let activeId = data.places[0] && data.places[0].id;
  const europeBounds = [
    [-12.5, 30],
    [42.5, 66]
  ];
  const mapStyle = {
    version: 8,
    sources: {
      "osm-raster": {
        type: "raster",
        tiles: ["https://tile.openstreetmap.org/{z}/{x}/{y}.png"],
        tileSize: 256,
        maxzoom: 19,
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
      }
    },
    layers: [
      {
        id: "osm-raster",
        type: "raster",
        source: "osm-raster"
      }
    ]
  };
  const map = new window.maplibregl.Map({
    container: mapNode,
    style: mapStyle,
    center: [14.5, 46],
    zoom: 3.6,
    minZoom: 3,
    maxZoom: 19,
    attributionControl: true,
    dragRotate: false,
    pitchWithRotate: false,
    touchPitch: false
  });
  let mapLoaded = false;
  const markers = [];
  const hoverPopup = new window.maplibregl.Popup({
    closeButton: false,
    closeOnClick: false,
    closeOnMove: true,
    offset: 18,
    className: "map-tooltip"
  });

  map.addControl(
    new window.maplibregl.NavigationControl({
      showCompass: false,
      visualizePitch: false
    }),
    "bottom-right"
  );
  const selectedRelations = new Set();
  const selectedCountries = new Set();
  const selectedHistoricalStates = new Set();
  const selectedPeople = new Set();
  let searchQuery = "";
  const baseCountries = [...new Set(data.places.map((place) => place.country))].sort((a, b) => a.localeCompare(b));
  const availableCountries = unitedKingdomCountries.size > 0 && baseCountries.some((country) => unitedKingdomCountries.has(country))
    ? ["United Kingdom", ...baseCountries]
    : baseCountries;
  const availableItalianHistoricalStates = [...new Set(
    data.places
      .filter((place) => place.country === "Italy" && place.historicalState && !place.historicalState.startsWith("At sea"))
      .map((place) => place.historicalState)
  )].sort((a, b) => {
    const orderA = historicalStateOrder.indexOf(a);
    const orderB = historicalStateOrder.indexOf(b);
    if (orderA !== -1 || orderB !== -1) {
      if (orderA === -1) return 1;
      if (orderB === -1) return -1;
      return orderA - orderB;
    }

    return a.localeCompare(b);
  });
  const availableYears = [...new Set(
    data.places.flatMap((place) => {
      const years = [];
      const startYear = yearFromDate(place.startDate);
      const endYear = yearFromDate(place.endDate);
      if (startYear !== null) years.push(startYear);
      if (endYear !== null) years.push(endYear);
      return years;
    })
  )].sort((a, b) => a - b);
  const availablePeople = [...new Set(
    data.places.flatMap((place) => peopleForPlace(place).map((person) => person.id))
  )]
    .map((personId) => personMeta(personId))
    .filter(Boolean)
    .sort((a, b) => (a.label || a.id).localeCompare(b.label || b.id));
  const atlasSources = (data.sources && data.sources.length)
    ? [...data.sources].sort((a, b) => {
        const publisherCompare = (a.publisher || "").localeCompare(b.publisher || "");
        if (publisherCompare !== 0) return publisherCompare;
        return (a.title || "").localeCompare(b.title || "");
      })
    : buildSourcesCatalogFromPlaces(data.places);
  const collapsedPanelState = loadCollapsedPanelState();

  function loadCollapsedPanelState() {
    try {
      const raw = window.localStorage.getItem("shelleyAtlasCollapsedPanels");
      if (!raw) return new Set(["places", "people"]);

      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? new Set(parsed) : new Set(["places", "people"]);
    } catch (error) {
      return new Set(["places", "people"]);
    }
  }

  function saveCollapsedPanelState() {
    try {
      window.localStorage.setItem(
        "shelleyAtlasCollapsedPanels",
        JSON.stringify([...collapsedPanelState])
      );
    } catch (error) {
      // Ignore storage failures and keep the current in-memory state.
    }
  }

  function syncCollapsiblePanel(panel) {
    const key = panel.dataset.panelKey;
    if (!key) return;

    const body = panel.querySelector(".panel-body");
    const toggle = panel.querySelector("[data-panel-toggle]");
    const toggleLabel = toggle && toggle.querySelector("[data-panel-toggle-label]");
    const collapsed = collapsedPanelState.has(key);

    panel.classList.toggle("is-collapsed", collapsed);

    if (body) {
      body.hidden = collapsed;
    }

    if (toggle) {
      toggle.setAttribute("aria-expanded", String(!collapsed));
    }

    if (toggleLabel) {
      toggleLabel.textContent = collapsed ? "Show" : "Hide";
    }
  }

  function initializeCollapsiblePanels() {
    collapsiblePanels.forEach((panel) => {
      syncCollapsiblePanel(panel);

      const toggle = panel.querySelector("[data-panel-toggle]");
      if (!toggle) return;

      toggle.addEventListener("click", () => {
        const key = panel.dataset.panelKey;
        if (!key) return;

        if (collapsedPanelState.has(key)) {
          collapsedPanelState.delete(key);
        } else {
          collapsedPanelState.add(key);
        }

        syncCollapsiblePanel(panel);
        saveCollapsedPanelState();
      });
    });
  }

  function yearFromDate(value) {
    if (!value) return null;

    const year = Number.parseInt(String(value).slice(0, 4), 10);
    return Number.isNaN(year) ? null : year;
  }

  function slugifyName(value) {
    return String(value || "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");
  }

  function escapeHtml(value) {
    return String(value || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function imageMarkup(image, variant) {
    if (!image || !image.src) return "";

    const imageTag = `
      <img
        class="media-figure__image"
        src="${escapeHtml(image.src)}"
        alt="${escapeHtml(image.alt || image.title || "")}"
        loading="lazy"
        decoding="async"
        referrerpolicy="no-referrer"
      >
    `;
    const linkedImage = image.pageUrl
      ? `<a class="media-figure__link" href="${escapeHtml(image.pageUrl)}" target="_blank" rel="noreferrer">${imageTag}</a>`
      : imageTag;
    const captionTitle = image.title
      ? (
          image.pageUrl
            ? `<a href="${escapeHtml(image.pageUrl)}" target="_blank" rel="noreferrer">${escapeHtml(image.title)}</a>`
            : escapeHtml(image.title)
        )
      : "";
    const captionMeta = [
      image.provider,
      image.license,
      image.credit ? `Credit: ${image.credit}` : ""
    ].filter(Boolean).map(escapeHtml).join(" · ");

    return `
      <figure class="media-figure media-figure--${variant}">
        ${linkedImage}
        <figcaption class="media-figure__caption">
          ${captionTitle ? `<span class="media-figure__title">${captionTitle}</span>` : ""}
          ${captionMeta ? `<span class="media-figure__meta">${captionMeta}</span>` : ""}
        </figcaption>
      </figure>
    `;
  }

  function personMeta(personId, fallbackLabel = "") {
    if (companionRegistry[personId]) {
      return {
        id: personId,
        ...companionRegistry[personId],
        image: peopleMedia[personId] || null
      };
    }

    return {
      id: personId,
      label: fallbackLabel || personId,
      circle: "Documented companion",
      image: peopleMedia[personId] || null
    };
  }

  function buildSourcesCatalogFromPlaces(places) {
    const sourceMap = new Map();

    places.forEach((place) => {
      (place.sources || []).forEach((source) => {
        const existing = sourceMap.get(source.id) || {
          ...source,
          citationIds: new Set()
        };
        existing.citationIds.add(place.id);
        sourceMap.set(source.id, existing);
      });
    });

    return [...sourceMap.values()]
      .map((source) => ({
        id: source.id,
        title: source.title,
        publisher: source.publisher,
        url: source.url,
        citationCount: source.citationIds.size
      }))
      .sort((a, b) => {
        const publisherCompare = (a.publisher || "").localeCompare(b.publisher || "");
        if (publisherCompare !== 0) return publisherCompare;
        return (a.title || "").localeCompare(b.title || "");
      });
  }

  function peopleForPlace(place) {
    const seen = new Set();

    return (place.companions || []).map((name) => {
      const personId = companionAliases[name] || slugifyName(name);
      if (seen.has(personId)) return null;
      seen.add(personId);
      return personMeta(personId, name);
    }).filter(Boolean);
  }

  function peopleMatchesPlace(place) {
    return selectedPeople.size === 0 || peopleForPlace(place).some((person) => selectedPeople.has(person.id));
  }

  function compareIsoDates(a, b) {
    if (!a && !b) return 0;
    if (!a) return 1;
    if (!b) return -1;
    return a.localeCompare(b);
  }

  function yearSpanLabel(startDate, endDate) {
    const startYear = yearFromDate(startDate);
    const endYear = yearFromDate(endDate);

    if (startYear === null && endYear === null) return "Undated";
    if (startYear !== null && endYear !== null && startYear !== endYear) {
      return `${startYear}-${endYear}`;
    }

    return String(startYear ?? endYear);
  }

  function countriesPreview(countries) {
    if (countries.length <= 4) return countries.join(", ");
    return `${countries.slice(0, 4).join(", ")} + ${countries.length - 4} more`;
  }

  function notablePersonEvents(personId) {
    return (companionRegistry[personId] && companionRegistry[personId].lifeEvents) || "";
  }

  function relationToPercy(personId) {
    return (companionRegistry[personId] && companionRegistry[personId].relation) || "";
  }

  function buildPeopleSummaries(places) {
    const summaries = new Map();

    places
      .filter((place) => place.relationGroup !== "memory")
      .forEach((place) => {
        const placePeople = peopleForPlace(place);
        if (!placePeople.length) return;

        placePeople.forEach((person) => {
          const existing = summaries.get(person.id) || {
            id: person.id,
            label: person.label,
            circle: person.circle,
            years: person.years || "",
            image: person.image || null,
            firstDate: place.startDate || place.endDate || "",
            lastDate: place.endDate || place.startDate || "",
            placeCount: 0,
            stayCount: 0,
            travelCount: 0,
            aftermathCount: 0,
            countries: new Set(),
            highlights: [],
            highlightNames: new Set()
          };

          const startDate = place.startDate || place.endDate || "";
          const endDate = place.endDate || place.startDate || "";

          if (compareIsoDates(startDate, existing.firstDate) < 0) {
            existing.firstDate = startDate;
          }

          if (compareIsoDates(endDate, existing.lastDate) > 0) {
            existing.lastDate = endDate;
          }

          existing.placeCount += 1;
          existing.countries.add(place.country);

          if (place.relationGroup === "visited") {
            existing.travelCount += 1;
          } else if (place.relationGroup === "death") {
            existing.aftermathCount += 1;
          } else {
            existing.stayCount += 1;
          }

          if (!existing.highlightNames.has(place.placeName) && existing.highlights.length < 4) {
            existing.highlightNames.add(place.placeName);
            existing.highlights.push(place.placeName);
          }

          summaries.set(person.id, existing);
        });
      });

    return [...summaries.values()]
      .filter((person) => selectedPeople.size === 0 || selectedPeople.has(person.id))
      .map((person) => {
        const countries = [...person.countries].sort((a, b) => a.localeCompare(b));
        const segments = [];

        if (person.stayCount) {
          segments.push(`${person.stayCount} residence or long-stay ${person.stayCount === 1 ? "record" : "records"}`);
        }
        if (person.travelCount) {
          segments.push(`${person.travelCount} visit or travel-stage ${person.travelCount === 1 ? "record" : "records"}`);
        }
        if (person.aftermathCount) {
          segments.push(`${person.aftermathCount} aftermath ${person.aftermathCount === 1 ? "record" : "records"}`);
        }

        return {
          id: person.id,
          label: person.label,
          circle: person.circle,
          years: person.years || "",
          relation: relationToPercy(person.id),
          image: person.image || null,
          timeSpan: yearSpanLabel(person.firstDate, person.lastDate),
          countries,
          placeCount: person.placeCount,
          highlights: person.highlights,
          lifeEvents: notablePersonEvents(person.id),
          summary: `Documented together across ${person.placeCount} ${person.placeCount === 1 ? "place" : "places"} from ${yearSpanLabel(person.firstDate, person.lastDate)} in ${countriesPreview(countries)}. Shared ${segments.join(", ")}.`
        };
      })
      .sort((a, b) => a.label.localeCompare(b.label));
  }

  function activeYearRange() {
    return {
      from: yearFromFilter && yearFromFilter.value ? Number.parseInt(yearFromFilter.value, 10) : null,
      to: yearToFilter && yearToFilter.value ? Number.parseInt(yearToFilter.value, 10) : null
    };
  }

  function historicalStateFilterLabel(value) {
    return value.replace(/\s+\(.+\)$/, "");
  }

  function filteredPlaces() {
    const { from, to } = activeYearRange();

    return data.places.filter((place) => {
      const relationMatches = selectedRelations.size === 0 || selectedRelations.has(place.relationGroup);
      const countryMatches = selectedCountries.size === 0 || selectedCountries.has(place.country) || (
        selectedCountries.has("United Kingdom") && unitedKingdomCountries.has(place.country)
      );
      const historicalStateMatches =
        selectedHistoricalStates.size === 0 || (place.historicalState && selectedHistoricalStates.has(place.historicalState));
      const peopleMatches = peopleMatchesPlace(place);
      const startYear = yearFromDate(place.startDate);
      const endYear = yearFromDate(place.endDate) ?? startYear;
      const yearMatches = (!from && !to) || (
        startYear !== null &&
        endYear !== null &&
        (!from || endYear >= from) &&
        (!to || startYear <= to)
      );
      const searchMatches = !searchQuery || place.placeName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                           (place.locality && place.locality.toLowerCase().includes(searchQuery.toLowerCase())) ||
                           (place.region && place.region.toLowerCase().includes(searchQuery.toLowerCase()));
      return relationMatches && countryMatches && historicalStateMatches && peopleMatches && yearMatches && searchMatches;
    });
  }

  function ensureActivePlace(places) {
    if (!places.find((place) => place.id === activeId)) {
      activeId = places[0] && places[0].id;
    }
  }

  function activeIndex(places) {
    return places.findIndex((place) => place.id === activeId);
  }

  function siteIdForPlace(place) {
    if (place.siteId) return place.siteId;

    const basis = [place.placeName, place.modernAddress || place.locality, place.country].filter(Boolean).join("--");
    return `site-${slugifyName(basis)}`;
  }

  function buildSitesFromPassages(places) {
    const groups = new Map();

    places.forEach((place, index) => {
      const siteId = siteIdForPlace(place);
      if (!groups.has(siteId)) {
        groups.set(siteId, {
          id: siteId,
          placeName: place.placeName,
          placeType: place.placeType,
          locality: place.locality,
          region: place.region,
          country: place.country,
          modernAddress: place.modernAddress,
          historicalState: place.historicalState,
          image: place.image,
          latitude: place.latitude,
          longitude: place.longitude,
          relationGroups: new Set(),
          passages: []
        });
      }

      const site = groups.get(siteId);
      site.relationGroups.add(place.relationGroup);
      if (!site.image && place.image) site.image = place.image;
      if (!site.modernAddress && place.modernAddress) site.modernAddress = place.modernAddress;
      if (!site.historicalState && place.historicalState) site.historicalState = place.historicalState;
      site.passages.push(Object.assign({ timelineIndex: index + 1 }, place));
    });

    return [...groups.values()]
      .map((site) => {
        const activePassage = site.passages.find((passage) => passage.id === activeId) || site.passages[0];
        const works = [...new Set(site.passages.flatMap((passage) => passage.works || []))];
        const sourcesMap = new Map();

        site.passages.forEach((passage) => {
          passage.sources.forEach((source) => {
            if (!sourcesMap.has(source.id)) {
              sourcesMap.set(source.id, source);
            }
          });
        });

        return Object.assign(site, {
          activePassage,
          primaryRelationGroup: activePassage.relationGroup,
          relationGroups: [...site.relationGroups],
          passageCount: site.passages.length,
          works,
          sources: [...sourcesMap.values()]
        });
      })
      .sort((first, second) => first.passages[0].timelineIndex - second.passages[0].timelineIndex);
  }

  function renderActivePassageBadge(places) {
    if (!activePassageBadge) return;

    if (!places.length) {
      activePassageBadge.innerHTML = "";
      activePassageBadge.hidden = true;
      return;
    }

    const index = Math.max(activeIndex(places), 0);
    const place = places[index];
    const eventLabel = passageEventLabel(place);
    activePassageBadge.hidden = false;
    activePassageBadge.innerHTML = `
      <span class="journey-status__kicker">Passage ${index + 1} of ${places.length}</span>
      <strong class="journey-status__date">${temporalLabel(place)}</strong>
      <span class="journey-status__place">${place.placeName}</span>
      <span class="journey-status__type">${eventLabel}</span>
    `;
  }

  function renderMapPassageBadge(places) {
    if (!mapPassageBadge) return;

    if (!places.length) {
      mapPassageBadge.innerHTML = "";
      mapPassageBadge.hidden = true;
      return;
    }

    const index = Math.max(activeIndex(places), 0);
    const place = places[index];
    const placeLabel = timelinePlaceLabel(place);
    mapPassageBadge.hidden = false;
    mapPassageBadge.innerHTML = `
      <div class="map-passage-badge__controls" aria-label="Journey navigation on the map">
        <button
          type="button"
          class="map-passage-badge__button map-passage-badge__button--nav"
          data-journey-action="back"
          aria-label="Previous passage"
          title="Previous passage"${index <= 0 ? " disabled" : ""}>&lt;</button>
        <button type="button" class="map-passage-badge__button map-passage-badge__button--current" data-journey-action="current" aria-label="Current passage ${index + 1} of ${places.length}">
          ${index + 1} of ${places.length}
        </button>
        <button
          type="button"
          class="map-passage-badge__button map-passage-badge__button--nav"
          data-journey-action="forward"
          aria-label="Next passage"
          title="Next passage"${index >= places.length - 1 ? " disabled" : ""}>&gt;</button>
      </div>
      <div class="map-passage-badge__body">
        <strong>${temporalLabel(place)}</strong>
        <span>${escapeHtml(placeLabel)}</span>
      </div>
    `;

    mapPassageBadge.querySelectorAll("[data-journey-action]").forEach((button) => {
      button.addEventListener("click", () => {
        const action = button.dataset.journeyAction;
        if (action === "back") {
          stepJourney(-1);
          return;
        }

        if (action === "forward") {
          stepJourney(1);
          return;
        }

        const activeButton = journeyFilmstrip && journeyFilmstrip.querySelector(".journey-stop.is-active");
        if (activeButton) {
          activeButton.scrollIntoView({ inline: "center", block: "nearest" });
          activeButton.focus({ preventScroll: true });
        }
      });
    });
  }

  function renderJourneyFilmstrip(places) {
    if (!journeyFilmstrip) return;

    if (!places.length) {
      journeyFilmstrip.innerHTML = `
        <div class="journey-filmstrip__empty">
          <p>No passages match the current filters.</p>
        </div>
      `;
      return;
    }

    journeyFilmstrip.innerHTML = places.map((place, placeIndex) => {
      const periodLabel = passagePeriodLabel(place);
      const placeLabel = timelinePlaceLabel(place);

      return `
        <button
          type="button"
          class="journey-stop journey-stop--${place.relationGroup}${place.id === activeId ? " is-active" : ""}"
          data-passage-id="${place.id}"
          aria-label="Passage ${placeIndex + 1}, ${escapeHtml(periodLabel)}, ${escapeHtml(temporalLabel(place))}, ${escapeHtml(passageEventLabel(place))}, ${escapeHtml(place.placeName)}"
          title="${escapeHtml(place.placeName)}"
        >
          <span class="journey-stop__place">${escapeHtml(placeLabel)}</span>
          <span class="journey-stop__dot" aria-hidden="true"></span>
          <span class="journey-stop__date">${escapeHtml(temporalLabel(place, { compact: true }))}</span>
        </button>
      `;
    }).join("");

    journeyFilmstrip.querySelectorAll("[data-passage-id]").forEach((button) => {
      button.addEventListener("click", () => {
        activatePlace(button.dataset.passageId, { fitBounds: false, focusActive: true });
      });
    });

    const activeButton = journeyFilmstrip.querySelector(".journey-stop.is-active");
    if (!activeButton) return;

    window.requestAnimationFrame(() => {
      activeButton.scrollIntoView({ inline: "center", block: "nearest" });
    });
  }

  function renderJourneyOptions(places) {
    if (!journeyStepList) return;

    journeyStepList.innerHTML = "";

    places.forEach((place, index) => {
      const option = document.createElement("option");
      option.value = `${index + 1} - ${temporalLabel(place, { compact: true })} - ${place.placeName}`;
      journeyStepList.appendChild(option);
    });
  }

  function renderJourneyFilmstripLabel(places) {
    if (!journeyFilmstripLabel) return;
    journeyFilmstripLabel.textContent = "";
    journeyFilmstripLabel.hidden = true;
  }

  function renderJourneyControls(places) {
    if (!journeyBack || !journeyForward || !journeyStepInput || !journeyTotal) return;

    if (!places.length) {
      journeyStepInput.value = "";
      journeyStepInput.disabled = true;
      journeyTotal.textContent = "of 0";
      journeyBack.disabled = true;
      journeyForward.disabled = true;
      renderJourneyOptions([]);
      renderActivePassageBadge([]);
      renderMapPassageBadge([]);
      renderJourneyFilmstripLabel([]);
      renderJourneyFilmstrip([]);
      return;
    }

    const index = Math.max(activeIndex(places), 0);
    journeyStepInput.disabled = false;
    journeyStepInput.value = String(index + 1);
    journeyTotal.textContent = `of ${places.length}`;
    journeyBack.disabled = index <= 0;
    journeyForward.disabled = index >= places.length - 1;
    renderJourneyOptions(places);
    renderActivePassageBadge(places);
    renderMapPassageBadge(places);
    renderJourneyFilmstripLabel(places);
    renderJourneyFilmstrip(places);
  }

  function commitJourneyInput() {
    if (!journeyStepInput) return;

    const places = filteredPlaces();
    ensureActivePlace(places);

    if (!places.length) return;

    const match = journeyStepInput.value.match(/\d+/);
    if (!match) {
      renderJourneyControls(places);
      return;
    }

    const requested = Number.parseInt(match[0], 10);
    if (Number.isNaN(requested)) {
      renderJourneyControls(places);
      return;
    }

    const nextIndex = Math.min(Math.max(requested, 1), places.length) - 1;
    activatePlace(places[nextIndex].id, { fitBounds: false, focusActive: true });
  }

  function companionPreview(place, limit = 3) {
    if (place.companions && place.companions.length) {
      if (place.companions.length <= limit) {
        return place.companions.join(", ");
      }

      return `${place.companions.slice(0, limit).join(", ")} + ${place.companions.length - limit} more`;
    }

    const note = place.companionsNote || "Not specified.";
    if (note.length <= 96) return note;

    const firstSentence = note.match(/^[^.?!]+[.?!]/);
    return firstSentence ? firstSentence[0] : note;
  }

  function shouldShowCompanions(place) {
    return (place.companions && place.companions.length) || place.companionsNote !== "Not applicable: this is a commemorative site rather than a biographical stay.";
  }

  function companionDetail(place) {
    if (place.companions && place.companions.length) {
      return place.companions.join(", ");
    }

    return place.companionsNote || "Not specified.";
  }

  function parseIsoDate(value) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value || "")) return null;

    const [year, month, day] = value.split("-").map((part) => Number.parseInt(part, 10));
    return {
      year,
      month,
      day,
      date: new Date(Date.UTC(year, month - 1, day))
    };
  }

  function isYearOnlyDate(parts, approximate) {
    return Boolean(parts && approximate && parts.month === 1 && parts.day === 1);
  }

  function humanizeRelationType(value) {
    return String(value || "")
      .split(/[_-]+/)
      .filter(Boolean)
      .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
      .join(" ");
  }

  function passageEventLabel(place) {
    if (place.relationGroup === "memory") {
      return humanizeRelationType(place.relationType || "memorial");
    }

    return relationLabels[place.relationGroup] || humanizeRelationType(place.relationType);
  }

  function passagePeriodLabel(place) {
    return String(place?.lifePeriodLabel || "").trim();
  }

  function timelinePlaceLabel(place) {
    const raw = String(place?.placeName || place?.locality || "").trim();
    if (!raw) return "Unknown place";

    const primary = raw.split(" / ")[0].trim();
    if (primary.length <= 28) return primary;

    const locality = String(place?.locality || "").trim();
    if (locality && locality.length <= 24) return locality;

    const commaShort = primary.split(",")[0].trim();
    if (commaShort && commaShort.length <= 28) return commaShort;

    return primary;
  }

  function formatSingleTemporal(parts, approximate) {
    if (!parts) return "Date unknown";
    if (isYearOnlyDate(parts, approximate)) return String(parts.year);
    return dayMonthYearFormatter.format(parts.date);
  }

  function formatTemporalRange(startParts, endParts, startApproximate, endApproximate, compact = false) {
    if (!startParts && !endParts) return "Date unknown";
    if (!startParts || !endParts) {
      return formatSingleTemporal(startParts || endParts, startParts ? startApproximate : endApproximate);
    }

    const sameDay = startParts.year === endParts.year && startParts.month === endParts.month && startParts.day === endParts.day;
    if (sameDay) return formatSingleTemporal(startParts, startApproximate || endApproximate);

    const fullYearRange = startApproximate
      && endApproximate
      && startParts.year === endParts.year
      && startParts.month === 1 && startParts.day === 1
      && endParts.month === 12 && endParts.day === 31;
    if (fullYearRange) return String(startParts.year);

    if (startParts.year === endParts.year) {
      if (compact) {
        if (startParts.month === endParts.month) {
          return `${monthShortFormatter.format(startParts.date)} ${startParts.year}`;
        }

        return `${monthShortFormatter.format(startParts.date)}-${monthShortFormatter.format(endParts.date)} ${startParts.year}`;
      }

      const startLabel = isYearOnlyDate(startParts, startApproximate)
        ? String(startParts.year)
        : (startApproximate ? monthShortFormatter.format(startParts.date) : dayMonthFormatter.format(startParts.date));
      const endLabel = isYearOnlyDate(endParts, endApproximate)
        ? String(endParts.year)
        : (endApproximate ? monthShortFormatter.format(endParts.date) : dayMonthFormatter.format(endParts.date));

      return `${startLabel}-${endLabel} ${startParts.year}`;
    }

    const startLabel = isYearOnlyDate(startParts, startApproximate)
      ? String(startParts.year)
      : (compact || startApproximate
        ? `${monthShortFormatter.format(startParts.date)} ${startParts.year}`
        : dayMonthYearFormatter.format(startParts.date));
    const endLabel = isYearOnlyDate(endParts, endApproximate)
      ? String(endParts.year)
      : (compact || endApproximate
        ? `${monthShortFormatter.format(endParts.date)} ${endParts.year}`
        : dayMonthYearFormatter.format(endParts.date));

    return `${startLabel}-${endLabel}`;
  }

  function temporalLabel(place, { compact = false } = {}) {
    const startParts = parseIsoDate(place.startDate);
    const endParts = parseIsoDate(place.endDate);
    const startApproximate = Boolean(place.startDateApproximate);
    const endApproximate = Boolean(place.endDateApproximate);

    if (startParts || endParts) {
      return formatTemporalRange(startParts, endParts, startApproximate, endApproximate, compact);
    }

    const display = String(place.dateDisplay || "").trim();
    if (!display) return "Date unknown";
    if (/not verified|to verify/i.test(display)) return "Date unknown";
    return display;
  }

  function placeLocationLabel(place) {
    const locationParts = [place.locality, place.region].filter(Boolean);
    return locationParts.length ? locationParts.join(", ") : place.country;
  }

  function placeCityLabel(place) {
    return String(place?.city || "").trim();
  }

  function placeContextLabel(place) {
    const city = placeCityLabel(place);
    const locationParts = city
      ? [place.region, place.country].filter(Boolean)
      : [place.locality, place.region, place.country].filter(Boolean);

    return locationParts.length ? locationParts.join(", ") : place.country;
  }

  function worksMarkup(place) {
    return place.works.length
      ? `<p class="timeline-works"><strong>Related works:</strong> ${place.works.join(", ")}</p>`
      : "";
  }

  function importantFactMarkup(place, className = "important-fact") {
    return place.importantFact
      ? `<p class="${className}"><strong>Important fact:</strong> ${place.importantFact}</p>`
      : "";
  }

  function inscriptionMarkup(place, className = "inscription-block") {
    if (!place.inscription) return "";

    const inscriptionHtml = escapeHtml(place.inscription).replace(/\n/g, "<br>");
    return `
      <div class="${className}">
        <strong>Inscription</strong>
        <div class="${className}__text">${inscriptionHtml}</div>
      </div>
    `;
  }

  function travelModeMarkup(place, className = "travel-line", label = "Travel") {
    return place.travelMode
      ? `<p class="${className}"><strong>${label}:</strong> ${place.travelMode}</p>`
      : "";
  }

  function routeNoteMarkup(place, className = "route-line", label = "Historic route") {
    return place.routeNote
      ? `<p class="${className}"><strong>${label}:</strong> ${place.routeNote}</p>`
      : "";
  }

  function sourcesMarkup(place) {
    return place.sources.length
      ? `
        <div class="sources">
          <strong>Sources</strong>
          <ul class="source-list">
            ${place.sources.map((source) => `<li><a href="${source.url}" target="_blank" rel="noreferrer">${source.title}</a> <span>${source.publisher}</span></li>`).join("")}
          </ul>
        </div>
      `
      : "";
  }

  function isInteractiveTarget(target) {
    return target instanceof Element && Boolean(target.closest("a, button, input, select, textarea, summary, [contenteditable='true']"));
  }

  function activatePlace(placeId, options) {
    if (!placeId) return;

    activeId = placeId;
    renderPlacesList();
    renderMap(options || { fitBounds: false, focusActive: true });
    renderDetail();
    renderJourneyControls(filteredPlaces());
  }

  function renderLegend() {
    if (!relationLegend) return;

    relationLegend.innerHTML = "";

    relationOrder
      .filter((key) => data.places.some((place) => place.relationGroup === key))
      .forEach((key) => {
        const pill = document.createElement("span");
        pill.className = "legend-pill";
        pill.title = relationDescriptions[key];

        const dot = document.createElement("span");
        dot.className = "legend-dot";
        dot.style.backgroundColor = palette[key];

        const label = document.createElement("span");
        label.textContent = relationLabels[key];

        pill.append(dot, label);
        relationLegend.appendChild(pill);
      });
  }

  function renderStats() {
    if (!heroStats) return;

    const stats = data.stats || {};
    const placeCount = stats.places || (data.sites ? data.sites.length : data.places.length);
    const peopleCount = buildPeopleSummaries(data.places).length;
    const sourcesCount = (data.sources || []).length;

    heroStats.innerHTML = `
      <div class="stat-pill"><strong>${placeCount}</strong><span>places</span></div>
      <div class="stat-pill"><strong>${peopleCount}</strong><span>people</span></div>
      <div class="stat-pill"><strong>${sourcesCount}</strong><span>sources</span></div>
    `;
  }

  function createFilterChip(group, value, label, active, options = {}) {
    const button = document.createElement("button");
    const { extraClass = "", swatchColor = "" } = options;
    button.type = "button";
    button.className = `filter-chip${active ? " is-active" : ""}${extraClass ? ` ${extraClass}` : ""}`;
    button.dataset.filterGroup = group;
    button.dataset.filterValue = value;
    button.setAttribute("aria-pressed", String(active));

    if (swatchColor) {
      button.classList.add("filter-chip--legend");
      button.style.setProperty("--chip-accent", swatchColor);

      const dot = document.createElement("span");
      dot.className = "filter-chip__dot";
      dot.style.backgroundColor = swatchColor;
      button.appendChild(dot);
    }

    const text = document.createElement("span");
    text.className = "filter-chip__label";
    text.textContent = label;
    button.appendChild(text);

    return button;
  }

  function renderFilterChips() {
    if (relationFilterGroup) {
      relationFilterGroup.innerHTML = "";
      relationFilterGroup.appendChild(
        createFilterChip("relation", "all", "All", selectedRelations.size === 0, { extraClass: "filter-chip--all" })
      );

      relationOrder
        .filter((group) => data.places.some((place) => place.relationGroup === group))
        .forEach((group) => {
          relationFilterGroup.appendChild(
            createFilterChip("relation", group, relationLabels[group] || group, selectedRelations.has(group), {
              swatchColor: palette[group]
            })
          );
        });
    }

    if (countryFilterGroup) {
      countryFilterGroup.innerHTML = "";
      countryFilterGroup.appendChild(
        createFilterChip("country", "all", "All", selectedCountries.size === 0, { extraClass: "filter-chip--all" })
      );

      availableCountries.forEach((country) => {
        countryFilterGroup.appendChild(
          createFilterChip("country", country, country, selectedCountries.has(country))
        );
      });
    }

    if (historicalStateFilterGroup) {
      historicalStateFilterGroup.innerHTML = "";
      historicalStateFilterGroup.appendChild(
        createFilterChip("historicalState", "all", "All", selectedHistoricalStates.size === 0, { extraClass: "filter-chip--all" })
      );

      availableItalianHistoricalStates.forEach((historicalState) => {
        historicalStateFilterGroup.appendChild(
          createFilterChip(
            "historicalState",
            historicalState,
            historicalStateFilterLabel(historicalState),
            selectedHistoricalStates.has(historicalState)
          )
        );
      });
    }

    if (peopleFilterGroup) {
      peopleFilterGroup.innerHTML = "";
      peopleFilterGroup.appendChild(
        createFilterChip("person", "all", "All", selectedPeople.size === 0, { extraClass: "filter-chip--all" })
      );

      availablePeople.forEach((person) => {
        peopleFilterGroup.appendChild(
          createFilterChip("person", person.id, person.label, selectedPeople.has(person.id))
        );
      });
    }

    if (clearFiltersButton) {
      const { from, to } = activeYearRange();
      clearFiltersButton.disabled =
        selectedRelations.size === 0 &&
        selectedCountries.size === 0 &&
        selectedHistoricalStates.size === 0 &&
        selectedPeople.size === 0 &&
        !from &&
        !to;
    }
  }

  function renderFilters() {
    if (yearFromFilter && yearToFilter) {
      availableYears.forEach((year) => {
        const option = document.createElement("option");
        option.value = String(year);
        option.textContent = String(year);
        yearFromFilter.appendChild(option.cloneNode(true));
        yearToFilter.appendChild(option);
      });
    }

    renderFilterChips();
  }

  function normalizeYearRange(changedField) {
    if (!yearFromFilter || !yearToFilter || !yearFromFilter.value || !yearToFilter.value) return;

    const from = Number.parseInt(yearFromFilter.value, 10);
    const to = Number.parseInt(yearToFilter.value, 10);

    if (from <= to) return;

    if (changedField === "from") {
      yearToFilter.value = yearFromFilter.value;
      return;
    }

    yearFromFilter.value = yearToFilter.value;
  }

  function toggleFilterChip(group, value) {
    const targetSet = group === "relation"
      ? selectedRelations
      : group === "country"
        ? selectedCountries
        : group === "historicalState"
          ? selectedHistoricalStates
          : selectedPeople;

    if (value === "all") {
      targetSet.clear();
      return;
    }

    if (targetSet.has(value)) {
      targetSet.delete(value);
    } else {
      targetSet.add(value);
    }
  }

  function renderPlacesList() {
    const places = filteredPlaces();
    ensureActivePlace(places);
    const sites = buildSitesFromPassages(places);
    placesList.innerHTML = "";

    sites.forEach((site) => {
      const activePassage = site.activePassage;
      const relationLabel = site.relationGroups.length === 1
        ? (relationLabels[site.primaryRelationGroup] || activePassage.relationType)
        : "Multiple documented presences";
      const item = document.createElement("article");
      item.className = `timeline-item${activePassage.id === activeId ? " is-active" : ""}`;
      item.dataset.siteId = site.id;
      item.tabIndex = 0;
      const mediaMarkup = imageMarkup(site.image, "place");
      const addressMarkup = site.modernAddress
        ? `<p class="timeline-address"><strong>Address:</strong> ${site.modernAddress}</p>`
        : "";
      const cityMarkup = placeCityLabel(site)
        ? `<p class="timeline-city"><strong>City:</strong> ${placeCityLabel(site)}</p>`
        : "";
      const locationMarkup = `<p class="timeline-location"><strong>Location:</strong> ${placeContextLabel(site)}</p>`;
      const periodMarkup = activePassage.lifePeriodLabel
        ? `<p class="timeline-period"><strong>Period:</strong> ${activePassage.lifePeriodLabel}</p>`
        : "";
      const passageMarkup = `<p class="timeline-when"><strong>Active passage:</strong> ${activePassage.timelineIndex}. ${passageEventLabel(activePassage)}</p>`;
      const dateMarkup = `<p class="timeline-date"><strong>Date:</strong> ${temporalLabel(activePassage)}</p>`;
      const historicalStateMarkup = site.historicalState
        ? `<p class="timeline-state"><strong>Historical state:</strong> ${site.historicalState}</p>`
        : "";
      const travelModeMarkupLine = travelModeMarkup(activePassage, "timeline-travel");
      const routeNoteMarkupLine = routeNoteMarkup(activePassage, "timeline-route");
      const companionsMarkup = shouldShowCompanions(activePassage)
        ? `<p class="companions-line"><strong>Companions:</strong> ${companionDetail(activePassage)}</p>`
        : "";
      const inscription = inscriptionMarkup(activePassage);
      const importantFact = importantFactMarkup(activePassage);
      const passageChipsMarkup = `
        <div class="timeline-passages">
          <strong>Passages</strong>
          <div class="passage-chip-list">
            ${site.passages.map((passage) => `
              <button type="button" class="passage-chip${passage.id === activeId ? " is-active" : ""}" data-passage-id="${passage.id}">
                <span class="passage-chip__index">${passage.timelineIndex}</span>
                <span class="passage-chip__date">${escapeHtml(temporalLabel(passage, { compact: true }))}</span>
              </button>
            `).join("")}
          </div>
        </div>
      `;
      item.innerHTML = `
        <div class="timeline-meta"><span>${relationLabel}</span></div>
        <h3>${site.placeName}</h3>
        ${mediaMarkup}
        ${addressMarkup}
        ${cityMarkup}
        ${locationMarkup}
        ${periodMarkup}
        ${passageMarkup}
        ${dateMarkup}
        ${historicalStateMarkup}
        ${passageChipsMarkup}
        ${travelModeMarkupLine}
        ${routeNoteMarkupLine}
        ${companionsMarkup}
        ${inscription}
        ${importantFact}
        <p class="people-line">${activePassage.summary}</p>
        ${worksMarkup({ works: site.works })}
        ${sourcesMarkup({ sources: site.sources })}
      `;
      item.addEventListener("click", (event) => {
        if (isInteractiveTarget(event.target)) return;
        activatePlace(activePassage.id, { fitBounds: false, focusActive: true });
      });
      item.addEventListener("keydown", (event) => {
        if (event.target !== item) return;
        if (event.key !== "Enter" && event.key !== " ") return;

        event.preventDefault();
        activatePlace(activePassage.id, { fitBounds: false, focusActive: true });
      });
      item.querySelectorAll("[data-passage-id]").forEach((button) => {
        button.addEventListener("click", (event) => {
          event.preventDefault();
          event.stopPropagation();
          activatePlace(button.dataset.passageId, { fitBounds: false, focusActive: true });
        });
      });
      placesList.appendChild(item);
    });

  }

  function renderPeopleSection() {
    if (!peopleList) return;

    const globalSummaries = new Map(buildPeopleSummaries(data.places).map((person) => [person.id, person]));
    const visibleSummaries = new Map(buildPeopleSummaries(filteredPlaces()).map((person) => [person.id, person]));
    const registryPeople = allRegistryPeople.length
      ? allRegistryPeople
      : [...globalSummaries.values()].sort((a, b) => a.label.localeCompare(b.label));

    peopleList.innerHTML = "";

    if (!registryPeople.length) {
      peopleList.innerHTML = `
        <article class="people-card people-card--empty">
          <h3>No people are currently registered</h3>
          <p>Add records to <code>data/people.yaml</code> to expose a complete people index in the atlas.</p>
        </article>
      `;
      return;
    }

    registryPeople.forEach((registryPerson) => {
      const globalSummary = globalSummaries.get(registryPerson.id);
      const visibleSummary = visibleSummaries.get(registryPerson.id);
      const person = visibleSummary || globalSummary || {
        id: registryPerson.id,
        label: registryPerson.label,
        circle: registryPerson.circle || "Documented person",
        years: registryPerson.years || "",
        relation: registryPerson.relation || "",
        image: registryPerson.image || null,
        timeSpan: "No dated atlas passages yet",
        countries: [],
        placeCount: 0,
        highlights: [],
        lifeEvents: registryPerson.lifeEvents || "",
        summary: "Present in the people registry but not yet attached to a dated atlas passage."
      };

      const totalPlaceCount = globalSummary ? globalSummary.placeCount : 0;
      const visiblePlaceCount = visibleSummary ? visibleSummary.placeCount : 0;
      const cardStateClass = visibleSummary ? "" : " people-card--muted";
      const card = document.createElement("article");
      card.className = `people-card${cardStateClass}`;
      const mediaMarkup = imageMarkup(person.image, "person");
      card.innerHTML = `
        ${mediaMarkup}
        <div class="people-card__meta">
          <span>${person.circle || "Documented person"}</span>
          <span>${totalPlaceCount} ${totalPlaceCount === 1 ? "place" : "places"} in atlas</span>
        </div>
        <h3>${person.label}</h3>
        ${person.relation ? `<p class="people-card__relation"><strong>Relation to Percy:</strong> ${person.relation}</p>` : ""}
        ${person.years ? `<p class="people-card__years"><strong>Years:</strong> ${person.years}</p>` : ""}
        <p class="people-card__timespan"><strong>Shared span:</strong> ${person.timeSpan}</p>
        <p class="people-card__countries"><strong>Countries:</strong> ${person.countries.length ? countriesPreview(person.countries) : "No linked places yet"}</p>
        <p class="people-card__visibility"><strong>Visible with current filters:</strong> ${visiblePlaceCount}</p>
        ${person.lifeEvents ? `<p class="people-card__events"><strong>Life events:</strong> ${person.lifeEvents}</p>` : ""}
        <p class="people-card__summary">${visibleSummary ? person.summary : "No passages for this person match the current filters, but the profile is part of the complete registry."}</p>
        ${person.highlights.length ? `<p class="people-card__highlights"><strong>Highlights:</strong> ${person.highlights.join(", ")}</p>` : ""}
      `;
      peopleList.appendChild(card);
    });
  }

  function renderSourcesSection() {
    if (!sourcesList) return;

    sourcesList.innerHTML = "";

    atlasSources.forEach((source) => {
      const card = document.createElement("article");
      card.className = "source-card";
      const citationLabel = source.citationCount === 1 ? "1 cited place" : `${source.citationCount} cited places`;

      card.innerHTML = `
        <p class="source-card__meta">${escapeHtml(source.publisher || "Source")}</p>
        <h3><a href="${escapeHtml(source.url)}" target="_blank" rel="noreferrer">${escapeHtml(source.title || source.url)}</a></h3>
        <p class="source-card__count">${citationLabel}</p>
        <p class="source-card__link"><a href="${escapeHtml(source.url)}" target="_blank" rel="noreferrer">${escapeHtml(source.url)}</a></p>
      `;

      sourcesList.appendChild(card);
    });
  }

  function renderDetail() {
    const places = filteredPlaces();
    ensureActivePlace(places);
    const place = placeIndex.get(activeId);
    if (!place) {
      detailCard.innerHTML = `
        <p class="detail-kicker">No results</p>
        <h3>No place available</h3>
        <p>Try changing the filters to reveal the route again.</p>
      `;
      return;
    }

    const index = Math.max(activeIndex(places), 0);
    const passageLabel = places.length ? `Passage ${index + 1}` : "Passage";

    const companionsMarkup = shouldShowCompanions(place)
      ? `<p><strong>Companions:</strong> ${companionDetail(place)}</p>`
      : "";
    const inscription = inscriptionMarkup(place);
    const historicalStateMarkup = place.historicalState
      ? `<p><strong>Historical state:</strong> ${place.historicalState}</p>`
      : "";
    const periodMarkup = place.lifePeriodLabel
      ? `<p><strong>Period:</strong> ${place.lifePeriodLabel}</p>`
      : "";
    const addressMarkup = place.modernAddress
      ? `<p><strong>Address:</strong> ${place.modernAddress}</p>`
      : "";
    const cityMarkup = placeCityLabel(place)
      ? `<p><strong>City:</strong> ${placeCityLabel(place)}</p>`
      : "";
    const travelModeMarkupLine = travelModeMarkup(place);
    const routeNoteMarkupLine = routeNoteMarkup(place);
    const importantFact = importantFactMarkup(place, "important-fact");
    const mediaMarkup = imageMarkup(place.image, "detail");

    detailCard.innerHTML = `
      <p class="detail-kicker">${passageLabel} · ${passageEventLabel(place)}</p>
      <h3>${place.placeName}</h3>
      ${mediaMarkup}
      ${addressMarkup}
      ${cityMarkup}
      <p><strong>Location:</strong> ${placeContextLabel(place)}</p>
      ${periodMarkup}
      ${historicalStateMarkup}
      <p><strong>Date:</strong> ${temporalLabel(place)}</p>
      ${travelModeMarkupLine}
      ${routeNoteMarkupLine}
      ${companionsMarkup}
      ${inscription}
      ${importantFact}
      <p>${place.summary}</p>
      ${worksMarkup(place)}
      ${sourcesMarkup(place)}
    `;
  }

  function createMarkerElement(site, active) {
    const size = active ? 40 : 32;
    const className = [
      "place-marker",
      `place-marker--${site.primaryRelationGroup}`,
      site.siteCount > 1 || site.passageCount > 1 ? "place-marker--multi" : "place-marker--single",
      site.siteCount > 1 ? "place-marker--grouped" : "",
      active ? "is-active" : ""
    ].filter(Boolean).join(" ");

    const element = document.createElement("button");
    element.type = "button";
    element.className = className;
    const activePassageIndex = site.activePassage?.timelineIndex;
    const markerNumber = activePassageIndex ? String(activePassageIndex) : "";
    const markerLabel = site.siteCount > 1
      ? `${site.placeName}. Shared coordinates with passages ${site.markerSequenceLabel}.`
      : site.passageCount > 1
      ? `${site.placeName}, active passage ${markerNumber} of ${site.passageCount}`
      : site.placeName;
    element.setAttribute("aria-label", markerLabel);
    element.setAttribute("title", markerLabel);

    if (site.siteCount > 1) {
      element.style.minHeight = `${size}px`;
      element.style.minWidth = `${size}px`;
      element.style.height = `${size}px`;
      const groupList = document.createElement("span");
      groupList.className = "place-marker__group-list";

      site.markerNumbers.forEach((number) => {
        const token = document.createElement("span");
        token.className = `place-marker__token${number === activePassageIndex ? " is-current" : ""}`;
        token.textContent = String(number);
        groupList.appendChild(token);
      });

      element.appendChild(groupList);
      return element;
    }

    element.style.width = `${size}px`;
    element.style.height = `${size}px`;
    const label = document.createElement("span");
    label.textContent = markerNumber;
    if (markerNumber.length >= 3) {
      label.style.fontSize = "0.68rem";
    } else if (markerNumber.length === 2) {
      label.style.fontSize = "0.78rem";
    }
    element.appendChild(label);

    return element;
  }

  function displayPositions(entries) {
    return new Map(
      entries.map((entry) => [entry.id, [entry.latitude, entry.longitude]])
    );
  }

  function coordinateKey(entry) {
    if (!entry || entry.latitude === undefined || entry.longitude === undefined) return "";
    return `${String(entry.latitude)}|${String(entry.longitude)}`;
  }

  function buildMarkerGroupsFromSites(sites, activeSiteId) {
    const groups = new Map();

    sites.forEach((site) => {
      const key = coordinateKey(site);
      if (!groups.has(key)) {
        groups.set(key, {
          id: `coord:${key}`,
          latitude: site.latitude,
          longitude: site.longitude,
          sites: []
        });
      }

      groups.get(key).sites.push(site);
    });

    return [...groups.values()]
      .map((group) => {
        const orderedSites = [...group.sites].sort(
          (first, second) => first.activePassage.timelineIndex - second.activePassage.timelineIndex
        );
        const activeSite = orderedSites.find((site) => site.id === activeSiteId) || orderedSites[0];
        const markerNumbers = orderedSites
          .map((site) => site.activePassage?.timelineIndex)
          .filter((value) => Number.isInteger(value));

        return Object.assign(group, {
          placeName: activeSite.placeName,
          activeSite,
          activePassage: activeSite.activePassage,
          primaryRelationGroup: activeSite.primaryRelationGroup,
          passageCount: activeSite.passageCount,
          siteCount: orderedSites.length,
          sites: orderedSites,
          markerNumbers,
          markerSequenceLabel: markerNumbers.join(", "),
          firstTimelineIndex: Math.min(...orderedSites.map((site) => site.passages[0].timelineIndex))
        });
      })
      .sort((first, second) => first.firstTimelineIndex - second.firstTimelineIndex);
  }

  function groupedMarkerTooltipHtml(group) {
    const lines = group.sites.map((site) => {
      const index = site.activePassage?.timelineIndex;
      const compactDate = temporalLabel(site.activePassage, { compact: true });
      const line = `${escapeHtml(String(index || ""))} · ${escapeHtml(site.placeName)} · ${escapeHtml(compactDate)}`;
      return index === group.activePassage?.timelineIndex ? `<strong>${line}</strong>` : line;
    });

    return lines.join("<br>");
  }

  function renderMap(options) {
    const renderOptions = Object.assign({
      fitBounds: false,
      focusActive: false,
      focusZoom: 8.25
    }, options);

    const places = filteredPlaces();
    ensureActivePlace(places);
    const sites = buildSitesFromPassages(places);

    markers.forEach((marker) => marker.remove());
    markers.length = 0;
    hoverPopup.remove();

    if (!mapLoaded) {
      return;
    }

    const activePlace = placeIndex.get(activeId);
    const activeSiteId = activePlace ? siteIdForPlace(activePlace) : null;
    const markerGroups = buildMarkerGroupsFromSites(sites, activeSiteId);
    const activeMarkerGroupId = markerGroups.find((group) => group.sites.some((site) => site.id === activeSiteId))?.id || null;
    const positions = displayPositions(markerGroups, activeMarkerGroupId);

    if (!markerGroups.length) {
      map.fitBounds(europeBounds, { padding: 24, duration: 0 });
      return;
    }

    markerGroups.forEach((group) => {
      const position = positions.get(group.id);
      const markerElement = createMarkerElement(group, group.id === activeMarkerGroupId);
      const marker = new window.maplibregl.Marker({
        element: markerElement,
        anchor: "center"
      }).setLngLat([position[1], position[0]]);
      const markerLabel = group.siteCount > 1
        ? `${group.placeName} · passages here: ${group.markerSequenceLabel}`
        : group.passageCount > 1
          ? `${group.placeName} (${group.passageCount} passages)`
          : group.placeName;
      const tooltipHtml = group.siteCount > 1 ? groupedMarkerTooltipHtml(group) : null;

      markerElement.addEventListener("click", () => {
        const clickTargets = group.siteCount > 1
          ? group.sites.map((site) => site.activePassage)
          : group.activeSite.passages;
        const currentIndex = clickTargets.findIndex((passage) => passage.id === activeId);
        const nextPassage = currentIndex === -1
          ? clickTargets[0]
          : clickTargets[(currentIndex + 1) % clickTargets.length];
        activatePlace(nextPassage.id, { fitBounds: false, focusActive: true, focusZoom: 12 });
      });
      markerElement.addEventListener("keydown", (event) => {
        if (event.key !== "Enter" && event.key !== " ") return;

        event.preventDefault();
        const clickTargets = group.siteCount > 1
          ? group.sites.map((site) => site.activePassage)
          : group.activeSite.passages;
        const currentIndex = clickTargets.findIndex((passage) => passage.id === activeId);
        const nextPassage = currentIndex === -1
          ? clickTargets[0]
          : clickTargets[(currentIndex + 1) % clickTargets.length];
        activatePlace(nextPassage.id, { fitBounds: false, focusActive: true, focusZoom: 12 });
      });
      markerElement.addEventListener("mouseenter", () => {
        hoverPopup.setLngLat([position[1], position[0]]);
        if (tooltipHtml) {
          hoverPopup.setHTML(tooltipHtml);
        } else {
          hoverPopup.setText(markerLabel);
        }
        hoverPopup.addTo(map);
      });
      markerElement.addEventListener("mouseleave", () => {
        hoverPopup.remove();
      });
      markerElement.addEventListener("focus", () => {
        hoverPopup.setLngLat([position[1], position[0]]);
        if (tooltipHtml) {
          hoverPopup.setHTML(tooltipHtml);
        } else {
          hoverPopup.setText(markerLabel);
        }
        hoverPopup.addTo(map);
      });
      markerElement.addEventListener("blur", () => {
        hoverPopup.remove();
      });

      marker.addTo(map);
      markers.push(marker);
    });

    if (renderOptions.fitBounds) {
      const boundsPoints = markerGroups.map((group) => {
        const position = positions.get(group.id);
        return [position[1], position[0]];
      });

      if (boundsPoints.length === 1) {
        map.easeTo({
          center: boundsPoints[0],
          zoom: 6,
          duration: 0
        });
      } else {
        map.fitBounds(boundsPoints.reduce((bounds, point) => {
          bounds.extend(point);
          return bounds;
        }, new window.maplibregl.LngLatBounds(boundsPoints[0], boundsPoints[0])), {
          padding: 48,
          duration: 0
        });
      }
      return;
    }

    if (renderOptions.focusActive && activeMarkerGroupId) {
      const activePosition = positions.get(activeMarkerGroupId);
      if (!activePosition) return;
      map.flyTo({
        center: [activePosition[1], activePosition[0]],
        zoom: Math.max(map.getZoom(), renderOptions.focusZoom),
        duration: 500,
        essential: true
      });
    }
  }

  function syncFullscreenState() {
    const isFullscreen = document.fullscreenElement === mapShell;
    const label = isFullscreen ? "Exit fullscreen" : "Enter fullscreen";
    fullscreenToggle.setAttribute("aria-label", label);
    fullscreenToggle.setAttribute("title", label);
    fullscreenToggle.setAttribute("aria-pressed", String(isFullscreen));
    fullscreenToggle.classList.toggle("is-active", isFullscreen);
    window.setTimeout(() => {
      if (mapLoaded) {
        map.resize();
      }
    }, 120);
  }

  function toggleFullscreen() {
    if (document.fullscreenElement === mapShell) {
      document.exitFullscreen();
      return;
    }

    if (mapShell.requestFullscreen) {
      mapShell.requestFullscreen();
    }
  }

  function stepJourney(direction) {
    const places = filteredPlaces();
    ensureActivePlace(places);

    if (!places.length) return;

    const index = Math.max(activeIndex(places), 0);
    const nextIndex = index + direction;

    if (nextIndex < 0 || nextIndex >= places.length) return;

    activatePlace(places[nextIndex].id, { fitBounds: false, focusActive: true });
  }

  function isEditableTarget(target) {
    if (!(target instanceof HTMLElement)) return false;

    const tagName = target.tagName;
    if (tagName === "INPUT" || tagName === "TEXTAREA" || tagName === "SELECT") return true;

    return Boolean(target.closest("[contenteditable='true']"));
  }

  function render() {
    renderFilterChips();
    renderPlacesList();
    renderPeopleSection();
    renderMap({ fitBounds: true, focusActive: false });
    renderDetail();
    renderJourneyControls(filteredPlaces());
  }

  renderLegend();
  renderStats();
  renderFilters();
  renderSourcesSection();
  initializeCollapsiblePanels();

  if (relationFilterGroup) {
    relationFilterGroup.addEventListener("click", (event) => {
      const button = event.target.closest("button[data-filter-value]");
      if (!button) return;

      toggleFilterChip("relation", button.dataset.filterValue);
      render();
    });
  }

  if (countryFilterGroup) {
    countryFilterGroup.addEventListener("click", (event) => {
      const button = event.target.closest("button[data-filter-value]");
      if (!button) return;

      toggleFilterChip("country", button.dataset.filterValue);
      render();
    });
  }

  if (historicalStateFilterGroup) {
    historicalStateFilterGroup.addEventListener("click", (event) => {
      const button = event.target.closest("button[data-filter-value]");
      if (!button) return;

      toggleFilterChip("historicalState", button.dataset.filterValue);
      render();
    });
  }

  if (peopleFilterGroup) {
    peopleFilterGroup.addEventListener("click", (event) => {
      const button = event.target.closest("button[data-filter-value]");
      if (!button) return;

      toggleFilterChip("person", button.dataset.filterValue);
      render();
    });
  }

  if (yearFromFilter) {
    yearFromFilter.addEventListener("change", () => {
      normalizeYearRange("from");
      render();
    });
  }

  if (yearToFilter) {
    yearToFilter.addEventListener("change", () => {
      normalizeYearRange("to");
      render();
    });
  }

  if (clearFiltersButton) {
    clearFiltersButton.addEventListener("click", () => {
      selectedRelations.clear();
      selectedCountries.clear();
      selectedHistoricalStates.clear();
      selectedPeople.clear();
      searchQuery = "";
      if (placeSearch) placeSearch.value = "";
      if (yearFromFilter) yearFromFilter.value = "";
      if (yearToFilter) yearToFilter.value = "";
      render();
    });
  }

  if (placeSearch) {
    placeSearch.addEventListener("input", (event) => {
      searchQuery = event.target.value.trim();
      render();
    });
  }

  if (searchClear) {
    searchClear.addEventListener("click", () => {
      searchQuery = "";
      placeSearch.value = "";
      render();
    });
  }

  if (journeyBack) {
    journeyBack.addEventListener("click", () => {
      stepJourney(-1);
    });
  }

  if (journeyForward) {
    journeyForward.addEventListener("click", () => {
      stepJourney(1);
    });
  }

  if (journeyStepInput) {
    journeyStepInput.addEventListener("change", commitJourneyInput);
    journeyStepInput.addEventListener("blur", commitJourneyInput);
    journeyStepInput.addEventListener("keydown", (event) => {
      if (event.key !== "Enter") return;
      event.preventDefault();
      commitJourneyInput();
    });
  }

  document.addEventListener("keydown", (event) => {
    if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;
    if (isEditableTarget(event.target)) return;

    if (event.key === "ArrowLeft") {
      event.preventDefault();
      stepJourney(-1);
    }

    if (event.key === "ArrowRight") {
      event.preventDefault();
      stepJourney(1);
    }
  });

  fullscreenToggle.addEventListener("click", toggleFullscreen);
  document.addEventListener("fullscreenchange", syncFullscreenState);
  map.on("load", () => {
    mapLoaded = true;
    render();
    syncFullscreenState();
  });

  render();
})();
