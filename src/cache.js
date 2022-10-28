export const getCachedLocation = () => {
  try {
    const stringifiedCoordinates = sessionStorage.getItem("coordinates");
    const coordinates =
      stringifiedCoordinates && JSON.parse(stringifiedCoordinates);
    const stringifiedZoom = sessionStorage.getItem("zoom");
    const zoom = stringifiedZoom && JSON.parse(stringifiedZoom);

    return { coordinates, zoom };
  } catch {}
};

/**
 * @param {any} coordinates 
 * @param {number} zoom 
 */
export const setCachedLocation = (coordinates, zoom) => {
  sessionStorage.setItem('coordinates', JSON.stringify(coordinates))
  sessionStorage.setItem('zoom', JSON.stringify(zoom))
};