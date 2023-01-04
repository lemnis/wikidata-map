/** @param {string} point */
export const sparqlPointToCoordinates = (point) => {
  const [lat, lng] = point
    .replace("Point(", "")
    .replace(")", "")
    .split(" ")
    .map((direction) => parseFloat(direction));

  return [lng, lat];
};

/**
 * @param {number} lat
 * @param {number} lng
 */
export const coordinatesToSparql = (lat, lng) => {
  return `"Point(${lat} ${lng})"^^geo:wktLiteral`;
};

/** @param {{ north: number, east: number, south: number, west: number }} coordinates */
export const wikidata = async (coordinates) => {
  // Prepare SPARQL bounding box cordinates
  const northEast = coordinatesToSparql(coordinates.north, coordinates.east);
  const southWest = coordinatesToSparql(coordinates.south, coordinates.west);

  // Get all wikidata items with a coordinate location within the bounding box
  const response = await fetch(
    "https://query.wikidata.org/sparql?query=" +
      encodeURIComponent(/*sql*/ `SELECT ?item ?itemLabel ?location (COUNT(?wikipedia) as ?articleCount) WHERE {
            SERVICE wikibase:box {
                ?item wdt:P625 ?location .
                bd:serviceParam wikibase:cornerNorthEast ${northEast} .
                bd:serviceParam wikibase:cornerSouthWest ${southWest} .
              }
              SERVICE wikibase:label { bd:serviceParam wikibase:language "[AUTO_LANGUAGE],en". }
              OPTIONAL { ?wikipedia schema:about ?item. }
            }
            GROUP BY ?item ?itemLabel ?location
          `),
    {
      headers: { Accept: "application/sparql-results+json" },
    }
  );

  /** @type {{ results: { bindings: Record<string, {value: string}>[]}}} */
  const json = await response.json();
  return json.results.bindings.map(
    ({ location, item, itemLabel, articleCount }) => ({
      coordinates: sparqlPointToCoordinates(location.value),
      url: item.value,
      title: itemLabel.value,
      articleCount: parseInt(articleCount.value || "0"),
    })
  );
};
