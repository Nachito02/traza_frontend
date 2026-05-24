import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { AppButton, AppCard, GuidedState, NoticeBanner, SectionIntro, useConfirmDialog } from "../../components/ui";
import QrCuartelModal from "../../components/QrCuartelModal";
import type { Cuartel } from "../../features/cuarteles/api";
import {
  fetchCuartelById,
  fetchCuartelesByFinca,
} from "../../features/cuarteles/api";
import { fetchTareasByBodega, type Tarea } from "../../features/encargos/api";
import { deleteFinca } from "../../features/fincas/api";
import { useFincasStore } from "../../features/fincas/store";
import { fetchTrazabilidades, type Trazabilidad } from "../../features/trazabilidades/api";
import { listElaboracionResource, type ElaboracionEntity } from "../../features/elaboracion/api";
import { getApiErrorMessage } from "../../lib/api";
import { useAuthStore } from "../../store/authStore";
import {
  getManejoCultivoLabel,
  getSistemaConduccionLabel,
  getSistemaRiegoLabel,
  getVariedadLabel,
} from "../../domain/viticultura/catalogos";

const FincaDetail = () => {
  const { confirm, ConfirmDialog } = useConfirmDialog();
  const { id } = useParams();
  const navigate = useNavigate();
  const activeBodegaId = useAuthStore((state) => state.activeBodegaId);
  const fincas = useFincasStore((state) => state.fincas);
  const loadFincas = useFincasStore((state) => state.loadFincas);
  const finca = fincas.find((item) => item.finca_id === id || item.id === id);

  const [cuarteles, setCuarteles] = useState<Cuartel[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedCuartelId, setExpandedCuartelId] = useState<string | null>(null);
  const [cuartelDetailById, setCuartelDetailById] = useState<Record<string, Cuartel>>({});
  const [cuartelDetailErrorById, setCuartelDetailErrorById] = useState<Record<string, string>>(
    {},
  );
  const [tareasFinca, setTareasFinca] = useState<Tarea[]>([]);
  const [trazabilidades, setTrazabilidades] = useState<Trazabilidad[]>([]);
  const [loadingResumen, setLoadingResumen] = useState(true);
  const [loadingDetailId, setLoadingDetailId] = useState<string | null>(null);
  const [deletingFinca, setDeletingFinca] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  const [remitosUva, setRemitosUva] = useState<ElaboracionEntity[]>([]);
  const [recepcionesBodega, setRecepcionesBodega] = useState<ElaboracionEntity[]>([]);
  const [cius, setCius] = useState<ElaboracionEntity[]>([]);
  const [loadingOperativos, setLoadingOperativos] = useState(false);
  const [qrCuartel, setQrCuartel] = useState<{ id: string; codigo: string } | null>(null);

  const fincaNombre = finca?.nombre_finca ?? "Finca";
  const fincaUbicacion = useMemo(() => {
    const detail = finca as Record<string, unknown> | undefined;
    const keys = ["ubicacion_texto", "ubicacion", "ubicacion_finca", "ubicacionFinca"];
    for (const key of keys) {
      const value = detail?.[key];
      if (typeof value === "string" && value.trim()) return value;
    }
    return "Ubicación sin definir";
  }, [finca]);

  useEffect(() => {
    if (!id) return;
    let mounted = true;
    setLoading(true);
    setError(null);

    fetchCuartelesByFinca(id)
      .then((data) => {
        if (!mounted) return;
        setCuarteles(data ?? []);
      })
      .catch(() => {
        if (!mounted) return;
        setError("No se pudieron cargar los cuarteles de la finca.");
      })
      .finally(() => {
        if (!mounted) return;
        setLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, [id]);

  useEffect(() => {
    if (!id || !activeBodegaId) {
      setTareasFinca([]);
      setTrazabilidades([]);
      setLoadingResumen(false);
      return;
    }

    let mounted = true;
    setLoadingResumen(true);

    Promise.all([
      fetchTareasByBodega(String(activeBodegaId)).catch(() => []),
      fetchTrazabilidades(activeBodegaId).catch(() => []),
    ])
      .then(([tareasData, trazabilidadesData]) => {
        if (!mounted) return;
        setTareasFinca(
          (tareasData ?? []).filter(
            (tarea) => String(tarea.finca_id ?? tarea.finca?.finca_id ?? "") === String(id),
          ),
        );
        setTrazabilidades(
          (trazabilidadesData ?? []).filter((trazabilidad) => {
            if (String(trazabilidad.finca_id ?? "") === String(id)) return true;
            return (trazabilidad.trazabilidad_origen ?? []).some(
              (origen) => String(origen.finca_id ?? "") === String(id),
            );
          }),
        );
      })
      .finally(() => {
        if (!mounted) return;
        setLoadingResumen(false);
      });

    return () => {
      mounted = false;
    };
  }, [activeBodegaId, id]);

  useEffect(() => {
    if (!id || !activeBodegaId) {
      setRemitosUva([]);
      setRecepcionesBodega([]);
      setCius([]);
      return;
    }

    let mounted = true;
    setLoadingOperativos(true);

    const params = { bodegaId: String(activeBodegaId) };

    Promise.all([
      listElaboracionResource("remitos-uva", params).catch(() => []),
      listElaboracionResource("recepciones-bodega", params).catch(() => []),
      listElaboracionResource("cius", params).catch(() => []),
    ]).then(([remitos, recepciones, ciusData]) => {
      if (!mounted) return;
      setRemitosUva(remitos.filter((r) => String(r.finca_id ?? "") === String(id)));
      setRecepcionesBodega(
        recepciones.filter((r) => {
          const remito = r.remito_uva as Record<string, unknown> | undefined;
          return String(remito?.finca_id ?? "") === String(id);
        }),
      );
      setCius(ciusData.filter((c) => String(c.finca_id ?? "") === String(id)));
    }).finally(() => {
      if (!mounted) return;
      setLoadingOperativos(false);
    });

    return () => {
      mounted = false;
    };
  }, [activeBodegaId, id]);

  const tareasActivas = useMemo(
    () =>
      tareasFinca.filter((tarea) => {
        const estado = String(tarea.estado ?? "").toLowerCase().trim();
        return estado !== "cancelado" && estado !== "completado";
      }),
    [tareasFinca],
  );

  const ultimaTarea = useMemo(
    () =>
      [...tareasFinca].sort((a, b) => {
        const aTime = new Date(String(a.updated_at ?? a.created_at ?? 0)).getTime();
        const bTime = new Date(String(b.updated_at ?? b.created_at ?? 0)).getTime();
        return bTime - aTime;
      })[0],
    [tareasFinca],
  );

  const historialItems = useMemo(() => {
    const taskItems = tareasFinca.map((tarea) => ({
      id: String(tarea.tarea_id ?? tarea.id ?? `${tarea.titulo}-${tarea.created_at ?? ""}`),
      tipo: "tarea" as const,
      titulo: tarea.titulo,
      descripcion: tarea.descripcion ?? null,
      estado: tarea.estado ?? "pendiente",
      fecha: String(tarea.updated_at ?? tarea.created_at ?? ""),
      meta: [
        tarea.cuartel?.codigo_cuartel ? `Cuartel ${tarea.cuartel.codigo_cuartel}` : null,
        tarea.prioridad ? `Prioridad ${tarea.prioridad}` : null,
      ].filter(Boolean).join(" · "),
    }));

    const trazabilidadItems = trazabilidades.map((trazabilidad) => ({
      id: trazabilidad.trazabilidad_id,
      tipo: "trazabilidad" as const,
      titulo: trazabilidad.nombre_producto?.trim()
        ? `Trazabilidad ${trazabilidad.nombre_producto}`
        : "Trazabilidad iniciada",
      descripcion: "Registro de trazabilidad vinculado al origen de esta finca.",
      estado: trazabilidad.estado,
      fecha: "",
      meta: trazabilidad.cuartel_id ? `Cuartel vinculado ${trazabilidad.cuartel_id}` : "Sin cuartel asociado",
    }));

    return [...taskItems, ...trazabilidadItems].sort((a, b) => {
      const aTime = a.fecha ? new Date(a.fecha).getTime() : 0;
      const bTime = b.fecha ? new Date(b.fecha).getTime() : 0;
      return bTime - aTime;
    });
  }, [tareasFinca, trazabilidades]);

  type RegistroOperativo = {
    id: string;
    tipo: "remito_uva" | "recepcion_bodega" | "ciu";
    titulo: string;
    meta: string;
    fecha: string;
  };

  const registrosOperativos = useMemo<RegistroOperativo[]>(() => {
    const remitos: RegistroOperativo[] = remitosUva.map((r) => {
      const cuartelCodigo = (r.cuartel as Record<string, unknown> | undefined)?.codigo_cuartel;
      const kg = r.kg_netos ?? r.kg_brutos;
      return {
        id: String(r.remito_uva_id ?? r.id ?? ""),
        tipo: "remito_uva",
        titulo: "Remito de uva",
        meta: [
          cuartelCodigo ? `Cuartel ${String(cuartelCodigo)}` : null,
          kg ? `${String(kg)} kg` : null,
        ].filter(Boolean).join(" · "),
        fecha: String(r.salida_finca ?? r.created_at ?? ""),
      };
    });

    const recepciones: RegistroOperativo[] = recepcionesBodega.map((r) => {
      const remito = r.remito_uva as Record<string, unknown> | undefined;
      const cuartelCodigo = (remito?.cuartel as Record<string, unknown> | undefined)?.codigo_cuartel;
      return {
        id: String(r.recepcion_bodega_id ?? r.id ?? ""),
        tipo: "recepcion_bodega",
        titulo: "Recepción en bodega",
        meta: [
          cuartelCodigo ? `Cuartel ${String(cuartelCodigo)}` : null,
          r.kg_pesados ? `${String(r.kg_pesados)} kg pesados` : null,
          r.clasificacion ? String(r.clasificacion) : null,
        ].filter(Boolean).join(" · "),
        fecha: String(r.fecha_hora ?? r.created_at ?? ""),
      };
    });

    const ciuItems: RegistroOperativo[] = cius.map((c) => ({
      id: String(c.ciu_id ?? c.id ?? ""),
      tipo: "ciu",
      titulo: `CIU${c.codigo_ciu ? ` — ${String(c.codigo_ciu)}` : ""}`,
      meta: [
        c.variedad ? `Variedad ${String(c.variedad)}` : null,
        c.kg_declarados ? `${String(c.kg_declarados)} kg declarados` : null,
      ].filter(Boolean).join(" · "),
      fecha: String(c.fecha_emision ?? c.created_at ?? ""),
    }));

    return [...remitos, ...recepciones, ...ciuItems].sort((a, b) => {
      const aTime = a.fecha ? new Date(a.fecha).getTime() : 0;
      const bTime = b.fecha ? new Date(b.fecha).getTime() : 0;
      return bTime - aTime;
    });
  }, [remitosUva, recepcionesBodega, cius]);

  const resumenEstado = useMemo(() => {
    if (tareasActivas.length > 0) return "En actividad";
    if (trazabilidades.length > 0) return "Con trazabilidad iniciada";
    if (cuarteles.length > 0) return "Lista para operar";
    return "Pendiente de estructura";
  }, [cuarteles.length, tareasActivas.length, trazabilidades.length]);

  const onToggleCuartelDetail = async (cuartelId: string) => {
    if (!cuartelId) return;
    if (expandedCuartelId === cuartelId) {
      setExpandedCuartelId(null);
      return;
    }

    setExpandedCuartelId(cuartelId);
    if (cuartelDetailById[cuartelId]) return;

    setLoadingDetailId(cuartelId);
    setCuartelDetailErrorById((prev) => ({ ...prev, [cuartelId]: "" }));
    try {
      const detail = await fetchCuartelById(cuartelId);
      setCuartelDetailById((prev) => ({ ...prev, [cuartelId]: detail }));
    } catch (requestError) {
      setCuartelDetailErrorById((prev) => ({
        ...prev,
        [cuartelId]: getApiErrorMessage(requestError),
      }));
    } finally {
      setLoadingDetailId(null);
    }
  };

  const onOpenCuartelTag = async (cuartelId: string) => {
    if (!cuartelId) return;
    setExpandedCuartelId(cuartelId);
    if (cuartelDetailById[cuartelId]) return;

    setLoadingDetailId(cuartelId);
    setCuartelDetailErrorById((prev) => ({ ...prev, [cuartelId]: "" }));
    try {
      const detail = await fetchCuartelById(cuartelId);
      setCuartelDetailById((prev) => ({ ...prev, [cuartelId]: detail }));
    } catch (requestError) {
      setCuartelDetailErrorById((prev) => ({
        ...prev,
        [cuartelId]: getApiErrorMessage(requestError),
      }));
    } finally {
      setLoadingDetailId(null);
    }
  };

  const onDeleteFinca = async () => {
    if (!id) return;
    const ok = await confirm(`¿Eliminar la finca "${fincaNombre}"?`);
    if (!ok) return;

    setDeletingFinca(true);
    setActionError(null);
    setActionSuccess(null);
    try {
      await deleteFinca(id);
      if (activeBodegaId) {
        await loadFincas(String(activeBodegaId));
      }
      navigate("/fincas", { replace: true });
    } catch (requestError) {
      setActionError(getApiErrorMessage(requestError));
    } finally {
      setDeletingFinca(false);
    }
  };

  if (!id) {
    return (
      <div className="min-h-screen bg-secondary px-6 py-10">
        <div className="mx-auto w-full max-w-6xl">
          <NoticeBanner tone="danger" className="p-8">
            Finca no encontrada.
          </NoticeBanner>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-secondary px-6 py-10">
      <div className="mx-auto w-full max-w-6xl space-y-6">
        <AppCard as="section" padding="lg">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="space-y-3">
              <SectionIntro
                eyebrow="Origen y seguimiento"
                title={<span className="text-3xl font-bold text-text">{fincaNombre}</span>}
                description="Esta vista empieza a concentrar el contexto y la actividad de la finca para que puedas leer su avance operativo sin mezclarlo con el tablero general de la bodega."
                className="[&>div>p]:max-w-3xl"
              />
              <div className="flex flex-wrap gap-2">
                <div className="rounded-[var(--radius-xl)] border border-[color:var(--border-default)] bg-[color:var(--surface-soft)] px-4 py-3">
                  <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[color:var(--accent-secondary)]">
                    Estado
                  </div>
                  <div className="mt-1 text-sm font-semibold text-[color:var(--text-ink)]">{resumenEstado}</div>
                </div>
                <div className="rounded-[var(--radius-xl)] border border-[color:var(--border-default)] bg-[color:var(--surface-soft)] px-4 py-3">
                  <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[color:var(--accent-secondary)]">
                    Ubicación
                  </div>
                  <div className="mt-1 text-sm font-semibold text-[color:var(--text-ink)]">{fincaUbicacion}</div>
                </div>
                <div className="rounded-[var(--radius-xl)] border border-[color:var(--border-default)] bg-[color:var(--surface-soft)] px-4 py-3">
                  <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[color:var(--accent-secondary)]">
                    Cuarteles
                  </div>
                  <div className="mt-1 text-sm font-semibold text-[color:var(--text-ink)]">
                    {loading ? "Cargando..." : `${cuarteles.length} registrados`}
                  </div>
                </div>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <Link to={`/trazabilidades?nueva=1&fincaId=${encodeURIComponent(String(id))}`}>
                <AppButton variant="primary" size="sm">Iniciar trazabilidad</AppButton>
              </Link>
              <Link to={`/admin/fincas?edit=${encodeURIComponent(String(id))}`}>
                <AppButton variant="secondary" size="sm">Editar finca</AppButton>
              </Link>
              <Link to={`/admin/cuarteles?fincaId=${encodeURIComponent(String(id))}&create=1`}>
                <AppButton variant="secondary" size="sm">Crear cuartel</AppButton>
              </Link>
              <Link to="/fincas">
                <AppButton variant="secondary" size="sm">Volver a fincas</AppButton>
              </Link>
              <AppButton
                type="button"
                variant="danger"
                size="sm"
                onClick={() => void onDeleteFinca()}
                disabled={deletingFinca}
              >
                {deletingFinca ? "Eliminando..." : "Eliminar finca"}
              </AppButton>
            </div>
          </div>

          <div className="mt-6 grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
            <AppCard
              as="section"
              tone="soft"
              padding="md"
              className="border-[color:var(--border-default)] bg-[color:var(--surface-soft)]"
              header={(
                <SectionIntro
                  title="Resumen operativo"
                  description="Lectura rápida de la actividad asociada a esta finca."
                />
              )}
            >
              <div className="grid gap-3 sm:grid-cols-3">
                <div className="rounded-[var(--radius-lg)] border border-[color:var(--border-shell)] bg-[color:var(--surface-card)] px-4 py-3">
                  <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[color:var(--text-ink-muted)]">
                    Tareas activas
                  </div>
                  <div className="mt-1 text-2xl font-semibold text-[color:var(--text-ink)]">
                    {loadingResumen ? "…" : tareasActivas.length}
                  </div>
                </div>
                <div className="rounded-[var(--radius-lg)] border border-[color:var(--border-shell)] bg-[color:var(--surface-card)] px-4 py-3">
                  <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[color:var(--text-ink-muted)]">
                    Trazabilidades
                  </div>
                  <div className="mt-1 text-2xl font-semibold text-[color:var(--text-ink)]">
                    {loadingResumen ? "…" : trazabilidades.length}
                  </div>
                </div>
                <div className="rounded-[var(--radius-lg)] border border-[color:var(--border-shell)] bg-[color:var(--surface-card)] px-4 py-3">
                  <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[color:var(--text-ink-muted)]">
                    Cuarteles
                  </div>
                  <div className="mt-1 text-2xl font-semibold text-[color:var(--text-ink)]">
                    {loading ? "…" : cuarteles.length}
                  </div>
                </div>
              </div>
            </AppCard>

            <AppCard
              as="section"
              tone="soft"
              padding="md"
              className="border-[color:var(--border-default)] bg-[color:var(--surface-soft)]"
              header={(
                <SectionIntro
                  title="Última señal"
                  description="Lo último que hoy permite ubicar el estado de esta finca."
                />
              )}
            >
              {loadingResumen ? (
                <NoticeBanner tone="info">Cargando actividad reciente…</NoticeBanner>
              ) : ultimaTarea ? (
                <div className="rounded-[var(--radius-lg)] border border-[color:var(--border-shell)] bg-[color:var(--surface-card)] px-4 py-4">
                  <div className="text-sm font-semibold text-[color:var(--text-ink)]">
                    {ultimaTarea.titulo}
                  </div>
                  <div className="mt-1 text-sm text-[color:var(--text-ink-muted)]">
                    {ultimaTarea.descripcion || "Actividad operativa registrada para esta finca."}
                  </div>
                  <div className="mt-3 text-xs text-[color:var(--text-ink-muted)]">
                    {ultimaTarea.updated_at || ultimaTarea.created_at
                      ? new Date(String(ultimaTarea.updated_at ?? ultimaTarea.created_at ?? "")).toLocaleString("es-AR")
                      : "Sin fecha disponible"}
                  </div>
                </div>
              ) : (
                <div className="rounded-[var(--radius-lg)] border border-[color:var(--border-shell)] bg-[color:var(--surface-card)] px-4 py-4 text-sm text-[color:var(--text-ink-muted)]">
                  Todavía no hay actividad operativa asociada a esta finca. El próximo paso natural es vincular cuarteles, tareas y trazabilidades para empezar a contar su historial.
                </div>
              )}
            </AppCard>
          </div>
        </AppCard>

        <AppCard
          as="section"
          padding="lg"
          header={(
            <SectionIntro
              title="Cuarteles de la finca"
              description="Primero revisás el listado y después, si hace falta, editás o creás desde la administración."
              actions={(
                <Link to={`/admin/cuarteles?fincaId=${encodeURIComponent(String(id))}`}>
                  <AppButton variant="secondary" size="sm">Administrar cuarteles</AppButton>
                </Link>
              )}
            />
          )}
        >

          {cuarteles.length > 0 ? (
            <div className="mt-4 flex flex-wrap gap-2">
              {cuarteles.map((cuartel) => {
                const cuartelId = String(cuartel.cuartel_id ?? cuartel.id ?? "");
                const isActive = expandedCuartelId === cuartelId;
                return (
                  <button
                    key={`tag-${cuartelId}`}
                    type="button"
                    onClick={() => void onOpenCuartelTag(cuartelId)}
                    className={[
                      "rounded-full border px-3 py-1 text-xs font-semibold transition-all duration-[var(--motion-fast)] ease-[var(--motion-standard)]",
                      isActive
                        ? "border-[color:var(--accent-primary)] bg-[color:var(--accent-primary)] text-[color:var(--text-primary)]"
                        : "border-[color:var(--border-shell)] bg-[color:var(--action-secondary-bg)] text-[color:var(--text-on-dark)] hover:border-[color:var(--border-default)] hover:bg-[color:var(--action-secondary-hover)]",
                    ].join(" ")}
                  >
                    {cuartel.codigo_cuartel ?? "Cuartel"}
                  </button>
                );
              })}
            </div>
          ) : null}

          <div className="mt-4">
            {loading ? (
              <NoticeBanner>Cargando cuarteles…</NoticeBanner>
            ) : error ? (
              <NoticeBanner tone="danger">
                {error}
              </NoticeBanner>
            ) : cuarteles.length === 0 ? (
              <GuidedState
                title="Esta finca todavía no tiene cuarteles"
                description="Los cuarteles son necesarios para asignar órdenes de trabajo de finca y cerrar la trazabilidad de labores de campo."
                action={(
                  <Link to={`/admin/cuarteles?fincaId=${encodeURIComponent(String(id))}&create=1`}>
                    <AppButton variant="primary" size="sm">Crear primer cuartel</AppButton>
                  </Link>
                )}
                secondaryAction={(
                  <Link to={`/admin/cuarteles?fincaId=${encodeURIComponent(String(id))}`}>
                    <AppButton variant="secondary" size="sm">Administrar cuarteles</AppButton>
                  </Link>
                )}
                steps={[
                  { label: "Finca creada", done: true },
                  { label: "Primer cuartel", done: false },
                ]}
              />
            ) : (
              <div className="grid items-start gap-3 md:grid-cols-2">
                {cuarteles.map((cuartel) => (
                  <AppCard
                    key={cuartel.cuartel_id ?? cuartel.id}
                    as="article"
                    tone="soft"
                    padding="sm"
                    className="bg-[color:var(--surface-soft)]"
                  >
                    {(() => {
                      const cuartelId = String(cuartel.cuartel_id ?? cuartel.id ?? "");
                      const isExpanded = expandedCuartelId === cuartelId;
                      const detail = cuartelDetailById[cuartelId];
                      const detailError = cuartelDetailErrorById[cuartelId];
                      const isLoadingDetail = loadingDetailId === cuartelId;
                      return (
                        <>
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <div className="text-sm font-semibold text-[color:var(--text-ink)]">
                                {cuartel.codigo_cuartel ?? "Cuartel"}
                              </div>
                              <div className="mt-1 text-xs text-[color:var(--text-accent)]">
                                {getVariedadLabel(cuartel.variedad) ?? "Variedad sin definir"} ·{" "}
                                {cuartel.superficie_ha ?? "-"} ha
                              </div>
                            </div>
                            <div className="rounded-full border border-[color:var(--border-default)] px-2.5 py-1 text-[11px] font-semibold text-[color:var(--accent-primary)]">
                              {cuartel.cultivo ?? "vid"}
                            </div>
                          </div>

                          <div className="mt-3 flex flex-wrap gap-2">
                            <AppButton
                              type="button"
                              variant="secondary"
                              size="sm"
                              onClick={() => void onToggleCuartelDetail(cuartelId)}
                            >
                              {isExpanded ? "Ocultar detalle" : "Ver detalle"}
                            </AppButton>
                            <Link
                              to={`/admin/cuarteles?edit=${encodeURIComponent(cuartelId)}&fincaId=${encodeURIComponent(String(id))}`}
                              className="inline-flex"
                            >
                              <AppButton variant="secondary" size="sm">Editar cuartel</AppButton>
                            </Link>
                            <AppButton
                              type="button"
                              variant="secondary"
                              size="sm"
                              onClick={() => setQrCuartel({ id: cuartelId, codigo: cuartel.codigo_cuartel })}
                            >
                              Ver QR
                            </AppButton>
                          </div>

                          {isExpanded ? (
                            <div className="mt-3 rounded-[var(--radius-lg)] border border-[color:var(--border-shell)] bg-[color:var(--surface-muted)] px-3 py-3 text-xs text-[color:var(--text-on-dark-muted)]">
                              {isLoadingDetail ? (
                                <div>Cargando detalle...</div>
                              ) : detailError ? (
                                <NoticeBanner tone="danger">{detailError}</NoticeBanner>
                              ) : (
                                <div className="grid gap-2">
                                  <div>
                                    <span className="font-semibold text-[color:var(--text-ink)]">Código:</span>{" "}
                                    {detail?.codigo_cuartel ?? "-"}
                                  </div>
                                  <div>
                                    <span className="font-semibold text-[color:var(--text-ink)]">Cultivo:</span>{" "}
                                    {detail?.cultivo ?? "-"}
                                  </div>
                                  <div>
                                    <span className="font-semibold text-[color:var(--text-ink)]">Variedad:</span>{" "}
                                    {getVariedadLabel(detail?.variedad)}
                                  </div>
                                  <div>
                                    <span className="font-semibold text-[color:var(--text-ink)]">Sistema de riego:</span>{" "}
                                    {getSistemaRiegoLabel(detail?.sistema_riego)}
                                  </div>
                                  <div>
                                    <span className="font-semibold text-[color:var(--text-ink)]">Superficie:</span>{" "}
                                    {detail?.superficie_ha ?? "-"} ha
                                  </div>
                                  <div>
                                    <span className="font-semibold text-[color:var(--text-ink)]">
                                      Manejo de cultivo:
                                    </span>{" "}
                                    {getManejoCultivoLabel(detail?.sistema_productivo)}
                                  </div>
                                  <div>
                                    <span className="font-semibold text-[color:var(--text-ink)]">
                                      Sistema de conducción:
                                    </span>{" "}
                                    {getSistemaConduccionLabel(detail?.sistema_conduccion)}
                                  </div>
                                  <div>
                                    <span className="font-semibold text-[color:var(--text-ink)]">Hileras:</span>{" "}
                                    {detail?.cantidad_hileras ?? "-"}
                                  </div>
                                  <div>
                                    <span className="font-semibold text-[color:var(--text-ink)]">Largo de hileras:</span>{" "}
                                    {detail?.largo_hileras_m ?? "-"} m
                                  </div>
                                  <div>
                                    <span className="font-semibold text-[color:var(--text-ink)]">Densidad de hileras:</span>{" "}
                                    {detail?.densidad_hileras ?? "-"}
                                  </div>
                                  <div>
                                    <span className="font-semibold text-[color:var(--text-ink)]">Distancia de plantación:</span>{" "}
                                    {detail?.distancia_plantacion ?? "-"}
                                  </div>
                                </div>
                              )}
                            </div>
                          ) : null}
                        </>
                      );
                    })()}
                  </AppCard>
                ))}
              </div>
            )}
          </div>

          {actionError ? (
            <NoticeBanner tone="danger" className="mt-4">
              {actionError}
            </NoticeBanner>
          ) : null}
          {actionSuccess ? (
            <NoticeBanner tone="success" className="mt-4">
              {actionSuccess}
            </NoticeBanner>
          ) : null}
        </AppCard>

        <AppCard
          as="section"
          padding="lg"
          header={(
            <SectionIntro
              title="Historial operativo y trazable"
              description="Línea de tiempo inicial con las tareas y trazabilidades que ya permiten empezar a contar la historia de esta finca."
            />
          )}
        >
          {loadingResumen ? (
            <NoticeBanner tone="info">Cargando historial…</NoticeBanner>
          ) : historialItems.length === 0 ? (
            <GuidedState
              title="Todavía no hay historial para esta finca"
              description="Cuando se registren tareas, trazabilidades u operaciones vinculadas al origen, esta sección va a empezar a mostrar la secuencia completa."
              action={(
                <Link to={`/trazabilidades?nueva=1&fincaId=${encodeURIComponent(String(id))}`}>
                  <AppButton variant="primary" size="sm">Crear primera trazabilidad</AppButton>
                </Link>
              )}
            />
          ) : (
            <div className="space-y-3">
              {historialItems.map((item) => {
                const isTask = item.tipo === "tarea";
                const estadoNormalizado = String(item.estado ?? "").toLowerCase().trim();
                const estadoLabel =
                  estadoNormalizado === "completado"
                    ? "Completado"
                    : estadoNormalizado === "en_progreso"
                      ? "En progreso"
                      : estadoNormalizado === "cancelado"
                        ? "Cancelado"
                        : estadoNormalizado === "en_curso"
                          ? "En curso"
                          : estadoNormalizado || "Pendiente";

                return (
                  <AppCard
                    key={`${item.tipo}-${item.id}`}
                    as="article"
                    tone="soft"
                    padding="sm"
                    className="border-[color:var(--border-shell)] bg-[color:var(--surface-soft)]"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="rounded-full border border-[color:var(--border-shell)] bg-[color:var(--surface-card)] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-[color:var(--accent-primary)]">
                            {isTask ? "Tarea" : "Trazabilidad"}
                          </span>
                          <span className="rounded-full border border-[color:var(--border-shell)] bg-[color:var(--surface-card)] px-2.5 py-1 text-[10px] font-semibold text-[color:var(--text-ink-muted)]">
                            {estadoLabel}
                          </span>
                        </div>
                        <div className="mt-3 text-sm font-semibold text-[color:var(--text-ink)]">
                          {item.titulo}
                        </div>
                        {item.descripcion ? (
                          <div className="mt-1 text-sm text-[color:var(--text-ink-muted)]">
                            {item.descripcion}
                          </div>
                        ) : null}
                        {item.meta ? (
                          <div className="mt-2 text-xs text-[color:var(--text-ink-muted)]">
                            {item.meta}
                          </div>
                        ) : null}
                      </div>
                      <div className="shrink-0 text-right text-xs text-[color:var(--text-ink-muted)]">
                        {item.fecha
                          ? new Date(item.fecha).toLocaleString("es-AR")
                          : "Sin fecha disponible"}
                      </div>
                    </div>
                  </AppCard>
                );
              })}
            </div>
          )}
        </AppCard>

        <AppCard
          as="section"
          padding="lg"
          header={(
            <SectionIntro
              title="Registros operativos"
              description="Remitos de uva, recepciones en bodega y cuadernos de ingreso vinculados a esta finca."
            />
          )}
        >
          {loadingOperativos ? (
            <NoticeBanner tone="info">Cargando registros operativos…</NoticeBanner>
          ) : registrosOperativos.length === 0 ? (
            <GuidedState
              title="Sin registros operativos para esta finca"
              description="Cuando se registren remitos de uva, recepciones o CIUs vinculados a esta finca, aparecerán acá."
            />
          ) : (
            <div className="space-y-3">
              {registrosOperativos.map((item) => {
                const tipoConfig = {
                  remito_uva:      { label: "Remito de uva",      accent: "var(--accent-primary)" },
                  recepcion_bodega:{ label: "Recepción en bodega", accent: "var(--accent-secondary)" },
                  ciu:             { label: "CIU",                 accent: "var(--accent-tertiary)" },
                } as const;
                const config = tipoConfig[item.tipo];
                return (
                  <AppCard
                    key={`${item.tipo}-${item.id}`}
                    as="article"
                    tone="soft"
                    padding="sm"
                    className="border-[color:var(--border-shell)] bg-[color:var(--surface-soft)]"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <span
                          className="rounded-full border border-[color:var(--border-shell)] bg-[color:var(--surface-card)] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em]"
                          style={{ color: config.accent }}
                        >
                          {config.label}
                        </span>
                        <div className="mt-3 text-sm font-semibold text-[color:var(--text-ink)]">
                          {item.titulo}
                        </div>
                        {item.meta ? (
                          <div className="mt-1 text-xs text-[color:var(--text-ink-muted)]">
                            {item.meta}
                          </div>
                        ) : null}
                      </div>
                      <div className="shrink-0 text-right text-xs text-[color:var(--text-ink-muted)]">
                        {item.fecha
                          ? new Date(item.fecha).toLocaleString("es-AR")
                          : "Sin fecha disponible"}
                      </div>
                    </div>
                  </AppCard>
                );
              })}
            </div>
          )}
        </AppCard>
      </div>
      {ConfirmDialog}

      {qrCuartel && (
        <QrCuartelModal
          opened={Boolean(qrCuartel)}
          onClose={() => setQrCuartel(null)}
          cuartelId={qrCuartel.id}
          cuartelCodigo={qrCuartel.codigo}
          fincaNombre={fincaNombre}
        />
      )}
    </div>
  );
};

export default FincaDetail;
