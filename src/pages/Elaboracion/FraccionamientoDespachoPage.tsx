import { useEffect, useMemo, useState } from "react";
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
  AppSelect,
  NoticeBanner,
  SectionIntro,
} from "../../components/ui";
import { getApiErrorMessage } from "../../lib/api";
import { useAuthStore } from "../../store/authStore";
import GenericCrudSection, { type SelectOption } from "./components/GenericCrudSection";
import SectionSelector from "./components/SectionSelector";

type LoteForm = {
  corteId: string;
  productoId: string;
  fecha: string;
  botellas: string;
  formato: string;
  codigo_lote_impreso: string;
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

function resolveLoteId(item: ElaboracionEntity) {
  const value = item.id_lote_frac ?? item.lote_fraccionamiento_id ?? item.id;
  return typeof value === "string" || typeof value === "number" ? String(value) : "";
}

function resolveBodegaId(item: ElaboracionEntity) {
  const value = item.bodega_id ?? item.bodegaId;
  return typeof value === "string" || typeof value === "number" ? String(value) : "";
}

type FraccionamientoDespachoPageProps = {
  initialSection?: "lotes" | "codigos" | "despachos";
  hideSectionSelector?: boolean;
  hidePrimaryAction?: boolean;
};

export default function FraccionamientoDespachoPage({
  initialSection = "lotes",
  hideSectionSelector = false,
  hidePrimaryAction = false,
}: FraccionamientoDespachoPageProps) {
  const [searchParams, setSearchParams] = useSearchParams();
  const activeBodegaId = useAuthStore((state) => state.activeBodegaId);
  const [activeSection, setActiveSection] = useState<"lotes" | "codigos" | "despachos">(initialSection);
  const [loteViewMode, setLoteViewMode] = useState<"list" | "form">(
    hidePrimaryAction ? "form" : "list",
  );

  const [cortes, setCortes] = useState<ElaboracionEntity[]>([]);
  const [productos, setProductos] = useState<ElaboracionEntity[]>([]);
  const [lotes, setLotes] = useState<ElaboracionEntity[]>([]);

  const [form, setForm] = useState<LoteForm>({
    corteId: "",
    productoId: "",
    fecha: "",
    botellas: "",
    formato: "",
    codigo_lote_impreso: "",
  });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loteFilterCodigos, setLoteFilterCodigos] = useState("");

  useEffect(() => {
    if (hideSectionSelector) {
      setActiveSection(initialSection);
      return;
    }
    const section = searchParams.get("section");
    if (section === "lotes" || section === "codigos" || section === "despachos") {
      setActiveSection(section);
      return;
    }
    setActiveSection(initialSection);
  }, [hideSectionSelector, initialSection, searchParams]);

  const corteOptions = useMemo(
    () => toOptions(cortes, ["id_corte", "corte_id", "id"], ["objetivo", "fecha", "id_corte"]),
    [cortes],
  );
  const productoOptions = useMemo(
    () =>
      toOptions(
        productos,
        ["id_producto", "producto_id", "id"],
        ["nombre_comercial", "varietal", "id_producto"],
      ),
    [productos],
  );
  const loteOptions = useMemo(
    () =>
      toOptions(
        lotes,
        ["id_lote_frac", "lote_fraccionamiento_id", "id"],
        ["codigo_lote_impreso", "fecha", "id_lote_frac"],
      ),
    [lotes],
  );

  const loadData = async () => {
    if (!activeBodegaId) return;
    setLoading(true);
    setError(null);
    try {
      const [cortesData, productosData, lotesData] = await Promise.all([
        listElaboracionResource("cortes", { bodegaId: String(activeBodegaId) }),
        listElaboracionResource("productos", { bodegaId: String(activeBodegaId) }),
        listElaboracionResource("lotes-fraccionamiento", { bodegaId: String(activeBodegaId) }),
      ]);
      setCortes(cortesData);
      setProductos(productosData);
      setLotes(lotesData);
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

  const submitLote = async () => {
    if (!activeBodegaId) {
      setError("Seleccioná una bodega.");
      return;
    }
    if (!form.corteId || !form.productoId || !form.fecha) {
      setError("corteId, productoId y fecha son obligatorios.");
      return;
    }

    const corte = cortes.find((item) => String(item.id_corte ?? item.corte_id ?? item.id) === form.corteId);
    const producto = productos.find(
      (item) => String(item.id_producto ?? item.producto_id ?? item.id) === form.productoId,
    );

    const corteBodega = corte ? resolveBodegaId(corte) : "";
    const productoBodega = producto ? resolveBodegaId(producto) : "";
    if (corteBodega && productoBodega && corteBodega !== productoBodega) {
      setError("Corte y producto deben pertenecer a la misma bodega.");
      return;
    }

    const payload: Record<string, unknown> = {
      corteId: form.corteId,
      productoId: form.productoId,
      fecha: form.fecha,
      botellas: form.botellas ? Number(form.botellas) : undefined,
      formato: form.formato || undefined,
      codigo_lote_impreso: form.codigo_lote_impreso || undefined,
    };

    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      if (editingId) {
        await patchElaboracionResource("lotes-fraccionamiento", editingId, payload);
        setSuccess("Lote fraccionamiento actualizado.");
      } else {
        await createElaboracionResource("lotes-fraccionamiento", payload);
        setSuccess("Lote fraccionamiento creado.");
      }
      setForm({
        corteId: "",
        productoId: "",
        fecha: "",
        botellas: "",
        formato: "",
        codigo_lote_impreso: "",
      });
      setEditingId(null);
      if (!hidePrimaryAction) {
        setLoteViewMode("list");
      }
      await loadData();
    } catch (requestError) {
      setError(getApiErrorMessage(requestError));
    } finally {
      setSaving(false);
    }
  };

  const editLote = (item: ElaboracionEntity) => {
    const id = resolveLoteId(item);
    if (!id) return;
    setEditingId(id);
    if (!hidePrimaryAction) {
      setLoteViewMode("form");
    }
    setForm({
      corteId: String(item.id_corte ?? item.corte_id ?? ""),
      productoId: String(item.id_producto ?? item.producto_id ?? ""),
      fecha: typeof item.fecha === "string" ? item.fecha.slice(0, 10) : "",
      botellas: item.botellas === undefined || item.botellas === null ? "" : String(item.botellas),
      formato: String(item.formato ?? ""),
      codigo_lote_impreso: String(item.codigo_lote_impreso ?? ""),
    });
  };

  const deleteLote = async (item: ElaboracionEntity) => {
    const id = resolveLoteId(item);
    if (!id) return;
    if (!window.confirm(`¿Eliminar lote ${id}?`)) return;

    try {
      await deleteElaboracionResource("lotes-fraccionamiento", id);
      setSuccess("Lote fraccionamiento eliminado.");
      await loadData();
    } catch (requestError) {
      setError(getApiErrorMessage(requestError));
    }
  };

  return (
    <div className="space-y-4">
      {!hideSectionSelector ? (
        <SectionSelector
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
            { key: "lotes", label: "Lotes Fraccionamiento" },
            { key: "codigos", label: "Códigos Envase" },
            { key: "despachos", label: "Despachos" },
          ]}
        />
      ) : null}

      {activeSection === "lotes" ? (
        <AppCard
          as="section"
          tone="default"
          padding="md"
          header={(
            <SectionIntro
              title="Lotes de Fraccionamiento"
              description="Validación aplicada: corte y producto deben ser de la misma bodega."
              actions={
                !hidePrimaryAction && loteViewMode === "list" ? (
                  <AppButton
                    type="button"
                    variant="primary"
                    size="sm"
                    onClick={() => {
                      setEditingId(null);
                      setForm({
                        corteId: "",
                        productoId: "",
                        fecha: "",
                        botellas: "",
                        formato: "",
                        codigo_lote_impreso: "",
                      });
                      setLoteViewMode("form");
                    }}
                  >
                    Nuevo lote
                  </AppButton>
                ) : undefined
              }
            />
          )}
        >

          {hidePrimaryAction || loteViewMode === "form" ? (
            <>
              <div className="mt-3 grid gap-2 md:grid-cols-2">
                <AppSelect
                  label="Corte"
                  value={form.corteId}
                  onChange={(event) => setForm((prev) => ({ ...prev, corteId: event.target.value }))}
                >
                  <option value="">Corte</option>
                  {corteOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </AppSelect>

                <AppSelect
                  label="Producto"
                  value={form.productoId}
                  onChange={(event) => setForm((prev) => ({ ...prev, productoId: event.target.value }))}
                >
                  <option value="">Producto</option>
                  {productoOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </AppSelect>

                <AppInput
                  label="Fecha"
                  type="date"
                  value={form.fecha}
                  onChange={(event) => setForm((prev) => ({ ...prev, fecha: event.target.value }))}
                  uiSize="lg"
                />
                <AppInput
                  label="Botellas"
                  type="number"
                  placeholder="Botellas"
                  value={form.botellas}
                  onChange={(event) => setForm((prev) => ({ ...prev, botellas: event.target.value }))}
                  uiSize="lg"
                />

                <AppInput
                  label="Formato"
                  type="text"
                  placeholder="Formato"
                  value={form.formato}
                  onChange={(event) => setForm((prev) => ({ ...prev, formato: event.target.value }))}
                  uiSize="lg"
                />
                <AppInput
                  label="Código lote impreso"
                  type="text"
                  placeholder="Código lote impreso"
                  value={form.codigo_lote_impreso}
                  onChange={(event) =>
                    setForm((prev) => ({ ...prev, codigo_lote_impreso: event.target.value }))
                  }
                  uiSize="lg"
                />
              </div>

              {!hidePrimaryAction ? (
                <div className="mt-3 flex flex-wrap gap-2">
                  <AppButton
                    type="button"
                    variant="primary"
                    size="sm"
                    loading={saving}
                    onClick={() => void submitLote()}
                    disabled={saving}
                  >
                    {editingId ? "Guardar" : "Crear"}
                  </AppButton>
                  <AppButton
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={() => {
                      setEditingId(null);
                      setForm({
                        corteId: "",
                        productoId: "",
                        fecha: "",
                        botellas: "",
                        formato: "",
                        codigo_lote_impreso: "",
                      });
                      setLoteViewMode("list");
                    }}
                  >
                    {editingId ? "Cancelar edición" : "Volver al listado"}
                  </AppButton>
                </div>
              ) : null}
            </>
          ) : (
            <div className="mt-3 max-h-72 space-y-2 overflow-auto">
              {loading ? (
                <NoticeBanner>Cargando...</NoticeBanner>
              ) : lotes.length === 0 ? (
                <NoticeBanner>Sin lotes.</NoticeBanner>
              ) : (
                lotes.map((item, index) => {
                  const id = resolveLoteId(item) || `i-${index}`;
                  return (
                    <AppCard key={id} as="article" tone="soft" padding="sm">
                      <div className="text-xs font-semibold text-[color:var(--accent-primary)]">{id}</div>
                      <pre className="mt-1 max-h-20 overflow-auto rounded bg-white p-2 text-[11px] text-[color:var(--text-ink)]">
                        {JSON.stringify(item, null, 2)}
                      </pre>
                      <div className="mt-2 flex gap-2">
                        <AppButton
                          type="button"
                          variant="secondary"
                          size="sm"
                          onClick={() => editLote(item)}
                        >
                          Editar
                        </AppButton>
                        <AppButton
                          type="button"
                          variant="danger"
                          size="sm"
                          onClick={() => void deleteLote(item)}
                        >
                          Eliminar
                        </AppButton>
                      </div>
                    </AppCard>
                  );
                })
              )}
            </div>
          )}

          {error ? <NoticeBanner tone="danger" className="mt-3">{error}</NoticeBanner> : null}
          {success ? <NoticeBanner tone="success" className="mt-3">{success}</NoticeBanner> : null}
        </AppCard>
      ) : null}

      {activeSection === "codigos" ? (
        <div className="space-y-6">
        <GenericCrudSection
          title="Códigos Envase"
          description="Generación de códigos QR por envase."
          resource="codigos-envase"
          bodegaId={activeBodegaId}
          listParams={{ loteFraccionamientoId: loteFilterCodigos || undefined }}
          separatedLayout={!hidePrimaryAction}
          fields={[
            {
              name: "loteFraccionamientoId",
              label: "Lote fraccionamiento",
              type: "select",
              required: true,
              options: loteOptions,
              sourceKey: "id_lote_frac",
            },
            { name: "codigo_qr", label: "Código QR", type: "text", required: true },
            { name: "codigo_lote_impreso", label: "Código lote impreso", type: "text" },
          ]}
        />

        <AppCard as="div" tone="default" padding="sm">
          <AppSelect
            label="Filtro para listado de códigos por lote"
            value={loteFilterCodigos}
            onChange={(event) => setLoteFilterCodigos(event.target.value)}
          >
            <option value="">Todos</option>
            {loteOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </AppSelect>
        </AppCard>
        </div>
      ) : null}

      {activeSection === "despachos" ? (
        <GenericCrudSection
          title="Despachos"
          description="Salida comercial de lotes fraccionados."
          resource="despachos"
          bodegaId={activeBodegaId}
          separatedLayout={!hidePrimaryAction}
          fields={[
            {
              name: "loteFraccionamientoId",
              label: "Lote fraccionamiento",
              type: "select",
              required: true,
              options: loteOptions,
              sourceKey: "id_lote_frac",
            },
            { name: "fecha", label: "Fecha", type: "date", required: true },
            { name: "destino", label: "Destino", type: "text" },
            { name: "cantidad", label: "Cantidad", type: "number" },
            { name: "documento", label: "Documento", type: "text" },
          ]}
        />
      ) : null}
    </div>
  );
}
