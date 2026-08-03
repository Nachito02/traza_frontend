import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import {
  deleteElaboracionResource,
  listElaboracionResource,
  patchElaboracionResource,
  type ElaboracionEntity,
} from "../../features/elaboracion/api";
import { crearCorteConVasijas, type CorteBlendResult } from "../../features/lotes/api";
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
import VasijaComposicionPanel from "./components/VasijaComposicionPanel";

type FuenteForm = {
  vasijaId: string;
  volumenL: string;
};

type CorteMetaForm = {
  fecha: string;
  objetivo: string;
  campaniaId: string;
  responsableUserId: string;
  observaciones: string;
};

function emptyMeta(): CorteMetaForm {
  return { fecha: "", objetivo: "", campaniaId: "", responsableUserId: "", observaciones: "" };
}

function emptyFuente(): FuenteForm {
  return { vasijaId: "", volumenL: "" };
}

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
  const [meta, setMeta] = useState<CorteMetaForm>(emptyMeta());
  const [fuentes, setFuentes] = useState<FuenteForm[]>([emptyFuente()]);
  const [destinoVasijaId, setDestinoVasijaId] = useState("");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [ultimoBlend, setUltimoBlend] = useState<CorteBlendResult | null>(null);

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

  const closeModal = () => {
    setShowCorteModal(false);
    setEditingId(null);
    setMeta(emptyMeta());
    setFuentes([emptyFuente()]);
    setDestinoVasijaId("");
  };

  const submitCorte = async () => {
    if (!activeBodegaId) {
      setError("Seleccioná una bodega.");
      return;
    }
    if (!meta.fecha) {
      setError("La fecha del corte es obligatoria.");
      return;
    }

    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      if (editingId) {
        // Editar solo actualiza los datos del corte, no vuelve a mover litros de las vasijas.
        await patchElaboracionResource("cortes", editingId, {
          fecha: meta.fecha,
          objetivo: meta.objetivo || undefined,
          campaniaId: meta.campaniaId || undefined,
          responsableUserId: meta.responsableUserId || undefined,
          observaciones: meta.observaciones || undefined,
        });
        setSuccess("Corte actualizado.");
        closeModal();
      } else {
        const fuentesValidas = fuentes
          .filter((f) => f.vasijaId && Number(f.volumenL) > 0)
          .map((f) => ({ vasijaId: f.vasijaId, volumenL: Number(f.volumenL) }));
        if (fuentesValidas.length === 0) {
          setError("Elegí al menos una vasija de origen con un volumen mayor a 0.");
          setSaving(false);
          return;
        }
        const blend = await crearCorteConVasijas({
          bodegaId: String(activeBodegaId),
          fecha: meta.fecha,
          objetivo: meta.objetivo || undefined,
          campaniaId: meta.campaniaId || undefined,
          responsableUserId: meta.responsableUserId || undefined,
          observaciones: meta.observaciones || undefined,
          fuentes: fuentesValidas,
          destinoVasijaId: destinoVasijaId || undefined,
        });
        setUltimoBlend(blend);
        setSuccess(`Corte creado. Lote resultado: ${blend.lote_creado[0]?.codigo ?? "—"}`);
        closeModal();
      }
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
    setEditingId(id);
    setShowCorteModal(true);
    setMeta({
      fecha: typeof item.fecha === "string" ? item.fecha.slice(0, 10) : "",
      objetivo: String(item.objetivo ?? ""),
      campaniaId: String(item.campania_id ?? item.campaniaId ?? ""),
      responsableUserId: String(item.responsable_user_id ?? item.responsableUserId ?? ""),
      observaciones: String(item.observaciones ?? ""),
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

  const setFuenteField = (index: number, patch: Partial<FuenteForm>) => {
    setFuentes((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], ...patch };
      return next;
    });
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
              description="Elegí de qué vasijas sacar y cuánto volumen: el sistema calcula la composición del blend."
              actions={
                !hidePrimaryAction ? (
                  <AppButton
                    type="button"
                    variant="primary"
                    size="sm"
                    onClick={() => {
                      closeModal();
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
          {ultimoBlend?.lote_creado[0] ? (
            <NoticeBanner tone="info" className="mt-3">
              Composición del lote {ultimoBlend.lote_creado[0].codigo}:{" "}
              {ultimoBlend.lote_creado[0].composicion_hijo
                .map((c) => `${c.lote_padre.codigo} (${Math.round(Number(c.porcentaje ?? 0))}%)`)
                .join(", ")}
            </NoticeBanner>
          ) : null}
        </AppCard>
      ) : null}

      {/* ── Modal: formulario de corte ───────────────────────────── */}
      <AppModal
        opened={showCorteModal}
        onClose={closeModal}
        title={(
          <div className="flex w-full items-center justify-between">
            <span>{editingId ? "Editar corte" : "Nuevo corte"}</span>
            <button
              type="button"
              aria-label="Cerrar"
              onClick={closeModal}
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
            value={meta.fecha}
            onChange={(event) => setMeta((prev) => ({ ...prev, fecha: event.target.value }))}
            uiSize="lg"
          />
          <AppInput
            label="Objetivo"
            type="text"
            placeholder="Opcional"
            value={meta.objetivo}
            onChange={(event) => setMeta((prev) => ({ ...prev, objetivo: event.target.value }))}
            uiSize="lg"
          />
          <AppInput
            label="Campaña ID"
            type="text"
            placeholder="Opcional"
            value={meta.campaniaId}
            onChange={(event) => setMeta((prev) => ({ ...prev, campaniaId: event.target.value }))}
            uiSize="lg"
          />
          <AppInput
            label="Responsable User ID"
            type="text"
            placeholder="Opcional"
            value={meta.responsableUserId}
            onChange={(event) => setMeta((prev) => ({ ...prev, responsableUserId: event.target.value }))}
            uiSize="lg"
          />
        </div>
        <AppTextarea
          label="Observaciones"
          value={meta.observaciones}
          onChange={(event) => setMeta((prev) => ({ ...prev, observaciones: event.target.value }))}
          placeholder="Opcional"
          className="mt-3"
          uiSize="lg"
        />

        {editingId ? (
          <NoticeBanner tone="info" className="mt-4">
            Editar acá solo actualiza estos datos del corte — no vuelve a mover litros entre vasijas.
          </NoticeBanner>
        ) : (
          <>
            {/* Fuentes (de dónde sale el vino y cuánto) */}
            <div className="mt-4 space-y-2">
              <p className="text-xs font-semibold text-[color:var(--text-ink-muted)]">
                Vasijas de origen — elegí de dónde sacar y cuánto
              </p>
              {fuentes.map((fuente, index) => (
                <div
                  key={`fuente-${index}`}
                  className="space-y-2 rounded-[var(--radius-lg)] border border-[color:var(--border-shell)] bg-[color:var(--surface-soft)] p-3"
                >
                  <div className="grid gap-2 md:grid-cols-2">
                    <AppSelect
                      label="Vasija origen"
                      value={fuente.vasijaId}
                      onChange={(event) => setFuenteField(index, { vasijaId: event.target.value })}
                    >
                      <option value="">Seleccionar…</option>
                      {vasijaOptions.map((option) => (
                        <option key={option.value} value={option.value}>{option.label}</option>
                      ))}
                    </AppSelect>
                    <AppInput
                      label="Volumen a sacar (l)"
                      type="number"
                      min="0"
                      placeholder="ej. 300"
                      value={fuente.volumenL}
                      onChange={(event) => setFuenteField(index, { volumenL: event.target.value })}
                      uiSize="lg"
                    />
                  </div>
                  {fuente.vasijaId ? <VasijaComposicionPanel vasijaId={fuente.vasijaId} /> : null}
                  {fuentes.length > 1 ? (
                    <AppButton
                      type="button"
                      variant="danger"
                      size="sm"
                      onClick={() => setFuentes((prev) => prev.filter((_, i) => i !== index))}
                    >
                      Quitar vasija
                    </AppButton>
                  ) : null}
                </div>
              ))}
              <AppButton
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => setFuentes((prev) => [...prev, emptyFuente()])}
              >
                + Agregar vasija de origen
              </AppButton>
            </div>

            <div className="mt-4">
              <AppSelect
                label="Vasija destino (opcional)"
                value={destinoVasijaId}
                onChange={(event) => setDestinoVasijaId(event.target.value)}
              >
                <option value="">Sin destino (solo registrar el corte)</option>
                {vasijaOptions.map((option) => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </AppSelect>
              <p className="mt-1 text-xs text-[color:var(--text-ink-muted)]">
                Si elegís destino, ahí queda cargado el lote resultado del blend, con la composición calculada.
              </p>
            </div>
          </>
        )}

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
          <AppButton type="button" variant="ghost" onClick={closeModal}>
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
