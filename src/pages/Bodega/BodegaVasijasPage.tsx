import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  deleteElaboracionResource,
  listElaboracionResource,
  type ElaboracionEntity,
} from "../../features/elaboracion/api";
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
      <div className="mx-auto w-full max-w-6xl">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-text">
            Administracion de vasijas
          </h1>
          <p className="mt-2 text-sm text-text-secondary">
            Primero ves el listado y después decidís si crear, editar o eliminar.
          </p>
        </div>

        <section className="rounded-2xl bg-primary p-6 shadow-lg">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-text">Vasijas</h2>
              <p className="text-xs text-text">
                Administrá las vasijas de la bodega activa con un flujo separado de alta y edición.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Link
                to="/bodega/vasijas/nueva"
                className="rounded-lg border border-[#C9A961]/40 px-3 py-2 text-xs font-semibold text-text transition hover:bg-primary"
              >
                Crear vasija
              </Link>
              <button
                type="button"
                onClick={() => void reload()}
                className="rounded-lg border border-[#C9A961]/40 px-3 py-2 text-xs font-semibold text-text transition hover:bg-primary"
              >
                Actualizar listado
              </button>
            </div>
          </div>

          <div className="mt-4">
            {!activeBodegaId ? (
              <div className="text-xs text-[#7A4A50]">
                Seleccioná una bodega para ver las vasijas.
              </div>
            ) : loading ? (
              <div className="text-xs text-[#7A4A50]">Cargando vasijas...</div>
            ) : items.length === 0 ? (
              <div className="text-xs text-text-secondary">
                No hay vasijas cargadas.
              </div>
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
                    <article
                      key={id || codigo}
                      className="rounded-xl border border-[#C9A961]/30 bg-[#FFF9F0] p-4 transition hover:bg-white"
                    >
                      <div className="text-sm font-semibold text-[#3D1B1F]">
                        {codigo}
                      </div>
                      <div className="mt-1 text-xs text-[#7A4A50]">{tipo}</div>
                      <div className="mt-2 text-[11px] text-[#8B4049]/80">
                        Gestioná la vasija y su información base
                      </div>
                      <div className="mt-3 rounded border border-[#C9A961]/30 bg-white px-3 py-2 text-xs text-[#6B3A3F]">
                        <div className="grid gap-1">
                          <div>
                            <span className="font-semibold text-[#3D1B1F]">
                              Capacidad:
                            </span>{" "}
                            {capacidad}
                          </div>
                          <div>
                            <span className="font-semibold text-[#3D1B1F]">
                              Estado:
                            </span>{" "}
                            {estado}
                          </div>
                          <div>
                            <span className="font-semibold text-[#3D1B1F]">
                              Ubicación:
                            </span>{" "}
                            {ubicacion}
                          </div>
                        </div>
                      </div>
                      <div className="mt-3 flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() =>
                            navigate(`/bodega/vasijas/${encodeURIComponent(id)}/editar`)
                          }
                          disabled={!id}
                          className="rounded border border-[#C9A961]/40 px-2 py-1 text-xs font-semibold text-[#722F37] transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          Editar vasija
                        </button>
                        <button
                          type="button"
                          disabled={!id || deletingId === id}
                          onClick={() => void onDelete(item)}
                          className="rounded border border-red-300 px-2 py-1 text-xs font-semibold text-red-700 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          {deletingId === id ? "Eliminando..." : "Eliminar vasija"}
                        </button>
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
            {error ? (
              <div className="mt-3 rounded border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
                {error}
              </div>
            ) : null}
            {success ? (
              <div className="mt-3 rounded border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-700">
                {success}
              </div>
            ) : null}
          </div>
        </section>
      </div>
    </div>
  );
}
