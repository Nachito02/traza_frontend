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
import {
  AppButton,
  AppCard,
  AppInput,
  AppModal,
  AppSelect,
  NoticeBanner,
  SectionIntro,
} from "../../components/ui";
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
    }, { replace: true });
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
        <AppCard
          as="section"
          tone="default"
          padding="lg"
          header={(
            <SectionIntro
              title="Listado"
              description="Administrá las fincas vinculadas a la bodega activa."
              actions={(
                <>
              <AppButton
                type="button"
                variant="primary"
                size="sm"
                onClick={() => {
                  setEditingId(null);
                  setForm(emptyForm);
                  setVinculoForm(emptyVinculoForm);
                  setFormMode("create");
                  setError(null);
                }}
              >
                Nueva finca
              </AppButton>
              <AppButton
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => void load()}
              >
                Actualizar listado
              </AppButton>
                </>
              )}
            />
          )}
        >
          <div className="mt-3 space-y-2">
            {loading ? <NoticeBanner>Cargando...</NoticeBanner> : items.length === 0 ? <NoticeBanner>Sin fincas.</NoticeBanner> : items.map((item) => {
              const id = resolveFincaId(item);
              const vinculo = vinculosByFincaId[id];
              return (
                <AppCard key={id} as="article" tone="soft" padding="sm">
                  <div className="text-sm font-semibold text-[color:var(--text-ink)]">{item.nombre ?? item.nombre_finca ?? item.name ?? "Finca"}</div>
                  <div className="mt-1 text-xs text-[color:var(--text-ink-muted)]">
                    Vínculo:{" "}
                    {vinculo?.tipo_vinculo === "proveedor_tercero"
                      ? "Proveedor tercero"
                      : vinculo?.tipo_vinculo === "propia"
                        ? "Propia"
                        : "Sin definir"}
                  </div>
                  <div className="mt-2 flex gap-2">
                    <AppButton
                      type="button"
                      variant="secondary"
                      size="sm"
                      onClick={() => {
                        const id = String(item.finca_id ?? item.id ?? "");
                        void onEditById(id);
                      }}
                    >
                      Editar
                    </AppButton>
                    <AppButton type="button" variant="danger" size="sm" onClick={() => void onDelete(item)}>Eliminar</AppButton>
                  </div>
                </AppCard>
              );
            })}
          </div>
          {formMode === "none" && error ? <NoticeBanner tone="danger" className="mt-3">{error}</NoticeBanner> : null}
          {formMode === "none" && success ? <NoticeBanner tone="success" className="mt-3">{success}</NoticeBanner> : null}
        </AppCard>
        ) : null}

        {formMode !== "none" ? (
          <AppCard
            as="section"
            tone="default"
            padding="lg"
            header={(
              <SectionIntro
                title={formMode === "edit" ? "Editar finca" : "Nueva finca"}
                description="Completá los datos base de la finca y definí el vínculo con la bodega activa."
                actions={(
                  <AppButton
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={() => {
                      setEditingId(null);
                      setForm(emptyForm);
                      setVinculoForm(emptyVinculoForm);
                      setFormMode("none");
                    }}
                  >
                    Volver al listado
                  </AppButton>
                )}
              />
            )}
          >
            {loadingEdit ? (
              <NoticeBanner className="mt-4">
                Cargando datos completos de la finca...
              </NoticeBanner>
            ) : null}
            <AppCard as="div" tone="soft" padding="md" className="mt-4">
              <div className="grid gap-4 md:grid-cols-2">
                <AppInput
                  label="Nombre de la finca"
                    value={form.nombre_finca}
                    onChange={(e) => setForm((p) => ({ ...p, nombre_finca: e.target.value }))}
                    placeholder="Finca Los Andes"
                    uiSize="lg"
                  />
                <AppInput
                  label="Ubicación"
                    value={form.ubicacion_texto}
                    onChange={(e) => setForm((p) => ({ ...p, ubicacion_texto: e.target.value }))}
                    placeholder="Luján de Cuyo, Mendoza"
                    uiSize="lg"
                  />
                <AppInput
                  label="RUT"
                    value={form.rut}
                    onChange={(e) => setForm((p) => ({ ...p, rut: e.target.value }))}
                    placeholder="RUT-123"
                    uiSize="lg"
                  />
                <AppInput
                  label="RENSPA"
                    value={form.renspa}
                    onChange={(e) => setForm((p) => ({ ...p, renspa: e.target.value }))}
                    placeholder="RENSPA-456"
                    uiSize="lg"
                  />
                <AppInput
                  label="Catastro"
                    value={form.catastro}
                    onChange={(e) => setForm((p) => ({ ...p, catastro: e.target.value }))}
                    placeholder="CAT-789"
                    uiSize="lg"
                  />
                <AppSelect
                  label="Tipo de vínculo"
                    value={vinculoForm.tipo_vinculo}
                    onChange={(e) =>
                      setVinculoForm((prev) => ({
                        ...prev,
                        tipo_vinculo: e.target.value as "propia" | "proveedor_tercero",
                      }))
                    }
                  >
                    <option value="propia">Propia</option>
                    <option value="proveedor_tercero">Proveedor tercero</option>
                </AppSelect>
                <label className="flex items-center gap-2 rounded-xl border border-[color:var(--border-default)] bg-white px-3 py-2 text-sm text-[color:var(--text-ink)] md:col-span-2">
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
            </AppCard>
            <div className="mt-4 flex flex-wrap gap-2">
              <AppButton
                type="button"
                variant="primary"
                loading={saving}
                onClick={() => void onSubmit()}
                disabled={disabled}
              >
                {editingId ? "Guardar" : "Crear"}
              </AppButton>
              <AppButton
                type="button"
                variant="secondary"
                onClick={() => {
                  setEditingId(null);
                  setForm(emptyForm);
                  setVinculoForm(emptyVinculoForm);
                  setFormMode("none");
                }}
              >
                Cancelar
              </AppButton>
            </div>
            {error ? <NoticeBanner tone="danger" className="mt-4">{error}</NoticeBanner> : null}
            {success ? <NoticeBanner tone="success" className="mt-4">{success}</NoticeBanner> : null}
          </AppCard>
        ) : null}
      </div>
      {confirmDeleteItem ? (
        <AppModal
          opened
          onClose={() => setConfirmDeleteItem(null)}
          title="¿Eliminar finca?"
          size="sm"
          footer={(
            <div className="flex justify-end gap-2">
              <AppButton type="button" variant="secondary" size="sm" onClick={() => setConfirmDeleteItem(null)}>
                Cancelar
              </AppButton>
              <AppButton type="button" variant="danger" size="sm" onClick={() => void onDeleteConfirm()}>
                Eliminar
              </AppButton>
            </div>
          )}
        >
            <p className="text-xs text-[color:var(--text-ink-muted)]">
              {confirmDeleteItem.nombre ?? confirmDeleteItem.nombre_finca ?? "Esta finca"} — esta acción no se puede deshacer.
            </p>
        </AppModal>
      ) : null}
    </div>
  );
}
