import { useEffect, useState } from "react";
import {
  createCampania,
  deleteCampania,
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

export default function CampaniasAdmin() {
  const activeBodegaId = useAuthStore((state) => state.activeBodegaId);
  const [items, setItems] = useState<Campania[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
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
    if (!form.nombre.trim() || !form.fecha_inicio || !form.fecha_fin) {
      setError("Nombre, fecha inicio y fecha fin son obligatorios.");
      return;
    }
    if (new Date(form.fecha_fin) <= new Date(form.fecha_inicio)) {
      setError("Fecha fin debe ser posterior a fecha inicio.");
      return;
    }

    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      const payload = { ...form, bodegaId: String(activeBodegaId) };
      if (editingId) {
        await patchCampania(editingId, payload);
        setSuccess("Campaña actualizada.");
      } else {
        await createCampania(payload);
        setSuccess("Campaña creada.");
      }
      setForm(emptyForm);
      setEditingId(null);
      await load();
    } catch (requestError) {
      setError(getApiErrorMessage(requestError));
    } finally {
      setSaving(false);
    }
  };

  const onEdit = (item: Campania) => {
    const id = String(item.campania_id ?? item.id ?? "");
    if (!id) return;
    setEditingId(id);
    setForm({
      nombre: item.nombre ?? "",
      fecha_inicio: item.fecha_inicio?.slice(0, 10) ?? "",
      fecha_fin: item.fecha_fin?.slice(0, 10) ?? "",
      estado: item.estado === "cerrada" ? "cerrada" : "abierta",
    });
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

  return (
    <div className="min-h-screen bg-secondary px-6 py-10">
      <div className="mx-auto w-full max-w-6xl space-y-6">
        <section className="rounded-2xl bg-white p-6 shadow-sm">
          <h1 className="text-2xl font-bold text-[#3D1B1F]">Administrar Campañas</h1>
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
            <button type="button" onClick={() => void onSubmit()} disabled={saving || !activeBodegaId} className="rounded border border-[#C9A961]/50 px-3 py-2 text-xs font-semibold text-[#722F37] disabled:opacity-60">{editingId ? "Guardar cambios" : "Crear campaña"}</button>
            {editingId ? <button type="button" onClick={() => { setEditingId(null); setForm(emptyForm); }} className="rounded border border-gray-300 px-3 py-2 text-xs font-semibold text-gray-700">Cancelar</button> : null}
            <button type="button" onClick={() => void load()} className="rounded border border-[#C9A961]/50 px-3 py-2 text-xs font-semibold text-[#722F37]">Actualizar</button>
          </div>
          {error ? <div className="mt-3 rounded border border-red-200 bg-red-50 p-2 text-xs text-red-700">{error}</div> : null}
          {success ? <div className="mt-3 rounded border border-emerald-200 bg-emerald-50 p-2 text-xs text-emerald-700">{success}</div> : null}
        </section>

        <section className="rounded-2xl bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-[#3D1B1F]">Listado</h2>
          <div className="mt-3 space-y-2">
            {loading ? <div className="text-sm text-[#7A4A50]">Cargando...</div> : items.length === 0 ? <div className="text-sm text-[#7A4A50]">Sin campañas.</div> : items.map((item) => {
              const id = String(item.campania_id ?? item.id ?? "");
              return (
                <article key={id} className="rounded border border-[#C9A961]/30 bg-[#FFF9F0] p-3">
                  <div className="text-sm font-semibold text-[#3D1B1F]">{item.nombre}</div>
                  <div className="text-xs text-[#6B3A3F]">{item.fecha_inicio?.slice(0, 10)} a {item.fecha_fin?.slice(0, 10)} · {item.estado}</div>
                  <div className="mt-2 flex gap-2">
                    <button type="button" onClick={() => onEdit(item)} className="rounded border border-[#C9A961]/50 px-2 py-1 text-xs font-semibold text-[#722F37]">Editar</button>
                    <button type="button" onClick={() => void onDelete(item)} className="rounded border border-red-300 px-2 py-1 text-xs font-semibold text-red-700">Eliminar</button>
                  </div>
                </article>
              );
            })}
          </div>
        </section>
      </div>
    </div>
  );
}
