import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  AppButton,
  AppCard,
  AppInput,
  AppModal,
  AppSelect,
  AppTextarea,
  NoticeBanner,
  SectionIntro,
  useAppNotifications,
} from "../../components/ui";
import {
  createElaboracionResource,
  deleteElaboracionResource,
  fetchComposicionActualVasija,
  fetchImpactoBorradoOperacionVasija,
  getElaboracionResource,
  listElaboracionResource,
  type ComposicionActualVasija,
  type ElaboracionEntity,
  type ImpactoBorradoOperacionVasija,
} from "../../features/elaboracion/api";
import { getApiErrorMessage } from "../../lib/api";
import { useAuthStore } from "../../store/authStore";

function nowDateTimeLocal(): string {
  const now = new Date();
  const offset = now.getTimezoneOffset();
  const local = new Date(now.getTime() - offset * 60_000);
  return local.toISOString().slice(0, 16);
}

function toIsoDateTime(raw: string): string {
  if (!raw.trim()) return "";
  const parsed = new Date(raw);
  if (Number.isNaN(parsed.getTime())) return raw;
  return parsed.toISOString();
}

type MedicionFormValues = {
  fecha_hora: string;
  volumen_l: string;
  grado_alcohol: string;
  azucar_residual_g_l: string;
  densidad: string;
  temperatura: string;
  brix: string;
  ph: string;
  acidez: string;
  estado_fermentacion: string;
  observaciones: string;
};

function emptyMedicionForm(): MedicionFormValues {
  return {
    fecha_hora: nowDateTimeLocal(),
    volumen_l: "",
    grado_alcohol: "",
    azucar_residual_g_l: "",
    densidad: "",
    temperatura: "",
    brix: "",
    ph: "",
    acidez: "",
    estado_fermentacion: "",
    observaciones: "",
  };
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatDateTime(value: unknown): string {
  if (typeof value !== "string" && typeof value !== "number") return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return String(value);
  return d.toLocaleString("es-AR", {
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function stringVal(value: unknown, fallback = "—"): string {
  if (typeof value === "string" && value.trim()) return value;
  if (typeof value === "number") return String(value);
  return fallback;
}

type TipoEvento = "operacion" | "existencia" | "fermentacion";
type SortDir = "desc" | "asc";
type TipoFilter = "todos" | TipoEvento;

interface TimelineEvent {
  id: string;
  tipo: TipoEvento;
  fecha: Date;
  raw: ElaboracionEntity;
}

function buildOperacionLabel(op: ElaboracionEntity, vasijaId: string): string {
  const tipo = stringVal(op.tipo, "Operación");
  const origen = op.vasija_origen && typeof op.vasija_origen === "object"
    ? (op.vasija_origen as Record<string, unknown>)
    : null;
  const destino = op.vasija_destino && typeof op.vasija_destino === "object"
    ? (op.vasija_destino as Record<string, unknown>)
    : null;

  const origenCodigo = origen ? stringVal(origen.codigo, null as unknown as string) : null;
  const destinoCodigo = destino ? stringVal(destino.codigo, null as unknown as string) : null;

  const isOrigen = stringVal(op.vasija_origen_id) === vasijaId;
  const isDestino = stringVal(op.vasija_destino_id) === vasijaId;

  const partes: string[] = [tipo];
  if (isOrigen && destinoCodigo) partes.push(`→ ${destinoCodigo}`);
  if (isDestino && origenCodigo) partes.push(`← ${origenCodigo}`);
  if (op.volumen_movido_l !== null && op.volumen_movido_l !== undefined && op.volumen_movido_l !== "")
    partes.push(`${op.volumen_movido_l} l`);
  return partes.join(" · ");
}

function buildExistenciaLabel(ex: ElaboracionEntity): string {
  const partes: string[] = [];
  if (ex.volumen_l !== null && ex.volumen_l !== undefined && ex.volumen_l !== "")
    partes.push(`${ex.volumen_l} l`);
  if (ex.grado_alcohol !== null && ex.grado_alcohol !== undefined && ex.grado_alcohol !== "")
    partes.push(`${ex.grado_alcohol}° alc`);
  if (ex.azucar_residual_g_l !== null && ex.azucar_residual_g_l !== undefined && ex.azucar_residual_g_l !== "")
    partes.push(`${ex.azucar_residual_g_l} g/l azúcar`);
  return partes.length > 0 ? partes.join(" · ") : "Existencia registrada";
}

function buildFermentacionLabel(ctrl: ElaboracionEntity): string {
  const partes: string[] = [];
  if (ctrl.densidad !== null && ctrl.densidad !== undefined && ctrl.densidad !== "")
    partes.push(`dens. ${ctrl.densidad}`);
  if (ctrl.temperatura !== null && ctrl.temperatura !== undefined && ctrl.temperatura !== "")
    partes.push(`${ctrl.temperatura}°C`);
  if (ctrl.brix !== null && ctrl.brix !== undefined && ctrl.brix !== "")
    partes.push(`${ctrl.brix}°Bx`);
  if (ctrl.estado_fermentacion) partes.push(stringVal(ctrl.estado_fermentacion));
  return partes.length > 0 ? partes.join(" · ") : "Control registrado";
}

const TIPO_LABELS: Record<TipoEvento, string> = {
  operacion: "Operación",
  existencia: "Existencia",
  fermentacion: "Fermentación",
};

const TIPO_DOT_CLASS: Record<TipoEvento, string> = {
  operacion: "bg-[color:var(--accent-brand)]",
  existencia: "bg-[color:var(--status-success)]",
  fermentacion: "bg-[color:var(--status-warning)]",
};

// ── Componente principal ──────────────────────────────────────────────────────

export default function BodegaVasijaDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const activeBodegaId = useAuthStore((state) => state.activeBodegaId);
  const { notifySuccess, notifyError } = useAppNotifications();

  const [vasija, setVasija] = useState<ElaboracionEntity | null>(null);
  const [composicion, setComposicion] = useState<ComposicionActualVasija | null>(null);
  const [operaciones, setOperaciones] = useState<ElaboracionEntity[]>([]);
  const [existencias, setExistencias] = useState<ElaboracionEntity[]>([]);
  const [fermentaciones, setFermentaciones] = useState<ElaboracionEntity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [tipoFilter, setTipoFilter] = useState<TipoFilter>("todos");

  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [impacto, setImpacto] = useState<ImpactoBorradoOperacionVasija | null>(null);
  const [impactoLoading, setImpactoLoading] = useState(false);
  const [eliminando, setEliminando] = useState(false);

  const [medicionOpen, setMedicionOpen] = useState(false);
  const [medicionValues, setMedicionValues] = useState<MedicionFormValues>(emptyMedicionForm());
  const [medicionSaving, setMedicionSaving] = useState(false);
  const [medicionError, setMedicionError] = useState<string | null>(null);

  useEffect(() => {
    if (!id || !activeBodegaId) return;
    let mounted = true;

    const run = async () => {
      setLoading(true);
      setError(null);

      const bodegaIdStr = String(activeBodegaId);
      try {
        const [vasijaData, composicionData, ops, exs, ctrls] = await Promise.all([
          getElaboracionResource("vasijas", id),
          fetchComposicionActualVasija(id).catch(() => null),
          listElaboracionResource("operaciones-vasija", { bodegaId: bodegaIdStr }),
          listElaboracionResource("existencias-vasija", { bodegaId: bodegaIdStr }),
          listElaboracionResource("controles-fermentacion", { bodegaId: bodegaIdStr }),
        ]);
        if (!mounted) return;
        setVasija(vasijaData);
        setComposicion(composicionData);
        setOperaciones(
          ops.filter(
            (op) =>
              stringVal(op.vasija_origen_id) === id ||
              stringVal(op.vasija_destino_id) === id,
          ),
        );
        setExistencias(exs.filter((ex) => stringVal(ex.vasija_id) === id));
        setFermentaciones(ctrls.filter((c) => stringVal(c.vasija_id) === id));
      } catch (err) {
        if (mounted) setError(getApiErrorMessage(err));
      } finally {
        if (mounted) setLoading(false);
      }
    };

    void run();

    return () => {
      mounted = false;
    };
  }, [id, activeBodegaId, reloadKey]);

  const openDeleteConfirm = (operacionVasijaId: string) => {
    setConfirmDeleteId(operacionVasijaId);
    setImpacto(null);
    setImpactoLoading(true);
    fetchImpactoBorradoOperacionVasija(operacionVasijaId)
      .then(setImpacto)
      .catch(() => setImpacto(null))
      .finally(() => setImpactoLoading(false));
  };

  const handleConfirmDelete = async () => {
    if (!confirmDeleteId) return;
    setEliminando(true);
    try {
      await deleteElaboracionResource("operaciones-vasija", confirmDeleteId);
      notifySuccess({ title: "Operación eliminada" });
      setConfirmDeleteId(null);
      setReloadKey((k) => k + 1);
    } catch (err) {
      notifyError({ title: "No se pudo eliminar", message: getApiErrorMessage(err) });
    } finally {
      setEliminando(false);
    }
  };

  const esFermentando = stringVal(vasija?.etapa) === "en_fermentacion";

  const openMedicionForm = () => {
    setMedicionValues(emptyMedicionForm());
    setMedicionError(null);
    setMedicionOpen(true);
  };

  const handleMedicionSubmit = async () => {
    if (!id) return;
    if (!medicionValues.fecha_hora) {
      setMedicionError("La fecha y hora son obligatorias.");
      return;
    }
    const parseNum = (v: string) => (v.trim() ? Number(v) : undefined);
    const fechaIso = toIsoDateTime(medicionValues.fecha_hora);

    const hasExistenciaValues = [
      medicionValues.volumen_l,
      medicionValues.grado_alcohol,
      medicionValues.azucar_residual_g_l,
    ].some((v) => v.trim());
    const hasFermentacionValues = esFermentando && [
      medicionValues.densidad,
      medicionValues.temperatura,
      medicionValues.brix,
      medicionValues.ph,
      medicionValues.acidez,
      medicionValues.estado_fermentacion,
    ].some((v) => v.trim());

    if (!hasExistenciaValues && !hasFermentacionValues) {
      setMedicionError("Completá al menos un valor de la medición.");
      return;
    }

    setMedicionSaving(true);
    setMedicionError(null);
    try {
      if (hasExistenciaValues) {
        await createElaboracionResource("existencias-vasija", {
          vasijaId: id,
          fecha_hora: fechaIso,
          volumen_l: parseNum(medicionValues.volumen_l),
          grado_alcohol: parseNum(medicionValues.grado_alcohol),
          azucar_residual_g_l: parseNum(medicionValues.azucar_residual_g_l),
          observaciones: medicionValues.observaciones.trim() || undefined,
        });
      }
      if (hasFermentacionValues) {
        await createElaboracionResource("controles-fermentacion", {
          vasijaId: id,
          fecha_hora: fechaIso,
          densidad: parseNum(medicionValues.densidad),
          temperatura: parseNum(medicionValues.temperatura),
          brix: parseNum(medicionValues.brix),
          ph: parseNum(medicionValues.ph),
          acidez: parseNum(medicionValues.acidez),
          estado_fermentacion: medicionValues.estado_fermentacion.trim() || undefined,
          observaciones: medicionValues.observaciones.trim() || undefined,
        });
      }
      notifySuccess({ title: "Medición registrada" });
      setMedicionOpen(false);
      setReloadKey((k) => k + 1);
    } catch (err) {
      setMedicionError(getApiErrorMessage(err));
    } finally {
      setMedicionSaving(false);
    }
  };

  const events = useMemo<TimelineEvent[]>(() => {
    const ops = operaciones.map<TimelineEvent>((op, idx) => ({
      id: String(op.operacion_vasija_id ?? op.id ?? `op-${idx}`),
      tipo: "operacion",
      fecha: new Date(String(op.fecha_hora ?? op.created_at ?? 0)),
      raw: op,
    }));
    const exs = existencias.map<TimelineEvent>((ex, idx) => ({
      id: String(ex.existencia_vasija_id ?? ex.id ?? `ex-${idx}`),
      tipo: "existencia",
      fecha: new Date(String(ex.fecha_hora ?? ex.created_at ?? 0)),
      raw: ex,
    }));
    const ctrls = fermentaciones.map<TimelineEvent>((c, idx) => ({
      id: String(c.control_fermentacion_id ?? c.id ?? `ferm-${idx}`),
      tipo: "fermentacion",
      fecha: new Date(String(c.fecha_hora ?? c.created_at ?? 0)),
      raw: c,
    }));

    return [...ops, ...exs, ...ctrls]
      .filter((ev) => tipoFilter === "todos" || ev.tipo === tipoFilter)
      .sort((a, b) =>
        sortDir === "desc"
          ? b.fecha.getTime() - a.fecha.getTime()
          : a.fecha.getTime() - b.fecha.getTime(),
      );
  }, [operaciones, existencias, fermentaciones, tipoFilter, sortDir]);

  if (!id) {
    return (
      <div className="min-h-screen bg-secondary px-6 py-10">
        <div className="mx-auto w-full max-w-4xl">
          <NoticeBanner tone="danger">Vasija no encontrada.</NoticeBanner>
        </div>
      </div>
    );
  }

  const codigo = vasija ? stringVal(vasija.codigo, "Vasija sin código") : "…";
  const tipo = vasija ? stringVal(vasija.tipo, "Tipo sin definir") : "";
  const capacidadNum =
    vasija && vasija.capacidad_litros !== null && vasija.capacidad_litros !== undefined
      ? Number(vasija.capacidad_litros)
      : null;
  const capacidad = capacidadNum !== null ? `${capacidadNum.toLocaleString("es-AR")} l` : "Sin definir";
  const ocupadoNum = composicion ? composicion.volumen_disponible_l : null;
  const capacidadConOcupado =
    ocupadoNum !== null
      ? `${ocupadoNum.toLocaleString("es-AR")}${capacidadNum !== null ? ` / ${capacidadNum.toLocaleString("es-AR")}` : ""} l`
      : capacidad;
  const estadoActual = vasija ? stringVal(vasija.etapa, "Sin estado") : "";
  const uso = vasija ? stringVal(vasija.uso, "Sin uso definido") : "";

  return (
    <div className="min-h-screen bg-secondary px-6 py-10">
      <div className="mx-auto w-full max-w-4xl space-y-6">

        {/* ── Encabezado ── */}
        <div className="flex flex-wrap items-center gap-2">
          <AppButton variant="ghost" size="sm" onClick={() => navigate(-1)}>← Volver</AppButton>
        </div>

        {/* ── Info vasija ── */}
        <AppCard as="section" tone="default" padding="lg">
          <SectionIntro
            title={codigo}
            description={[tipo, capacidad !== "Sin definir" ? capacidad : null]
              .filter(Boolean)
              .join(" · ")}
            actions={(
              <div className="flex flex-wrap gap-2">
                <AppButton
                  variant="secondary"
                  size="sm"
                  onClick={() => navigate(`/bodega/vasijas/${encodeURIComponent(id)}/editar`)}
                >
                  Editar
                </AppButton>
                <AppButton
                  variant="secondary"
                  size="sm"
                  onClick={openMedicionForm}
                >
                  Nueva medición
                </AppButton>
                <AppButton
                  variant="primary"
                  size="sm"
                  onClick={() =>
                    navigate(
                      `/operacion/vasijas?section=operaciones&vasijaId=${encodeURIComponent(id)}`,
                    )
                  }
                >
                  Registrar operación
                </AppButton>
              </div>
            )}
          />

          {vasija ? (
            <div className="mt-4 grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
              {[
                { label: "Tipo", value: tipo },
                { label: "Ocupado / Capacidad", value: capacidadConOcupado },
                { label: "Uso", value: uso },
                { label: "Etapa", value: estadoActual },
              ].map(({ label, value }) => (
                <div key={label} className="rounded-[var(--radius-md)] border border-[color:var(--border-shell)] bg-[color:var(--surface-muted)] px-3 py-2">
                  <div className="text-xs text-[color:var(--text-ink-muted)]">{label}</div>
                  <div className="mt-0.5 font-medium text-[color:var(--text-ink)]">{value}</div>
                </div>
              ))}
            </div>
          ) : null}
        </AppCard>

        {/* ── Timeline de movimientos ── */}
        <AppCard
          as="section"
          tone="default"
          padding="lg"
          header={(
            <SectionIntro
              title="Movimientos"
              description="Historial de operaciones, existencias y controles de fermentación de esta vasija."
            />
          )}
        >
          {loading ? (
            <NoticeBanner>Cargando movimientos…</NoticeBanner>
          ) : error ? (
            <NoticeBanner tone="danger">{error}</NoticeBanner>
          ) : (
            <>
              {/* Filtros */}
              <div className="mt-4 flex flex-wrap items-end gap-3">
                <div className="w-44">
                  <AppSelect
                    label="Ordenar por fecha"
                    value={sortDir}
                    onChange={(e) => setSortDir(e.target.value as SortDir)}
                  >
                    <option value="desc">Más recientes primero</option>
                    <option value="asc">Más antiguas primero</option>
                  </AppSelect>
                </div>
                <div className="w-44">
                  <AppSelect
                    label="Tipo"
                    value={tipoFilter}
                    onChange={(e) => setTipoFilter(e.target.value as TipoFilter)}
                  >
                    <option value="todos">Todos</option>
                    <option value="operacion">Operaciones</option>
                    <option value="existencia">Existencias</option>
                    <option value="fermentacion">Fermentación</option>
                  </AppSelect>
                </div>
              </div>

              {events.length === 0 ? (
                <p className="mt-4 text-sm text-[color:var(--text-ink-muted)]">
                  {tipoFilter === "todos"
                    ? "Todavía no hay movimientos registrados para esta vasija."
                    : "No hay movimientos que coincidan con el filtro seleccionado."}
                </p>
              ) : (
                <div className="relative mt-4 space-y-0 pl-6">
                  <div
                    className="pointer-events-none absolute bottom-2 left-[7px] top-2 w-px bg-[color:var(--border-shell)]"
                    aria-hidden
                  />
                  {events.map((ev) => {
                    const label =
                      ev.tipo === "operacion"
                        ? buildOperacionLabel(ev.raw, id)
                        : ev.tipo === "existencia"
                          ? buildExistenciaLabel(ev.raw)
                          : buildFermentacionLabel(ev.raw);
                    const obs = typeof ev.raw.observaciones === "string" && ev.raw.observaciones.trim()
                      ? ev.raw.observaciones
                      : null;

                    return (
                      <div key={ev.id} className="relative flex gap-3 py-2">
                        {/* dot */}
                        <span
                          className={`absolute -left-[19px] top-[11px] h-2.5 w-2.5 rounded-full border-2 border-[color:var(--surface-default)] ${TIPO_DOT_CLASS[ev.tipo]}`}
                        />
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-baseline gap-2">
                            <span className="text-xs font-semibold uppercase tracking-wide text-[color:var(--text-ink-muted)]">
                              {TIPO_LABELS[ev.tipo]}
                            </span>
                            <span className="text-xs text-[color:var(--text-ink-muted)]">
                              {formatDateTime(ev.fecha)}
                            </span>
                          </div>
                          <p className="mt-0.5 text-sm text-[color:var(--text-ink)]">{label}</p>
                          {obs ? (
                            <p className="mt-0.5 text-xs text-[color:var(--text-ink-muted)]">{obs}</p>
                          ) : null}
                        </div>
                        {ev.tipo === "operacion" ? (
                          <AppButton
                            variant="ghost"
                            size="sm"
                            onClick={() => openDeleteConfirm(ev.id)}
                          >
                            Eliminar
                          </AppButton>
                        ) : null}
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          )}
        </AppCard>

      </div>

      <AppModal
        opened={confirmDeleteId !== null}
        onClose={() => setConfirmDeleteId(null)}
        title="¿Eliminar esta operación?"
        size="sm"
        footer={(
          <div className="flex justify-end gap-2">
            <AppButton type="button" variant="secondary" size="sm" onClick={() => setConfirmDeleteId(null)}>
              Cancelar
            </AppButton>
            <AppButton
              type="button"
              variant="danger"
              size="sm"
              loading={eliminando}
              disabled={impactoLoading || impacto?.reversible === false}
              onClick={() => void handleConfirmDelete()}
            >
              Eliminar
            </AppButton>
          </div>
        )}
      >
        <div className="space-y-2">
          {impactoLoading ? (
            <p className="text-xs text-[color:var(--text-ink-muted)]">Revisando qué más se ve afectado…</p>
          ) : impacto && !impacto.reversible ? (
            <NoticeBanner tone="danger">{impacto.motivoNoReversible}</NoticeBanner>
          ) : impacto && impacto.vasijaContenidoVinculado.length > 0 ? (
            <NoticeBanner tone="warning">
              Esta operación generó {impacto.vasijaContenidoVinculado.map((v) => `${v.volumen_l} l`).join(", ")}{" "}
              en la vasija — al eliminarla, ese volumen también se borra del registro.
            </NoticeBanner>
          ) : null}
          <p className="text-xs text-[color:var(--text-ink-muted)]">Esta acción no se puede deshacer.</p>
        </div>
      </AppModal>

      <AppModal
        opened={medicionOpen}
        onClose={() => {
          if (!medicionSaving) setMedicionOpen(false);
        }}
        title="Nueva medición"
        size="lg"
        showHeaderDivider
        footer={(
          <div className="flex justify-end gap-2">
            <AppButton
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => setMedicionOpen(false)}
              disabled={medicionSaving}
            >
              Cancelar
            </AppButton>
            <AppButton
              type="button"
              variant="primary"
              size="sm"
              loading={medicionSaving}
              onClick={() => void handleMedicionSubmit()}
            >
              Registrar
            </AppButton>
          </div>
        )}
      >
        <div className="grid gap-3 md:grid-cols-2">
          <AppInput
            label="Fecha y hora"
            type="datetime-local"
            value={medicionValues.fecha_hora}
            onChange={(event) => setMedicionValues((prev) => ({ ...prev, fecha_hora: event.target.value }))}
            uiSize="lg"
          />
          <AppInput
            label="Volumen (l)"
            type="number"
            value={medicionValues.volumen_l}
            onChange={(event) => setMedicionValues((prev) => ({ ...prev, volumen_l: event.target.value }))}
            uiSize="lg"
          />
          <AppInput
            label="Grado alcohol"
            type="number"
            value={medicionValues.grado_alcohol}
            onChange={(event) => setMedicionValues((prev) => ({ ...prev, grado_alcohol: event.target.value }))}
            uiSize="lg"
          />
          <AppInput
            label="Azúcar residual g/l"
            type="number"
            value={medicionValues.azucar_residual_g_l}
            onChange={(event) => setMedicionValues((prev) => ({ ...prev, azucar_residual_g_l: event.target.value }))}
            uiSize="lg"
          />
        </div>

        {esFermentando ? (
          <div className="mt-4 border-t border-[color:var(--border-shell)] pt-3">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-[color:var(--feedback-warning-text)]">
              Control de fermentación — esta vasija está en fermentación
            </p>
            <div className="grid gap-3 md:grid-cols-2">
              <AppInput
                label="Densidad"
                type="number"
                value={medicionValues.densidad}
                onChange={(event) => setMedicionValues((prev) => ({ ...prev, densidad: event.target.value }))}
                uiSize="lg"
              />
              <AppInput
                label="Temperatura"
                type="number"
                value={medicionValues.temperatura}
                onChange={(event) => setMedicionValues((prev) => ({ ...prev, temperatura: event.target.value }))}
                uiSize="lg"
              />
              <AppInput
                label="Brix"
                type="number"
                value={medicionValues.brix}
                onChange={(event) => setMedicionValues((prev) => ({ ...prev, brix: event.target.value }))}
                uiSize="lg"
              />
              <AppInput
                label="pH"
                type="number"
                value={medicionValues.ph}
                onChange={(event) => setMedicionValues((prev) => ({ ...prev, ph: event.target.value }))}
                uiSize="lg"
              />
              <AppInput
                label="Acidez"
                type="number"
                value={medicionValues.acidez}
                onChange={(event) => setMedicionValues((prev) => ({ ...prev, acidez: event.target.value }))}
                uiSize="lg"
              />
              <AppInput
                label="Estado fermentación"
                value={medicionValues.estado_fermentacion}
                onChange={(event) => setMedicionValues((prev) => ({ ...prev, estado_fermentacion: event.target.value }))}
                uiSize="lg"
              />
            </div>
          </div>
        ) : null}

        <div className="mt-3">
          <AppTextarea
            label="Observaciones"
            value={medicionValues.observaciones}
            onChange={(event) => setMedicionValues((prev) => ({ ...prev, observaciones: event.target.value }))}
          />
        </div>
        {medicionError ? <NoticeBanner tone="danger" className="mt-3">{medicionError}</NoticeBanner> : null}
      </AppModal>
    </div>
  );
}
