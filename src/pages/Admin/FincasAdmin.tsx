import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import {
  createFinca,
  deleteFinca,
  fetchFincaById,
  fetchFincas,
  patchFinca,
  type Finca,
} from "../../features/fincas/api";
import {
  upsertBodegaFincaVinculo,
  type BodegaFincaVinculo,
} from "../../features/users/api";
import { getApiErrorMessage } from "../../lib/api";
import { useAuthStore } from "../../store/authStore";

type FormState = {
  nombre_finca: string;
  ubicacion_texto: string;
  rut: string;
  renspa: string;
  catastro: string;
};

const emptyForm: FormState = {
  nombre_finca: "",
  ubicacion_texto: "",
  rut: "",
  renspa: "",
  catastro: "",
};

type VinculoFormState = {
  tipo_vinculo: "propia" | "proveedor_tercero";
  activo: boolean;
};

const emptyVinculoForm: VinculoFormState = {
  tipo_vinculo: "propia",
  activo: true,
};

function resolveFincaId(item: Finca) {
  const value = item.finca_id ?? item.id;
  return typeof value === "string" || typeof value === "number" ? String(value) : "";
}

function resolveFincaVinculo(item: Finca) {
  return item.vinculo ?? (Array.isArray(item.vinculos) ? item.vinculos[0] : undefined);
}

export default function FincasAdmin() {
  const [searchParams, setSearchParams] = useSearchParams();
  const activeBodegaId = useAuthStore((state) => state.activeBodegaId);
  const [items, setItems] = useState<Finca[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loadingEdit, setLoadingEdit] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formMode, setFormMode] = useState<"none" | "create" | "edit">("none");
  const [form, setForm] = useState<FormState>(emptyForm);
  const [vinculoForm, setVinculoForm] = useState<VinculoFormState>(emptyVinculoForm);
  const [vinculosByFincaId, setVinculosByFincaId] = useState<Record<string, BodegaFincaVinculo>>(
    {},
  );
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [confirmDeleteItem, setConfirmDeleteItem] = useState<Finca | null>(null);

  const load = useCallback(async () => {
    if (!activeBodegaId) {
      setItems([]);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const list = await fetchFincas(activeBodegaId);
      setItems(list);
      const mapped = Object.fromEntries(
        (list ?? [])
          .map((item) => {
            const fincaId = resolveFincaId(item);
            const vinculo = resolveFincaVinculo(item);
            if (!fincaId || !vinculo) return null;
            return [fincaId, vinculo] as const;
          })
          .filter(Boolean) as Array<readonly [string, BodegaFincaVinculo]>,
      );
      setVinculosByFincaId(mapped);
    } catch (requestError) {
      setError(getApiErrorMessage(requestError));
    } finally {
      setLoading(false);
    }
  }, [activeBodegaId]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    const editId = searchParams.get("edit");
    if (!editId) return;
    void onEditById(editId);
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.delete("edit");
      return next;
    });
  }, [searchParams, setSearchParams]);

  const disabled = useMemo(() => !activeBodegaId || saving, [activeBodegaId, saving]);

  const onSubmit = async () => {
    if (!activeBodegaId) return;
    if (!form.nombre_finca.trim()) {
      setError("Nombre de finca obligatorio.");
      return;
    }

    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      const payload = {
        nombre_finca: form.nombre_finca.trim(),
        ubicacion_texto: form.ubicacion_texto.trim() || null,
        rut: form.rut.trim() || null,
        renspa: form.renspa.trim() || null,
        catastro: form.catastro.trim() || null,
      };
      let targetFincaId = editingId ?? "";
      if (editingId) {
        await patchFinca(editingId, payload);
        setSuccess("Finca actualizada.");
      } else {
        const created = await createFinca({
          bodegaId: String(activeBodegaId),
          ...payload,
        });
        targetFincaId = String(created.finca_id ?? created.id ?? "");
        setSuccess("Finca creada.");
      }
      if (targetFincaId) {
        await upsertBodegaFincaVinculo({
          bodegaId: String(activeBodegaId),
          fincaId: targetFincaId,
          tipo_vinculo: vinculoForm.tipo_vinculo,
          activo: vinculoForm.activo,
        });
      }
      setForm(emptyForm);
      setVinculoForm(emptyVinculoForm);
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
      const item = await fetchFincaById(id);
      setEditingId(id);
      setFormMode("edit");
      setForm({
        nombre_finca: item.nombre_finca ?? item.nombre ?? item.name ?? "",
        ubicacion_texto: item.ubicacion_texto ?? item.ubicacion ?? "",
        rut: item.rut ?? "",
        renspa: item.renspa ?? "",
        catastro: item.catastro ?? "",
      });
      const vinculo = vinculosByFincaId[id];
      setVinculoForm({
        tipo_vinculo:
          vinculo?.tipo_vinculo === "proveedor_tercero" ? "proveedor_tercero" : "propia",
        activo: vinculo?.activo !== false,
      });
    } catch (requestError) {
      setError(getApiErrorMessage(requestError));
    } finally {
      setLoadingEdit(false);
    }
  };

  const onDelete = (item: Finca) => {
    const id = String(item.finca_id ?? item.id ?? "");
    if (!id) return;
    setConfirmDeleteItem(item);
  };

  const onDeleteConfirm = async () => {
    if (!confirmDeleteItem) return;
    const id = String(confirmDeleteItem.finca_id ?? confirmDeleteItem.id ?? "");
    setConfirmDeleteItem(null);
    try {
      await deleteFinca(id);
      setSuccess("Finca eliminada.");
      await load();
    } catch (requestError) {
      setError(getApiErrorMessage(requestError));
    }
  };

  return (
    <div className="min-h-screen bg-secondary px-6 py-10">
      <div className="mx-auto w-full max-w-6xl space-y-6">
        {formMode === "none" ? (
        <section className="rounded-2xl bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-lg font-semibold text-[#3D1B1F]">Listado</h2>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => {
                  setEditingId(null);
                  setForm(emptyForm);
                  setVinculoForm(emptyVinculoForm);
                  setFormMode("create");
                  setError(null);
                }}
                className="rounded border border-[#C9A961]/50 px-3 py-2 text-xs font-semibold text-[#722F37]"
              >
                Nueva finca
              </button>
              <button type="button" onClick={() => void load()} className="rounded border border-[#C9A961]/50 px-3 py-2 text-xs font-semibold text-[#722F37]">
                Actualizar listado
              </button>
            </div>
          </div>
          <div className="mt-3 space-y-2">
            {loading ? <div className="text-sm text-[#7A4A50]">Cargando...</div> : items.length === 0 ? <div className="text-sm text-[#7A4A50]">Sin fincas.</div> : items.map((item) => {
              const id = resolveFincaId(item);
              const vinculo = vinculosByFincaId[id];
              return (
                <article key={id} className="rounded border border-[#C9A961]/30 bg-[#FFF9F0] p-3">
                  <div className="text-sm font-semibold text-[#3D1B1F]">{item.nombre ?? item.nombre_finca ?? item.name ?? "Finca"}</div>
                  <div className="text-xs text-[#6B3A3F]">{item.ubicacion_texto ?? item.ubicacion ?? "Sin ubicación"}</div>
                  <div className="mt-1 text-xs text-[#6B3A3F]">
                    Vínculo:{" "}
                    {vinculo?.tipo_vinculo === "proveedor_tercero"
                      ? "Proveedor tercero"
                      : vinculo?.tipo_vinculo === "propia"
                        ? "Propia"
                        : "Sin definir"}
                  </div>
                  <div className="mt-2 flex gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        const id = String(item.finca_id ?? item.id ?? "");
                        void onEditById(id);
                      }}
                      className="cursor-pointer rounded border border-[#C9A961]/50 px-2 py-1 text-xs font-semibold text-[#722F37] transition hover:bg-white active:scale-[0.98]"
                    >
                      Editar
                    </button>
                    <button type="button" onClick={() => void onDelete(item)} className="rounded border border-red-300 px-2 py-1 text-xs font-semibold text-red-700">Eliminar</button>
                  </div>
                </article>
              );
            })}
          </div>
          {formMode === "none" && error ? <div className="mt-3 rounded border border-red-200 bg-red-50 p-2 text-xs text-red-700">{error}</div> : null}
          {formMode === "none" && success ? <div className="mt-3 rounded border border-emerald-200 bg-emerald-50 p-2 text-xs text-emerald-700">{success}</div> : null}
        </section>
        ) : null}

        {formMode !== "none" ? (
          <section className="rounded-2xl bg-white p-6 shadow-sm">
            <h1 className="text-2xl font-bold text-[#3D1B1F]">
              {formMode === "edit" ? "Editar finca" : "Nueva finca"}
            </h1>
            {loadingEdit ? (
              <div className="mt-3 rounded border border-[#C9A961]/30 bg-[#FFF9F0] p-2 text-xs text-[#7A4A50]">
                Cargando datos completos de la finca...
              </div>
            ) : null}
            <div className="mt-4 grid gap-3 md:grid-cols-2">
              <input value={form.nombre_finca} onChange={(e) => setForm((p) => ({ ...p, nombre_finca: e.target.value }))} placeholder="Nombre finca" className="rounded border border-[#C9A961]/40 px-3 py-2 text-sm" />
              <input value={form.ubicacion_texto} onChange={(e) => setForm((p) => ({ ...p, ubicacion_texto: e.target.value }))} placeholder="Ubicación" className="rounded border border-[#C9A961]/40 px-3 py-2 text-sm" />
              <input value={form.rut} onChange={(e) => setForm((p) => ({ ...p, rut: e.target.value }))} placeholder="RUT" className="rounded border border-[#C9A961]/40 px-3 py-2 text-sm" />
              <input value={form.renspa} onChange={(e) => setForm((p) => ({ ...p, renspa: e.target.value }))} placeholder="RENSPA" className="rounded border border-[#C9A961]/40 px-3 py-2 text-sm" />
              <input value={form.catastro} onChange={(e) => setForm((p) => ({ ...p, catastro: e.target.value }))} placeholder="Catastro" className="rounded border border-[#C9A961]/40 px-3 py-2 text-sm" />
              <select
                value={vinculoForm.tipo_vinculo}
                onChange={(e) =>
                  setVinculoForm((prev) => ({
                    ...prev,
                    tipo_vinculo: e.target.value as "propia" | "proveedor_tercero",
                  }))
                }
                className="rounded border border-[#C9A961]/40 px-3 py-2 text-sm"
              >
                <option value="propia">Vínculo: Propia</option>
                <option value="proveedor_tercero">Vínculo: Proveedor tercero</option>
              </select>
              <label className="flex items-center gap-2 rounded border border-[#C9A961]/40 px-3 py-2 text-sm text-[#3D1B1F]">
                <input
                  type="checkbox"
                  checked={vinculoForm.activo}
                  onChange={(e) =>
                    setVinculoForm((prev) => ({ ...prev, activo: e.target.checked }))
                  }
                />
                Vínculo activo
              </label>
            </div>
            <div className="mt-3 flex gap-2">
              <button type="button" onClick={() => void onSubmit()} disabled={disabled} className="cursor-pointer rounded border border-[#C9A961]/50 px-3 py-2 text-xs font-semibold text-[#722F37] transition hover:bg-[#FFF9F0] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60">{editingId ? "Guardar" : "Crear"}</button>
              <button
                type="button"
                onClick={() => {
                  setEditingId(null);
                  setForm(emptyForm);
                  setVinculoForm(emptyVinculoForm);
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
      {confirmDeleteItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl">
            <h3 className="text-base font-semibold text-[#3D1B1F]">¿Eliminar finca?</h3>
            <p className="mt-2 text-xs text-[#7A4A50]">
              {confirmDeleteItem.nombre ?? confirmDeleteItem.nombre_finca ?? "Esta finca"} — esta acción no se puede deshacer.
            </p>
            <div className="mt-4 flex justify-end gap-2">
              <button type="button" onClick={() => setConfirmDeleteItem(null)} className="rounded border border-gray-300 px-3 py-2 text-xs font-semibold text-gray-700">Cancelar</button>
              <button type="button" onClick={() => void onDeleteConfirm()} className="rounded border border-red-500 bg-red-500 px-3 py-2 text-xs font-semibold text-white transition hover:bg-red-600">Eliminar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
