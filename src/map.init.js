import { getCachedLocation, setCachedLocation } from "./cache.js";
import { wikidata } from "./wikidata.js";

let { coordinates, zoom } = {
  zoom: 5,
  coordinates: { lat: 50, lng: 0 },
};

const cachedLocation = getCachedLocation();
if (cachedLocation?.coordinates) coordinates = cachedLocation.coordinates;
if (cachedLocation?.zoom) zoom = cachedLocation.zoom;

let map, previousMarker, previousIcon;

const layers = new Set();
const svgIcon = L.divIcon({
  html: /*svg*/ `<svg
  viewBox="0 0 500 820"
  version="1.1"
  xmlns="http://www.w3.org/2000/svg"
  xml:space="preserve"
  style="fill-rule: evenodd; clip-rule: evenodd; stroke-linecap: round"
>
  <defs>
    <linearGradient
      x1="0"
      y1="0"
      x2="1"
      y2="0"
      gradientUnits="userSpaceOnUse"
      gradientTransform="matrix(2.30025e-15,-37.566,37.566,2.30025e-15,416.455,540.999)"
      id="map-marker-38-f"
    >
      <stop offset="0" stop-color="rgb(111,18,18)" />
      <stop offset="1" stop-color="rgb(156,76,76)" />
    </linearGradient>
    <linearGradient
      x1="0"
      y1="0"
      x2="1"
      y2="0"
      gradientUnits="userSpaceOnUse"
      gradientTransform="matrix(1.16666e-15,-19.053,19.053,1.16666e-15,414.482,522.486)"
      id="map-marker-38-s"
    >
      <stop offset="0" stop-color="rgb(108,46,46)" />
      <stop offset="1" stop-color="rgb(131,56,56)" />
    </linearGradient>
  </defs>
  <g transform="matrix(19.5417,0,0,19.5417,-7889.1,-9807.44)">
    <path
      d="M416.544,503.612C409.971,503.612 404.5,509.303 404.5,515.478C404.5,518.256 406.064,521.786 407.194,524.224L416.5,542.096L425.762,524.224C426.892,521.786 428.5,518.433 428.5,515.478C428.5,509.303 423.117,503.612 416.544,503.612ZM416.544,510.767C419.128,510.784 421.223,512.889 421.223,515.477C421.223,518.065 419.128,520.14 416.544,520.156C413.96,520.139 411.865,518.066 411.865,515.477C411.865,512.889 413.96,510.784 416.544,510.767Z"
      stroke-width="1.1px"
      fill="url(#map-marker-38-f)"
      stroke="url(#map-marker-38-s)"
    />
  </g>
</svg>`,
  className: "",
  iconSize: [24, 40],
  iconAnchor: [12, 40],
});

const lo = (e) => {
  setCachedLocation(map.getCenter(), map.getZoom());

  const bounds = map.getBounds();
  const { lat: east, lng: north } = bounds.getNorthEast();
  const { lat: west, lng: south } = bounds.getSouthWest();

  wikidata({ east, north, west, south })
    .then((items) =>
      items.map(({ coordinates, url, articleCount }) => {
        const options = {};
        if (articleCount === 0) options.icon = svgIcon;
        return L.marker(coordinates, options).on("click", (e) => {
          if (previousMarker) previousMarker.setIcon(previousIcon);
          previousIcon = e.target.getIcon();
          previousMarker = e.target;
          e.target.setIcon(svgIcon);
          const id = url.slice(url.lastIndexOf("/") + 1);
          if (document.querySelector("knowledge-graph"))
            document.querySelector("knowledge-graph").style.display = "block";

          if (document.querySelector("knowledge-graph")) {
            document.querySelector("knowledge-graph")?.setAttribute("key", id);
            return;
          }

          L.Control.infobox = L.Control.extend({
            onAdd: function (map) {
              var text = L.DomUtil.create("knowledge-graph");
              text.setAttribute(
                "style",
                "width: 500px; filter: drop-shadow(0 0 10px rgba(0, 0, 0, .3))"
              );
              text.setAttribute("key", id);
              text.setAttribute("source", "wikidata");
              return text;
            },

            onRemove: function (map) {
              // Nothing to do here
            },
          });
          L.control.infobox = function (opts) {
            return new L.Control.infobox(opts);
          };
          L.control.infobox({ position: "topleft" }).addTo(map);
        });
      })
    )
    .then((points) => {
      layers.forEach((item) => {
        map.removeLayer(item);
        layers.delete(item);
      });

      const markers = L.markerClusterGroup();
      points.forEach((marker) => {
        layers.add(markers.addLayer(marker));
      });
      layers.add(markers);
      map.addLayer(markers);
    });
};

map = L.map("map", { zoomControl: false });
map.on("moveend", lo);
map.on("load", lo);
map.on("click", (e) => {
  if (e.originalEvent.target.matches("knowledge-graph *, knowledge-graph"))
    return;
  if (previousMarker) previousMarker.setIcon(previousIcon);
  previousMarker = undefined;
  if (document.querySelector("knowledge-graph"))
    document.querySelector("knowledge-graph").style.display = "none";
});
map.setView(coordinates, zoom);

const OpenStreetMap = L.tileLayer(
  "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
  {
    attribution:
      '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
  }
);

L.control.zoom({ position: "bottomright" }).addTo(map);

var cycleosm = L.tileLayer(
  "https://{s}.tile-cyclosm.openstreetmap.fr/cyclosm/{z}/{x}/{y}.png",
  {}
);

var Satellite = L.tileLayer(
  "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
  {
    attribution:
      "Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community",
  }
);

var openrailwaymap = new L.TileLayer(
  "http://{s}.tiles.openrailwaymap.org/standard/{z}/{x}/{y}.png",
  {
    attribution:
      '<a href="https://www.openstreetmap.org/copyright">© OpenStreetMap contributors</a>, Style: <a href="http://creativecommons.org/licenses/by-sa/2.0/">CC-BY-SA 2.0</a> <a href="http://www.openrailwaymap.org/">OpenRailwayMap</a> and OpenStreetMap',
    minZoom: 2,
    maxZoom: 19,
    tileSize: 256,
  }
);

const German = L.tileLayer(
  "https://{s}.tile.openstreetmap.de/{z}/{x}/{y}.png",
  {
    maxZoom: 18,
    attribution:
      '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
  }
).addTo(map);

L.control
  .layers(
    {
      German,
      OpenStreetMap,
      Cycle: cycleosm,
      Satellite,
    },
    { openrailwaymap }
  )
  .addTo(map);

const search = (value) => {
  console.log(value);
  if (value.includes(",")) {
    const coors = value.split(",");
    const lon = parseFloat(coors?.[0]);
    const lat = parseFloat(coors?.[1]);
    if (coors.length === 2 && isFinite(lon) && isFinite(lat)) {
      map.setView(new L.LatLng(lat, lon), 16);
    }
  }
};

L.Control.searchie = L.Control.extend({
  onAdd: function (map) {
    const input = L.DomUtil.create("input");
    input.type = "search";
    input.style;
    input.style.fontSize = "2em";
    input.style.appearance = "none";
    input.style.border = "3px solid lightgray";
    input.style.borderRadius = "1em";
    input.style.padding = "0.2em 0.5em";
    input.style.minWidth = "100px";
    input.addEventListener("change", (ev) => search(ev.target.value));
    return input;
  },

  onRemove: function (map) {
    // Nothing to do here
  },
});
L.control.searchie = function (opts) {
  return new L.Control.searchie(opts);
};
L.control.searchie({ position: "topleft" }).addTo(map);

if (location.search.includes("s=")) {
  const value = new URLSearchParams(location.search).get("s");
  search(value);
}

map.addControl(L.control.search({ position: "topleft" }));
