let coordinates = [50, 0];
let zoom = 14;

try {
  coordinates = JSON.parse(sessionStorage.getItem('coordinates'));
  zoom = JSON.parse(sessionStorage.getItem('zoom'));
} catch {}


console.log(coordinates, zoom);
var map = L.map("map").setView(coordinates, zoom);

L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
  attribution:
    '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
}).addTo(map);

var wikidataIcon = L.icon({
  iconUrl: 'https://upload.wikimedia.org/wikipedia/commons/6/66/Wikidata-logo-en.svg',
  iconSize:     [52, 37],
});


/** @param {{ north: number, east: number, south: number, west: number }} coordinates */
const wikidata = async (coordinates) => {
  const NorthEast = `"Point(${coordinates.north} ${coordinates.east})"^^geo:wktLiteral`;
  const SouthWest = `"Point(${coordinates.south} ${coordinates.west})"^^geo:wktLiteral`;
  const response = await fetch(
    "https://query.wikidata.org/sparql?query=" +
      encodeURIComponent(/*sql*/ `SELECT ?item ?itemLabel ?location WHERE {
            SERVICE wikibase:box {
                ?item wdt:P625 ?location .
                bd:serviceParam wikibase:cornerNorthEast ${NorthEast} .
                bd:serviceParam wikibase:cornerSouthWest ${SouthWest} .
              }
              SERVICE wikibase:label { bd:serviceParam wikibase:language "[AUTO_LANGUAGE],en". }
          }`),
    {
      headers: { Accept: "application/sparql-results+json" },
    }
  );
  /** @type {{ results: { bindings: Record<string, {value: string}>[]}}} */
  const json = await response.json();
  return json.results.bindings.map(({ location, item, itemLabel }) => {
    /** @type {any} */
    const coordinates = location.value
      .replace("Point(", "")
      .replace(")", "")
      .split(" ")
      .map((direction) => parseFloat(direction))
      .reverse();

    return L.marker(coordinates, { icon: wikidataIcon }).bindPopup(
      () =>
        `<a href="${item.value}" target="_blank">${itemLabel.value} (${
          item.value.split("/")[item.value.split("/").length - 1]
        })</a>`
    );
  });
};

const layers = new Set();

map.on("moveend", (e) => {
  sessionStorage.setItem('coordinates', JSON.stringify(map.getCenter()))
  sessionStorage.setItem('zoom', JSON.stringify(map.getZoom()))

  const bounds = map.getBounds();
  const { lat: east, lng: north } = bounds.getNorthEast();
  const { lat: west, lng: south } = bounds.getSouthWest();
  
  const bbox = { east, north, west, south };
  wikidata(bbox).then((points) => {
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
});
