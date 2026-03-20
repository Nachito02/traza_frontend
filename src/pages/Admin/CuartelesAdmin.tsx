import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import {
  createCuartel,
  deleteCuartel,
  fetchCuartelById,
  fetchCuartelesByFinca,
  patchCuartel,
  type Cuartel,
} from "../../features/cuarteles/api";
import { getApiErrorMessage } from "../../lib/api";
import { useAuthStore } from "../../store/authStore";
import { useFincasStore } from "../../features/fincas/store";

type FormState = {
  fincaId: string;
  codigo_cuartel: string;
  superficie_ha: string;
  cultivo: string;
  variedad: string;
  sistema_productivo: string;
  sistema_conduccion: string;
};

const emptyForm: FormState = {
  fincaId: "",
  codigo_cuartel: "",
  superficie_ha: "",
  cultivo: "vid",
  variedad: "",
  sistema_productivo: "",
  sistema_conduccion: "",
};

type CuartelRow = Cuartel & { fincaId: string };

export default function CuartelesAdmin() {
  const [searchParams, setSearchParams] = useSearchParams();
  const activeBodegaId = useAuthStore((state) => state.activeBodegaId);
  const fincas = useFincasStore((state) => state.fincas);
  const loadFincas = useFincasStore((state) => state.loadFincas);
  const editParam = searchParams.get("edit") ?? "";
  const fincaIdParam = searchParams.get("fincaId") ?? "";
  const createParam = searchParams.get("create");

  const [items, setItems] = useState<CuartelRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loadingEdit, setLoadingEdit] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formMode, setFormMode] = useState<"none" | "create" | "edit">("none");
  const [form, setForm] = useState<FormState>(emptyForm);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [detailById, setDetailById] = useState<Record<string, Cuartel>>({});
  const [loadingDetailId, setLoadingDetailId] = useState<string | null>(null);
  const [detailErrorById, setDetailErrorById] = useState<
    Record<string, string>
  >({});
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    if (!activeBodegaId) return;
    void loadFincas(activeBodegaId);
  }, [activeBodegaId, loadFincas]);

  useEffect(() => {
    if (!form.fincaId && fincas.length > 0) {
      setForm((prev) => ({
        ...prev,
        fincaId: fincaIdParam || String(fincas[0].finca_id ?? fincas[0].id ?? ""),
      }));
    }
  }, [fincaIdParam, fincas, form.fincaId]);

  const fincaById = useMemo(
    () =>
      Object.fromEntries(
        fincas.map((finca) => [
          String(finca.finca_id ?? finca.id ?? ""),
          finca.nombre ?? finca.nombre_finca ?? finca.name ?? "Finca",
        ]),
      ),
    [fincas],
  );

  const selectedFincaLabel = fincaIdParam
    ? fincaById[fincaIdParam] ?? "Finca seleccionada"
    : "Todas las fincas";

  const load = async () => {
    if (!activeBodegaId) {
      setItems([]);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const rows = await Promise.all(
        fincas
          .map((finca) => String(finca.finca_id ?? finca.id ?? ""))
          .filter(Boolean)
          .map(async (fincaId) => {
            const list = await fetchCuartelesByFinca(fincaId);
            return (list ?? []).map((item) => ({ ...item, fincaId }));
          }),
      );
      setItems(rows.flat());
    } catch (requestError) {
      setError(getApiErrorMessage(requestError));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeBodegaId, fincas.length]);

  useEffect(() => {
    if (!editParam && createParam !== "1") return;
    if (editParam) {
      const fallbackFincaId =
        fincaIdParam || items.find((item) => String(item.cuartel_id ?? item.id ?? "") === editParam)?.fincaId || "";
      void onEditById(editParam, fallbackFincaId);
      return;
    }

    setEditingId(null);
    setFormMode("create");
    setError(null);
    setSuccess(null);
    setForm({
      ...emptyForm,
      fincaId: fincaIdParam || form.fincaId || "",
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [createParam, editParam, fincaIdParam, items]);

  const clearFormQueryState = () => {
    const nextParams = new URLSearchParams(searchParams);
    nextParams.delete("edit");
    nextParams.delete("create");
    setSearchParams(nextParams, { replace: true });
  };

  const onSubmit = async () => {
    if (!form.fincaId || !form.codigo_cuartel.trim() || !form.variedad.trim()) {
      setError("Finca, código y variedad son obligatorios.");
      return;
    }
    if (!form.superficie_ha || Number.isNaN(Number(form.superficie_ha))) {
      setError("Superficie válida requerida.");
      return;
    }

    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      if (editingId) {
        await patchCuartel(editingId, {
          codigo_cuartel: form.codigo_cuartel.trim(),
          superficie_ha: Number(form.superficie_ha),
          cultivo: form.cultivo.trim() || "vid",
          variedad: form.variedad.trim(),
          sistema_productivo: form.sistema_productivo.trim() || null,
          sistema_conduccion: form.sistema_conduccion.trim() || null,
        });
        setSuccess("Cuartel actualizado.");
      } else {
        await createCuartel({
          fincaId: form.fincaId,
          codigo_cuartel: form.codigo_cuartel.trim(),
          superficie_ha: Number(form.superficie_ha),
          cultivo: form.cultivo.trim() || "vid",
          variedad: form.variedad.trim(),
          sistema_productivo: form.sistema_productivo.trim() || null,
          sistema_conduccion: form.sistema_conduccion.trim() || null,
        });
        setSuccess("Cuartel creado.");
      }

      setForm(emptyForm);
      setEditingId(null);
      setFormMode("none");
      clearFormQueryState();
      await load();
    } catch (requestError) {
      setError(getApiErrorMessage(requestError));
    } finally {
      setSaving(false);
    }
  };

  const onEditById = async (id: string, fallbackFincaId: string) => {
    if (!id) return;
    setLoadingEdit(true);
    setError(null);
    try {
      const detail = await fetchCuartelById(id);
      setEditingId(id);
      setFormMode("edit");
      setForm({
        fincaId: String(detail.finca_id ?? fallbackFincaId ?? ""),
        codigo_cuartel: detail.codigo_cuartel ?? "",
        superficie_ha:
          detail.superficie_ha === undefined || detail.superficie_ha === null
            ? ""
            : String(detail.superficie_ha),
        cultivo: detail.cultivo ?? "vid",
        variedad: detail.variedad ?? "",
        sistema_productivo: detail.sistema_productivo ?? "",
        sistema_conduccion: detail.sistema_conduccion ?? "",
      });
    } catch (requestError) {
      setError(getApiErrorMessage(requestError));
    } finally {
      setLoadingEdit(false);
    }
  };

  const onDelete = async (item: CuartelRow) => {
    const id = String(item.cuartel_id ?? item.id ?? "");
    if (!id) return;
    if (!window.confirm(`¿Eliminar cuartel ${id}?`)) return;
    try {
      await deleteCuartel(id);
      setSuccess("Cuartel eliminado.");
      await load();
    } catch (requestError) {
      setError(getApiErrorMessage(requestError));
    }
  };

  const onToggleDetail = async (id: string) => {
    if (!id) return;
    if (expandedId === id) {
      setExpandedId(null);
      return;
    }

    setExpandedId(id);
    if (detailById[id]) return;

    setLoadingDetailId(id);
    setDetailErrorById((prev) => ({ ...prev, [id]: "" }));
    try {
      const detail = await fetchCuartelById(id);
      setDetailById((prev) => ({ ...prev, [id]: detail }));
    } catch (requestError) {
      setDetailErrorById((prev) => ({
        ...prev,
        [id]: getApiErrorMessage(requestError),
      }));
    } finally {
      setLoadingDetailId(null);
    }
  };

  return (
    <div className="min-h-screen bg-secondary px-6 py-10">
      <div className="mx-auto w-full max-w-6xl space-y-6">
        <section className="rounded-2xl bg-primary p-6 shadow-lg">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="space-y-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#8B5E34]">
                  Administración
                </p>
                <h1 className="text-3xl font-bold text-text">Cuarteles</h1>
                <p className="mt-2 max-w-3xl text-sm text-text-secondary">
                  Revisá el listado por finca y seguí con altas o ediciones desde un flujo separado,
                  manteniendo la misma lógica visual que usamos en fincas.
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <div className="rounded-xl border border-[#C9A961]/30 bg-[#FFF9F0] px-4 py-3">
                  <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#8B5E34]">
                    Contexto
                  </div>
                  <div className="mt-1 text-sm font-semibold text-[#3D1B1F]">{selectedFincaLabel}</div>
                </div>
                <div className="rounded-xl border border-[#C9A961]/30 bg-[#FFF9F0] px-4 py-3">
                  <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#8B5E34]">
                    Cuarteles
                  </div>
                  <div className="mt-1 text-sm font-semibold text-[#3D1B1F]">
                    {loading ? "Cargando..." : `${items.length} registrados`}
                  </div>
                </div>
              </div>
            </div>

            {formMode === "none" ? (
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setEditingId(null);
                    setForm({ ...emptyForm, fincaId: fincaIdParam || "" });
                    setFormMode("create");
                    setError(null);
                    setSuccess(null);
                    setSearchParams((prev) => {
                      const next = new URLSearchParams(prev);
                      next.set("create", "1");
                      if (fincaIdParam) next.set("fincaId", fincaIdParam);
                      return next;
                    });
                  }}
                  className="rounded-lg border border-[#C9A961]/40 px-3 py-2 text-xs font-semibold text-text transition hover:bg-primary cursor-pointer"
                >
                  Nuevo cuartel
                </button>
                <button
                  type="button"
                  onClick={() => void load()}
                  className="rounded-lg border border-[#C9A961]/40 px-3 py-2 text-xs font-semibold text-text transition hover:bg-primary cursor-pointer"
                >
                  Actualizar listado
                </button>
              </div>
            ) : null}
          </div>
        </section>

        {formMode === "none" ? (
          <section className="rounded-2xl bg-primary p-6 shadow-lg">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold text-text">Listado de cuarteles</h2>
                <p className="text-xs text-text-secondary">
                  Entrá al detalle o editá cada cuartel sin mezclar el formulario con el listado.
                </p>
              </div>
            </div>

            <div className="mt-4 space-y-3">
              {loading ? (
                <div className="text-sm text-[#7A4A50]">Cargando...</div>
              ) : items.length === 0 ? (
                <div className="rounded-xl border border-dashed border-[#C9A961]/40 bg-[#FFF9F0] px-4 py-5 text-sm text-[#7A4A50]">
                  Sin cuarteles para este contexto.
                </div>
              ) : (
                items.map((item, index) => {
                  const id = String(item.cuartel_id ?? item.id ?? `i-${index}`);
                  const isExpanded = expandedId === id;
                  const detail = detailById[id];
                  const detailError = detailErrorById[id];
                  const isLoadingDetail = loadingDetailId === id;
                  return (
                    <article
                      key={id}
                      className="rounded-xl border border-[#C9A961]/30 bg-[#FFF9F0] p-4 shadow-sm"
                    >
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <div className="text-sm font-semibold text-[#3D1B1F]">
                            {item.codigo_cuartel}
                          </div>
                          <div className="mt-1 text-xs text-[#6B3A3F]">
                            {fincaById[item.fincaId] ?? item.fincaId}
                          </div>
                        </div>
                        <div className="rounded-full border border-[#C9A961]/40 px-2.5 py-1 text-[11px] font-semibold text-[#722F37]">
                          {item.cultivo ?? "vid"}
                        </div>
                      </div>

                      <div className="mt-3 grid gap-2 text-xs text-[#6B3A3F] md:grid-cols-2">
                        <div className="rounded-lg border border-[#C9A961]/20 bg-white/70 px-3 py-2">
                          <span className="font-semibold text-[#3D1B1F]">Variedad:</span>{" "}
                          {item.variedad || "-"}
                        </div>
                        <div className="rounded-lg border border-[#C9A961]/20 bg-white/70 px-3 py-2">
                          <span className="font-semibold text-[#3D1B1F]">Superficie:</span>{" "}
                          {item.superficie_ha ?? "-"} ha
                        </div>
                      </div>

                      <div className="mt-3 flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => void onEditById(id, item.fincaId)}
                          className="cursor-pointer rounded border border-[#C9A961]/50 px-2 py-1 text-xs font-semibold text-[#722F37] transition hover:bg-[#FFF9F0] active:scale-[0.98]"
                        >
                          Editar
                        </button>
                        <button
                          type="button"
                          onClick={() => void onToggleDetail(id)}
                          className="cursor-pointer rounded border border-[#C9A961]/50 px-2 py-1 text-xs font-semibold text-[#722F37] transition hover:bg-[#FFF9F0] active:scale-[0.98]"
                        >
                          {isExpanded ? "Ocultar detalle" : "Ver detalle"}
                        </button>
                        <button
                          type="button"
                          onClick={() => void onDelete(item)}
                          className="cursor-pointer rounded border border-red-300 px-2 py-1 text-xs font-semibold text-red-700 transition hover:bg-red-50 active:scale-[0.98]"
                        >
                          Eliminar
                        </button>
                      </div>

                      {isExpanded ? (
                        <div className="mt-3 rounded-xl border border-[#C9A961]/30 bg-white px-3 py-3 text-xs text-[#6B3A3F]">
                          {isLoadingDetail ? (
                            <div>Cargando detalle...</div>
                          ) : detailError ? (
                            <div className="text-red-700">{detailError}</div>
                          ) : (
                            <div className="grid gap-2 md:grid-cols-2">
                              <div>
                                <span className="font-semibold text-[#3D1B1F]">
                                  Código:
                                </span>{" "}
                                {detail?.codigo_cuartel ?? "-"}
                              </div>
                              <div>
                                <span className="font-semibold text-[#3D1B1F]">
                                  Cultivo:
                                </span>{" "}
                                {detail?.cultivo ?? "-"}
                              </div>
                              <div>
                                <span className="font-semibold text-[#3D1B1F]">
                                  Variedad:
                                </span>{" "}
                                {detail?.variedad ?? "-"}
                              </div>
                              <div>
                                <span className="font-semibold text-[#3D1B1F]">
                                  Superficie:
                                </span>{" "}
                                {detail?.superficie_ha ?? "-"} ha
                              </div>
                              <div>
                                <span className="font-semibold text-[#3D1B1F]">
                                  Sistema productivo:
                                </span>{" "}
                                {detail?.sistema_productivo ?? "-"}
                              </div>
                              <div>
                                <span className="font-semibold text-[#3D1B1F]">
                                  Sistema conducción:
                                </span>{" "}
                                {detail?.sistema_conduccion ?? "-"}
                              </div>
                            </div>
                          )}
                        </div>
                      ) : null}
                    </article>
                  );
                })
              )}
            </div>

            {error ? (
              <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                {error}
              </div>
            ) : null}
            {success ? (
              <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
                {success}
              </div>
            ) : null}
          </section>
        ) : null}

        {formMode !== "none" ? (
          <section className="rounded-2xl bg-primary p-6 shadow-lg">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#8B5E34]">
                  Formulario
                </p>
                <h1 className="text-2xl font-bold text-text">
                  {formMode === "edit" ? "Editar cuartel" : "Nuevo cuartel"}
                </h1>
                <p className="mt-2 text-sm text-text-secondary">
                  Completá los datos base del cuartel para dejarlo listo dentro de la finca
                  seleccionada.
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setEditingId(null);
                  setForm(emptyForm);
                  setFormMode("none");
                  clearFormQueryState();
                }}
                className="rounded-lg border border-[#C9A961]/40 px-3 py-2 text-xs font-semibold text-text transition hover:bg-primary cursor-pointer"
              >
                Volver al listado
              </button>
            </div>
            {loadingEdit ? (
              <div className="mt-4 rounded-xl border border-[#C9A961]/30 bg-[#FFF9F0] px-3 py-2 text-xs text-[#7A4A50]">
                Cargando datos completos del cuartel...
              </div>
            ) : null}
            <div className="mt-4 rounded-xl border border-[#C9A961]/30 bg-[#FFF9F0] p-4">
              <div className="grid gap-4 md:grid-cols-2">
                <label className="space-y-2 text-sm text-[#6B3A3F]">
                  <span className="font-semibold text-[#3D1B1F]">Finca</span>
                  <select
                    value={form.fincaId}
                    onChange={(event) =>
                      setForm((prev) => ({ ...prev, fincaId: event.target.value }))
                    }
                    className="w-full rounded-xl border border-[#C9A961]/40 bg-white px-3 py-2 text-sm text-[#3D1B1F]"
                    disabled={formMode === "edit"}
                  >
                    <option value="">Seleccionar finca</option>
                    {fincas.map((finca) => {
                      const id = String(finca.finca_id ?? finca.id ?? "");
                      return (
                        <option key={id} value={id}>
                          {finca.nombre ?? finca.nombre_finca ?? finca.name ?? id}
                        </option>
                      );
                    })}
                  </select>
                </label>
                <label className="space-y-2 text-sm text-[#6B3A3F]">
                  <span className="font-semibold text-[#3D1B1F]">Código de cuartel</span>
                  <input
                    value={form.codigo_cuartel}
                    onChange={(e) =>
                      setForm((p) => ({ ...p, codigo_cuartel: e.target.value }))
                    }
                    placeholder="Ej. C-01"
                    className="w-full rounded-xl border border-[#C9A961]/40 bg-white px-3 py-2 text-sm text-[#3D1B1F]"
                  />
                </label>
                <label className="space-y-2 text-sm text-[#6B3A3F]">
                  <span className="font-semibold text-[#3D1B1F]">Superficie (ha)</span>
                  <input
                    type="number"
                    step="0.01"
                    value={form.superficie_ha}
                    onChange={(e) =>
                      setForm((p) => ({ ...p, superficie_ha: e.target.value }))
                    }
                    placeholder="0.00"
                    className="w-full rounded-xl border border-[#C9A961]/40 bg-white px-3 py-2 text-sm text-[#3D1B1F]"
                  />
                </label>
                <label className="space-y-2 text-sm text-[#6B3A3F]">
                  <span className="font-semibold text-[#3D1B1F]">Cultivo</span>
                  <input
                    value={form.cultivo}
                    onChange={(e) =>
                      setForm((p) => ({ ...p, cultivo: e.target.value }))
                    }
                    placeholder="vid"
                    className="w-full rounded-xl border border-[#C9A961]/40 bg-white px-3 py-2 text-sm text-[#3D1B1F]"
                  />
                </label>
                <label className="space-y-2 text-sm text-[#6B3A3F]">
                  <span className="font-semibold text-[#3D1B1F]">Variedad</span>
                  <input
                    value={form.variedad}
                    onChange={(e) =>
                      setForm((p) => ({ ...p, variedad: e.target.value }))
                    }
                    placeholder="Malbec"
                    className="w-full rounded-xl border border-[#C9A961]/40 bg-white px-3 py-2 text-sm text-[#3D1B1F]"
                  />
                </label>
                <label className="space-y-2 text-sm text-[#6B3A3F]">
                  <span className="font-semibold text-[#3D1B1F]">Sistema productivo</span>
                  <input
                    value={form.sistema_productivo}
                    onChange={(e) =>
                      setForm((p) => ({ ...p, sistema_productivo: e.target.value }))
                    }
                    placeholder="Convencional, orgánico..."
                    className="w-full rounded-xl border border-[#C9A961]/40 bg-white px-3 py-2 text-sm text-[#3D1B1F]"
                  />
                </label>
                <label className="space-y-2 text-sm text-[#6B3A3F] md:col-span-2">
                  <span className="font-semibold text-[#3D1B1F]">Sistema de conducción</span>
                  <input
                    value={form.sistema_conduccion}
                    onChange={(e) =>
                      setForm((p) => ({ ...p, sistema_conduccion: e.target.value }))
                    }
                    placeholder="Espaldera, parral..."
                    className="w-full rounded-xl border border-[#C9A961]/40 bg-white px-3 py-2 text-sm text-[#3D1B1F]"
                  />
                </label>
              </div>
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => void onSubmit()}
                disabled={saving || !activeBodegaId}
                className="rounded-lg border border-[#C9A961]/40 px-3 py-2 text-xs font-semibold text-text hover:bg-primary cursor-pointer transition active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {editingId ? "Guardar" : "Crear"}
              </button>
              <button
                type="button"
                onClick={() => {
                  setEditingId(null);
                  setForm(emptyForm);
                  setFormMode("none");
                  clearFormQueryState();
                }}
                className="rounded-lg border border-[#C9A961]/40 px-3 py-2 text-xs font-semibold text-red-600 hover:bg-primary cursor-pointer transition active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
              >
                Cancelar
              </button>
            </div>
            {error ? (
              <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                {error}
              </div>
            ) : null}
            {success ? (
              <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
                {success}
              </div>
            ) : null}
          </section>
        ) : null}
      </div>
    </div>
  );
}
