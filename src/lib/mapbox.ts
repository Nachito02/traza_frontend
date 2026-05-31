import type { GeoJSONPolygon, Centroide } from "../features/cuarteles/api";

export type { GeoJSONPolygon, Centroide };

/** Token de Mapbox desde variables de entorno. Puede ser undefined si no está configurado. */
export function getMapboxToken(): string | undefined {
  return (import.meta.env.VITE_MAPBOX_TOKEN as string | undefined) || undefined;
}

/**
 * Construye la URL de Mapbox Static Images API para mostrar el polígono
 * del cuartel como imagen PNG sin necesitar cargar el SDK completo.
 *
 * Formato: https://api.mapbox.com/styles/v1/mapbox/satellite-streets-v12/static/
 *            geojson({feature})/auto/{w}x{h}?padding=60&access_token={token}
 */
export function buildMapboxStaticUrl(
  poligono: GeoJSONPolygon,
  options: { width?: number; height?: number } = {},
): string {
  const token = getMapboxToken();
  if (!token) return "";

  const { width = 800, height = 400 } = options;

  const feature = {
    type: "Feature",
    geometry: poligono,
    properties: {
      stroke: "#304bd1",
      "stroke-width": 3,
      "stroke-opacity": 1,
      fill: "#304bd1",
      "fill-opacity": 0.25,
    },
  };

  const encoded = encodeURIComponent(JSON.stringify(feature));
  return (
    `https://api.mapbox.com/styles/v1/mapbox/satellite-streets-v12/static/` +
    `geojson(${encoded})/auto/${width}x${height}` +
    `?padding=60&access_token=${token}`
  );
}
