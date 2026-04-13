import { useEffect, useState } from "react";
import {
  createCampania,
  deleteCampania,
  fetchCampaniaById,
  fetchCampanias,
  patchCampania,
  type Campania,
} from "../../features/campanias/api";
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
  const [confirmDeleteItem, setConfirmDeleteItem] = useState<Campania | null>(null);

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
    setConfirmDeleteItem(item);
  };

  const onDeleteConfirm = async () => {
    if (!confirmDeleteItem) return;
    const id = String(confirmDeleteItem.campania_id ?? confirmDeleteItem.id ?? "");
    setConfirmDeleteItem(null);
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
          <AppCard
            as="section"
            tone="default"
            padding="lg"
            header={(
              <SectionIntro
                title="Campañas"
                description="Administrá campañas, revisá su vigencia y actualizá sus fechas sin salir del módulo."
                actions={(
                  <>
                <AppButton
                  type="button"
                  variant="primary"
                  size="sm"
                  onClick={() => {
                    setEditingId(null);
                    setForm(emptyForm);
                    setFormMode("create");
                    setError(null);
                  }}
                >
                  Nueva campaña
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
              {loading ? (
                <NoticeBanner>Cargando...</NoticeBanner>
              ) : items.length === 0 ? (
                <NoticeBanner>Sin campañas.</NoticeBanner>
              ) : (
                items.map((item) => {
                  const id = String(item.campania_id ?? item.id ?? "");
                  const isExpanded = expandedId === id;
                  const detail = detailById[id];
                  const detailError = detailErrorById[id];
                  const isLoadingDetail = loadingDetailId === id;
                  return (
                    <AppCard key={id} as="article" tone="soft" padding="sm">
                      <div className="text-sm font-semibold text-[color:var(--text-ink)]">{item.nombre}</div>
                      <div className="text-xs text-[color:var(--text-ink-muted)]">
                        {toInputDate(item.fecha_inicio)} a {toInputDate(item.fecha_fin)} · {item.estado}
                      </div>
                      <div className="mt-2 flex flex-wrap gap-2">
                        <AppButton
                          type="button"
                          variant="secondary"
                          size="sm"
                          onClick={() => void onEditById(id)}
                        >
                          Editar
                        </AppButton>
                        <AppButton
                          type="button"
                          variant="secondary"
                          size="sm"
                          onClick={() => void onToggleDetail(id)}
                        >
                          {isExpanded ? "Ocultar detalle" : "Ver detalle"}
                        </AppButton>
                        <AppButton
                          type="button"
                          variant="danger"
                          size="sm"
                          onClick={() => void onDelete(item)}
                        >
                          Eliminar
                        </AppButton>
                      </div>

                      {isExpanded ? (
                        <div className="mt-2 rounded border border-[color:var(--border-default)] bg-white px-3 py-2 text-xs text-[color:var(--text-ink-muted)]">
                          {isLoadingDetail ? (
                            <div>Cargando detalle...</div>
                          ) : detailError ? (
                            <div className="text-[color:var(--feedback-danger-text)]">{detailError}</div>
                          ) : (
                            <div className="grid gap-1">
                              <div>
                                <span className="font-semibold text-[color:var(--text-ink)]">Nombre:</span> {detail?.nombre ?? "-"}
                              </div>
                              <div>
                                <span className="font-semibold text-[color:var(--text-ink)]">Fecha inicio:</span> {toInputDate(detail?.fecha_inicio)}
                              </div>
                              <div>
                                <span className="font-semibold text-[color:var(--text-ink)]">Fecha fin:</span> {toInputDate(detail?.fecha_fin)}
                              </div>
                              <div>
                                <span className="font-semibold text-[color:var(--text-ink)]">Estado:</span> {detail?.estado ?? "-"}
                              </div>
                            </div>
                          )}
                        </div>
                      ) : null}
                    </AppCard>
                  );
                })
              )}
            </div>

            {error ? <NoticeBanner tone="danger" className="mt-3">{error}</NoticeBanner> : null}
            {success ? <NoticeBanner tone="success" className="mt-3">{success}</NoticeBanner> : null}
          </AppCard>
        ) : null}

        {formMode !== "none" ? (
          <AppCard
            as="section"
            tone="default"
            padding="lg"
            header={(
              <SectionIntro
                title={formMode === "edit" ? "Editar campaña" : "Nueva campaña"}
                description="Definí nombre, fechas y estado de la campaña para dejar el contexto productivo ordenado."
                actions={(
                  <AppButton
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={() => { setEditingId(null); setForm(emptyForm); setFormMode("none"); }}
                  >
                    Volver al listado
                  </AppButton>
                )}
              />
            )}
          >
            {loadingEdit ? (
              <NoticeBanner className="mt-3">
                Cargando datos completos de la campaña...
              </NoticeBanner>
            ) : null}
            <div className="mt-4 grid gap-3 md:grid-cols-2">
              <AppInput
                label="Nombre"
                value={form.nombre}
                onChange={(e) => setForm((p) => ({ ...p, nombre: e.target.value }))}
                placeholder="Nombre campaña"
                uiSize="lg"
              />
              <AppSelect
                label="Estado"
                value={form.estado}
                onChange={(e) => setForm((p) => ({ ...p, estado: e.target.value as "abierta" | "cerrada" }))}
              >
                <option value="abierta">abierta</option>
                <option value="cerrada">cerrada</option>
              </AppSelect>
              <AppInput
                label="Fecha inicio"
                type="date"
                value={form.fecha_inicio}
                onChange={(e) => setForm((p) => ({ ...p, fecha_inicio: e.target.value }))}
                uiSize="lg"
              />
              <AppInput
                label="Fecha fin"
                type="date"
                value={form.fecha_fin}
                onChange={(e) => setForm((p) => ({ ...p, fecha_fin: e.target.value }))}
                uiSize="lg"
              />
            </div>
            <div className="mt-3 flex gap-2">
              <AppButton type="button" variant="primary" onClick={() => void onSubmit()} disabled={saving || !activeBodegaId} loading={saving}>
                {editingId ? "Guardar" : "Crear"}
              </AppButton>
              <AppButton type="button" variant="secondary" onClick={() => { setEditingId(null); setForm(emptyForm); setFormMode("none"); }}>
                Cancelar
              </AppButton>
            </div>
            {error ? <NoticeBanner tone="danger" className="mt-3">{error}</NoticeBanner> : null}
            {success ? <NoticeBanner tone="success" className="mt-3">{success}</NoticeBanner> : null}
          </AppCard>
        ) : null}
      </div>
      {confirmDeleteItem ? (
        <AppModal
          opened
          onClose={() => setConfirmDeleteItem(null)}
          title="¿Eliminar campaña?"
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
            {confirmDeleteItem.nombre ?? "Esta campaña"} — esta acción no se puede deshacer.
          </p>
        </AppModal>
      ) : null}
    </div>
  );
}
