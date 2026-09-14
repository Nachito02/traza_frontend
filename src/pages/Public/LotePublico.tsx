import { useCallback, useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { fetchPublicLote, type PublicLote } from "../../features/public/api";
import type { LoteHistorialEvento } from "../../features/lotes/api";
import {
  getVariedadLabel,
  getSistemaRiegoLabel,
  getManejoCultivoLabel,
  getSistemaConduccionLabel,
} from "../../domain/viticultura/catalogos";
import { buildMapboxStaticUrl } from "../../lib/mapbox";
import trazaLogo from "../../assets/traza_logo_02.png";

const TIPO_OPERACION_LABEL: Record<string, string> = {
  ingreso: "Ingreso",
  fermentacion: "Fermentación",
  trasiego: "Trasiego",
  descube: "Descube",
  correccion: "Corrección",
  corte_parcial: "Corte parcial",
};

// ── Helpers ────────────────────────────────────────────────────────────────

function publicFileIcon(mimeType: string): string {
  if (mimeType.startsWith("image/")) return "🖼️";
  if (mimeType.startsWith("video/")) return "🎬";
  if (mimeType === "application/pdf") return "📄";
  if (mimeType.includes("word") || mimeType.includes("document")) return "📝";
  if (mimeType.includes("excel") || mimeType.includes("spreadsheet") || mimeType === "text/csv") return "📊";
  if (mimeType.includes("powerpoint") || mimeType.includes("presentation")) return "📋";
  return "📎";
}

function fmt(dateStr: string | null | undefined) {
  if (!dateStr) return "—";
  return new Date(dateStr).toLocaleDateString("es-AR", { day: "2-digit", month: "short", year: "numeric" });
}

function estadoColor(estado: string): string {
  const e = estado.toLowerCase();
  if (e === "completado") return "#00d47a";
  if (e === "en_progreso" || e === "en_curso") return "#304bd1";
  if (e === "cancelado") return "#ff5d5d";
  return "#8ea4cf";
}

function estadoLabel(estado: string): string {
  const map: Record<string, string> = {
    completado: "Completado",
    en_progreso: "En progreso",
    en_curso: "En curso",
    pendiente: "Pendiente",
    cancelado: "Cancelado",
  };
  return map[estado.toLowerCase()] ?? estado;
}

const ORIGEN_LABEL: Record<PublicLote["origen"], string> = {
  ingreso: "Ingreso directo de cosecha",
  corte: "Resultado de un corte / blend",
};

// ── Timeline ───────────────────────────────────────────────────────────────

type CuartelLabel = { nombre_finca: string; codigo_cuartel: string };

type TimelineEvent =
  | { kind: "bodega"; date: Date; data: LoteHistorialEvento }
  | { kind: "tarea"; date: Date; origen: CuartelLabel; data: PublicLote["cuarteles"][number]["tareas"][number] }
  | { kind: "remito"; date: Date; origen: CuartelLabel; data: PublicLote["cuarteles"][number]["remitos_uva"][number] }
  | {
      kind: "recepcion";
      date: Date;
      origen: CuartelLabel;
      data: PublicLote["cuarteles"][number]["remitos_uva"][number]["recepciones"][number] & { cuartel_kg?: number | null };
    }
  | { kind: "ciu"; date: Date; origen: CuartelLabel; data: PublicLote["cuarteles"][number]["cius"][number] };

/** Los eventos de UNA finca/cuartel, en orden cronológico (más viejo primero — se lee como una historia). */
function buildEventosDeCuartel(c: PublicLote["cuarteles"][number]): TimelineEvent[] {
  const origen: CuartelLabel = { nombre_finca: c.cuartel.finca.nombre_finca, codigo_cuartel: c.cuartel.codigo_cuartel };
  const events: TimelineEvent[] = [];
  for (const t of c.tareas) events.push({ kind: "tarea", date: new Date(t.updated_at || t.created_at), origen, data: t });
  for (const r of c.remitos_uva) {
    events.push({ kind: "remito", date: new Date(r.salida_finca), origen, data: r });
  }
  for (const ciu of c.cius) events.push({ kind: "ciu", date: new Date(ciu.emitido_at), origen, data: ciu });
  return events.sort((a, b) => a.date.getTime() - b.date.getTime());
}

/** Los eventos de bodega del lote (recepción/ingreso, corte, movimientos de vasija, etc.), en orden cronológico. */
function buildEventosDeBodega(lote: PublicLote): TimelineEvent[] {
  const events: TimelineEvent[] = lote.historial.map((evento): TimelineEvent => ({ kind: "bodega", date: new Date(evento.fecha), data: evento }));
  for (const c of lote.cuarteles) {
    const origen: CuartelLabel = { nombre_finca: c.cuartel.finca.nombre_finca, codigo_cuartel: c.cuartel.codigo_cuartel };
    for (const r of c.remitos_uva) {
      for (const rb of r.recepciones) {
        events.push({ kind: "recepcion", date: new Date(rb.fecha_hora), origen, data: { ...rb, cuartel_kg: r.kg_declarados } });
      }
    }
  }
  return events.sort((a, b) => a.date.getTime() - b.date.getTime());
}

// ── Sub-componentes (mismo lenguaje visual que TrazabilidadPublica/ProductoPublico) ──

type BadgeProps = { color?: string; children: React.ReactNode };
const Badge = ({ color = "#8ea4cf", children }: BadgeProps) => (
  <span
    style={{
      display: "inline-flex",
      alignItems: "center",
      padding: "2px 10px",
      borderRadius: 999,
      fontSize: 11,
      fontWeight: 700,
      letterSpacing: "0.1em",
      textTransform: "uppercase",
      border: `1px solid ${color}44`,
      color,
      background: `${color}18`,
    }}
  >
    {children}
  </span>
);

type EventCardProps = { icon: string; label: string; accent: string; origen?: CuartelLabel; children: React.ReactNode };
const EventCard = ({ icon, label, accent, origen, children }: EventCardProps) => (
  <div
    style={{
      display: "flex",
      gap: 16,
      padding: "16px 20px",
      borderRadius: 12,
      border: `1px solid ${accent}28`,
      background: `${accent}0a`,
      marginBottom: 12,
    }}
  >
    <div
      style={{
        flexShrink: 0,
        width: 40,
        height: 40,
        borderRadius: 10,
        border: `1px solid ${accent}44`,
        background: `${accent}18`,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: 20,
      }}
    >
      {icon}
    </div>
    <div style={{ flex: 1, minWidth: 0 }}>
      <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 8, marginBottom: 6 }}>
        <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.2em", textTransform: "uppercase", color: accent }}>{label}</span>
        {origen ? (
          <span style={{ fontSize: 10, fontWeight: 600, color: "#8ea4cf" }}>
            🌱 {origen.nombre_finca} · {origen.codigo_cuartel}
          </span>
        ) : null}
      </div>
      {children}
    </div>
  </div>
);

function Pill({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ background: "#f0f4fa", borderRadius: 8, padding: "6px 12px", display: "flex", gap: 6, alignItems: "center" }}>
      <span style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", color: "#8ea4cf" }}>{label}</span>
      <span style={{ fontSize: 13, fontWeight: 600, color: "#050b2f" }}>{value}</span>
    </div>
  );
}

function Counter({ value, label }: { value: number; label: string }) {
  return (
    <div style={{ display: "flex", alignItems: "baseline", gap: 6 }}>
      <span style={{ fontSize: 22, fontWeight: 800, color: "#07135f" }}>{value}</span>
      <span style={{ fontSize: 12, color: "#4a6080" }}>{label}</span>
    </div>
  );
}

/** Línea compacta con un resumen; clickeable para desplegar el detalle completo (campos con label). */
function DetalleToggle({ resumen, campos }: { resumen: string; campos: Array<{ label: string; value: string }> }) {
  const [open, setOpen] = useState(false);
  return (
    <div>
      <button
        onClick={() => setOpen((o) => !o)}
        style={{ all: "unset", cursor: "pointer", display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: "#4a6080" }}
      >
        <span>{resumen}</span>
        {campos.length > 0 && (
          <span style={{ fontSize: 10, color: "#304bd1", fontWeight: 600 }}>{open ? "▲ ocultar" : "▼ ver detalle"}</span>
        )}
      </button>
      {open && campos.length > 0 && (
        <div style={{ marginTop: 6, background: "#f7f9fc", borderRadius: 8, border: "1px solid #e2e8f0", padding: "10px 12px", display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))", gap: 8 }}>
          {campos.map((c) => (
            <div key={c.label}>
              <div style={{ fontSize: 9, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "#8ea4cf" }}>{c.label}</div>
              <div style={{ fontSize: 12, fontWeight: 600, color: "#050b2f" }}>{c.value}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/** Ficha del cuartel de origen (variedad, riego, manejo, mapa) — no solo sus eventos. */
function CuartelInfoCard({ cuartel }: { cuartel: PublicLote["cuarteles"][number] }) {
  const c = cuartel.cuartel;
  const mapUrl = c.poligono ? buildMapboxStaticUrl(c.poligono, { width: 800, height: 260 }) : null;
  return (
    <div style={{ background: "#ffffff", borderRadius: 16, border: "1px solid #d9e3ed", padding: "24px 28px", marginBottom: 16, boxShadow: "0 4px 16px rgba(7,19,95,0.07)" }}>
      <div style={{ display: "flex", flexWrap: "wrap", alignItems: "flex-start", justifyContent: "space-between", gap: 16 }}>
        <div>
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.2em", textTransform: "uppercase", color: "#00a862", marginBottom: 8 }}>
            🌱 Finca y cuartel de origen
          </div>
          <h2 style={{ fontSize: 22, fontWeight: 800, color: "#050b2f", margin: 0, lineHeight: 1.2 }}>{c.finca.nombre_finca}</h2>
          <div style={{ fontSize: 14, color: "#4a6080", marginTop: 4 }}>
            Cuartel {c.codigo_cuartel}
            {c.finca.ubicacion_texto ? ` · ${c.finca.ubicacion_texto}` : ""}
          </div>
        </div>
        {c.finca.renspa && (
          <div style={{ background: "#f0f4fa", borderRadius: 10, padding: "8px 14px", fontSize: 12, color: "#4a6080" }}>
            <span style={{ fontWeight: 700 }}>RENSPA</span> {c.finca.renspa}
          </div>
        )}
      </div>

      <div style={{ display: "flex", flexWrap: "wrap", gap: 10, marginTop: 16 }}>
        {c.variedad && <Pill label="Variedad" value={getVariedadLabel(c.variedad) ?? c.variedad} />}
        {c.superficie_ha && <Pill label="Superficie" value={`${c.superficie_ha} ha`} />}
        {c.cultivo && <Pill label="Cultivo" value={c.cultivo} />}
        {c.sistema_riego && <Pill label="Riego" value={getSistemaRiegoLabel(c.sistema_riego) ?? c.sistema_riego} />}
        {c.sistema_productivo && <Pill label="Manejo" value={getManejoCultivoLabel(c.sistema_productivo) ?? c.sistema_productivo} />}
        {c.sistema_conduccion && <Pill label="Conducción" value={getSistemaConduccionLabel(c.sistema_conduccion) ?? c.sistema_conduccion} />}
      </div>

      {mapUrl ? (
        <div style={{ marginTop: 16, borderRadius: 12, overflow: "hidden", border: "1px solid #d9e3ed" }}>
          <img src={mapUrl} alt={`Ubicación del cuartel ${c.codigo_cuartel}`} style={{ width: "100%", display: "block", objectFit: "cover", height: 200 }} loading="lazy" />
        </div>
      ) : null}

      <div style={{ display: "flex", flexWrap: "wrap", gap: 12, marginTop: 16, paddingTop: 16, borderTop: "1px solid #edf2f7" }}>
        <Counter value={cuartel.tareas.length} label="tareas registradas" />
        <Counter value={cuartel.remitos_uva.length} label="remitos de uva" />
        <Counter value={cuartel.cius.length} label="CIUs emitidos" />
      </div>
    </div>
  );
}

// ── Lightbox / gallery ───────────────────────────────────────────────────────

type LightboxImage = { url: string; nombre: string };

function Lightbox({ images, startIndex, onClose }: { images: LightboxImage[]; startIndex: number; onClose: () => void }) {
  const [idx, setIdx] = useState(startIndex);
  const prev = useCallback(() => setIdx((i) => (i - 1 + images.length) % images.length), [images.length]);
  const next = useCallback(() => setIdx((i) => (i + 1) % images.length), [images.length]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowLeft") prev();
      if (e.key === "ArrowRight") next();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose, prev, next]);

  const img = images[idx];
  if (!img) return null;

  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, zIndex: 9999, background: "rgba(5,11,47,0.92)", display: "flex", alignItems: "center", justifyContent: "center" }}>
      {images.length > 1 && (
        <button onClick={(e) => { e.stopPropagation(); prev(); }} style={{ position: "absolute", left: 16, top: "50%", transform: "translateY(-50%)", background: "rgba(255,255,255,0.15)", border: "none", borderRadius: "50%", width: 44, height: 44, fontSize: 20, color: "#fff", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>‹</button>
      )}
      <div onClick={(e) => e.stopPropagation()} style={{ maxWidth: "90vw", maxHeight: "90vh", display: "flex", flexDirection: "column", alignItems: "center", gap: 12 }}>
        <img src={img.url} alt={img.nombre} style={{ maxWidth: "90vw", maxHeight: "80vh", borderRadius: 12, objectFit: "contain", boxShadow: "0 8px 40px rgba(0,0,0,0.5)" }} />
        <div style={{ color: "rgba(237,242,247,0.7)", fontSize: 12, textAlign: "center" }}>
          {img.nombre}
          {images.length > 1 && <span style={{ marginLeft: 12, opacity: 0.5 }}>{idx + 1} / {images.length}</span>}
        </div>
      </div>
      {images.length > 1 && (
        <button onClick={(e) => { e.stopPropagation(); next(); }} style={{ position: "absolute", right: 16, top: "50%", transform: "translateY(-50%)", background: "rgba(255,255,255,0.15)", border: "none", borderRadius: "50%", width: 44, height: 44, fontSize: 20, color: "#fff", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>›</button>
      )}
      <button onClick={onClose} style={{ position: "absolute", top: 16, right: 16, background: "rgba(255,255,255,0.15)", border: "none", borderRadius: "50%", width: 36, height: 36, fontSize: 18, color: "#fff", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>×</button>
    </div>
  );
}

function ImageGallery({ images, files }: { images: LightboxImage[]; files: { url: string; nombre: string; tipo: string }[] }) {
  const [lightbox, setLightbox] = useState<{ open: boolean; index: number }>({ open: false, index: 0 });
  if (images.length === 0 && files.length === 0) return null;

  return (
    <div style={{ marginTop: 12 }}>
      {images.length > 0 && (
        <div style={{ display: "grid", gridTemplateColumns: images.length === 1 ? "1fr" : images.length === 2 ? "1fr 1fr" : "repeat(3, 1fr)", gap: 6, marginBottom: files.length > 0 ? 8 : 0 }}>
          {images.map((img, i) => (
            <button key={img.url} onClick={() => setLightbox({ open: true, index: i })} style={{ all: "unset", cursor: "zoom-in", display: "block", aspectRatio: images.length === 1 ? "16/9" : "1/1", borderRadius: 8, overflow: "hidden", border: "1px solid #d9e3ed", position: "relative" }}>
              <img src={img.url} alt={img.nombre} style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
            </button>
          ))}
        </div>
      )}
      {files.length > 0 && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
          {files.map((f) => (
            <a key={f.url} href={f.url} target="_blank" rel="noopener noreferrer" style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "5px 10px", borderRadius: 8, border: "1px solid #d9e3ed", background: "#f7f9fc", textDecoration: "none", fontSize: 12, color: "#07135f", fontWeight: 600 }}>
              <span style={{ fontSize: 16 }}>{publicFileIcon(f.tipo)}</span>
              <span style={{ maxWidth: 160, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{f.nombre}</span>
            </a>
          ))}
        </div>
      )}
      {lightbox.open && <Lightbox images={images} startIndex={lightbox.index} onClose={() => setLightbox({ open: false, index: 0 })} />}
    </div>
  );
}

// ── Composición: % por finca/cuartel de origen ──────────────────────────────

function composicionPorCuartel(lote: PublicLote): Array<{ label: string; pct: number }> {
  const porCuartel = new Map<string, { label: string; pct: number }>();
  for (const ciu of lote.cius) {
    const cuartel = lote.cuarteles.find((c) => c.cius.some((x) => x.ciu_id === ciu.ciu_id));
    const key = cuartel ? cuartel.cuartel.cuartel_id : "?";
    const label = cuartel ? `${cuartel.cuartel.finca.nombre_finca} · ${cuartel.cuartel.codigo_cuartel}` : "Origen sin identificar";
    const previo = porCuartel.get(key);
    if (previo) previo.pct += ciu.porcentaje_efectivo;
    else porCuartel.set(key, { label, pct: ciu.porcentaje_efectivo });
  }
  return Array.from(porCuartel.values()).sort((a, b) => b.pct - a.pct);
}

/** Una tarjeta de evento, cualquiera sea su tipo — reutilizada tanto en las secciones por finca como en la de bodega. */
function RenderEvento({ event, eventKey }: { event: TimelineEvent; eventKey: string }) {
  if (event.kind === "bodega") {
    const h = event.data;
    if (h.kind === "origen_ingreso") {
      return (
        <EventCard key={eventKey} icon="🍇" label="Ingreso a bodega" accent="#00a862">
          {h.recepciones.map((r, i) => (
            <div key={i} style={{ fontSize: 13, color: "#4a6080", marginBottom: 4 }}>
              CIU {r.codigo_ciu ?? "—"} · {fmt(r.fecha_hora)}
              {r.kg_pesados ? ` · ${r.kg_pesados.toLocaleString("es-AR")} kg` : ""}
            </div>
          ))}
        </EventCard>
      );
    }
    if (h.kind === "origen_corte") {
      return (
        <EventCard key={eventKey} icon="🔀" label="Corte / blend" accent="#7a1f3d">
          {h.objetivo && <div style={{ fontSize: 15, fontWeight: 700, color: "#050b2f", marginBottom: 8 }}>{h.objetivo}</div>}
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {h.componentes.map((c) => (
              <Badge key={c.lote_id} color="#7a1f3d">{c.lote_codigo} · {Math.round(c.porcentaje)}%</Badge>
            ))}
          </div>
        </EventCard>
      );
    }
    if (h.kind === "movimiento_vasija") {
      return (
        <EventCard key={eventKey} icon="🛢️" label={TIPO_OPERACION_LABEL[h.tipo_operacion ?? ""] ?? "Movimiento en vasija"} accent="#304bd1">
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center", fontSize: 13, color: "#4a6080" }}>
            <span>Vasija <strong style={{ color: "#050b2f" }}>{h.vasija_codigo}</strong></span>
            <span>{h.volumen_l.toLocaleString("es-AR")} l</span>
            {h.responsable && <span>{h.responsable}</span>}
            <Badge color={h.cerrado ? "#8ea4cf" : "#00a862"}>{h.cerrado ? "Histórico" : "Activo"}</Badge>
          </div>
          {h.observaciones && <div style={{ fontSize: 13, color: "#4a6080", marginTop: 8 }}>{h.observaciones}</div>}
          {(h.analisis.length > 0 || h.existencias.length > 0) && (
            <div style={{ marginTop: 10, paddingTop: 10, borderTop: "1px solid #e8edf5", display: "flex", flexDirection: "column", gap: 6 }}>
              {h.analisis.map((a, i) => (
                <DetalleToggle
                  key={`a-${i}`}
                  resumen={`🧪 Análisis de fermentación · ${fmt(a.fecha_hora)}`}
                  campos={[
                    a.densidad !== null ? { label: "Densidad", value: String(a.densidad) } : null,
                    a.temperatura !== null ? { label: "Temperatura", value: `${a.temperatura}°C` } : null,
                    a.brix !== null ? { label: "Brix", value: String(a.brix) } : null,
                    a.ph !== null ? { label: "pH", value: String(a.ph) } : null,
                    a.acidez !== null ? { label: "Acidez", value: String(a.acidez) } : null,
                    a.estado_fermentacion ? { label: "Estado", value: a.estado_fermentacion } : null,
                    a.observaciones ? { label: "Observaciones", value: a.observaciones } : null,
                  ].filter((c): c is { label: string; value: string } => c !== null)}
                />
              ))}
              {h.existencias.map((e, i) => (
                <DetalleToggle
                  key={`e-${i}`}
                  resumen={`🧪 Control de existencia · ${fmt(e.fecha_hora)}`}
                  campos={[
                    e.volumen_l !== null ? { label: "Volumen", value: `${e.volumen_l.toLocaleString("es-AR")} l` } : null,
                    e.grado_alcohol !== null ? { label: "Grado alcohólico", value: `${e.grado_alcohol}%` } : null,
                    e.azucar_residual_g_l !== null ? { label: "Azúcar residual", value: `${e.azucar_residual_g_l} g/l` } : null,
                    e.observaciones ? { label: "Observaciones", value: e.observaciones } : null,
                  ].filter((c): c is { label: string; value: string } => c !== null)}
                />
              ))}
            </div>
          )}
        </EventCard>
      );
    }
    return (
      <EventCard key={eventKey} icon="🔗" label="Usado en otro corte" accent="#9a6a1f">
        <div style={{ fontSize: 13, color: "#4a6080" }}>
          Aportó <strong style={{ color: "#050b2f" }}>{Math.round(h.porcentaje)}%</strong> al lote {h.lote_resultado_codigo}
        </div>
      </EventCard>
    );
  }

  if (event.kind === "tarea") {
    const t = event.data;
    const operariosUnicos = [...new Set(t.asignaciones.map((a) => a.operario).filter(Boolean) as string[])];
    return (
      <EventCard key={eventKey} icon="🌿" label={t.proceso?.tipo_evento ?? "Tarea de campo"} accent="#304bd1">
        <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "space-between", alignItems: "flex-start", gap: 8, marginBottom: 8 }}>
          <div style={{ fontSize: 15, fontWeight: 700, color: "#050b2f" }}>{t.titulo}</div>
          <span style={{ fontSize: 12, color: "#8ea4cf", whiteSpace: "nowrap" }}>{fmt(t.updated_at)}</span>
        </div>
        {t.descripcion && <div style={{ fontSize: 13, color: "#4a6080", marginBottom: 10, lineHeight: 1.6 }}>{t.descripcion}</div>}
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 10 }}>
          <Badge color={estadoColor(t.estado)}>{estadoLabel(t.estado)}</Badge>
          {t.proceso && <Badge color="#304bd1">{t.proceso.nombre}</Badge>}
          {t.fecha_fin && <Badge color="#9a6a1f">Fecha límite: {fmt(t.fecha_fin)}</Badge>}
        </div>
        {operariosUnicos.length > 0 && (
          <div style={{ marginBottom: 10 }}>
            <div style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.16em", color: "#8ea4cf", marginBottom: 4 }}>
              Operario{operariosUnicos.length !== 1 ? "s" : ""}
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              {operariosUnicos.map((nombre) => (
                <span key={nombre} style={{ background: "#f0f4fa", borderRadius: 6, padding: "3px 10px", fontSize: 12, fontWeight: 600, color: "#07135f" }}>{nombre}</span>
              ))}
            </div>
          </div>
        )}
        {t.entradas.length > 0 && (
          <div style={{ marginTop: 10, paddingTop: 10, borderTop: "1px solid #e8edf5" }}>
            <div style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.16em", color: "#8ea4cf", marginBottom: 8 }}>
              Registros de trabajo ({t.entradas.length})
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {t.entradas.map((e) => (
                <div key={e.entrada_id} style={{ background: "#f7f9fc", borderRadius: 8, border: "1px solid #e2e8f0", padding: "10px 12px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 8, marginBottom: e.descripcion ? 6 : 0 }}>
                    <span style={{ fontSize: 12, fontWeight: 600, color: "#07135f" }}>{e.registrado_por ?? "Operario"}</span>
                    <span style={{ fontSize: 11, color: "#8ea4cf", whiteSpace: "nowrap" }}>{fmt(e.fecha)}</span>
                  </div>
                  {e.descripcion && <div style={{ fontSize: 12, color: "#4a6080", lineHeight: 1.55 }}>{e.descripcion}</div>}
                  {Array.isArray(e.adjuntos) && e.adjuntos.length > 0 && (
                    <ImageGallery
                      images={e.adjuntos.filter((a) => a.tipo.startsWith("image/")).map((a) => ({ url: a.url, nombre: a.nombre }))}
                      files={e.adjuntos.filter((a) => !a.tipo.startsWith("image/"))}
                    />
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </EventCard>
    );
  }

  if (event.kind === "remito") {
    const r = event.data;
    return (
      <EventCard key={eventKey} icon="🚛" label="Remito de uva" accent="#00a862">
        <div style={{ fontSize: 14, fontWeight: 600, color: "#050b2f", marginBottom: 6 }}>
          Salida de finca{r.transportista ? ` · ${r.transportista}` : ""}
        </div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center" }}>
          {r.kg_declarados && <Badge color="#00a862">{r.kg_declarados.toLocaleString("es-AR")} kg declarados</Badge>}
          {r.llegada_bodega && <Badge color="#304bd1">Llegada {fmt(r.llegada_bodega)}</Badge>}
          <span style={{ marginLeft: "auto", fontSize: 12, color: "#8ea4cf" }}>{fmt(r.salida_finca)}</span>
        </div>
        {r.adjuntos.length > 0 && (
          <ImageGallery
            images={r.adjuntos.filter((a) => a.tipo.startsWith("image/")).map((a) => ({ url: a.url, nombre: a.nombre }))}
            files={r.adjuntos.filter((a) => !a.tipo.startsWith("image/"))}
          />
        )}
      </EventCard>
    );
  }

  if (event.kind === "recepcion") {
    const rb = event.data;
    return (
      <EventCard key={eventKey} icon="🏭" label="Recepción en bodega" accent="#9a6a1f" origen={event.origen}>
        <div style={{ fontSize: 14, fontWeight: 600, color: "#050b2f", marginBottom: 6 }}>
          Ingreso a bodega{rb.clasificacion ? ` · ${rb.clasificacion}` : ""}
        </div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center" }}>
          {rb.kg_pesados && <Badge color="#9a6a1f">{rb.kg_pesados.toLocaleString("es-AR")} kg pesados</Badge>}
          <span style={{ marginLeft: "auto", fontSize: 12, color: "#8ea4cf" }}>{fmt(rb.fecha_hora)}</span>
        </div>
        {rb.analisis.length > 0 && (
          <div style={{ marginTop: 10, paddingTop: 10, borderTop: "1px solid #e8edf5", display: "flex", flexDirection: "column", gap: 6 }}>
            {rb.analisis.map((a, i) => (
              <DetalleToggle
                key={i}
                resumen={`🧪 ${a.fuente}`}
                campos={[
                  a.brix !== null ? { label: "Brix", value: String(a.brix) } : null,
                  a.ph !== null ? { label: "pH", value: String(a.ph) } : null,
                  a.acidez !== null ? { label: "Acidez", value: String(a.acidez) } : null,
                  a.temperatura_uva !== null ? { label: "Temperatura", value: `${a.temperatura_uva}°C` } : null,
                  "sanidad" in a && a.sanidad ? { label: "Sanidad", value: a.sanidad } : null,
                  "estado_pcc" in a && a.estado_pcc ? { label: "Estado PCC", value: a.estado_pcc } : null,
                  "aprobado" in a && a.aprobado !== null ? { label: "Aprobado", value: a.aprobado ? "Sí" : "No" } : null,
                  a.observaciones ? { label: "Observaciones", value: a.observaciones } : null,
                ].filter((c): c is { label: string; value: string } => c !== null)}
              />
            ))}
          </div>
        )}
      </EventCard>
    );
  }

  if (event.kind === "ciu") {
    const c = event.data;
    return (
      <EventCard key={eventKey} icon="📋" label="CIU" accent="#304bd1">
        <div style={{ fontSize: 14, fontWeight: 600, color: "#050b2f", marginBottom: 6 }}>CIU {c.codigo_ciu}</div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center" }}>
          <Badge color={c.estado === "emitido" ? "#00a862" : "#8ea4cf"}>{c.estado}</Badge>
          {c.variedad_nombre && <Badge color="#304bd1">{c.variedad_nombre}</Badge>}
          {c.tenor_azucarino_gl !== null && <Badge color="#9a6a1f">{c.tenor_azucarino_gl} g/l</Badge>}
          {c.uva_organica && <Badge color="#00a862">Orgánica</Badge>}
          <span style={{ marginLeft: "auto", fontSize: 12, color: "#8ea4cf" }}>{fmt(c.emitido_at)}</span>
        </div>
        {c.observaciones && <div style={{ fontSize: 13, color: "#4a6080", marginTop: 8 }}>{c.observaciones}</div>}
      </EventCard>
    );
  }

  return null;
}

// ── Main page ──────────────────────────────────────────────────────────────

const LotePublico = () => {
  const { loteId } = useParams<{ loteId: string }>();
  const [data, setData] = useState<PublicLote | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!loteId) return;
    let mounted = true;
    const run = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetchPublicLote(loteId);
        if (mounted) setData(res);
      } catch (err: unknown) {
        if (mounted) setError(err instanceof Error ? err.message : "No se pudo cargar la trazabilidad.");
      } finally {
        if (mounted) setLoading(false);
      }
    };
    void run();
    return () => {
      mounted = false;
    };
  }, [loteId]);

  const eventosPorCuartel = data ? data.cuarteles.map((c) => ({ info: c, cuartel: c.cuartel, eventos: buildEventosDeCuartel(c) })) : [];
  const eventosBodega = data ? buildEventosDeBodega(data) : [];
  const composicion = data ? composicionPorCuartel(data) : [];

  return (
    <div style={{ minHeight: "100vh", background: "#f0f4fa", fontFamily: "'Work Sans', sans-serif" }}>
      <header style={{ background: "#07135f", padding: "20px 24px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16 }}>
        <img src={trazaLogo} alt="Traza" style={{ height: 44, objectFit: "contain" }} />
        <div style={{ textAlign: "right" }}>
          <div style={{ color: "rgba(237,242,247,0.6)", fontSize: 11, fontWeight: 700, letterSpacing: "0.2em", textTransform: "uppercase" }}>Trazabilidad pública</div>
          <div style={{ color: "#ffffff", fontSize: 14, fontWeight: 600, marginTop: 2 }}>
            {data ? (data.producto?.nombre_comercial ?? data.codigo) : "Cargando…"}
          </div>
        </div>
      </header>

      <main style={{ maxWidth: 800, margin: "0 auto", padding: "32px 16px 64px" }}>
        {loading && <div style={{ textAlign: "center", padding: "80px 0", color: "#4a6080", fontSize: 15 }}>Cargando trazabilidad…</div>}
        {!loading && error && (
          <div style={{ background: "#fff0f0", border: "1px solid #fca5a5", borderRadius: 12, padding: 24, color: "#b91c1c", fontSize: 14 }}>{error}</div>
        )}

        {!loading && data && (
          <>
            <div style={{ background: "#ffffff", borderRadius: 16, border: "1px solid #d9e3ed", padding: "24px 28px", marginBottom: 28, boxShadow: "0 4px 16px rgba(7,19,95,0.07)" }}>
              <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.2em", textTransform: "uppercase", color: "#7a1f3d", marginBottom: 8 }}>
                {data.producto ? "🍷 Producto" : "🍇 Lote"}
              </div>
              <h1 style={{ fontSize: 28, fontWeight: 800, color: "#050b2f", margin: 0, lineHeight: 1.2 }}>
                {data.producto?.nombre_comercial ?? data.codigo}
              </h1>
              {data.producto ? (
                <div style={{ display: "flex", flexWrap: "wrap", gap: 10, marginTop: 12 }}>
                  {data.producto.varietal && <Pill label="Varietal" value={data.producto.varietal} />}
                  {data.producto.anio && <Pill label="Año" value={String(data.producto.anio)} />}
                  {data.producto.tipo && <Pill label="Tipo" value={data.producto.tipo} />}
                  <Pill label="Lote" value={data.codigo} />
                </div>
              ) : (
                <div style={{ fontSize: 15, color: "#4a6080", marginTop: 6 }}>{ORIGEN_LABEL[data.origen]}</div>
              )}

              {composicion.length > 0 ? (
                <div style={{ display: "flex", flexWrap: "wrap", gap: 10, marginTop: 20, paddingTop: 20, borderTop: "1px solid #edf2f7" }}>
                  {composicion.map((c) => (
                    <Badge key={c.label} color="#00a862">{c.label} · {Math.round(c.pct)}%</Badge>
                  ))}
                </div>
              ) : null}
            </div>

            {/* Fincas y cuarteles de origen — una sección por cada uno, en orden cronológico */}
            {eventosPorCuartel.map(({ info, cuartel, eventos }) => (
              <div key={cuartel.cuartel_id} style={{ marginBottom: 28 }}>
                <CuartelInfoCard cuartel={info} />
                {eventosPorCuartel.length > 1 ? (
                  <h3 style={{ fontSize: 12, fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase", color: "#00a862", margin: "0 0 12px" }}>
                    🌱 En {cuartel.finca.nombre_finca} · Cuartel {cuartel.codigo_cuartel}
                  </h3>
                ) : eventos.length > 0 ? (
                  <h3 style={{ fontSize: 12, fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase", color: "#00a862", margin: "0 0 12px" }}>
                    🌱 En la finca
                  </h3>
                ) : null}
                {eventos.length === 0 ? (
                  <div style={{ background: "#ffffff", borderRadius: 12, padding: 20, textAlign: "center", color: "#8ea4cf", fontSize: 13 }}>
                    Sin registros de campo todavía para este cuartel.
                  </div>
                ) : (
                  eventos.map((event, i) => <RenderEvento key={`${cuartel.cuartel_id}-${i}`} event={event} eventKey={`${cuartel.cuartel_id}-${i}`} />)
                )}
              </div>
            ))}

            {/* En la bodega */}
            <div style={{ marginBottom: 12 }}>
              <h3 style={{ fontSize: 12, fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase", color: "#7a1f3d", margin: "0 0 12px" }}>
                🏭 En la bodega
              </h3>
              {eventosBodega.length === 0 ? (
                <div style={{ background: "#ffffff", borderRadius: 12, padding: 28, textAlign: "center", color: "#8ea4cf", fontSize: 14 }}>
                  Todavía no hay registros de bodega para este lote.
                </div>
              ) : (
                eventosBodega.map((event, i) => <RenderEvento key={`bodega-${i}`} event={event} eventKey={`bodega-${i}`} />)
              )}
            </div>
          </>
        )}

        <div style={{ textAlign: "center", paddingTop: 40, borderTop: "1px solid #d9e3ed", color: "#8ea4cf", fontSize: 12 }}>
          <div>Información provista por <strong style={{ color: "#4a6080" }}>Traza</strong> — plataforma de trazabilidad vitivinícola</div>
          <div style={{ marginTop: 4 }}>Los datos son actualizados en tiempo real por el equipo productor</div>
        </div>
      </main>
    </div>
  );
};

export default LotePublico;
