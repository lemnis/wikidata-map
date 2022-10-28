import { getCachedLocation, setCachedLocation } from "./cache.js";
import { wikidata } from "./wikidata.js";

let { coordinates, zoom } = {
  zoom: 5,
  coordinates: { lat: 50, lng: 0 },
};

const cachedLocation = getCachedLocation();
if (cachedLocation?.coordinates) coordinates = cachedLocation.coordinates;
if (cachedLocation?.zoom) zoom = cachedLocation.zoom;

let map;

const layers = new Set();

const lo = (e) => {
  console.log(e);
  setCachedLocation(map.getCenter(), map.getZoom());

  const bounds = map.getBounds();
  const { lat: east, lng: north } = bounds.getNorthEast();
  const { lat: west, lng: south } = bounds.getSouthWest();

  wikidata({ east, north, west, south })
    .then((items) =>
      items.map(({ coordinates, url }) => {
        return L.marker(coordinates).on("click", () => {
          const id = url.slice(url.lastIndexOf("/") + 1);

          if (document.querySelector("knowledge-graph")) {
            document
              .querySelector("knowledge-graph")
              ?.setAttribute("key", id);
            return;
          }

          L.Control.infobox = L.Control.extend({
            onAdd: function (map) {
              var text = L.DomUtil.create("knowledge-graph");
              text.setAttribute('style', 'width: 500px; filter: drop-shadow(0 0 10px rgba(0, 0, 0, .3))');
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

map = L.map("map", { zoomControl: false});
map.on("moveend", lo);
map.on("load", lo);
map.setView(coordinates, zoom);

L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
  attribution:
    '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
}).addTo(map);
L.control.zoom({
  position: 'bottomright'
}).addTo(map);