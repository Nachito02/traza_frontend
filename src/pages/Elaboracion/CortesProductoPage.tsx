import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import {
  createElaboracionResource,
  deleteElaboracionResource,
  listElaboracionResource,
  patchElaboracionResource,
  type ElaboracionEntity,
} from "../../features/elaboracion/api";
import {
  AppButton,
  AppCard,
  AppInput,
  AppModal,
  AppSelect,
  AppTextarea,
  GuidedState,
  NoticeBanner,
  SectionIntro,
  useConfirmDialog,
} from "../../components/ui";
import { getApiErrorMessage } from "../../lib/api";
import { useAuthStore } from "../../store/authStore";
import GenericCrudSection, { type SelectOption } from "./components/GenericCrudSection";
import SectionSelector from "./components/SectionSelector";

type CorteComponenteForm = {
  vasijaId: string;
  loteCosechaId: string;
  volumen_l: string;
  porcentaje: string;
};

type CorteForm = {
  fecha: string;
  objetivo: string;
  campaniaId: string;
  responsableUserId: string;
  observaciones: string;
  componentes: CorteComponenteForm[];
};

function toOptions(items: ElaboracionEntity[], idKeys: string[], labelKeys: string[]): SelectOption[] {
  return items
    .map((item) => {
      const id = idKeys
        .map((key) => item[key])
        .find((value) => typeof value === "string" || typeof value === "number");
      const label = labelKeys
        .map((key) => item[key])
        .find((value) => typeof value === "string" || typeof value === "number");
      if (id === undefined || id === null) return null;
      return { value: String(id), label: String(label ?? id) };
    })
    .filter((option): option is SelectOption => option !== null);
}

function emptyCorteForm(): CorteForm {
  return {
    fecha: "",
    objetivo: "",
    campaniaId: "",
    responsableUserId: "",
    observaciones: "",
    componentes: [{ vasijaId: "", loteCosechaId: "", volumen_l: "", porcentaje: "" }],
  };
}

function resolveCorteId(item: ElaboracionEntity) {
  const value = item.id_corte ?? item.corte_id ?? item.id;
  return typeof value === "string" || typeof value === "number" ? String(value) : "";
}

type CortesProductoPageProps = {
  initialSection?: "cortes" | "productos";
  hideSectionSelector?: boolean;
  hidePrimaryAction?: boolean;
};

export default function CortesProductoPage({
  initialSection = "cortes",
  hideSectionSelector = false,
  hidePrimaryAction = false,
}: CortesProductoPageProps) {
  const { confirm, ConfirmDialog } = useConfirmDialog();
  const [searchParams, setSearchParams] = useSearchParams();
  const activeBodegaId = useAuthStore((state) => state.activeBodegaId);
  const [activeSection, setActiveSection] = useState<"cortes" | "productos">(initialSection);
  const [showCorteModal, setShowCorteModal] = useState(false);

  const [vasijaOptions, setVasijaOptions] = useState<SelectOption[]>([]);
  const [cortes, setCortes] = useState<ElaboracionEntity[]>([]);
  const [form, setForm] = useState<CorteForm>(emptyCorteForm());
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    if (hideSectionSelector) {
      setActiveSection(initialSection);
      return;
    }
    const section = searchParams.get("section");
    if (section === "cortes" || section === "productos") {
      setActiveSection(section);
      return;
    }
    setActiveSection(initialSection);
  }, [hideSectionSelector, initialSection, searchParams]);

  const loadData = async () => {
    if (!activeBodegaId) return;
    setLoading(true);
    setError(null);
    try {
      const [vasijas, cortesData] = await Promise.all([
        listElaboracionResource("vasijas", { bodegaId: String(activeBodegaId) }),
        listElaboracionResource("cortes", { bodegaId: String(activeBodegaId) }),
      ]);
      setVasijaOptions(toOptions(vasijas, ["id_vasija", "vasija_id", "id"], ["codigo", "id_vasija"]));
      setCortes(cortesData);
    } catch (requestError) {
      setError(getApiErrorMessage(requestError));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeBodegaId]);

  const submitCorte = async () => {
    if (!activeBodegaId) {
      setError("Seleccioná una bodega.");
      return;
    }
    if (!form.fecha) {
      setError("La fecha del corte es obligatoria.");
      return;
    }
    if (form.componentes.length === 0) {
      setError("Debes agregar al menos un componente.");
      return;
    }

    const componentesPayload = form.componentes.map((componente) => ({
      vasijaId: componente.vasijaId || undefined,
      loteCosechaId: componente.loteCosechaId || undefined,
      volumen_l: componente.volumen_l ? Number(componente.volumen_l) : undefined,
      porcentaje: componente.porcentaje ? Number(componente.porcentaje) : undefined,
    }));

    const invalid = componentesPayload.find(
      (componente) => !componente.vasijaId && !componente.loteCosechaId,
    );
    if (invalid) {
      setError("Cada componente debe tener al menos vasijaId o loteCosechaId.");
      return;
    }

    const payload: Record<string, unknown> = {
      bodegaId: String(activeBodegaId),
      fecha: form.fecha,
      objetivo: form.objetivo || undefined,
      campaniaId: form.campaniaId || undefined,
      responsableUserId: form.responsableUserId || undefined,
      observaciones: form.observaciones || undefined,
      componentes: componentesPayload,
    };

    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      if (editingId) {
        await patchElaboracionResource("cortes", editingId, payload);
        setSuccess("Corte actualizado.");
      } else {
        await createElaboracionResource("cortes", payload);
        setSuccess("Corte creado.");
      }
      setForm(emptyCorteForm());
      setEditingId(null);
      setShowCorteModal(false);
      await loadData();
    } catch (requestError) {
      setError(getApiErrorMessage(requestError));
    } finally {
      setSaving(false);
    }
  };

  const editCorte = (item: ElaboracionEntity) => {
    const id = resolveCorteId(item);
    if (!id) return;
    const componentesRaw = Array.isArray(item.componentes)
      ? item.componentes
      : Array.isArray(item.corte_componentes)
        ? item.corte_componentes
        : [];

    const componentes = componentesRaw.length
      ? componentesRaw.map((componente) => {
          const row = componente as Record<string, unknown>;
          return {
            vasijaId: String(row.vasijaId ?? row.id_vasija ?? ""),
            loteCosechaId: String(row.loteCosechaId ?? row.id_lote_cosecha ?? ""),
            volumen_l: row.volumen_l === undefined || row.volumen_l === null ? "" : String(row.volumen_l),
            porcentaje: row.porcentaje === undefined || row.porcentaje === null ? "" : String(row.porcentaje),
          };
        })
      : [{ vasijaId: "", loteCosechaId: "", volumen_l: "", porcentaje: "" }];

    setEditingId(id);
    setShowCorteModal(true);
    setForm({
      fecha: typeof item.fecha === "string" ? item.fecha.slice(0, 10) : "",
      objetivo: String(item.objetivo ?? ""),
      campaniaId: String(item.campania_id ?? item.campaniaId ?? ""),
      responsableUserId: String(item.responsable_user_id ?? item.responsableUserId ?? ""),
      observaciones: String(item.observaciones ?? ""),
      componentes,
    });
  };

  const deleteCorte = async (item: ElaboracionEntity) => {
    const id = resolveCorteId(item);
    if (!id) return;
    if (!(await confirm(`¿Eliminar corte ${id}?`))) return;

    try {
      await deleteElaboracionResource("cortes", id);
      setSuccess("Corte eliminado.");
      await loadData();
    } catch (requestError) {
      setError(getApiErrorMessage(requestError));
    }
  };

  return (
    <div className="space-y-5">
      {!hideSectionSelector ? (
        <AppCard
          as="section"
          tone="default"
          padding="lg"
          className="bg-[color:var(--surface-hero)] text-[color:var(--text-on-dark)]"
          header={(
            <SectionIntro
              eyebrow="Bodega"
              title="Cortes y Producto"
              description="Registro de cortes de elaboración y productos resultantes."
              descriptionClassName="text-[color:var(--text-on-dark-muted)]"
            />
          )}
        >
          <SectionSelector
            bare
            value={activeSection}
            onChange={(value) => {
              setActiveSection(value);
              setSearchParams((prev) => {
                const next = new URLSearchParams(prev);
                next.set("section", value);
                return next;
              });
            }}
            options={[
              { key: "cortes", label: "Cortes" },
              { key: "productos", label: "Productos" },
            ]}
          />
        </AppCard>
      ) : null}

      {activeSection === "cortes" ? (
        <AppCard
          as="section"
          tone="default"
          padding="md"
          header={(
            <SectionIntro
              title="Cortes"
              description="Registro de cortes de elaboración. Cada componente requiere vasija o lote de cosecha."
              actions={
                !hidePrimaryAction ? (
                  <AppButton
                    type="button"
                    variant="primary"
                    size="sm"
                    onClick={() => {
                      setEditingId(null);
                      setForm(emptyCorteForm());
                      setShowCorteModal(true);
                    }}
                  >
                    Nuevo corte
                  </AppButton>
                ) : undefined
              }
            />
          )}
        >
          {/* ── Lista de cortes ──────────────────────────────────── */}
          <div className="mt-3 max-h-72 space-y-2 overflow-auto">
            {loading ? (
              <NoticeBanner>Cargando...</NoticeBanner>
            ) : cortes.length === 0 ? (
              <GuidedState
                title="Sin cortes registrados"
                description="Cuando cargues el primer corte, aparecerá acá para editarlo, revisarlo o continuar el flujo operativo."
              />
            ) : (
              cortes.map((item, index) => {
                const id = resolveCorteId(item) || `i-${index}`;
                const shortId = id.slice(0, 8);
                const fecha = typeof item.fecha === "string" ? item.fecha.slice(0, 10) : null;
                const objetivo = typeof item.objetivo === "string" && item.objetivo ? item.objetivo : null;
                const componentesRaw = Array.isArray(item.componentes)
                  ? item.componentes
                  : Array.isArray(item.corte_componentes)
                    ? item.corte_componentes
                    : [];
                return (
                  <div
                    key={id}
                    className="rounded-[var(--radius-lg)] border border-[color:var(--border-shell)] bg-[color:var(--surface-soft)] px-4 py-3"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="text-xs font-semibold text-[color:var(--text-ink)]">
                          Corte <span className="font-normal text-[color:var(--text-ink-muted)]">#{shortId}</span>
                        </div>
                        <div className="mt-1.5 flex flex-wrap gap-x-5 gap-y-1">
                          {fecha ? (
                            <span className="text-xs text-[color:var(--text-ink-muted)]">
                              <span className="font-medium">Fecha:</span>{" "}
                              <span className="text-[color:var(--text-ink)]">{fecha}</span>
                            </span>
                          ) : null}
                          {objetivo ? (
                            <span className="text-xs text-[color:var(--text-ink-muted)]">
                              <span className="font-medium">Objetivo:</span>{" "}
                              <span className="text-[color:var(--text-ink)]">{objetivo}</span>
                            </span>
                          ) : null}
                          {componentesRaw.length > 0 ? (
                            <span className="text-xs text-[color:var(--text-ink-muted)]">
                              <span className="font-medium">Componentes:</span>{" "}
                              <span className="text-[color:var(--text-ink)]">{componentesRaw.length}</span>
                            </span>
                          ) : null}
                        </div>
                      </div>
                      <div className="flex shrink-0 items-center gap-2">
                        <AppButton
                          type="button"
                          variant="secondary"
                          size="sm"
                          onClick={() => editCorte(item)}
                        >
                          Editar
                        </AppButton>
                        <AppButton
                          type="button"
                          variant="danger"
                          size="sm"
                          onClick={() => void deleteCorte(item)}
                        >
                          Eliminar
                        </AppButton>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {error ? <NoticeBanner tone="danger" className="mt-3">{error}</NoticeBanner> : null}
          {success ? <NoticeBanner tone="success" className="mt-3">{success}</NoticeBanner> : null}
        </AppCard>
      ) : null}

      {/* ── Modal: formulario de corte ───────────────────────────── */}
      <AppModal
        opened={showCorteModal}
        onClose={() => { setShowCorteModal(false); setEditingId(null); setForm(emptyCorteForm()); }}
        title={(
          <div className="flex w-full items-center justify-between">
            <span>{editingId ? "Editar corte" : "Nuevo corte"}</span>
            <button
              type="button"
              aria-label="Cerrar"
              onClick={() => { setShowCorteModal(false); setEditingId(null); setForm(emptyCorteForm()); }}
              className="rounded-[var(--radius-md)] p-1.5 text-[color:var(--text-ink-muted)] transition-colors hover:bg-[color:var(--action-ghost-hover)] hover:text-[color:var(--text-ink)]"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>
        )}
        size="lg"
        showHeaderDivider
      >
        <div className="grid gap-3 md:grid-cols-2">
          <AppInput
            label="Fecha"
            type="date"
            value={form.fecha}
            onChange={(event) => setForm((prev) => ({ ...prev, fecha: event.target.value }))}
            uiSize="lg"
          />
          <AppInput
            label="Objetivo"
            type="text"
            placeholder="Opcional"
            value={form.objetivo}
            onChange={(event) => setForm((prev) => ({ ...prev, objetivo: event.target.value }))}
            uiSize="lg"
          />
          <AppInput
            label="Campaña ID"
            type="text"
            placeholder="Opcional"
            value={form.campaniaId}
            onChange={(event) => setForm((prev) => ({ ...prev, campaniaId: event.target.value }))}
            uiSize="lg"
          />
          <AppInput
            label="Responsable User ID"
            type="text"
            placeholder="Opcional"
            value={form.responsableUserId}
            onChange={(event) => setForm((prev) => ({ ...prev, responsableUserId: event.target.value }))}
            uiSize="lg"
          />
        </div>
        <AppTextarea
          label="Observaciones"
          value={form.observaciones}
          onChange={(event) => setForm((prev) => ({ ...prev, observaciones: event.target.value }))}
          placeholder="Opcional"
          className="mt-3"
          uiSize="lg"
        />

        {/* Componentes */}
        <div className="mt-4 space-y-2">
          <p className="text-xs font-semibold text-[color:var(--text-ink-muted)]">Componentes</p>
          {form.componentes.map((componente, index) => (
            <div
              key={`comp-${index}`}
              className="rounded-[var(--radius-lg)] border border-[color:var(--border-shell)] bg-[color:var(--surface-soft)] p-3"
            >
              <div className="grid gap-2 md:grid-cols-2">
                <AppSelect
                  label="Vasija"
                  value={componente.vasijaId}
                  onChange={(event) =>
                    setForm((prev) => {
                      const componentes = [...prev.componentes];
                      componentes[index] = { ...componentes[index], vasijaId: event.target.value };
                      return { ...prev, componentes };
                    })
                  }
                >
                  <option value="">Seleccionar vasija (opcional)</option>
                  {vasijaOptions.map((option) => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                </AppSelect>
                <AppInput
                  label="Lote cosecha ID"
                  type="text"
                  placeholder="Opcional"
                  value={componente.loteCosechaId}
                  onChange={(event) =>
                    setForm((prev) => {
                      const componentes = [...prev.componentes];
                      componentes[index] = { ...componentes[index], loteCosechaId: event.target.value };
                      return { ...prev, componentes };
                    })
                  }
                  uiSize="lg"
                />
                <AppInput
                  label="Volumen (l)"
                  type="number"
                  placeholder="Opcional"
                  value={componente.volumen_l}
                  onChange={(event) =>
                    setForm((prev) => {
                      const componentes = [...prev.componentes];
                      componentes[index] = { ...componentes[index], volumen_l: event.target.value };
                      return { ...prev, componentes };
                    })
                  }
                  uiSize="lg"
                />
                <AppInput
                  label="Porcentaje"
                  type="number"
                  placeholder="Opcional"
                  value={componente.porcentaje}
                  onChange={(event) =>
                    setForm((prev) => {
                      const componentes = [...prev.componentes];
                      componentes[index] = { ...componentes[index], porcentaje: event.target.value };
                      return { ...prev, componentes };
                    })
                  }
                  uiSize="lg"
                />
              </div>
              {form.componentes.length > 1 ? (
                <div className="mt-2">
                  <AppButton
                    type="button"
                    variant="danger"
                    size="sm"
                    onClick={() =>
                      setForm((prev) => ({
                        ...prev,
                        componentes: prev.componentes.filter((_, i) => i !== index),
                      }))
                    }
                  >
                    Quitar componente
                  </AppButton>
                </div>
              ) : null}
            </div>
          ))}
          <AppButton
            type="button"
            variant="secondary"
            size="sm"
            onClick={() =>
              setForm((prev) => ({
                ...prev,
                componentes: [
                  ...prev.componentes,
                  { vasijaId: "", loteCosechaId: "", volumen_l: "", porcentaje: "" },
                ],
              }))
            }
          >
            + Agregar componente
          </AppButton>
        </div>

        {error ? <NoticeBanner tone="danger" className="mt-3">{error}</NoticeBanner> : null}

        <div className="mt-4 flex flex-wrap gap-2">
          <AppButton
            type="button"
            variant="primary"
            loading={saving}
            disabled={saving}
            onClick={() => void submitCorte()}
          >
            {editingId ? "Guardar" : "Crear"}
          </AppButton>
          <AppButton
            type="button"
            variant="ghost"
            onClick={() => { setShowCorteModal(false); setEditingId(null); setForm(emptyCorteForm()); }}
          >
            Cancelar
          </AppButton>
        </div>
      </AppModal>

      {activeSection === "productos" ? (
        <GenericCrudSection
          title="Productos"
          description="Catálogo de productos finales para fraccionamiento."
          resource="productos"
          bodegaId={activeBodegaId}
          formInModal={!hidePrimaryAction}
          fields={[
            { name: "nombre_comercial", label: "Nombre comercial", type: "text", required: true },
            { name: "varietal", label: "Varietal", type: "text" },
            { name: "anio", label: "Año", type: "number" },
            { name: "tipo", label: "Tipo", type: "text" },
            { name: "activo", label: "Activo", type: "checkbox" },
          ]}
        />
      ) : null}
      {ConfirmDialog}
    </div>
  );
}
