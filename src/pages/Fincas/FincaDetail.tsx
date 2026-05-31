import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  AppButton,
  AppCard,
  AppSelect,
  GuidedState,
  NoticeBanner,
  SectionIntro,
  useConfirmDialog,
} from "../../components/ui";
import QrCuartelModal from "../../components/QrCuartelModal";
import OrderRow from "../Tareas/components/OrderRow";
import TaskDetailModal from "../Tareas/components/TaskDetailModal";
import { isCompletedTask } from "../Tareas/tareas.helpers";
import type { Cuartel } from "../../features/cuarteles/api";
import { fetchCuartelesByFinca } from "../../features/cuarteles/api";
import { fetchTareasByBodega, type Tarea } from "../../features/encargos/api";
import { deleteFinca } from "../../features/fincas/api";
import { useFincasStore } from "../../features/fincas/store";
import { getApiErrorMessage } from "../../lib/api";
import { buildMapboxStaticUrl } from "../../lib/mapbox";
import { useAuthStore } from "../../store/authStore";
import {
  getManejoCultivoLabel,
  getSistemaConduccionLabel,
  getSistemaRiegoLabel,
  getVariedadLabel,
} from "../../domain/viticultura/catalogos";

// ── Sub-componentes ────────────────────────────────────────────────────────

type CuartelCardProps = {
  cuartel: Cuartel;
  fincaId: string;
  onQr: (id: string, codigo: string) => void;
};

function CuartelCard({ cuartel, fincaId, onQr }: CuartelCardProps) {
  const cuartelId = String(cuartel.cuartel_id ?? cuartel.id ?? "");
  const mapUrl = cuartel.poligono
    ? buildMapboxStaticUrl(cuartel.poligono, { width: 600, height: 200 })
    : null;

  return (
    <AppCard as="article" tone="soft" padding="sm" className="bg-[color:var(--surface-soft)]">
      {/* Imagen satelital */}
      {mapUrl && (
        <div className="mb-3 overflow-hidden rounded-[var(--radius-lg)] border border-[color:var(--border-shell)]">
          <img
            src={mapUrl}
            alt={`Mapa del cuartel ${cuartel.codigo_cuartel}`}
            className="block w-full object-cover"
            style={{ height: 150 }}
            loading="lazy"
          />
        </div>
      )}

      {/* Info principal */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="font-semibold text-[color:var(--text-ink)]">
            {cuartel.codigo_cuartel}
          </div>
          <div className="mt-0.5 text-xs text-[color:var(--text-accent)]">
            {getVariedadLabel(cuartel.variedad) ?? "—"} · {cuartel.superficie_ha ?? "—"} ha
          </div>
        </div>
        <span className="rounded-full border border-[color:var(--border-default)] px-2.5 py-1 text-[11px] font-semibold text-[color:var(--accent-primary)]">
          {cuartel.cultivo ?? "vid"}
        </span>
      </div>

      {/* Datos secundarios */}
      <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-[color:var(--text-ink-muted)]">
        {cuartel.sistema_riego && (
          <span>Riego: {getSistemaRiegoLabel(cuartel.sistema_riego)}</span>
        )}
        {cuartel.sistema_productivo && (
          <span>Manejo: {getManejoCultivoLabel(cuartel.sistema_productivo)}</span>
        )}
        {cuartel.sistema_conduccion && (
          <span>Conducción: {getSistemaConduccionLabel(cuartel.sistema_conduccion)}</span>
        )}
      </div>

      {/* Acciones */}
      <div className="mt-3 flex flex-wrap gap-2">
        <Link
          to={`/admin/cuarteles?edit=${encodeURIComponent(cuartelId)}&fincaId=${encodeURIComponent(fincaId)}`}
          className="inline-flex"
        >
          <AppButton variant="secondary" size="sm">
            {cuartel.poligono ? "Editar / límites" : "Editar"}
          </AppButton>
        </Link>
        <AppButton
          type="button"
          variant="secondary"
          size="sm"
          onClick={() => onQr(cuartelId, cuartel.codigo_cuartel)}
        >
          Ver QR
        </AppButton>
      </div>
    </AppCard>
  );
}

// ── Página ─────────────────────────────────────────────────────────────────

const FincaDetail = () => {
  const { confirm, ConfirmDialog } = useConfirmDialog();
  const { id } = useParams();
  const navigate = useNavigate();
  const activeBodegaId = useAuthStore((state) => state.activeBodegaId);
  const fincas = useFincasStore((state) => state.fincas);
  const loadFincas = useFincasStore((state) => state.loadFincas);
  const finca = fincas.find((f) => f.finca_id === id || f.id === id);

  const [cuarteles, setCuarteles] = useState<Cuartel[]>([]);
  const [loadingCuarteles, setLoadingCuarteles] = useState(true);
  const [errorCuarteles, setErrorCuarteles] = useState<string | null>(null);

  const [tareas, setTareas] = useState<Tarea[]>([]);
  const [loadingTareas, setLoadingTareas] = useState(true);

  const [deletingFinca, setDeletingFinca] = useState(false);
  const [qrCuartel, setQrCuartel] = useState<{ id: string; codigo: string } | null>(null);
  const [selectedTarea, setSelectedTarea] = useState<Tarea | null>(null);
  const [sortDir, setSortDir] = useState<"desc" | "asc">("desc");
  const [statusFilter, setStatusFilter] = useState<"todos" | "pendientes" | "completadas">("todos");

  const fincaNombre = finca?.nombre_finca ?? "Finca";

  const ubicacion = useMemo(() => {
    const src = finca as Record<string, unknown> | undefined;
    for (const key of ["ubicacion_texto", "ubicacion"]) {
      const val = src?.[key];
      if (typeof val === "string" && val.trim()) return val;
    }
    return null;
  }, [finca]);

  // Tareas de esta finca filtradas y ordenadas según los controles del historial
  const historial = useMemo(() => {
    return tareas
      .filter((t) => String(t.finca_id ?? t.finca?.finca_id ?? "") === String(id))
      .filter((t) => {
        if (statusFilter === "todos") return true;
        const completada = isCompletedTask(t);
        return statusFilter === "completadas" ? completada : !completada;
      })
      .sort((a, b) => {
        const at = new Date(String(a.updated_at ?? a.created_at ?? 0)).getTime();
        const bt = new Date(String(b.updated_at ?? b.created_at ?? 0)).getTime();
        return sortDir === "desc" ? bt - at : at - bt;
      });
  }, [tareas, id, statusFilter, sortDir]);

  // Fetch cuarteles
  useEffect(() => {
    if (!id) return;
    let mounted = true;
    setLoadingCuarteles(true);
    setErrorCuarteles(null);
    fetchCuartelesByFinca(id)
      .then((data) => { if (mounted) setCuarteles(data ?? []); })
      .catch(() => { if (mounted) setErrorCuarteles("No se pudieron cargar los cuarteles."); })
      .finally(() => { if (mounted) setLoadingCuarteles(false); });
    return () => { mounted = false; };
  }, [id]);

  // Fetch tareas de la bodega activa (filtramos por finca en el memo)
  useEffect(() => {
    if (!activeBodegaId) { setLoadingTareas(false); return; }
    let mounted = true;
    setLoadingTareas(true);
    fetchTareasByBodega(String(activeBodegaId))
      .then((data) => { if (mounted) setTareas(data ?? []); })
      .catch(() => { if (mounted) setTareas([]); })
      .finally(() => { if (mounted) setLoadingTareas(false); });
    return () => { mounted = false; };
  }, [activeBodegaId]);

  const onDeleteFinca = async () => {
    if (!id) return;
    const ok = await confirm(`¿Eliminar la finca "${fincaNombre}"? Esta acción no se puede deshacer.`);
    if (!ok) return;
    setDeletingFinca(true);
    try {
      await deleteFinca(id);
      if (activeBodegaId) await loadFincas(String(activeBodegaId));
      navigate("/fincas", { replace: true });
    } catch (e) {
      alert(getApiErrorMessage(e));
    } finally {
      setDeletingFinca(false);
    }
  };

  if (!id) {
    return (
      <div className="min-h-screen bg-secondary px-6 py-10">
        <div className="mx-auto w-full max-w-6xl">
          <NoticeBanner tone="danger">Finca no encontrada.</NoticeBanner>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-secondary px-6 py-10">
      <div className="mx-auto w-full max-w-6xl space-y-6">

        {/* ── Header ──────────────────────────────────────────────── */}
        <AppCard as="section" padding="lg">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <div className="text-xs font-semibold uppercase tracking-[0.18em] text-[color:var(--accent-secondary)]">
                Finca
              </div>
              <h1 className="mt-1 text-2xl font-bold text-[color:var(--text-ink)]">
                {fincaNombre}
              </h1>
              {ubicacion && (
                <p className="mt-1 text-sm text-[color:var(--text-ink-muted)]">{ubicacion}</p>
              )}
              <div className="mt-3 flex flex-wrap gap-2">
                {finca?.renspa && (
                  <span className="rounded-lg border border-[color:var(--border-default)] bg-[color:var(--surface-soft)] px-3 py-1 text-xs font-semibold text-[color:var(--text-ink-muted)]">
                    RENSPA {finca.renspa}
                  </span>
                )}
                <span className="rounded-lg border border-[color:var(--border-default)] bg-[color:var(--surface-soft)] px-3 py-1 text-xs font-semibold text-[color:var(--text-ink-muted)]">
                  {loadingCuarteles ? "…" : `${cuarteles.length} cuartel${cuarteles.length !== 1 ? "es" : ""}`}
                </span>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <Link to={`/admin/cuarteles?fincaId=${encodeURIComponent(id)}&create=1`}>
                <AppButton variant="primary" size="sm">+ Cuartel</AppButton>
              </Link>
              <Link to={`/admin/fincas?edit=${encodeURIComponent(id)}`}>
                <AppButton variant="secondary" size="sm">Editar finca</AppButton>
              </Link>
              <Link to="/fincas">
                <AppButton variant="ghost" size="sm">← Volver</AppButton>
              </Link>
              <AppButton
                type="button"
                variant="danger"
                size="sm"
                onClick={() => void onDeleteFinca()}
                disabled={deletingFinca}
              >
                {deletingFinca ? "Eliminando…" : "Eliminar"}
              </AppButton>
            </div>
          </div>
        </AppCard>

        {/* ── Cuarteles ───────────────────────────────────────────── */}
        <AppCard
          as="section"
          padding="lg"
          header={(
            <SectionIntro
              title="Cuarteles"
              description="Unidades productivas de la finca. Cada cuartel tiene su propio QR de trazabilidad pública."
              actions={(
                <Link to={`/admin/cuarteles?fincaId=${encodeURIComponent(id)}`}>
                  <AppButton variant="secondary" size="sm">Administrar</AppButton>
                </Link>
              )}
            />
          )}
        >
          {loadingCuarteles ? (
            <NoticeBanner>Cargando cuarteles…</NoticeBanner>
          ) : errorCuarteles ? (
            <NoticeBanner tone="danger">{errorCuarteles}</NoticeBanner>
          ) : cuarteles.length === 0 ? (
            <GuidedState
              title="Esta finca todavía no tiene cuarteles"
              description="Los cuarteles son necesarios para asignar órdenes de campo y activar la trazabilidad por origen."
              action={(
                <Link to={`/admin/cuarteles?fincaId=${encodeURIComponent(id)}&create=1`}>
                  <AppButton variant="primary" size="sm">Crear primer cuartel</AppButton>
                </Link>
              )}
              steps={[
                { label: "Finca creada", done: true },
                { label: "Primer cuartel", done: false },
              ]}
            />
          ) : (
            <div className="mt-4 grid gap-3 md:grid-cols-2">
              {cuarteles.map((cuartel) => (
                <CuartelCard
                  key={cuartel.cuartel_id ?? cuartel.id}
                  cuartel={cuartel}
                  fincaId={id}
                  onQr={(cid, codigo) => setQrCuartel({ id: cid, codigo })}
                />
              ))}
            </div>
          )}
        </AppCard>

        {/* ── Historial de tareas ──────────────────────────────────── */}
        <AppCard
          as="section"
          padding="lg"
          header={(
            <SectionIntro
              title="Historial de tareas"
              description="Órdenes de trabajo registradas para esta finca."
              actions={(
                <Link to="/ordenes">
                  <AppButton variant="ghost" size="sm">Ver todas →</AppButton>
                </Link>
              )}
            />
          )}
        >
          {loadingTareas ? (
            <NoticeBanner>Cargando tareas…</NoticeBanner>
          ) : (
            <>
              <div className="mt-4 flex flex-wrap items-end gap-3">
                <div className="w-44">
                  <AppSelect
                    label="Ordenar por fecha"
                    value={sortDir}
                    onChange={(e) => setSortDir(e.target.value as "desc" | "asc")}
                  >
                    <option value="desc">Más recientes primero</option>
                    <option value="asc">Más antiguas primero</option>
                  </AppSelect>
                </div>
                <div className="w-44">
                  <AppSelect
                    label="Estado"
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value as "todos" | "pendientes" | "completadas")}
                  >
                    <option value="todos">Todas</option>
                    <option value="pendientes">Pendientes</option>
                    <option value="completadas">Completadas</option>
                  </AppSelect>
                </div>
              </div>

              {historial.length === 0 ? (
                <p className="mt-4 py-2 text-sm text-[color:var(--text-ink-muted)]">
                  {statusFilter === "todos"
                    ? "Todavía no hay tareas registradas para esta finca."
                    : "No hay tareas que coincidan con el filtro seleccionado."}
                </p>
              ) : (
                <div className="relative mt-4 space-y-1 pl-6">
                  <div
                    className="pointer-events-none absolute bottom-2 left-[7px] top-2 w-px bg-[color:var(--border-shell)]"
                    aria-hidden
                  />
                  {historial.map((t) => (
                    <OrderRow
                      key={String(t.tarea_id ?? t.id ?? "")}
                      task={t}
                      variant={isCompletedTask(t) ? "completed" : "pending"}
                      onOpenDetail={() => setSelectedTarea(t)}
                    />
                  ))}
                </div>
              )}
            </>
          )}
        </AppCard>

      </div>

      {ConfirmDialog}

      <TaskDetailModal task={selectedTarea} onClose={() => setSelectedTarea(null)} />

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
