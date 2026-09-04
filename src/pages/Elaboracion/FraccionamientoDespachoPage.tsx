import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import {
  createElaboracionResource,
  deleteElaboracionResource,
  listElaboracionResource,
  patchElaboracionResource,
  type ElaboracionEntity,
} from "../../features/elaboracion/api";
import { AppCard, AppSelect, SectionIntro } from "../../components/ui";
import { getApiErrorMessage } from "../../lib/api";
import { useAuthStore } from "../../store/authStore";
import GenericCrudSection, { type SelectOption } from "./components/GenericCrudSection";
import QrEnvaseModal from "./components/QrEnvaseModal";
import SectionSelector from "./components/SectionSelector";

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

function getNestedRecord(item: ElaboracionEntity, key: string): Record<string, unknown> | null {
  const value = item[key];
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
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

  const [cortes, setCortes] = useState<ElaboracionEntity[]>([]);
  const [productos, setProductos] = useState<ElaboracionEntity[]>([]);
  const [lotes, setLotes] = useState<ElaboracionEntity[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loteFilterCodigos, setLoteFilterCodigos] = useState("");
  const [qrModal, setQrModal] = useState<{ codigoQr: string; label?: string } | null>(null);

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

  // "Corte → Lote resultante": el corte guiado por vasijas ya arma su propio lote (blend);
  // mostrarlo en el label ayuda a saber a qué corte corresponde al momento de nombrarlo.
  const corteOptions = useMemo<SelectOption[]>(
    () =>
      cortes
        .map((item) => {
          const id = item.id_corte ?? item.corte_id ?? item.id;
          if (typeof id !== "string" && typeof id !== "number") return null;
          const fecha = typeof item.fecha === "string" ? item.fecha.slice(0, 10) : null;
          const objetivo = typeof item.objetivo === "string" && item.objetivo ? item.objetivo : null;
          const loteCreado = Array.isArray(item.lote_creado) ? item.lote_creado : [];
          const loteCodigo = loteCreado
            .map((entry) =>
              entry && typeof entry === "object" && "codigo" in entry
                ? (entry as Record<string, unknown>).codigo
                : null,
            )
            .find((value): value is string => typeof value === "string");
          const base = [fecha, objetivo].filter(Boolean).join(" · ") || String(id);
          return { value: String(id), label: loteCodigo ? `${base} → ${loteCodigo}` : base };
        })
        .filter((option): option is SelectOption => option !== null),
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
    setLoadError(null);
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
      setLoadError(getApiErrorMessage(requestError));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeBodegaId]);

  const validateLoteFraccionamiento = (values: Record<string, string | boolean>) => {
    const corteId = typeof values.corteId === "string" ? values.corteId : "";
    const productoId = typeof values.productoId === "string" ? values.productoId : "";
    if (!corteId || !productoId) return null;
    const corte = cortes.find((item) => String(item.id_corte ?? item.corte_id ?? item.id) === corteId);
    const producto = productos.find(
      (item) => String(item.id_producto ?? item.producto_id ?? item.id) === productoId,
    );
    const corteBodega = corte ? resolveBodegaId(corte) : "";
    const productoBodega = producto ? resolveBodegaId(producto) : "";
    if (corteBodega && productoBodega && corteBodega !== productoBodega) {
      return "Corte y producto deben pertenecer a la misma bodega.";
    }
    return null;
  };

  const handleCodigoEnvaseCreated = (item: ElaboracionEntity) => {
    const codigoQr = typeof item.codigo_qr === "string" ? item.codigo_qr : "";
    if (!codigoQr) return;
    const loteFracId = String(item.lote_fraccionamiento_id ?? "");
    const lote = lotes.find((entry) => resolveLoteId(entry) === loteFracId);
    const producto = lote ? getNestedRecord(lote, "producto") : null;
    const nombreComercial =
      producto && typeof producto.nombre_comercial === "string" ? producto.nombre_comercial : null;
    setQrModal({ codigoQr, label: nombreComercial ?? undefined });
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
              title="Fraccionamiento y Despacho"
              description="Registro de lotes de fraccionamiento, códigos de envase y despachos."
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
              { key: "lotes", label: "Lotes Fraccionamiento" },
              { key: "codigos", label: "Códigos Envase" },
              { key: "despachos", label: "Despachos" },
            ]}
          />
        </AppCard>
      ) : null}

      {activeSection === "lotes" ? (
        <GenericCrudSection
          title="Lotes de Fraccionamiento"
          description="Elegí el corte y ponele nombre al producto final. Corte y producto deben ser de la misma bodega."
          resource="lotes-fraccionamiento"
          bodegaId={activeBodegaId}
          separatedLayout={!hidePrimaryAction}
          validate={validateLoteFraccionamiento}
          controller={{
            create: async (payload) => {
              const created = await createElaboracionResource("lotes-fraccionamiento", payload);
              await loadData();
              return created;
            },
            update: async ({ id }, payload) => {
              const updated = await patchElaboracionResource("lotes-fraccionamiento", id, payload);
              await loadData();
              return updated;
            },
            remove: async ({ id }) => {
              await deleteElaboracionResource("lotes-fraccionamiento", id);
              await loadData();
            },
          }}
          fields={[
            { name: "corteId", label: "Corte", type: "select", required: true, options: corteOptions, sourceKey: "corte_id" },
            { name: "productoId", label: "Producto", type: "select", required: true, options: productoOptions, sourceKey: "producto_id" },
            { name: "fecha", label: "Fecha", type: "date", required: true },
            { name: "botellas", label: "Botellas", type: "number" },
            { name: "formato", label: "Formato", type: "text", placeholder: "ej. 750ml" },
            { name: "codigo_lote_impreso", label: "Código lote impreso", type: "text" },
          ]}
        />
      ) : null}

      {activeSection === "codigos" ? (
        <div className="space-y-6">
        <GenericCrudSection
          title="Códigos Envase"
          description="Un QR por envase — el código se genera automáticamente al crear el registro, listo para imprimir en la etiqueta."
          resource="codigos-envase"
          bodegaId={activeBodegaId}
          listParams={{ loteFraccionamientoId: loteFilterCodigos || undefined }}
          separatedLayout={!hidePrimaryAction}
          onCreated={handleCodigoEnvaseCreated}
          fields={[
            {
              name: "loteFraccionamientoId",
              label: "Lote fraccionamiento",
              type: "select",
              required: true,
              options: loteOptions,
              sourceKey: "id_lote_frac",
            },
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

      {loading || loadError ? (
        <p className="text-xs text-[color:var(--text-ink-muted)]">
          {loadError ?? "Cargando…"}
        </p>
      ) : null}

      <QrEnvaseModal
        opened={Boolean(qrModal)}
        onClose={() => setQrModal(null)}
        codigoQr={qrModal?.codigoQr ?? ""}
        productoLabel={qrModal?.label}
      />
    </div>
  );
}
