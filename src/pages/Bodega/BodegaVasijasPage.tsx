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
  NoticeBanner,
  SectionIntro,
} from "../../components/ui";
import { getApiErrorMessage } from "../../lib/api";
import { useAuthStore } from "../../store/authStore";

const VASIJA_ID_KEYS = ["id_vasija", "vasija_id", "id"];

function resolveVasijaId(item: ElaboracionEntity) {
  for (const key of VASIJA_ID_KEYS) {
    const value = item[key];
    if (typeof value === "string" && value.trim()) return value;
    if (typeof value === "number") return String(value);
  }
  return "";
}

export default function BodegaVasijasPage() {
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
    const confirmed = window.confirm(`¿Eliminar la vasija "${codigo}"?`);
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
              <AppButton
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => void reload()}
              >
                Actualizar listado
              </AppButton>
                </>
              )}
            />
          )}
        >

          <div className="mt-4">
            {!activeBodegaId ? (
              <NoticeBanner>
                Seleccioná una bodega para ver las vasijas.
              </NoticeBanner>
            ) : loading ? (
              <NoticeBanner>Cargando vasijas...</NoticeBanner>
            ) : items.length === 0 ? (
              <NoticeBanner>No hay vasijas cargadas.</NoticeBanner>
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
                  const estado =
                    typeof item.estado === "string" && item.estado.trim()
                      ? item.estado
                      : "Estado sin definir";
                  const ubicacion =
                    typeof item.ubicacion === "string" && item.ubicacion.trim()
                      ? item.ubicacion
                      : "Ubicación sin definir";
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
                      <div className="mt-2 text-[11px] text-[color:var(--accent-primary)]/80">
                        Gestioná la vasija y su información base
                      </div>
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
                              Estado:
                            </span>{" "}
                            {estado}
                          </div>
                          <div>
                            <span className="font-semibold text-[color:var(--text-ink)]">
                              Ubicación:
                            </span>{" "}
                            {ubicacion}
                          </div>
                        </div>
                      </div>
                      <div className="mt-3 flex flex-wrap gap-2">
                        <AppButton
                          type="button"
                          variant="secondary"
                          size="sm"
                          onClick={() =>
                            navigate(`/bodega/vasijas/${encodeURIComponent(id)}/editar`)
                          }
                          disabled={!id}
                        >
                          Editar vasija
                        </AppButton>
                        <AppButton
                          type="button"
                          variant="danger"
                          size="sm"
                          disabled={!id || deletingId === id}
                          loading={deletingId === id}
                          onClick={() => void onDelete(item)}
                        >
                          {deletingId === id ? "Eliminando..." : "Eliminar vasija"}
                        </AppButton>
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
    </div>
  );
}
