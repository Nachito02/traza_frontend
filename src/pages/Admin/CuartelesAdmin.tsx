import { useEffect, useMemo, useState } from "react";
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
  const activeBodegaId = useAuthStore((state) => state.activeBodegaId);
  const fincas = useFincasStore((state) => state.fincas);
  const loadFincas = useFincasStore((state) => state.loadFincas);

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
  const [detailErrorById, setDetailErrorById] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    if (!activeBodegaId) return;
    void loadFincas(activeBodegaId);
  }, [activeBodegaId, loadFincas]);

  useEffect(() => {
    if (!form.fincaId && fincas.length > 0) {
      setForm((prev) => ({ ...prev, fincaId: String(fincas[0].finca_id ?? fincas[0].id ?? "") }));
    }
  }, [fincas, form.fincaId]);

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
        superficie_ha: detail.superficie_ha === undefined || detail.superficie_ha === null ? "" : String(detail.superficie_ha),
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
      setDetailErrorById((prev) => ({ ...prev, [id]: getApiErrorMessage(requestError) }));
    } finally {
      setLoadingDetailId(null);
    }
  };

  return (
    <div className="min-h-screen bg-secondary px-6 py-10">
      <div className="mx-auto w-full max-w-6xl space-y-6">
        {formMode === "none" ? (
          <section className="rounded-2xl bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-lg font-semibold text-[#3D1B1F]">Cuarteles</h2>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setEditingId(null);
                    setForm(emptyForm);
                    setFormMode("create");
                    setError(null);
                  }}
                  className="rounded border border-[#C9A961]/50 px-3 py-2 text-xs font-semibold text-[#722F37]"
                >
                  Nuevo cuartel
                </button>
                <button
                  type="button"
                  onClick={() => void load()}
                  className="rounded border border-[#C9A961]/50 px-3 py-2 text-xs font-semibold text-[#722F37]"
                >
                  Actualizar listado
                </button>
              </div>
            </div>

            <div className="mt-3 space-y-2">
              {loading ? (
                <div className="text-sm text-[#7A4A50]">Cargando...</div>
              ) : items.length === 0 ? (
                <div className="text-sm text-[#7A4A50]">Sin cuarteles.</div>
              ) : (
                items.map((item, index) => {
                  const id = String(item.cuartel_id ?? item.id ?? `i-${index}`);
                  const isExpanded = expandedId === id;
                  const detail = detailById[id];
                  const detailError = detailErrorById[id];
                  const isLoadingDetail = loadingDetailId === id;
                  return (
                    <article key={id} className="rounded border border-[#C9A961]/30 bg-[#FFF9F0] p-3">
                      <div className="text-sm font-semibold text-[#3D1B1F]">{item.codigo_cuartel}</div>
                      <div className="text-xs text-[#6B3A3F]">
                        {fincaById[item.fincaId] ?? item.fincaId} · {item.variedad} · {item.superficie_ha} ha
                      </div>
                      <div className="mt-2 flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => void onEditById(id, item.fincaId)}
                          className="cursor-pointer rounded border border-[#C9A961]/50 px-2 py-1 text-xs font-semibold text-[#722F37] transition hover:bg-white active:scale-[0.98]"
                        >
                          Editar
                        </button>
                        <button
                          type="button"
                          onClick={() => void onToggleDetail(id)}
                          className="cursor-pointer rounded border border-[#C9A961]/50 px-2 py-1 text-xs font-semibold text-[#722F37] transition hover:bg-white active:scale-[0.98]"
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
                        <div className="mt-3 rounded border border-[#C9A961]/30 bg-white px-3 py-2 text-xs text-[#6B3A3F]">
                          {isLoadingDetail ? (
                            <div>Cargando detalle...</div>
                          ) : detailError ? (
                            <div className="text-red-700">{detailError}</div>
                          ) : (
                            <div className="grid gap-1">
                              <div><span className="font-semibold text-[#3D1B1F]">Código:</span> {detail?.codigo_cuartel ?? "-"}</div>
                              <div><span className="font-semibold text-[#3D1B1F]">Cultivo:</span> {detail?.cultivo ?? "-"}</div>
                              <div><span className="font-semibold text-[#3D1B1F]">Variedad:</span> {detail?.variedad ?? "-"}</div>
                              <div><span className="font-semibold text-[#3D1B1F]">Superficie:</span> {detail?.superficie_ha ?? "-"} ha</div>
                              <div><span className="font-semibold text-[#3D1B1F]">Sistema productivo:</span> {detail?.sistema_productivo ?? "-"}</div>
                              <div><span className="font-semibold text-[#3D1B1F]">Sistema conducción:</span> {detail?.sistema_conduccion ?? "-"}</div>
                            </div>
                          )}
                        </div>
                      ) : null}
                    </article>
                  );
                })
              )}
            </div>

            {error ? <div className="mt-3 rounded border border-red-200 bg-red-50 p-2 text-xs text-red-700">{error}</div> : null}
            {success ? <div className="mt-3 rounded border border-emerald-200 bg-emerald-50 p-2 text-xs text-emerald-700">{success}</div> : null}
          </section>
        ) : null}

        {formMode !== "none" ? (
          <section className="rounded-2xl bg-white p-6 shadow-sm">
            <h1 className="text-2xl font-bold text-[#3D1B1F]">
              {formMode === "edit" ? "Editar cuartel" : "Nuevo cuartel"}
            </h1>
            {loadingEdit ? (
              <div className="mt-3 rounded border border-[#C9A961]/30 bg-[#FFF9F0] p-2 text-xs text-[#7A4A50]">
                Cargando datos completos del cuartel...
              </div>
            ) : null}
            <div className="mt-4 grid gap-3 md:grid-cols-2">
              <select
                value={form.fincaId}
                onChange={(event) => setForm((prev) => ({ ...prev, fincaId: event.target.value }))}
                className="rounded border border-[#C9A961]/40 px-3 py-2 text-sm"
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
              <input value={form.codigo_cuartel} onChange={(e) => setForm((p) => ({ ...p, codigo_cuartel: e.target.value }))} placeholder="Código cuartel" className="rounded border border-[#C9A961]/40 px-3 py-2 text-sm" />
              <input type="number" step="0.01" value={form.superficie_ha} onChange={(e) => setForm((p) => ({ ...p, superficie_ha: e.target.value }))} placeholder="Superficie ha" className="rounded border border-[#C9A961]/40 px-3 py-2 text-sm" />
              <input value={form.cultivo} onChange={(e) => setForm((p) => ({ ...p, cultivo: e.target.value }))} placeholder="Cultivo" className="rounded border border-[#C9A961]/40 px-3 py-2 text-sm" />
              <input value={form.variedad} onChange={(e) => setForm((p) => ({ ...p, variedad: e.target.value }))} placeholder="Variedad" className="rounded border border-[#C9A961]/40 px-3 py-2 text-sm" />
              <input value={form.sistema_productivo} onChange={(e) => setForm((p) => ({ ...p, sistema_productivo: e.target.value }))} placeholder="Sistema productivo" className="rounded border border-[#C9A961]/40 px-3 py-2 text-sm" />
              <input value={form.sistema_conduccion} onChange={(e) => setForm((p) => ({ ...p, sistema_conduccion: e.target.value }))} placeholder="Sistema conducción" className="rounded border border-[#C9A961]/40 px-3 py-2 text-sm" />
            </div>
            <div className="mt-3 flex gap-2">
              <button
                type="button"
                onClick={() => void onSubmit()}
                disabled={saving || !activeBodegaId}
                className="cursor-pointer rounded border border-[#C9A961]/50 px-3 py-2 text-xs font-semibold text-[#722F37] transition hover:bg-[#FFF9F0] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {editingId ? "Guardar cambios" : "Guardar cuartel"}
              </button>
              <button
                type="button"
                onClick={() => {
                  setEditingId(null);
                  setForm(emptyForm);
                  setFormMode("none");
                }}
                className="cursor-pointer rounded border border-gray-300 px-3 py-2 text-xs font-semibold text-gray-700 transition hover:bg-gray-50 active:scale-[0.98]"
              >
                Cancelar
              </button>
            </div>
            {error ? <div className="mt-3 rounded border border-red-200 bg-red-50 p-2 text-xs text-red-700">{error}</div> : null}
            {success ? <div className="mt-3 rounded border border-emerald-200 bg-emerald-50 p-2 text-xs text-emerald-700">{success}</div> : null}
          </section>
        ) : null}
      </div>
    </div>
  );
}
