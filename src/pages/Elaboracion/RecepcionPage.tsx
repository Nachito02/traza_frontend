import { useCallback, useEffect, useMemo, useState } from "react";
import {
  listElaboracionResource,
  listLotesCosecha,
  type ElaboracionEntity,
  type LoteCosechaOption,
} from "../../features/elaboracion/api";
import { fetchCuartelesByFinca, type Cuartel } from "../../features/cuarteles/api";
import { useFincasStore } from "../../features/fincas/store";
import { useAuthStore } from "../../store/authStore";
import { AppButton, AppModal } from "../../components/ui";
import GenericCrudSection, { type CrudField, type SelectOption } from "./components/GenericCrudSection";
import SectionSelector from "./components/SectionSelector";
import { useSearchParams } from "react-router-dom";

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
      return {
        value: String(id),
        label: String(label ?? id),
      };
    })
    .filter((option): option is SelectOption => option !== null);
}

function resolveStringId(item: ElaboracionEntity, keys: string[]) {
  const id = keys
    .map((key) => item[key])
    .find((value) => typeof value === "string" || typeof value === "number");
  return id === undefined || id === null ? "" : String(id);
}

function formatRecepcionOption(item: ElaboracionEntity): SelectOption | null {
  const id = item.recepcion_bodega_id ?? item.id_recepcion ?? item.recepcion_id ?? item.id;
  if (typeof id !== "string" && typeof id !== "number") return null;

  const fecha = typeof item.fecha_hora === "string" ? new Date(item.fecha_hora) : null;
  const fechaLabel = fecha && !Number.isNaN(fecha.getTime())
    ? fecha.toLocaleString("es-AR", {
        day: "2-digit",
        month: "2-digit",
        year: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
      })
    : "Sin fecha";

  const remito = item.remito_uva && typeof item.remito_uva === "object"
    ? item.remito_uva as Record<string, unknown>
    : {};
  const finca = remito.finca && typeof remito.finca === "object"
    ? remito.finca as Record<string, unknown>
    : {};
  const cuartel = remito.cuartel && typeof remito.cuartel === "object"
    ? remito.cuartel as Record<string, unknown>
    : {};
  const lote = remito.evento_cosecha && typeof remito.evento_cosecha === "object"
    ? remito.evento_cosecha as Record<string, unknown>
    : {};

  const fincaLabel = typeof finca.nombre_finca === "string" ? finca.nombre_finca : null;
  const cuartelLabel = typeof cuartel.codigo_cuartel === "string" ? cuartel.codigo_cuartel : null;
  const kgPesados = typeof item.kg_pesados === "string" || typeof item.kg_pesados === "number"
    ? `${item.kg_pesados} kg`
    : null;
  const loteId = typeof remito.lote_cosecha_id === "string"
    ? `Lote ${remito.lote_cosecha_id.slice(0, 8)}`
    : null;
  const cantidad = typeof lote.cantidad === "string" || typeof lote.cantidad === "number"
    ? `${lote.cantidad} ${typeof lote.unidad === "string" ? lote.unidad : ""}`.trim()
    : null;
  const patente = typeof remito.patente === "string" && remito.patente.trim()
    ? `Patente ${remito.patente}`
    : null;

  return {
    value: String(id),
    label: [
      fechaLabel,
      [fincaLabel, cuartelLabel].filter(Boolean).join(" / "),
      kgPesados ?? cantidad,
      patente ?? loteId,
    ].filter(Boolean).join(" · "),
  };
}

type RecepcionPageProps = {
  initialSection?: "remito" | "recepcion" | "analisis";
  hideSectionSelector?: boolean;
  hidePrimaryAction?: boolean;
};

type PendingNextStep =
  | {
      from: "remito";
      target: "recepcion";
      title: string;
      description: string;
      primaryLabel: string;
      remitoId: string;
    }
  | {
      from: "recepcion";
      target: "analisis";
      title: string;
      description: string;
      primaryLabel: string;
      recepcionId: string;
    };

export default function RecepcionPage({
  initialSection = "remito",
  hideSectionSelector = false,
  hidePrimaryAction = false,
}: RecepcionPageProps) {
  const [searchParams, setSearchParams] = useSearchParams();
  const activeBodegaId = useAuthStore((state) => state.activeBodegaId);
  const fincas = useFincasStore((state) => state.fincas);
  const loadFincas = useFincasStore((state) => state.loadFincas);
  const [remitoOptions, setRemitoOptions] = useState<SelectOption[]>([]);
  const [recepcionOptions, setRecepcionOptions] = useState<SelectOption[]>([]);
  const [cuarteles, setCuarteles] = useState<Cuartel[]>([]);
  const [lotesCosecha, setLotesCosecha] = useState<LoteCosechaOption[]>([]);
  const [recepcionDefaults, setRecepcionDefaults] = useState<Record<string, string | boolean>>({});
  const [analisisDefaults, setAnalisisDefaults] = useState<Record<string, string | boolean>>({});
  const [pendingNextStep, setPendingNextStep] = useState<PendingNextStep | null>(null);
  const [activeSection, setActiveSection] = useState<"remito" | "recepcion" | "analisis">(
    initialSection,
  );

  const goToSection = useCallback(
    (section: "remito" | "recepcion" | "analisis") => {
      setActiveSection(section);
      if (hideSectionSelector) return;
      setSearchParams((prev) => {
        const next = new URLSearchParams(prev);
        next.set("section", section);
        return next;
      });
    },
    [hideSectionSelector, setSearchParams],
  );

  const loadOperationalOptions = useCallback(async () => {
    if (!activeBodegaId) {
      setRemitoOptions([]);
      setRecepcionOptions([]);
      setLotesCosecha([]);
      return;
    }

    const [remitos, recepciones, lotes] = await Promise.all([
      listElaboracionResource("remitos-uva", { bodegaId: String(activeBodegaId) }),
      listElaboracionResource("recepciones-bodega", { bodegaId: String(activeBodegaId) }),
      listLotesCosecha({ bodegaId: String(activeBodegaId) }),
    ]);
    setRemitoOptions(
      toOptions(
        remitos,
        ["remito_uva_id", "id_remito", "remito_id", "id"],
        ["patente", "transportista", "remito_uva_id", "id_remito"],
      ),
    );
    setRecepcionOptions(
      recepciones
        .map(formatRecepcionOption)
        .filter((option): option is SelectOption => option !== null),
    );
    setLotesCosecha(lotes);
  }, [activeBodegaId]);

  useEffect(() => {
    if (hideSectionSelector) {
      setActiveSection(initialSection);
      return;
    }
    const section = searchParams.get("section");
    if (section === "remito" || section === "recepcion" || section === "analisis") {
      setActiveSection(section);
      return;
    }
    setActiveSection(initialSection);
  }, [hideSectionSelector, initialSection, searchParams]);

  useEffect(() => {
    if (!activeBodegaId) return;
    void loadFincas(activeBodegaId);
    loadOperationalOptions()
      .catch(() => {
        // opciones quedan vacías, el usuario puede continuar sin filtrar por select
        setRemitoOptions([]);
        setRecepcionOptions([]);
        setLotesCosecha([]);
      });
  }, [activeBodegaId, loadFincas, loadOperationalOptions]);

  useEffect(() => {
    if (fincas.length === 0) {
      setCuarteles([]);
      return;
    }
    Promise.all(
      fincas.map((finca) => {
        const fincaId = String(finca.finca_id ?? finca.id ?? "");
        return fincaId ? fetchCuartelesByFinca(fincaId) : Promise.resolve([]);
      }),
    )
      .then((groups) => setCuarteles(groups.flat()))
      .catch(() => setCuarteles([]));
  }, [fincas]);

  const fincaOptions = useMemo(
    () =>
      fincas
        .map((finca) => {
          const id = finca.finca_id ?? finca.id;
          if (!id) return null;
          return {
            value: String(id),
            label: finca.nombre_finca ?? finca.nombre ?? finca.name ?? String(id),
          };
        })
        .filter((option): option is SelectOption => option !== null),
    [fincas],
  );

  const cuartelOptions = useMemo(
    () =>
      cuarteles
        .map((cuartel) => {
          const id = cuartel.cuartel_id ?? cuartel.id;
          if (!id) return null;
          const finca = fincas.find((item) => String(item.finca_id ?? item.id ?? "") === String(cuartel.finca_id ?? ""));
          const fincaLabel = finca?.nombre_finca ?? finca?.nombre ?? finca?.name;
          return {
            value: String(id),
            label: fincaLabel ? `${fincaLabel} / ${cuartel.codigo_cuartel}` : cuartel.codigo_cuartel,
            fincaId: String(cuartel.finca_id ?? ""),
          };
        })
        .filter((option): option is SelectOption & { fincaId: string } => option !== null),
    [cuarteles, fincas],
  );

  const loteCosechaOptions = useMemo(
    () =>
      lotesCosecha.map((lote) => {
        const fecha = new Date(lote.fecha_cosecha);
        const fechaLabel = Number.isNaN(fecha.getTime())
          ? lote.fecha_cosecha
          : fecha.toLocaleDateString("es-AR");
        const fincaLabel = lote.cuartel?.finca?.nombre_finca ?? "Finca";
        const cuartelLabel = lote.cuartel?.codigo_cuartel ?? "Cuartel";
        const cantidad = `${lote.cantidad} ${lote.unidad}`;

        return {
          value: lote.lote_cosecha_id,
          label: `${fechaLabel} · ${fincaLabel} / ${cuartelLabel} · ${cantidad}`,
          cuartelId: lote.cuartel_id,
        };
      }),
    [lotesCosecha],
  );

  const remitoFields = useMemo<CrudField[]>(
    () => [
      {
        name: "fincaId",
        label: "Finca",
        type: "select",
        required: true,
        options: fincaOptions,
        sourceKey: "finca_id",
        clearOnChange: ["cuartelId", "loteCosechaId"],
      },
      {
        name: "cuartelId",
        label: "Cuartel",
        type: "select",
        required: true,
        sourceKey: "cuartel_id",
        clearOnChange: ["loteCosechaId"],
        getOptions: (values) => {
          const selectedFincaId = String(values.fincaId ?? "");
          if (!selectedFincaId) return cuartelOptions;
          return cuartelOptions.filter((option) => option.fincaId === selectedFincaId);
        },
      },
      {
        name: "loteCosechaId",
        label: "Lote de cosecha",
        type: "select",
        required: true,
        sourceKey: "lote_cosecha_id",
        getOptions: (values) => {
          const selectedFincaId = String(values.fincaId ?? "");
          const selectedCuartelId = String(values.cuartelId ?? "");
          if (!selectedFincaId || !selectedCuartelId) return [];
          return loteCosechaOptions.filter((option) => option.cuartelId === selectedCuartelId);
        },
      },
      { name: "salida_finca", label: "Salida finca", type: "datetime-local", required: true },
      { name: "llegada_bodega", label: "Llegada bodega", type: "datetime-local", required: true },
      { name: "transportista", label: "Transportista", type: "text" },
      { name: "patente", label: "Patente", type: "text" },
      { name: "kg_declarados", label: "Kg declarados", type: "number" },
    ],
    [cuartelOptions, fincaOptions, loteCosechaOptions],
  );

  const recepcionFields = useMemo<CrudField[]>(
    () => [
      {
        name: "remitoUvaId",
        label: "Remito",
        type: "select",
        required: true,
        options: remitoOptions,
        sourceKey: "remito_uva_id",
      },
      { name: "fecha_hora", label: "Fecha y hora", type: "datetime-local", required: true },
      { name: "kg_pesados", label: "Kg pesados", type: "number" },
      { name: "clasificacion", label: "Clasificación", type: "text" },
      { name: "observaciones", label: "Observaciones", type: "textarea" },
    ],
    [remitoOptions],
  );

  const analisisFields = useMemo<CrudField[]>(
    () => [
      {
        name: "recepcionBodegaId",
        label: "Recepción",
        type: "select",
        required: true,
        options: recepcionOptions,
        sourceKey: "recepcion_bodega_id",
      },
      { name: "brix", label: "Brix", type: "number" },
      { name: "ph", label: "pH", type: "number" },
      { name: "acidez", label: "Acidez", type: "number" },
      { name: "temperatura_uva", label: "Temp. uva", type: "number" },
      { name: "sanidad", label: "Sanidad", type: "text" },
      { name: "observaciones", label: "Observaciones", type: "textarea" },
    ],
    [recepcionOptions],
  );

  const handleRemitoCreated = useCallback(
    async (item: ElaboracionEntity) => {
      await loadOperationalOptions();
      if (hideSectionSelector) return;
      const remitoId = resolveStringId(item, ["remito_uva_id", "id_remito", "remito_id", "id"]);
      if (!remitoId) return;
      setPendingNextStep({
        from: "remito",
        target: "recepcion",
        title: "Remito guardado",
        description:
          "El remito ya quedó registrado. Podés continuar ahora con la recepción en bodega o volver más tarde cuando tengas los datos de pesaje.",
        primaryLabel: "Continuar con recepción",
        remitoId,
      });
    },
    [hideSectionSelector, loadOperationalOptions],
  );

  const handleRecepcionCreated = useCallback(
    async (item: ElaboracionEntity) => {
      await loadOperationalOptions();
      if (hideSectionSelector) return;
      const recepcionId = resolveStringId(item, [
        "recepcion_bodega_id",
        "id_recepcion",
        "recepcion_id",
        "id",
      ]);
      if (!recepcionId) return;
      setPendingNextStep({
        from: "recepcion",
        target: "analisis",
        title: "Recepción guardada",
        description:
          "La recepción ya quedó disponible para análisis. Podés cargar los datos de laboratorio ahora o continuar más tarde.",
        primaryLabel: "Cargar análisis",
        recepcionId,
      });
    },
    [hideSectionSelector, loadOperationalOptions],
  );

  const continuePendingStep = () => {
    if (!pendingNextStep) return;
    if (pendingNextStep.from === "remito") {
      setRecepcionDefaults({ remitoUvaId: pendingNextStep.remitoId });
      goToSection("recepcion");
    } else {
      setAnalisisDefaults({ recepcionBodegaId: pendingNextStep.recepcionId });
      goToSection("analisis");
    }
    setPendingNextStep(null);
  };

  const validateRemito = (values: Record<string, string | boolean>) => {
    const fincaId = String(values.fincaId ?? "");
    const cuartelId = String(values.cuartelId ?? "");
    const loteCosechaId = String(values.loteCosechaId ?? "");
    const cuartel = cuartelOptions.find((option) => option.value === cuartelId);
    if (cuartel && fincaId && cuartel.fincaId !== fincaId) {
      const fieldErrors: Record<string, string> = {
        cuartelId: "El cuartel seleccionado no corresponde a la finca indicada.",
      };
      return {
        fieldErrors,
      };
    }

    const lote = loteCosechaOptions.find((option) => option.value === loteCosechaId);
    if (lote && cuartelId && lote.cuartelId !== cuartelId) {
      const fieldErrors: Record<string, string> = {
        loteCosechaId: "El lote de cosecha seleccionado no corresponde al cuartel indicado.",
      };
      return {
        fieldErrors,
      };
    }

    return null;
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
            { key: "remito", label: "Remito Uva" },
            { key: "recepcion", label: "Recepción Bodega" },
            { key: "analisis", label: "Análisis Recepción" },
          ]}
        />
      ) : null}

      {activeSection === "remito" ? (
        <GenericCrudSection
          title="Remito Uva"
          description="Salida de finca y traslado hacia bodega."
          resource="remitos-uva"
          bodegaId={activeBodegaId}
          hidePrimaryAction={hidePrimaryAction}
          separatedLayout={!hidePrimaryAction}
          fields={remitoFields}
          validate={validateRemito}
          onCreated={handleRemitoCreated}
        />
      ) : null}

      {activeSection === "recepcion" ? (
        <GenericCrudSection
          title="Recepción Bodega"
          description="Ingreso efectivo y pesaje de remitos."
          resource="recepciones-bodega"
          bodegaId={activeBodegaId}
          hidePrimaryAction={hidePrimaryAction}
          separatedLayout={!hidePrimaryAction}
          fields={recepcionFields}
          defaultValues={recepcionDefaults}
          onCreated={handleRecepcionCreated}
        />
      ) : null}

      {activeSection === "analisis" ? (
        <GenericCrudSection
          title="Análisis Recepción"
          description="Análisis general de recepción."
          resource="analisis-recepcion"
          bodegaId={activeBodegaId}
          hidePrimaryAction={hidePrimaryAction}
          separatedLayout={!hidePrimaryAction}
          fields={analisisFields}
          defaultValues={analisisDefaults}
        />
      ) : null}

      <AppModal
        opened={pendingNextStep !== null}
        onClose={() => setPendingNextStep(null)}
        title={pendingNextStep?.title}
        description="Flujo asistido de ingreso de uva"
        size="sm"
        footer={(
          <div className="flex flex-wrap justify-end gap-2">
            <AppButton
              type="button"
              variant="secondary"
              onClick={() => setPendingNextStep(null)}
            >
              Continuar más tarde
            </AppButton>
            <AppButton
              type="button"
              variant="primary"
              onClick={continuePendingStep}
            >
              {pendingNextStep?.primaryLabel ?? "Continuar"}
            </AppButton>
          </div>
        )}
      >
        <p className="text-sm leading-relaxed text-[color:var(--text-ink-muted)]">
          {pendingNextStep?.description}
        </p>
      </AppModal>
    </div>
  );
}
