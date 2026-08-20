import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  fetchImpactoBorradoRecepcion,
  fetchImpactoBorradoRemito,
  listElaboracionResource,
  uploadRemitoUvaAdjunto,
  type ElaboracionEntity,
} from "../../features/elaboracion/api";
import { fetchCuartelesByFinca, type Cuartel } from "../../features/cuarteles/api";
import { fetchBodega } from "../../features/bodega/api";
import { useFincasStore } from "../../features/fincas/store";
import { useAuthStore } from "../../store/authStore";
import { AppButton, AppModal, useAppNotifications } from "../../components/ui";
import GenericCrudSection, { type CrudField, type SelectOption } from "./components/GenericCrudSection";
import SectionSelector from "./components/SectionSelector";
import { useSearchParams } from "react-router-dom";

function resolveStringId(item: ElaboracionEntity, keys: string[]) {
  const id = keys
    .map((key) => item[key])
    .find((value) => typeof value === "string" || typeof value === "number");
  return id === undefined || id === null ? "" : String(id);
}

function describeLoteImpacto(lote: {
  codigo: string;
  esUnicoOrigen: boolean;
  volumenVasijaL: number;
  bloqueado: boolean;
}) {
  if (lote.volumenVasijaL > 0) {
    return `⚠ el lote ${lote.codigo} ya tiene ${lote.volumenVasijaL} l registrados en vasija — el borrado se va a rechazar (corregí esa operación de vasija primero)`;
  }
  if (lote.bloqueado) {
    return `⚠ el lote ${lote.codigo} ya se usó como componente de otro lote (blend) — el borrado se va a rechazar`;
  }
  if (!lote.esUnicoOrigen) {
    return `su lugar en el lote ${lote.codigo}`;
  }
  return `el lote ${lote.codigo} (queda sin origen)`;
}

async function buildRemitoDeleteWarning(item: ElaboracionEntity): Promise<string | null> {
  const remitoId = resolveStringId(item, ["remito_uva_id", "id_remito", "remito_id", "id"]);
  if (!remitoId) return null;
  const impacto = await fetchImpactoBorradoRemito(remitoId);
  const partes: string[] = [];
  if (impacto.recepciones > 0) partes.push(`${impacto.recepciones} recepción(es)`);
  if (impacto.tieneAnalisis) partes.push("su análisis");
  if (impacto.cius.length > 0) partes.push(`el CIU ${impacto.cius.join(", ")}`);
  for (const lote of impacto.lotes) partes.push(describeLoteImpacto(lote));
  if (partes.length === 0) return null;
  return `También se va a borrar: ${partes.join(", ")}.`;
}

async function buildRecepcionDeleteWarning(item: ElaboracionEntity): Promise<string | null> {
  const recepcionId = resolveStringId(item, [
    "recepcion_bodega_id",
    "id_recepcion",
    "recepcion_id",
    "id",
  ]);
  if (!recepcionId) return null;
  const impacto = await fetchImpactoBorradoRecepcion(recepcionId);
  const partes: string[] = [];
  if (impacto.tieneAnalisis) partes.push("su análisis");
  if (impacto.ciu) partes.push(`el CIU ${impacto.ciu.codigo_ciu}`);
  if (impacto.lote) partes.push(describeLoteImpacto(impacto.lote));
  if (partes.length === 0) return null;
  return `También se va a borrar: ${partes.join(", ")}.`;
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
  const transportista = typeof remito.transportista === "string" && remito.transportista.trim()
    ? remito.transportista.trim()
    : null;

  return {
    value: String(id),
    label: [
      fechaLabel,
      [fincaLabel, cuartelLabel].filter(Boolean).join(" / "),
      kgPesados ?? cantidad,
      patente ?? loteId,
      transportista,
    ].filter(Boolean).join(" · "),
  };
}

function formatRemitoOption(item: ElaboracionEntity): SelectOption | null {
  const id = item.remito_uva_id ?? item.id_remito ?? item.remito_id ?? item.id;
  if (typeof id !== "string" && typeof id !== "number") return null;

  const salida = typeof item.salida_finca === "string" ? new Date(item.salida_finca) : null;
  const salidaLabel = salida && !Number.isNaN(salida.getTime())
    ? salida.toLocaleString("es-AR", {
        day: "2-digit",
        month: "2-digit",
        year: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
      })
    : null;

  const finca = item.finca && typeof item.finca === "object"
    ? item.finca as Record<string, unknown>
    : {};
  const cuartel = item.cuartel && typeof item.cuartel === "object"
    ? item.cuartel as Record<string, unknown>
    : {};

  const fincaLabel = typeof finca.nombre_finca === "string" ? finca.nombre_finca : null;
  const cuartelLabel = typeof cuartel.codigo_cuartel === "string" ? cuartel.codigo_cuartel : null;
  const origen = [fincaLabel, cuartelLabel].filter(Boolean).join(" / ");
  const kg = typeof item.kg_declarados === "string" || typeof item.kg_declarados === "number"
    ? `${item.kg_declarados} kg`
    : null;
  const patente = typeof item.patente === "string" && item.patente.trim()
    ? item.patente.trim()
    : null;
  const transportista = typeof item.transportista === "string" && item.transportista.trim()
    ? item.transportista.trim()
    : null;

  const parts = [
    origen || null,
    salidaLabel ? `Salida ${salidaLabel}` : null,
    kg,
    patente ? `Patente ${patente}` : null,
    transportista,
  ].filter(Boolean);

  return {
    value: String(id),
    label: parts.length > 0 ? parts.join(" · ") : `Remito ${String(id).slice(0, 8)}`,
  };
}

type RecepcionPageProps = {
  initialSection?: "recepcion" | "analisis";
  hideSectionSelector?: boolean;
  hidePrimaryAction?: boolean;
  /** Auto-opens the create modal on mount (only when arriving via el flujo guiado). */
  autoOpenForm?: boolean;
  onSectionChange?: (section: "recepcion" | "analisis") => void;
  recepcionDefaultValues?: Record<string, string | boolean>;
  analisisDefaultValues?: Record<string, string | boolean>;
  onRecepcionDefaultsChange?: (values: Record<string, string | boolean>) => void;
  onAnalisisDefaultsChange?: (values: Record<string, string | boolean>) => void;
};

type PendingNextStep = {
  target: "analisis";
  title: string;
  description: string;
  primaryLabel: string;
  recepcionId: string;
};

export default function RecepcionPage({
  initialSection = "recepcion",
  hideSectionSelector = false,
  hidePrimaryAction = false,
  autoOpenForm = false,
  onSectionChange,
  recepcionDefaultValues,
  analisisDefaultValues,
  onRecepcionDefaultsChange,
  onAnalisisDefaultsChange,
}: RecepcionPageProps) {
  const { notifyError, notifySuccess } = useAppNotifications();
  const [searchParams, setSearchParams] = useSearchParams();
  const activeBodegaId = useAuthStore((state) => state.activeBodegaId);
  const fincas = useFincasStore((state) => state.fincas);
  const loadFincas = useFincasStore((state) => state.loadFincas);
  const [remitoOptions, setRemitoOptions] = useState<SelectOption[]>([]);
  const [recepcionOptions, setRecepcionOptions] = useState<SelectOption[]>([]);
  const [cuarteles, setCuarteles] = useState<Cuartel[]>([]);
  const [kgPorTacho, setKgPorTacho] = useState<number | null>(null);
  const [recepcionDefaults, setRecepcionDefaults] = useState<Record<string, string | boolean>>({});
  const [analisisDefaults, setAnalisisDefaults] = useState<Record<string, string | boolean>>({});
  const [pendingNextStep, setPendingNextStep] = useState<PendingNextStep | null>(null);
  const [activeSection, setActiveSection] = useState<"recepcion" | "analisis">(initialSection);
  // Se incrementa cada vez que se guarda un remito nuevo, para forzar que la
  // sección de Pesaje se vuelva a montar y su modal se auto-abra de nuevo
  // (GenericCrudSection solo auto-abre una vez por instancia montada).
  const [pesajeAutoOpenKey, setPesajeAutoOpenKey] = useState(0);
  const [pendingRemitoFoto, setPendingRemitoFoto] = useState<File | null>(null);
  const [remitoFotoPreviewUrl, setRemitoFotoPreviewUrl] = useState<string | null>(null);
  const [uploadingRemitoFoto, setUploadingRemitoFoto] = useState(false);
  const [remitoFotoSubida, setRemitoFotoSubida] = useState(false);
  const remitoFotoInputRef = useRef<HTMLInputElement | null>(null);

  // La sección visible se sincroniza desde la URL/props (fuente de verdad), ajustando
  // el estado durante el render en lugar de en un efecto para evitar renders en cascada.
  const resolvedSection: "recepcion" | "analisis" = (() => {
    if (hideSectionSelector) return initialSection;
    const section = searchParams.get("section");
    if (section === "recepcion" || section === "analisis") return section;
    return initialSection;
  })();
  const [syncedSection, setSyncedSection] = useState(resolvedSection);
  if (syncedSection !== resolvedSection) {
    setSyncedSection(resolvedSection);
    setActiveSection(resolvedSection);
  }

  const goToSection = useCallback(
    (section: "recepcion" | "analisis") => {
      setActiveSection(section);
      onSectionChange?.(section);
      if (hideSectionSelector) return;
      setSearchParams((prev) => {
        const next = new URLSearchParams(prev);
        next.set("section", section);
        return next;
      });
    },
    [hideSectionSelector, onSectionChange, setSearchParams],
  );

  const loadOperationalOptions = useCallback(async () => {
    if (!activeBodegaId) {
      setRemitoOptions([]);
      setRecepcionOptions([]);
      return;
    }

    const [remitos, recepciones, analisis] = await Promise.all([
      listElaboracionResource("remitos-uva", { bodegaId: String(activeBodegaId) }),
      listElaboracionResource("recepciones-bodega", { bodegaId: String(activeBodegaId) }),
      listElaboracionResource("analisis-recepcion", { bodegaId: String(activeBodegaId) }),
    ]);

    // Un remito que ya tiene recepción, o una recepción que ya tiene análisis, no
    // se pueden volver a elegir para cargar otro — se muestran en gris.
    const remitosConRecepcion = new Set(
      recepciones
        .map((r) => r.remito_uva_id)
        .filter((id): id is string => typeof id === "string"),
    );
    const recepcionesConAnalisis = new Set(
      analisis
        .map((a) => a.recepcion_bodega_id)
        .filter((id): id is string => typeof id === "string"),
    );

    setRemitoOptions(
      remitos
        .map(formatRemitoOption)
        .filter((option): option is SelectOption => option !== null)
        .map((option) => ({ ...option, disabled: remitosConRecepcion.has(option.value) })),
    );
    setRecepcionOptions(
      recepciones
        .map(formatRecepcionOption)
        .filter((option): option is SelectOption => option !== null)
        .map((option) => ({ ...option, disabled: recepcionesConAnalisis.has(option.value) })),
    );
  }, [activeBodegaId]);

  useEffect(() => {
    if (!activeBodegaId) return;
    void loadFincas(activeBodegaId);
    const run = async () => {
      try {
        await loadOperationalOptions();
      } catch {
        // opciones quedan vacías, el usuario puede continuar sin filtrar por select
        setRemitoOptions([]);
        setRecepcionOptions([]);
      }
    };
    void run();
  }, [activeBodegaId, loadFincas, loadOperationalOptions]);

  useEffect(() => {
    let mounted = true;
    const run = async () => {
      if (fincas.length === 0) {
        if (mounted) setCuarteles([]);
        return;
      }
      try {
        const groups = await Promise.all(
          fincas.map((finca) => {
            const fincaId = String(finca.finca_id ?? finca.id ?? "");
            return fincaId ? fetchCuartelesByFinca(fincaId) : Promise.resolve([]);
          }),
        );
        if (mounted) setCuarteles(groups.flat());
      } catch {
        if (mounted) setCuarteles([]);
      }
    };
    void run();
    return () => {
      mounted = false;
    };
  }, [fincas]);

  useEffect(() => {
    if (!activeBodegaId) {
      setKgPorTacho(null);
      return;
    }
    let mounted = true;
    const run = async () => {
      try {
        const bodega = await fetchBodega(String(activeBodegaId));
        if (!mounted) return;
        const raw = bodega.kg_por_tacho;
        const parsed = raw !== null && raw !== undefined ? Number(raw) : NaN;
        setKgPorTacho(Number.isFinite(parsed) && parsed > 0 ? parsed : null);
      } catch {
        if (mounted) setKgPorTacho(null);
      }
    };
    void run();
    return () => {
      mounted = false;
    };
  }, [activeBodegaId]);

  const fincaOptions = useMemo(
    () =>
      fincas
        .map((finca) => {
          const id = finca.finca_id ?? finca.id;
          if (!id) return null;
          return {
            value: String(id),
            label: finca.nombre_finca ?? String(id),
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
          const fincaLabel = finca?.nombre_finca;
          return {
            value: String(id),
            label: fincaLabel ? `${fincaLabel} / ${cuartel.codigo_cuartel}` : cuartel.codigo_cuartel,
            fincaId: String(cuartel.finca_id ?? ""),
          };
        })
        .filter((option): option is SelectOption & { fincaId: string } => option !== null),
    [cuarteles, fincas],
  );

  const computeKgDeclarados = useCallback(
    (cantidadRaw: string, unidad: string) => {
      const cantidad = Number(cantidadRaw);
      if (!cantidadRaw.trim() || Number.isNaN(cantidad)) return "";
      if (unidad === "tachos") {
        const factor = kgPorTacho ?? 20;
        return String(Math.round(cantidad * factor * 100) / 100);
      }
      return cantidadRaw.trim();
    },
    [kgPorTacho],
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
        clearOnChange: ["cuartelId"],
      },
      {
        name: "cuartelId",
        label: "Cuartel",
        type: "select",
        required: true,
        sourceKey: "cuartel_id",
        getOptions: (values) => {
          const selectedFincaId = String(values.fincaId ?? "");
          if (!selectedFincaId) return cuartelOptions;
          return cuartelOptions.filter((option) => option.fincaId === selectedFincaId);
        },
        // Si el cuartel elegido tiene una única variedad plantada, se asume que
        // lo que sale en el remito es puro 100% de esa variedad — el usuario
        // puede corregirlo si no es así (mezcla con otro cuartel, etc.).
        deriveOnChange: (value) => {
          const cuartel = cuarteles.find(
            (item) => String(item.cuartel_id ?? item.id ?? "") === value,
          );
          if (!cuartel || !cuartel.variedad?.trim()) return null;
          return { variedad_pureza: "pura", variedad_pureza_pct: "100" };
        },
      },
      {
        name: "cuartel_variedad_info",
        label: "Variedad del cuartel",
        description: "Informativo, según lo cargado en el cuartel — no se guarda en el remito.",
        type: "text",
        computed: (values) => {
          const cuartel = cuarteles.find(
            (item) => String(item.cuartel_id ?? item.id ?? "") === String(values.cuartelId ?? ""),
          );
          return cuartel?.variedad?.trim() || "—";
        },
      },
      { name: "salida_finca", label: "Salida finca", type: "datetime-local", required: true },
      { name: "llegada_bodega", label: "Llegada bodega", type: "datetime-local", required: true },
      { name: "transportista", label: "Transportista", type: "text" },
      { name: "patente", label: "Patente", type: "text" },
      { name: "modelo_vehiculo", label: "Modelo del vehículo", type: "text", placeholder: "ej. -FORD 1985" },
      { name: "cuit_conductor", label: "CUIT/CUIL del conductor", type: "text" },
      {
        name: "cantidad_declarada",
        label: "Peso declarado",
        description: kgPorTacho
          ? `Si elegís Tachos, se convierte solo a kg (1 tacho ≈ ${kgPorTacho} kg).`
          : "Si elegís Tachos, se convierte solo a kg (1 tacho ≈ 20 kg, sin configurar en la bodega).",
        type: "number",
        compactWith: "unidad_declarada",
        deriveOnChange: (value, values) => ({
          kg_declarados: computeKgDeclarados(value, String(values.unidad_declarada ?? "")),
        }),
      },
      {
        name: "unidad_declarada",
        label: "Unidad",
        type: "select",
        options: [
          { value: "kg", label: "Kg" },
          { value: "tachos", label: "Tachos" },
        ],
        deriveOnChange: (value, values) => ({
          kg_declarados: computeKgDeclarados(String(values.cantidad_declarada ?? ""), value),
        }),
      },
      {
        name: "kg_declarados",
        label: "Peso declarado (kg)",
        type: "number",
        hideInForm: true,
      },
      { name: "kg_bruto", label: "Peso bruto", type: "number" },
      { name: "kg_tara", label: "Tara (peso del camión)", type: "number" },
      {
        name: "kg_neto",
        label: "Peso neto (bruto − tara)",
        type: "number",
        computed: (values) => {
          const bruto = Number(values.kg_bruto);
          const tara = Number(values.kg_tara);
          if (
            !String(values.kg_bruto ?? "").trim() ||
            !String(values.kg_tara ?? "").trim() ||
            Number.isNaN(bruto) ||
            Number.isNaN(tara)
          ) {
            return "";
          }
          return String(bruto - tara);
        },
      },
      {
        name: "tipo_cosecha",
        label: "Tipo de cosecha",
        type: "select",
        options: [
          { value: "manual", label: "Manual" },
          { value: "mecanica", label: "Mecánica" },
        ],
      },
      {
        name: "variedad_pureza",
        label: "Variedad",
        type: "select",
        options: [
          { value: "pura", label: "Pura" },
          { value: "mezclada", label: "Mezclada" },
        ],
      },
      { name: "variedad_pureza_pct", label: "% de la variedad", type: "number" },
      { name: "sanidad_escala", label: "Sanidad (1-10)", type: "number" },
      { name: "presencia_hojas_escala", label: "Presencia de hojas (1-10)", type: "number" },
      { name: "observaciones", label: "Observaciones", type: "textarea" },
    ],
    [cuartelOptions, fincaOptions, cuarteles, computeKgDeclarados, kgPorTacho],
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
      { name: "brix", label: "Grados Brix", type: "number" },
      { name: "ph", label: "pH", type: "number" },
      { name: "acidez", label: "Acidez (g/l)", type: "number" },
      { name: "temperatura_uva", label: "Temp. uva °C", type: "number" },
      { name: "sanidad", label: "Sanidad", type: "text" },
      { name: "observaciones", label: "Observaciones", type: "textarea" },
    ],
    [recepcionOptions],
  );

  const handleRemitoCreated = useCallback(
    async (item: ElaboracionEntity) => {
      await loadOperationalOptions();
      const remitoId = resolveStringId(item, ["remito_uva_id", "id_remito", "remito_id", "id"]);
      if (!remitoId) return;
      // Se queda en la misma pantalla: el paso de pesaje se auto-abre con este
      // remito precargado, sin popup de confirmación intermedio.
      const defaults = { remitoUvaId: remitoId };
      setRecepcionDefaults(defaults);
      onRecepcionDefaultsChange?.(defaults);
      setPesajeAutoOpenKey((key) => key + 1);
      setRemitoFotoSubida(false);

      if (pendingRemitoFoto) {
        setUploadingRemitoFoto(true);
        try {
          await uploadRemitoUvaAdjunto(remitoId, pendingRemitoFoto);
          setRemitoFotoSubida(true);
          notifySuccess({
            title: "Foto adjuntada",
            message: "La foto del remito quedó guardada en IPFS.",
          });
        } catch {
          notifyError({
            title: "No se pudo subir la foto",
            message: "El remito se guardó igual — podés reintentar la foto más tarde.",
          });
        } finally {
          setUploadingRemitoFoto(false);
          if (remitoFotoPreviewUrl) URL.revokeObjectURL(remitoFotoPreviewUrl);
          setPendingRemitoFoto(null);
          setRemitoFotoPreviewUrl(null);
        }
      }
    },
    [
      loadOperationalOptions,
      onRecepcionDefaultsChange,
      pendingRemitoFoto,
      remitoFotoPreviewUrl,
      notifyError,
      notifySuccess,
    ],
  );

  const handleRecepcionCreated = useCallback(
    async (item: ElaboracionEntity) => {
      await loadOperationalOptions();
      const recepcionId = resolveStringId(item, [
        "recepcion_bodega_id",
        "id_recepcion",
        "recepcion_id",
        "id",
      ]);
      if (!recepcionId) return;
      setPendingNextStep({
        target: "analisis",
        title: "Recepción guardada",
        description:
          "La recepción ya quedó disponible para análisis. Podés cargar los datos de laboratorio ahora o continuar más tarde.",
        primaryLabel: "Cargar análisis",
        recepcionId,
      });
    },
    [loadOperationalOptions],
  );

  // Sin este refresh, el select de "Recepción" del propio form de Análisis
  // seguía ofreciendo como disponible una recepción a la que se le acababa de
  // cargar un análisis en la misma visita — el flag `disabled` se calcula una
  // sola vez al montar y no se enteraba de lo recién creado.
  const handleAnalisisCreated = useCallback(async () => {
    await loadOperationalOptions();
  }, [loadOperationalOptions]);

  const continuePendingStep = () => {
    if (!pendingNextStep) return;
    const defaults = { recepcionBodegaId: pendingNextStep.recepcionId };
    setAnalisisDefaults(defaults);
    onAnalisisDefaultsChange?.(defaults);
    goToSection("analisis");
    setPendingNextStep(null);
  };

  const handlePickRemitoFoto = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] ?? null;
    event.target.value = "";
    if (!file) return;
    if (remitoFotoPreviewUrl) URL.revokeObjectURL(remitoFotoPreviewUrl);
    setPendingRemitoFoto(file);
    setRemitoFotoPreviewUrl(URL.createObjectURL(file));
    setRemitoFotoSubida(false);
  };

  const removePendingRemitoFoto = () => {
    if (remitoFotoPreviewUrl) URL.revokeObjectURL(remitoFotoPreviewUrl);
    setPendingRemitoFoto(null);
    setRemitoFotoPreviewUrl(null);
  };

  const renderRemitoFotoPicker = () => (
    <div>
      <p className="text-sm font-medium text-[color:var(--text-ink)]">
        Foto del comprobante <span className="font-normal text-[color:var(--text-ink-muted)]">(opcional)</span>
      </p>
      <div className="mt-2 flex flex-wrap items-center gap-3">
        {remitoFotoPreviewUrl ? (
          <img
            src={remitoFotoPreviewUrl}
            alt="Vista previa de la foto del remito"
            className="h-20 w-20 rounded-[var(--radius-md)] border border-[color:var(--border-shell)] object-cover"
          />
        ) : null}
        <AppButton
          type="button"
          variant="secondary"
          size="sm"
          onClick={() => remitoFotoInputRef.current?.click()}
          disabled={uploadingRemitoFoto}
        >
          {pendingRemitoFoto ? "Cambiar foto" : "Elegir foto"}
        </AppButton>
        {pendingRemitoFoto ? (
          <AppButton
            type="button"
            variant="ghost"
            size="sm"
            onClick={removePendingRemitoFoto}
            disabled={uploadingRemitoFoto}
          >
            Quitar
          </AppButton>
        ) : null}
        <input
          ref={remitoFotoInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handlePickRemitoFoto}
        />
        {uploadingRemitoFoto ? (
          <span className="text-xs text-[color:var(--text-ink-muted)]">Subiendo a IPFS…</span>
        ) : remitoFotoSubida ? (
          <span className="text-xs text-[color:var(--text-ink-muted)]">✓ Foto adjuntada</span>
        ) : pendingRemitoFoto ? (
          <span className="text-xs text-[color:var(--text-ink-muted)]">Se sube al guardar.</span>
        ) : null}
      </div>
    </div>
  );

  const validateRemito = (values: Record<string, string | boolean>) => {
    const fincaId = String(values.fincaId ?? "");
    const cuartelId = String(values.cuartelId ?? "");
    const cuartel = cuartelOptions.find((option) => option.value === cuartelId);
    if (cuartel && fincaId && cuartel.fincaId !== fincaId) {
      const fieldErrors: Record<string, string> = {
        cuartelId: "El cuartel seleccionado no corresponde a la finca indicada.",
      };
      return {
        fieldErrors,
      };
    }

    // lote de cosecha es opcional — no se valida cruce con cuartel

    if (String(values.cantidad_declarada ?? "").trim() && !String(values.unidad_declarada ?? "").trim()) {
      return {
        fieldErrors: { unidad_declarada: "Elegí la unidad de la cantidad declarada." },
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
            { key: "recepcion", label: "Recepción y pesaje" },
            { key: "analisis", label: "Análisis Recepción" },
          ]}
        />
      ) : null}

      {activeSection === "recepcion" ? (
        <div className="space-y-4">
          <GenericCrudSection
            title="1. Remito de uva"
            description="Salida de finca y traslado hacia bodega."
            resource="remitos-uva"
            bodegaId={activeBodegaId}
            hidePrimaryAction={hidePrimaryAction}
            formInModal={!hidePrimaryAction}
            fields={remitoFields}
            validate={validateRemito}
            onCreated={handleRemitoCreated}
            getDeleteWarning={buildRemitoDeleteWarning}
            renderExtra={renderRemitoFotoPicker}
          />

          <GenericCrudSection
            key={`pesaje-${pesajeAutoOpenKey}`}
            title="2. Pesaje en bodega"
            description="Ingreso efectivo y pesaje del remito."
            resource="recepciones-bodega"
            bodegaId={activeBodegaId}
            hidePrimaryAction={hidePrimaryAction}
            formInModal={!hidePrimaryAction}
            autoOpenForm={autoOpenForm || pesajeAutoOpenKey > 0}
            fields={recepcionFields}
            defaultValues={recepcionDefaultValues ?? recepcionDefaults}
            onCreated={handleRecepcionCreated}
            getDeleteWarning={buildRecepcionDeleteWarning}
          />
        </div>
      ) : null}

      {activeSection === "analisis" ? (
        <GenericCrudSection
          title="Análisis Recepción"
          description="Análisis general de recepción."
          resource="analisis-recepcion"
          bodegaId={activeBodegaId}
          hidePrimaryAction={hidePrimaryAction}
          formInModal={!hidePrimaryAction}
          autoOpenForm={autoOpenForm}
          fields={analisisFields}
          defaultValues={analisisDefaultValues ?? analisisDefaults}
          onCreated={handleAnalisisCreated}
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
