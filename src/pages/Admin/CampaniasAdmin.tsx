import { useEffect, useState } from "react";
import {
  createCampania,
  deleteCampania,
  fetchCampaniaById,
  fetchCampanias,
  patchCampania,
  type Campania,
} from "../../features/campanias/api";
import { getApiErrorMessage } from "../../lib/api";
import { useAuthStore } from "../../store/authStore";

type FormState = {
  nombre: string;
  fecha_inicio: string;
  fecha_fin: string;
  estado: "abierta" | "cerrada";
};

const emptyForm: FormState = {
  nombre: "",
  fecha_inicio: "",
  fecha_fin: "",
  estado: "abierta",
};

function toInputDate(value?: string) {
  if (!value) return "";
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(value)) {
    const [dd, mm, yyyy] = value.split("/");
    return `${yyyy}-${mm}-${dd}`;
  }
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "";
  return parsed.toISOString().slice(0, 10);
}

export default function CampaniasAdmin() {
  const activeBodegaId = useAuthStore((state) => state.activeBodegaId);
  const [items, setItems] = useState<Campania[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loadingEdit, setLoadingEdit] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formMode, setFormMode] = useState<"none" | "create" | "edit">("none");
  const [form, setForm] = useState<FormState>(emptyForm);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [detailById, setDetailById] = useState<Record<string, Campania>>({});
  const [loadingDetailId, setLoadingDetailId] = useState<string | null>(null);
  const [detailErrorById, setDetailErrorById] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const load = async () => {
    if (!activeBodegaId) {
      setItems([]);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      setItems(await fetchCampanias(activeBodegaId));
    } catch (requestError) {
      setError(getApiErrorMessage(requestError));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeBodegaId]);

  const onSubmit = async () => {
    if (!activeBodegaId) return;

    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      if (editingId) {
        const patchPayload = {
          nombre: form.nombre.trim() || undefined,
          fecha_inicio: form.fecha_inicio || undefined,
          fecha_fin: form.fecha_fin || undefined,
          estado: form.estado,
        };

        if (!patchPayload.nombre && !patchPayload.fecha_inicio && !patchPayload.fecha_fin && !patchPayload.estado) {
          setError("Debes enviar al menos un campo para actualizar.");
          return;
        }

        if (patchPayload.fecha_inicio && patchPayload.fecha_fin) {
          if (new Date(patchPayload.fecha_fin) <= new Date(patchPayload.fecha_inicio)) {
            setError("Fecha fin debe ser posterior a fecha inicio.");
            return;
          }
        }

        await patchCampania(editingId, patchPayload);
        setSuccess("Campaña actualizada.");
      } else {
        if (!form.nombre.trim() || !form.fecha_inicio || !form.fecha_fin) {
          setError("Nombre, fecha inicio y fecha fin son obligatorios.");
          return;
        }
        if (new Date(form.fecha_fin) <= new Date(form.fecha_inicio)) {
          setError("Fecha fin debe ser posterior a fecha inicio.");
          return;
        }

        await createCampania({
          bodegaId: String(activeBodegaId),
          nombre: form.nombre.trim(),
          fecha_inicio: form.fecha_inicio,
          fecha_fin: form.fecha_fin,
          estado: form.estado,
        });
        setSuccess("Campaña creada.");
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

  const onEditById = async (id: string) => {
    if (!id) return;
    setLoadingEdit(true);
    setError(null);
    try {
      const detail = await fetchCampaniaById(id);
      setEditingId(id);
      setFormMode("edit");
      setForm({
        nombre: detail.nombre ?? "",
        fecha_inicio: toInputDate(detail.fecha_inicio),
        fecha_fin: toInputDate(detail.fecha_fin),
        estado: detail.estado === "cerrada" ? "cerrada" : "abierta",
      });
    } catch (requestError) {
      setError(getApiErrorMessage(requestError));
    } finally {
      setLoadingEdit(false);
    }
  };

  const onDelete = async (item: Campania) => {
    const id = String(item.campania_id ?? item.id ?? "");
    if (!id) return;
    if (!window.confirm(`¿Eliminar campaña ${id}?`)) return;
    try {
      await deleteCampania(id);
      setSuccess("Campaña eliminada.");
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
      const detail = await fetchCampaniaById(id);
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
              <h2 className="text-lg font-semibold text-[#3D1B1F]">Campañas</h2>
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
                  Nueva campaña
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
                <div className="text-sm text-[#7A4A50]">Sin campañas.</div>
              ) : (
                items.map((item) => {
                  const id = String(item.campania_id ?? item.id ?? "");
                  const isExpanded = expandedId === id;
                  const detail = detailById[id];
                  const detailError = detailErrorById[id];
                  const isLoadingDetail = loadingDetailId === id;
                  return (
                    <article key={id} className="rounded border border-[#C9A961]/30 bg-[#FFF9F0] p-3">
                      <div className="text-sm font-semibold text-[#3D1B1F]">{item.nombre}</div>
                      <div className="text-xs text-[#6B3A3F]">
                        {toInputDate(item.fecha_inicio)} a {toInputDate(item.fecha_fin)} · {item.estado}
                      </div>
                      <div className="mt-2 flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => void onEditById(id)}
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
                        <div className="mt-2 rounded border border-[#C9A961]/30 bg-white px-3 py-2 text-xs text-[#6B3A3F]">
                          {isLoadingDetail ? (
                            <div>Cargando detalle...</div>
                          ) : detailError ? (
                            <div className="text-red-700">{detailError}</div>
                          ) : (
                            <div className="grid gap-1">
                              <div>
                                <span className="font-semibold text-[#3D1B1F]">Nombre:</span> {detail?.nombre ?? "-"}
                              </div>
                              <div>
                                <span className="font-semibold text-[#3D1B1F]">Fecha inicio:</span> {toInputDate(detail?.fecha_inicio)}
                              </div>
                              <div>
                                <span className="font-semibold text-[#3D1B1F]">Fecha fin:</span> {toInputDate(detail?.fecha_fin)}
                              </div>
                              <div>
                                <span className="font-semibold text-[#3D1B1F]">Estado:</span> {detail?.estado ?? "-"}
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

            {error ? <div className="mt-3 rounded border border-red-200 bg-red-50 p-2 text-xs text-red-700">{error}</div> : null}
            {success ? <div className="mt-3 rounded border border-emerald-200 bg-emerald-50 p-2 text-xs text-emerald-700">{success}</div> : null}
          </section>
        ) : null}

        {formMode !== "none" ? (
          <section className="rounded-2xl bg-white p-6 shadow-sm">
            <h1 className="text-2xl font-bold text-[#3D1B1F]">
              {formMode === "edit" ? "Editar campaña" : "Nueva campaña"}
            </h1>
            {loadingEdit ? (
              <div className="mt-3 rounded border border-[#C9A961]/30 bg-[#FFF9F0] p-2 text-xs text-[#7A4A50]">
                Cargando datos completos de la campaña...
              </div>
            ) : null}
            <div className="mt-4 grid gap-3 md:grid-cols-2">
              <input value={form.nombre} onChange={(e) => setForm((p) => ({ ...p, nombre: e.target.value }))} placeholder="Nombre campaña" className="rounded border border-[#C9A961]/40 px-3 py-2 text-sm" />
              <select value={form.estado} onChange={(e) => setForm((p) => ({ ...p, estado: e.target.value as "abierta" | "cerrada" }))} className="rounded border border-[#C9A961]/40 px-3 py-2 text-sm">
                <option value="abierta">abierta</option>
                <option value="cerrada">cerrada</option>
              </select>
              <input type="date" value={form.fecha_inicio} onChange={(e) => setForm((p) => ({ ...p, fecha_inicio: e.target.value }))} className="rounded border border-[#C9A961]/40 px-3 py-2 text-sm" />
              <input type="date" value={form.fecha_fin} onChange={(e) => setForm((p) => ({ ...p, fecha_fin: e.target.value }))} className="rounded border border-[#C9A961]/40 px-3 py-2 text-sm" />
            </div>
            <div className="mt-3 flex gap-2">
              <button type="button" onClick={() => void onSubmit()} disabled={saving || !activeBodegaId} className="cursor-pointer rounded border border-[#C9A961]/50 px-3 py-2 text-xs font-semibold text-[#722F37] transition hover:bg-[#FFF9F0] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60">{editingId ? "Guardar cambios" : "Guardar campaña"}</button>
              <button type="button" onClick={() => { setEditingId(null); setForm(emptyForm); setFormMode("none"); }} className="cursor-pointer rounded border border-gray-300 px-3 py-2 text-xs font-semibold text-gray-700 transition hover:bg-gray-50 active:scale-[0.98]">Cancelar</button>
            </div>
            {error ? <div className="mt-3 rounded border border-red-200 bg-red-50 p-2 text-xs text-red-700">{error}</div> : null}
            {success ? <div className="mt-3 rounded border border-emerald-200 bg-emerald-50 p-2 text-xs text-emerald-700">{success}</div> : null}
          </section>
        ) : null}
      </div>
    </div>
  );
}
