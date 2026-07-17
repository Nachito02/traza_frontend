import { useCallback, useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import {
  fetchPublicTrazabilidadCuartel,
  type PublicTrazabilidadCuartel,
} from "../../features/public/api";
import {
  getVariedadLabel,
  getSistemaRiegoLabel,
  getManejoCultivoLabel,
  getSistemaConduccionLabel,
} from "../../domain/viticultura/catalogos";
import trazaLogo from "../../assets/traza_logo_02.png";
import { buildMapboxStaticUrl } from "../../lib/mapbox";

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
  return new Date(dateStr).toLocaleDateString("es-AR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
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

// ── Timeline item helpers ──────────────────────────────────────────────────

type TimelineEvent =
  | { kind: "tarea"; date: Date; data: PublicTrazabilidadCuartel["tareas"][number] }
  | { kind: "remito"; date: Date; data: PublicTrazabilidadCuartel["remitos_uva"][number] }
  | { kind: "recepcion"; date: Date; data: PublicTrazabilidadCuartel["remitos_uva"][number]["recepciones"][number] & { cuartel_kg?: number | null } }
  | { kind: "ciu"; date: Date; data: PublicTrazabilidadCuartel["cius"][number] };

function buildTimeline(trazabilidad: PublicTrazabilidadCuartel): TimelineEvent[] {
  const events: TimelineEvent[] = [];

  for (const t of trazabilidad.tareas) {
    events.push({ kind: "tarea", date: new Date(t.updated_at || t.created_at), data: t });
  }

  for (const r of trazabilidad.remitos_uva) {
    events.push({ kind: "remito", date: new Date(r.salida_finca), data: r });
    for (const rb of r.recepciones) {
      events.push({ kind: "recepcion", date: new Date(rb.fecha_hora), data: { ...rb, cuartel_kg: r.kg_declarados } });
    }
  }

  for (const c of trazabilidad.cius) {
    events.push({ kind: "ciu", date: new Date(c.emitido_at), data: c });
  }

  return events.sort((a, b) => b.date.getTime() - a.date.getTime());
}

// ── Sub-components ─────────────────────────────────────────────────────────

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

type EventCardProps = { icon: string; label: string; accent: string; children: React.ReactNode };
const EventCard = ({ icon, label, accent, children }: EventCardProps) => (
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
      <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.2em", textTransform: "uppercase", color: accent, marginBottom: 6 }}>
        {label}
      </div>
      {children}
    </div>
  </div>
);

// ── Lightbox ───────────────────────────────────────────────────────────────

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
    <div
      onClick={onClose}
      style={{
        position: "fixed", inset: 0, zIndex: 9999,
        background: "rgba(5,11,47,0.92)",
        display: "flex", alignItems: "center", justifyContent: "center",
      }}
    >
      {/* Prev */}
      {images.length > 1 && (
        <button
          onClick={(e) => { e.stopPropagation(); prev(); }}
          style={{ position: "absolute", left: 16, top: "50%", transform: "translateY(-50%)", background: "rgba(255,255,255,0.15)", border: "none", borderRadius: "50%", width: 44, height: 44, fontSize: 20, color: "#fff", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}
        >‹</button>
      )}

      {/* Image */}
      <div onClick={(e) => e.stopPropagation()} style={{ maxWidth: "90vw", maxHeight: "90vh", display: "flex", flexDirection: "column", alignItems: "center", gap: 12 }}>
        <img
          src={img.url}
          alt={img.nombre}
          style={{ maxWidth: "90vw", maxHeight: "80vh", borderRadius: 12, objectFit: "contain", boxShadow: "0 8px 40px rgba(0,0,0,0.5)" }}
        />
        <div style={{ color: "rgba(237,242,247,0.7)", fontSize: 12, textAlign: "center" }}>
          {img.nombre}
          {images.length > 1 && <span style={{ marginLeft: 12, opacity: 0.5 }}>{idx + 1} / {images.length}</span>}
        </div>
      </div>

      {/* Next */}
      {images.length > 1 && (
        <button
          onClick={(e) => { e.stopPropagation(); next(); }}
          style={{ position: "absolute", right: 16, top: "50%", transform: "translateY(-50%)", background: "rgba(255,255,255,0.15)", border: "none", borderRadius: "50%", width: 44, height: 44, fontSize: 20, color: "#fff", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}
        >›</button>
      )}

      {/* Close */}
      <button
        onClick={onClose}
        style={{ position: "absolute", top: 16, right: 16, background: "rgba(255,255,255,0.15)", border: "none", borderRadius: "50%", width: 36, height: 36, fontSize: 18, color: "#fff", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}
      >×</button>
    </div>
  );
}

// ── Image gallery ──────────────────────────────────────────────────────────

function ImageGallery({ images, files }: { images: LightboxImage[]; files: { url: string; nombre: string; tipo: string }[] }) {
  const [lightbox, setLightbox] = useState<{ open: boolean; index: number }>({ open: false, index: 0 });

  if (images.length === 0 && files.length === 0) return null;

  return (
    <div style={{ marginTop: 12 }}>
      {/* Images grid */}
      {images.length > 0 && (
        <div style={{
          display: "grid",
          gridTemplateColumns: images.length === 1 ? "1fr" : images.length === 2 ? "1fr 1fr" : "repeat(3, 1fr)",
          gap: 6,
          marginBottom: files.length > 0 ? 8 : 0,
        }}>
          {images.map((img, i) => (
            <button
              key={img.url}
              onClick={() => setLightbox({ open: true, index: i })}
              style={{
                all: "unset",
                cursor: "zoom-in",
                display: "block",
                aspectRatio: images.length === 1 ? "16/9" : "1/1",
                borderRadius: 8,
                overflow: "hidden",
                border: "1px solid #d9e3ed",
                position: "relative",
              }}
            >
              <img
                src={img.url}
                alt={img.nombre}
                style={{ width: "100%", height: "100%", objectFit: "cover", display: "block", transition: "opacity 0.15s" }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLImageElement).style.opacity = "0.85"; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLImageElement).style.opacity = "1"; }}
              />
              {/* Overlay hint on single image */}
              {images.length === 1 && (
                <div style={{ position: "absolute", bottom: 8, right: 8, background: "rgba(5,11,47,0.55)", borderRadius: 6, padding: "3px 8px", fontSize: 11, color: "#fff" }}>
                  🔍 Ver
                </div>
              )}
            </button>
          ))}
        </div>
      )}

      {/* Non-image file links */}
      {files.length > 0 && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
          {files.map((f) => (
            <a
              key={f.url}
              href={f.url}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: "inline-flex", alignItems: "center", gap: 6,
                padding: "5px 10px", borderRadius: 8,
                border: "1px solid #d9e3ed", background: "#f7f9fc",
                textDecoration: "none", fontSize: 12, color: "#07135f", fontWeight: 600,
              }}
            >
              <span style={{ fontSize: 16 }}>{publicFileIcon(f.tipo)}</span>
              <span style={{ maxWidth: 160, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{f.nombre}</span>
            </a>
          ))}
        </div>
      )}

      {lightbox.open && (
        <Lightbox images={images} startIndex={lightbox.index} onClose={() => setLightbox({ open: false, index: 0 })} />
      )}
    </div>
  );
}

// ── Main page ──────────────────────────────────────────────────────────────

const TrazabilidadPublica = () => {
  const { cuartelId } = useParams<{ cuartelId: string }>();
  const [data, setData] = useState<PublicTrazabilidadCuartel | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!cuartelId) return;
    let mounted = true;

    const run = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetchPublicTrazabilidadCuartel(cuartelId);
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
  }, [cuartelId]);

  const timeline = data ? buildTimeline(data) : [];

  return (
    <div style={{ minHeight: "100vh", background: "#f0f4fa", fontFamily: "'Work Sans', sans-serif" }}>
      {/* Header */}
      <header
        style={{
          background: "#07135f",
          padding: "20px 24px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 16,
        }}
      >
        <img src={trazaLogo} alt="Traza" style={{ height: 44, objectFit: "contain" }} />
        <div style={{ textAlign: "right" }}>
          <div style={{ color: "rgba(237,242,247,0.6)", fontSize: 11, fontWeight: 700, letterSpacing: "0.2em", textTransform: "uppercase" }}>
            Trazabilidad pública
          </div>
          <div style={{ color: "#ffffff", fontSize: 14, fontWeight: 600, marginTop: 2 }}>
            {data ? `Cuartel ${data.cuartel.codigo_cuartel}` : "Cargando…"}
          </div>
        </div>
      </header>

      <main style={{ maxWidth: 800, margin: "0 auto", padding: "32px 16px 64px" }}>

        {/* Loading */}
        {loading && (
          <div style={{ textAlign: "center", padding: "80px 0", color: "#4a6080", fontSize: 15 }}>
            Cargando trazabilidad…
          </div>
        )}

        {/* Error */}
        {!loading && error && (
          <div style={{ background: "#fff0f0", border: "1px solid #fca5a5", borderRadius: 12, padding: 24, color: "#b91c1c", fontSize: 14 }}>
            {error}
          </div>
        )}

        {/* Content */}
        {!loading && data && (
          <>
            {/* Cuartel info card */}
            <div
              style={{
                background: "#ffffff",
                borderRadius: 16,
                border: "1px solid #d9e3ed",
                padding: "24px 28px",
                marginBottom: 28,
                boxShadow: "0 4px 16px rgba(7,19,95,0.07)",
              }}
            >
              <div style={{ display: "flex", flexWrap: "wrap", alignItems: "flex-start", justifyContent: "space-between", gap: 16 }}>
                <div>
                  <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.2em", textTransform: "uppercase", color: "#00a862", marginBottom: 8 }}>
                    Cuartel de origen
                  </div>
                  <h1 style={{ fontSize: 28, fontWeight: 800, color: "#050b2f", margin: 0, lineHeight: 1.2 }}>
                    {data.cuartel.codigo_cuartel}
                  </h1>
                  <div style={{ fontSize: 15, color: "#4a6080", marginTop: 6 }}>
                    {data.cuartel.finca.nombre_finca}
                    {data.cuartel.finca.ubicacion_texto ? ` · ${data.cuartel.finca.ubicacion_texto}` : ""}
                  </div>
                </div>
                {data.cuartel.finca.renspa && (
                  <div style={{ background: "#f0f4fa", borderRadius: 10, padding: "8px 14px", fontSize: 12, color: "#4a6080" }}>
                    <span style={{ fontWeight: 700 }}>RENSPA</span> {data.cuartel.finca.renspa}
                  </div>
                )}
              </div>

              <div style={{ display: "flex", flexWrap: "wrap", gap: 10, marginTop: 20 }}>
                {data.cuartel.variedad && (
                  <Pill label="Variedad" value={getVariedadLabel(data.cuartel.variedad) ?? data.cuartel.variedad} />
                )}
                {data.cuartel.superficie_ha && (
                  <Pill label="Superficie" value={`${data.cuartel.superficie_ha} ha`} />
                )}
                {data.cuartel.cultivo && (
                  <Pill label="Cultivo" value={data.cuartel.cultivo} />
                )}
                {data.cuartel.sistema_riego && (
                  <Pill label="Riego" value={getSistemaRiegoLabel(data.cuartel.sistema_riego) ?? data.cuartel.sistema_riego} />
                )}
                {data.cuartel.sistema_productivo && (
                  <Pill label="Manejo" value={getManejoCultivoLabel(data.cuartel.sistema_productivo) ?? data.cuartel.sistema_productivo} />
                )}
                {data.cuartel.sistema_conduccion && (
                  <Pill label="Conducción" value={getSistemaConduccionLabel(data.cuartel.sistema_conduccion) ?? data.cuartel.sistema_conduccion} />
                )}
              </div>

              {/* Imagen satelital del cuartel */}
              {data.cuartel.poligono && (() => {
                const url = buildMapboxStaticUrl(data.cuartel.poligono, { width: 800, height: 320 });
                if (!url) return null;
                return (
                  <div style={{ marginTop: 20, borderRadius: 12, overflow: "hidden", border: "1px solid #d9e3ed" }}>
                    <img
                      src={url}
                      alt={`Ubicación del cuartel ${data.cuartel.codigo_cuartel}`}
                      style={{ width: "100%", display: "block", objectFit: "cover", height: 220 }}
                      loading="lazy"
                    />
                  </div>
                );
              })()}

              {/* Summary counters */}
              <div style={{ display: "flex", flexWrap: "wrap", gap: 12, marginTop: 20, paddingTop: 20, borderTop: "1px solid #edf2f7" }}>
                <Counter value={data.tareas.length} label="tareas registradas" />
                <Counter value={data.remitos_uva.length} label="remitos de uva" />
                <Counter value={data.cius.length} label="CIUs emitidos" />
              </div>
            </div>

            {/* Timeline */}
            <div style={{ marginBottom: 12 }}>
              <h2 style={{ fontSize: 13, fontWeight: 700, letterSpacing: "0.2em", textTransform: "uppercase", color: "#4a6080", margin: "0 0 20px" }}>
                Línea de tiempo
              </h2>

              {timeline.length === 0 ? (
                <div style={{ background: "#ffffff", borderRadius: 12, padding: 28, textAlign: "center", color: "#8ea4cf", fontSize: 14 }}>
                  Todavía no hay registros de trazabilidad para este cuartel.
                </div>
              ) : (
                timeline.map((event, idx) => {
                  if (event.kind === "tarea") {
                    const t = event.data;
                    const operariosAsignados = t.asignaciones
                      .map((a) => a.operario)
                      .filter(Boolean) as string[];
                    const operariosUnicos = [...new Set(operariosAsignados)];
                    return (
                      <EventCard key={`tarea-${t.tarea_id}-${idx}`} icon="🌿" label={t.proceso?.tipo_evento ?? "Tarea de campo"} accent="#304bd1">
                        {/* Title + date */}
                        <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "space-between", alignItems: "flex-start", gap: 8, marginBottom: 8 }}>
                          <div style={{ fontSize: 15, fontWeight: 700, color: "#050b2f" }}>
                            {t.titulo}
                          </div>
                          <span style={{ fontSize: 12, color: "#8ea4cf", whiteSpace: "nowrap" }}>{fmt(t.updated_at)}</span>
                        </div>

                        {/* Description */}
                        {t.descripcion && (
                          <div style={{ fontSize: 13, color: "#4a6080", marginBottom: 10, lineHeight: 1.6 }}>
                            {t.descripcion}
                          </div>
                        )}

                        {/* Badges row */}
                        <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 10 }}>
                          <Badge color={estadoColor(t.estado)}>{estadoLabel(t.estado)}</Badge>
                          {t.proceso && <Badge color="#304bd1">{t.proceso.nombre}</Badge>}
                          {t.fecha_fin && (
                            <Badge color="#9a6a1f">Fecha límite: {fmt(t.fecha_fin)}</Badge>
                          )}
                        </div>

                        {/* Operarios */}
                        {operariosUnicos.length > 0 && (
                          <div style={{ marginBottom: 10 }}>
                            <div style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.16em", color: "#8ea4cf", marginBottom: 4 }}>
                              Operario{operariosUnicos.length !== 1 ? "s" : ""}
                            </div>
                            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                              {operariosUnicos.map((nombre) => (
                                <span
                                  key={nombre}
                                  style={{
                                    background: "#f0f4fa",
                                    borderRadius: 6,
                                    padding: "3px 10px",
                                    fontSize: 12,
                                    fontWeight: 600,
                                    color: "#07135f",
                                  }}
                                >
                                  {nombre}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Entradas / registros de trabajo */}
                        {t.entradas.length > 0 && (
                          <div style={{ marginTop: 10, paddingTop: 10, borderTop: "1px solid #e8edf5" }}>
                            <div style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.16em", color: "#8ea4cf", marginBottom: 8 }}>
                              Registros de trabajo ({t.entradas.length})
                            </div>
                            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                              {t.entradas.map((e) => (
                                <div
                                  key={e.entrada_id}
                                  style={{
                                    background: "#f7f9fc",
                                    borderRadius: 8,
                                    border: "1px solid #e2e8f0",
                                    padding: "10px 12px",
                                  }}
                                >
                                  <div style={{ display: "flex", justifyContent: "space-between", gap: 8, marginBottom: e.descripcion ? 6 : 0 }}>
                                    <span style={{ fontSize: 12, fontWeight: 600, color: "#07135f" }}>
                                      {e.registrado_por ?? "Operario"}
                                    </span>
                                    <span style={{ fontSize: 11, color: "#8ea4cf", whiteSpace: "nowrap" }}>
                                      {fmt(e.fecha)}
                                    </span>
                                  </div>
                                  {e.descripcion && (
                                    <div style={{ fontSize: 12, color: "#4a6080", lineHeight: 1.55 }}>
                                      {e.descripcion}
                                    </div>
                                  )}
                                  {/* Adjuntos — gallery with lightbox */}
                                  {Array.isArray(e.adjuntos) && e.adjuntos.length > 0 && (
                                    <ImageGallery
                                      images={(e.adjuntos).filter((a) => a.tipo.startsWith("image/")).map((a) => ({ url: a.url, nombre: a.nombre }))}
                                      files={(e.adjuntos).filter((a) => !a.tipo.startsWith("image/"))}
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
                      <EventCard key={`remito-${r.remito_uva_id}-${idx}`} icon="🚛" label="Remito de uva" accent="#00a862">
                        <div style={{ fontSize: 14, fontWeight: 600, color: "#050b2f", marginBottom: 6 }}>
                          Salida de finca{r.transportista ? ` · ${r.transportista}` : ""}
                        </div>
                        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center" }}>
                          {r.kg_declarados && <Badge color="#00a862">{r.kg_declarados.toLocaleString("es-AR")} kg declarados</Badge>}
                          {r.llegada_bodega && <Badge color="#304bd1">Llegada {fmt(r.llegada_bodega)}</Badge>}
                          <span style={{ marginLeft: "auto", fontSize: 12, color: "#8ea4cf" }}>{fmt(r.salida_finca)}</span>
                        </div>
                      </EventCard>
                    );
                  }

                  if (event.kind === "recepcion") {
                    const rb = event.data;
                    return (
                      <EventCard key={`recepcion-${rb.recepcion_bodega_id}-${idx}`} icon="🏭" label="Recepción en bodega" accent="#9a6a1f">
                        <div style={{ fontSize: 14, fontWeight: 600, color: "#050b2f", marginBottom: 6 }}>
                          Ingreso a bodega{rb.clasificacion ? ` · ${rb.clasificacion}` : ""}
                        </div>
                        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center" }}>
                          {rb.kg_pesados && <Badge color="#9a6a1f">{rb.kg_pesados.toLocaleString("es-AR")} kg pesados</Badge>}
                          <span style={{ marginLeft: "auto", fontSize: 12, color: "#8ea4cf" }}>{fmt(rb.fecha_hora)}</span>
                        </div>
                      </EventCard>
                    );
                  }

                  if (event.kind === "ciu") {
                    const c = event.data;
                    return (
                      <EventCard key={`ciu-${c.ciu_id}-${idx}`} icon="📋" label="CIU" accent="#304bd1">
                        <div style={{ fontSize: 14, fontWeight: 600, color: "#050b2f", marginBottom: 6 }}>
                          CIU {c.codigo_ciu}
                        </div>
                        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center" }}>
                          <Badge color={c.estado === "emitido" ? "#00a862" : "#8ea4cf"}>{c.estado}</Badge>
                          <span style={{ marginLeft: "auto", fontSize: 12, color: "#8ea4cf" }}>{fmt(c.emitido_at)}</span>
                        </div>
                      </EventCard>
                    );
                  }

                  return null;
                })
              )}
            </div>
          </>
        )}

        {/* Footer */}
        <div style={{ textAlign: "center", paddingTop: 40, borderTop: "1px solid #d9e3ed", color: "#8ea4cf", fontSize: 12 }}>
          <div>Información provista por <strong style={{ color: "#4a6080" }}>Traza</strong> — plataforma de trazabilidad vitivinícola</div>
          <div style={{ marginTop: 4 }}>Los datos son actualizados en tiempo real por el equipo productor</div>
        </div>
      </main>
    </div>
  );
};

// ── Small helper components ────────────────────────────────────────────────

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

export default TrazabilidadPublica;
