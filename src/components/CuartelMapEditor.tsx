import { useCallback, useEffect, useRef, useState } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import { getMapboxToken } from "../lib/mapbox";
import type { GeoJSONPolygon, Centroide } from "../features/cuarteles/api";

// ── Geocoding (autocompletado en vivo) ──────────────────────────────────────

type GeoSuggestion = {
  id: string;
  center: [number, number];
  placeName: string;
};

async function geocodeSuggestions(query: string, token: string): Promise<GeoSuggestion[]> {
  // autocomplete=true + limit=5: sugerencias en vivo mientras se escribe.
  // country=ar acota a Argentina para resultados más relevantes.
  const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(query)}.json?access_token=${token}&language=es&autocomplete=true&limit=5&country=ar`;
  const res = await fetch(url);
  if (!res.ok) return [];
  const data = (await res.json()) as {
    features?: { id: string; center: [number, number]; place_name: string }[];
  };
  return (data.features ?? []).map((f) => ({ id: f.id, center: f.center, placeName: f.place_name }));
}

// ── Tipos internos ─────────────────────────────────────────────────────────

type LngLat = [number, number]; // [longitude, latitude]

type Props = {
  /** Polígono inicial (al editar un cuartel existente). */
  initialPolygon?: GeoJSONPolygon | null;
  /** Centro inicial del mapa. */
  initialCentroid?: Centroide | null;
  /** Se llama cada vez que cambia el polígono. */
  onChange: (polygon: GeoJSONPolygon | null, centroid: Centroide | null) => void;
};

// ── Helpers de GeoJSON ────────────────────────────────────────────────────

function buildPolyFeatureCollection(pts: LngLat[]): object {
  if (pts.length < 3) return { type: "FeatureCollection", features: [] };
  return {
    type: "FeatureCollection",
    features: [
      {
        type: "Feature",
        geometry: { type: "Polygon", coordinates: [[...pts, pts[0]]] },
        properties: {},
      },
    ],
  };
}

function buildPointsFeatureCollection(pts: LngLat[]): object {
  return {
    type: "FeatureCollection",
    features: pts.map((p, i) => ({
      type: "Feature",
      geometry: { type: "Point", coordinates: p },
      properties: { index: i },
    })),
  };
}

function computeCentroid(pts: LngLat[]): Centroide | null {
  if (pts.length === 0) return null;
  const lng = pts.reduce((s, p) => s + p[0], 0) / pts.length;
  const lat = pts.reduce((s, p) => s + p[1], 0) / pts.length;
  return { lat, lng };
}

function buildPolygon(pts: LngLat[]): GeoJSONPolygon | null {
  if (pts.length < 3) return null;
  return { type: "Polygon", coordinates: [[...pts, pts[0]]] };
}

function initialPointsFromPolygon(poly: GeoJSONPolygon | null | undefined): LngLat[] {
  if (!poly?.coordinates[0]) return [];
  const ring = poly.coordinates[0] as LngLat[];
  if (ring.length < 2) return ring;
  // Si el último punto cierra el anillo (igual al primero), lo quitamos
  const first = ring[0];
  const last = ring[ring.length - 1];
  if (first[0] === last[0] && first[1] === last[1]) return ring.slice(0, -1);
  return ring;
}

// ── Componente ─────────────────────────────────────────────────────────────

const CuartelMapEditor = ({ initialPolygon, initialCentroid, onChange }: Props) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const [mapReady, setMapReady] = useState(false);
  const [webglSupported] = useState<boolean>(() => mapboxgl.supported());
  const [points, setPoints] = useState<LngLat[]>(() =>
    initialPointsFromPolygon(initialPolygon),
  );

  // ── Geocoder (autocompletado en vivo) ──────────────────────────────────────
  const [geoQuery, setGeoQuery] = useState("");
  const [geoSuggestions, setGeoSuggestions] = useState<GeoSuggestion[]>([]);
  const [geoOpen, setGeoOpen] = useState(false);
  const [geoLoading, setGeoLoading] = useState(false);
  const [geoSelected, setGeoSelected] = useState<string | null>(null);
  // Evita re-disparar la búsqueda cuando el input cambia por elegir una sugerencia.
  const skipFetchRef = useRef(false);
  // Descarta respuestas fuera de orden (el usuario sigue tipeando).
  const reqIdRef = useRef(0);

  // Debounce: 300ms después de dejar de tipear, pide sugerencias.
  useEffect(() => {
    if (skipFetchRef.current) {
      skipFetchRef.current = false;
      return;
    }
    const q = geoQuery.trim();
    const token = getMapboxToken();
    const reqId = ++reqIdRef.current;
    const timer = window.setTimeout(async () => {
      if (!token || q.length < 3) {
        setGeoSuggestions([]);
        setGeoOpen(false);
        return;
      }
      setGeoLoading(true);
      try {
        const results = await geocodeSuggestions(q, token);
        if (reqIdRef.current !== reqId) return; // llegó una respuesta vieja
        setGeoSuggestions(results);
        setGeoOpen(results.length > 0);
      } catch {
        if (reqIdRef.current === reqId) {
          setGeoSuggestions([]);
          setGeoOpen(false);
        }
      } finally {
        if (reqIdRef.current === reqId) setGeoLoading(false);
      }
    }, 300);
    return () => window.clearTimeout(timer);
  }, [geoQuery]);

  const selectSuggestion = useCallback((s: GeoSuggestion) => {
    skipFetchRef.current = true;
    setGeoQuery(s.placeName);
    setGeoSuggestions([]);
    setGeoOpen(false);
    setGeoSelected(s.placeName);
    mapRef.current?.flyTo({ center: s.center, zoom: 15, duration: 1400 });
  }, []);

  // Ref para evitar stale closure en el click handler del mapa
  const pointsRef = useRef<LngLat[]>(points);
  useEffect(() => {
    pointsRef.current = points;
  }, [points]);

  // Notificar al padre cuando cambian los puntos
  useEffect(() => {
    onChange(buildPolygon(points), computeCentroid(points));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [points]);

  // Actualizar las fuentes del mapa cuando cambian los puntos
  useEffect(() => {
    const map = mapRef.current;
    if (!mapReady || !map) return;
    (map.getSource("polygon") as mapboxgl.GeoJSONSource | undefined)?.setData(
      buildPolyFeatureCollection(points) as Parameters<mapboxgl.GeoJSONSource["setData"]>[0],
    );
    (map.getSource("pts") as mapboxgl.GeoJSONSource | undefined)?.setData(
      buildPointsFeatureCollection(points) as Parameters<mapboxgl.GeoJSONSource["setData"]>[0],
    );
  }, [points, mapReady]);

  // Inicializar el mapa una sola vez
  useEffect(() => {
    const token = getMapboxToken();
    if (!token || !containerRef.current || !webglSupported) return;

    mapboxgl.accessToken = token;

    const defaultCenter: [number, number] = initialCentroid
      ? [initialCentroid.lng, initialCentroid.lat]
      : [-68.85, -33.0]; // Mendoza por defecto

    const map = new mapboxgl.Map({
      container: containerRef.current,
      style: "mapbox://styles/mapbox/satellite-streets-v12",
      center: defaultCenter,
      zoom: initialCentroid ? 15 : 11,
    });

    map.addControl(new mapboxgl.NavigationControl({ showCompass: false }), "top-right");
    map.addControl(new mapboxgl.ScaleControl({ unit: "metric" }), "bottom-left");

    mapRef.current = map;

    map.on("load", () => {
      const initPts = pointsRef.current;

      // Fuente del polígono
      map.addSource("polygon", {
        type: "geojson",
        data: buildPolyFeatureCollection(initPts) as Parameters<mapboxgl.Map["addSource"]>[1] extends { data: infer D } ? D : never,
      });
      map.addLayer({
        id: "polygon-fill",
        type: "fill",
        source: "polygon",
        paint: { "fill-color": "#304bd1", "fill-opacity": 0.22 },
      });
      map.addLayer({
        id: "polygon-line",
        type: "line",
        source: "polygon",
        paint: { "line-color": "#304bd1", "line-width": 2 },
      });

      // Fuente de los puntos
      map.addSource("pts", {
        type: "geojson",
        data: buildPointsFeatureCollection(initPts) as Parameters<mapboxgl.Map["addSource"]>[1] extends { data: infer D } ? D : never,
      });
      map.addLayer({
        id: "pts-circle",
        type: "circle",
        source: "pts",
        paint: {
          "circle-radius": 7,
          "circle-color": "#ffffff",
          "circle-stroke-width": 2.5,
          "circle-stroke-color": "#304bd1",
        },
      });

      // Handler de click para agregar puntos
      map.on("click", (e) => {
        const pt: LngLat = [e.lngLat.lng, e.lngLat.lat];
        setPoints((prev) => [...prev, pt]);
      });

      // Cursor
      map.getCanvas().style.cursor = "crosshair";

      setMapReady(true);
    });

    return () => {
      map.remove();
      mapRef.current = null;
      setMapReady(false);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleUndo = useCallback(() => setPoints((prev) => prev.slice(0, -1)), []);
  const handleClear = useCallback(() => setPoints([]), []);

  const token = getMapboxToken();

  // ── Sin soporte WebGL ────────────────────────────────────────────────────
  if (!webglSupported) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 rounded-[var(--radius-xl)] border border-dashed border-[color:var(--border-default)] bg-[color:var(--surface-soft)] p-8 text-center">
        <span className="text-3xl">🗺️</span>
        <div>
          <p className="font-semibold text-[color:var(--text-ink)]">Mapa no disponible</p>
          <p className="mt-1 text-sm text-[color:var(--text-ink-muted)]">
            Tu navegador no soporta WebGL, necesario para el editor de límites.
            Podés igualmente guardar el cuartel sin polígono.
          </p>
        </div>
      </div>
    );
  }

  // ── Sin token ────────────────────────────────────────────────────────────
  if (!token) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 rounded-[var(--radius-xl)] border border-dashed border-[color:var(--border-default)] bg-[color:var(--surface-soft)] p-8 text-center">
        <span className="text-3xl">🗺️</span>
        <div>
          <p className="font-semibold text-[color:var(--text-ink)]">Mapa no configurado</p>
          <p className="mt-1 text-sm text-[color:var(--text-ink-muted)]">
            Agregá <code className="rounded bg-[color:var(--surface-muted)] px-1 py-0.5 text-xs">VITE_MAPBOX_TOKEN</code> al{" "}
            <code className="rounded bg-[color:var(--surface-muted)] px-1 py-0.5 text-xs">.env</code> para habilitar el editor de límites.
          </p>
        </div>
      </div>
    );
  }

  // ── Estado del polígono ───────────────────────────────────────────────────
  const statusMsg =
    points.length === 0
      ? "Hacé click en el mapa para agregar puntos al polígono del cuartel."
      : points.length < 3
        ? `${points.length} punto${points.length !== 1 ? "s" : ""} — necesitás al menos 3 para cerrar el polígono.`
        : `${points.length} puntos — polígono definido ✓`;

  const statusColor =
    points.length >= 3
      ? "text-[color:var(--feedback-success-text)]"
      : "text-[color:var(--text-ink-muted)]";

  return (
    <div className="space-y-2">
      {/* Buscador de dirección con autocompletado en vivo */}
      <div className="relative">
        <input
          type="text"
          value={geoQuery}
          onChange={(e) => { setGeoQuery(e.target.value); setGeoSelected(null); }}
          onFocus={() => { if (geoSuggestions.length > 0) setGeoOpen(true); }}
          onBlur={() => window.setTimeout(() => setGeoOpen(false), 120)}
          onKeyDown={(e) => {
            if (e.key === "Enter") { e.preventDefault(); if (geoSuggestions[0]) selectSuggestion(geoSuggestions[0]); }
            if (e.key === "Escape") setGeoOpen(false);
          }}
          placeholder="Buscá una dirección o localidad…"
          autoComplete="off"
          className="w-full rounded-[var(--radius-md)] border border-[color:var(--border-default)] bg-[color:var(--surface-base)] px-3 py-2 pr-9 text-sm text-[color:var(--text-ink)] placeholder:text-[color:var(--text-ink-muted)] focus:border-[color:var(--brand-primary)] focus:outline-none"
        />
        {geoLoading ? (
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-[color:var(--text-ink-muted)]">…</span>
        ) : null}
        {geoOpen && geoSuggestions.length > 0 ? (
          <ul className="absolute z-20 mt-1 w-full overflow-hidden rounded-[var(--radius-md)] border border-[color:var(--border-default)] bg-[color:var(--surface-base)] shadow-lg">
            {geoSuggestions.map((s) => (
              <li key={s.id}>
                <button
                  type="button"
                  onMouseDown={(e) => { e.preventDefault(); selectSuggestion(s); }}
                  className="block w-full px-3 py-2 text-left text-sm text-[color:var(--text-ink)] transition-colors hover:bg-[color:var(--surface-soft)]"
                >
                  <span className="mr-1">📍</span>{s.placeName}
                </button>
              </li>
            ))}
          </ul>
        ) : null}
      </div>
      {geoSelected ? (
        <p className="text-xs text-[color:var(--feedback-success-text)]">📍 {geoSelected}</p>
      ) : null}

      {/* Mapa */}
      <div
        ref={containerRef}
        className="w-full overflow-hidden rounded-[var(--radius-xl)] border border-[color:var(--border-default)]"
        style={{ height: 420 }}
      />

      {/* Barra de estado + acciones */}
      <div className="flex flex-wrap items-center gap-3">
        <span className={`flex-1 text-xs ${statusColor}`}>{statusMsg}</span>

        {points.length > 0 && (
          <>
            <button
              type="button"
              onClick={handleUndo}
              className="rounded-[var(--radius-md)] border border-[color:var(--border-default)] bg-[color:var(--surface-base)] px-3 py-1.5 text-xs font-semibold text-[color:var(--text-ink)] transition-all hover:bg-[color:var(--surface-soft)]"
            >
              ← Deshacer último
            </button>
            <button
              type="button"
              onClick={handleClear}
              className="rounded-[var(--radius-md)] border border-[color:var(--border-default)] bg-[color:var(--surface-base)] px-3 py-1.5 text-xs font-semibold text-[color:var(--feedback-danger-text)] transition-all hover:bg-red-50"
            >
              Limpiar todo
            </button>
          </>
        )}
      </div>

      <p className="text-[11px] text-[color:var(--text-ink-muted)]">
        Usá la rueda del mouse para hacer zoom · Arrastrá el mapa para navegar · Cada click agrega un vértice
      </p>
    </div>
  );
};

export default CuartelMapEditor;
