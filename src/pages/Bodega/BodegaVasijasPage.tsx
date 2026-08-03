import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  deleteElaboracionResource,
  listElaboracionResource,
  type ElaboracionEntity,
} from "../../features/elaboracion/api";
import {
  AppButton,
  AppCard,
  GuidedState,
  NoticeBanner,
  SectionIntro,
  useConfirmDialog,
} from "../../components/ui";
import { getApiErrorMessage } from "../../lib/api";
import { useAuthStore } from "../../store/authStore";

const VASIJA_ID_KEYS = ["id_vasija", "vasija_id", "id"];
const editIcon = (
  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M12 20h9" />
    <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" />
  </svg>
);
const deleteIcon = (
  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M3 6h18" />
    <path d="M8 6V4h8v2" />
    <path d="M19 6l-1 14H6L5 6" />
    <path d="M10 11v6" />
    <path d="M14 11v6" />
  </svg>
);

function resolveVasijaId(item: ElaboracionEntity) {
  for (const key of VASIJA_ID_KEYS) {
    const value = item[key];
    if (typeof value === "string" && value.trim()) return value;
    if (typeof value === "number") return String(value);
  }
  return "";
}

export default function BodegaVasijasPage() {
  const { confirm, ConfirmDialog } = useConfirmDialog();
  const activeBodegaId = useAuthStore((state) => state.activeBodegaId);
  const navigate = useNavigate();
  const [items, setItems] = useState<ElaboracionEntity[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    if (!activeBodegaId) {
      setItems([]);
      return;
    }
    let mounted = true;
    setLoading(true);
    setError(null);

    listElaboracionResource("vasijas", { bodegaId: String(activeBodegaId) })
      .then((data) => {
        if (!mounted) return;
        setItems(data);
      })
      .catch((requestError) => {
        if (!mounted) return;
        setError(getApiErrorMessage(requestError));
      })
      .finally(() => {
        if (!mounted) return;
        setLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, [activeBodegaId]);

  const reload = async () => {
    if (!activeBodegaId) {
      setItems([]);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const data = await listElaboracionResource("vasijas", {
        bodegaId: String(activeBodegaId),
      });
      setItems(data);
    } catch (requestError) {
      setError(getApiErrorMessage(requestError));
    } finally {
      setLoading(false);
    }
  };

  const onDelete = async (item: ElaboracionEntity) => {
    const id = resolveVasijaId(item);
    if (!id) {
      setError("No se pudo resolver el ID de la vasija.");
      return;
    }
    const codigo =
      typeof item.codigo === "string" && item.codigo.trim() ? item.codigo : id;
    const confirmed = await confirm(`¿Eliminar la vasija "${codigo}"?`);
    if (!confirmed) return;

    setDeletingId(id);
    setError(null);
    setSuccess(null);
    try {
      await deleteElaboracionResource("vasijas", id);
      setSuccess("Vasija eliminada correctamente.");
      await reload();
    } catch (requestError) {
      setError(getApiErrorMessage(requestError));
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="min-h-screen bg-secondary px-6 py-10">
      <div className="mx-auto w-full max-w-6xl space-y-6">
        <SectionIntro
          title="Administración de vasijas"
          description="Primero ves el listado y después decidís si crear, editar o eliminar."
        />

        <AppCard
          as="section"
          tone="default"
          padding="lg"
          header={(
            <SectionIntro
              title="Vasijas"
              description="Administrá las vasijas de la bodega activa con un flujo separado de alta y edición."
              actions={(
                <>
              <Link to="/bodega/vasijas/nueva">
                <AppButton variant="primary" size="sm">Crear vasija</AppButton>
              </Link>
                </>
              )}
            />
          )}
        >

          <div className="mt-4">
            {!activeBodegaId ? (
              <GuidedState
                title="Seleccioná una bodega para administrar vasijas"
                description="Las vasijas se guardan por bodega. Antes de cargar, editar o revisar el inventario, necesitás activar el contexto correcto."
                action={(
                  <Link to="/contexto">
                    <AppButton variant="primary" size="sm">Elegir bodega</AppButton>
                  </Link>
                )}
              />
            ) : loading ? (
              <NoticeBanner>Cargando vasijas...</NoticeBanner>
            ) : items.length === 0 ? (
              <GuidedState
                title="Todavía no hay vasijas cargadas"
                description="Para registrar operaciones de bodega, cortes, existencias o fermentación, primero necesitás crear al menos una vasija."
                action={(
                  <Link to="/bodega/vasijas/nueva">
                    <AppButton variant="primary" size="sm">Crear primera vasija</AppButton>
                  </Link>
                )}
              />
            ) : (
              <div className="grid gap-3 md:grid-cols-2">
                {items.map((item) => {
                  const id = resolveVasijaId(item);
                  const codigo =
                    typeof item.codigo === "string" && item.codigo.trim()
                      ? item.codigo
                      : "Vasija sin codigo";
                  const tipo =
                    typeof item.tipo === "string" && item.tipo.trim()
                      ? item.tipo
                      : "Tipo sin definir";
                  const estadoActual =
                    typeof item.etapa === "string" && item.etapa.trim()
                      ? item.etapa
                      : "Sin estado";
                  const uso =
                    typeof item.uso === "string" && item.uso.trim()
                      ? item.uso
                      : "Sin uso definido";
                  const capacidad =
                    item.capacidad_litros === null ||
                    item.capacidad_litros === undefined ||
                    item.capacidad_litros === ""
                      ? "Sin definir"
                      : `${String(item.capacidad_litros)} l`;

                  return (
                    <AppCard
                      key={id || codigo}
                      as="article"
                      tone="interactive"
                      padding="md"
                    >
                      <div className="text-sm font-semibold text-[color:var(--text-ink)]">
                        {codigo}
                      </div>
                      <div className="mt-1 text-xs text-[color:var(--text-ink-muted)]">{tipo}</div>
                      
                      <div className="mt-3 rounded-[var(--radius-md)] border border-[color:var(--border-shell)] bg-[color:var(--surface-muted)] px-3 py-2 text-xs text-[color:var(--text-on-dark-muted)]">
                        <div className="grid gap-1">
                          <div>
                            <span className="font-semibold text-[color:var(--text-on-dark)]">
                              Capacidad:
                            </span>{" "}
                            {capacidad}
                          </div>
                          <div>
                            <span className="font-semibold text-[color:var(--text-on-dark)]">
                              Uso:
                            </span>{" "}
                            {uso}
                          </div>
                          <div>
                            <span className="font-semibold text-[color:var(--text-ink)]">
                              Etapa:
                            </span>{" "}
                            {estadoActual}
                          </div>
                        </div>
                      </div>
                      <div className="mt-4">
                        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
                          <AppButton
                            type="button"
                            variant="primary"
                            size="sm"
                            className="w-full justify-center"
                            onClick={() =>
                              navigate(`/bodega/vasijas/${encodeURIComponent(id)}`)
                            }
                            disabled={!id}
                          >
                            Ver movimientos
                          </AppButton>
                          <AppButton
                            type="button"
                            variant="secondary"
                            size="sm"
                            className="w-full justify-center"
                            onClick={() =>
                              navigate(
                                `/operacion/vasijas?section=operaciones&vasijaId=${encodeURIComponent(id)}`,
                              )
                            }
                            disabled={!id}
                          >
                            Gestionar
                          </AppButton>
                          <AppButton
                            type="button"
                            variant="secondary"
                            size="sm"
                            leftSection={editIcon}
                            className="w-full justify-center border-[color:var(--border-default)] bg-[color:var(--surface-soft)] text-[color:var(--text-ink)] hover:bg-[color:var(--surface-base)]"
                            onClick={() =>
                              navigate(`/bodega/vasijas/${encodeURIComponent(id)}/editar`)
                            }
                            disabled={!id}
                          >
                            Editar
                          </AppButton>
                          <AppButton
                            type="button"
                            variant="danger"
                            size="sm"
                            leftSection={deleteIcon}
                            className="w-full justify-center border-[color:rgba(213,74,74,0.28)] bg-[color:rgba(213,74,74,0.08)] text-[color:var(--feedback-danger-text)] hover:border-[color:rgba(213,74,74,0.45)] hover:bg-[color:rgba(213,74,74,0.14)]"
                            disabled={!id || deletingId === id}
                            loading={deletingId === id}
                            onClick={() => void onDelete(item)}
                          >
                            {deletingId === id ? "Eliminando..." : "Eliminar"}
                          </AppButton>
                        </div>
                      </div>
                    </AppCard>
                  );
                })}
              </div>
            )}
            {error ? (
              <NoticeBanner tone="danger" className="mt-3">{error}</NoticeBanner>
            ) : null}
            {success ? (
              <NoticeBanner tone="success" className="mt-3">{success}</NoticeBanner>
            ) : null}
          </div>
        </AppCard>
      </div>
    {ConfirmDialog}
    </div>
  );
}
