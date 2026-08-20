import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import {
  AppButton,
  AppCard,
  AppInput,
  AppModal,
  AppSelect,
  AppTextarea,
  GuidedState,
  NoticeBanner,
  useAppNotifications,
  useConfirmDialog,
} from "../../../components/ui";
import {
  createElaboracionResource,
  deleteElaboracionResource,
  fetchComposicionActualVasija,
  listElaboracionResource,
  patchElaboracionResource,
  type ElaboracionEntity,
} from "../../../features/elaboracion/api";
import { VASIJA_TIPOS, VASIJA_USOS, VASIJA_ESTADOS } from "../../../features/elaboracion/vasijaFields";
import { getApiErrorMessage } from "../../../lib/api";

function stringVal(value: unknown, fallback = ""): string {
  if (typeof value === "string" && value.trim()) return value;
  if (typeof value === "number") return String(value);
  return fallback;
}

function numVal(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() && Number.isFinite(Number(value))) return Number(value);
  return null;
}

function optionLabel(options: readonly { value: string; label: string }[], value: unknown): string {
  const v = stringVal(value);
  if (!v) return "—";
  return options.find((o) => o.value === v)?.label ?? v;
}

function resolveVasijaId(item: ElaboracionEntity): string {
  return stringVal(item.vasija_id ?? item.id_vasija ?? item.id);
}

function nowDateTimeLocal(): string {
  const now = new Date();
  const offset = now.getTimezoneOffset();
  const local = new Date(now.getTime() - offset * 60_000);
  return local.toISOString().slice(0, 16);
}

function toIsoDateTime(raw: string): string {
  if (!raw.trim()) return "";
  const parsed = new Date(raw);
  if (Number.isNaN(parsed.getTime())) return raw;
  return parsed.toISOString();
}

type VasijaRow = {
  id: string;
  codigo: string;
  tipo: string;
  /** Valor crudo de `tipo` (no la etiqueta) — hace falta para dibujar la
   * textura de madera en las barricas de roble. */
  tipoRaw: string;
  uso: string;
  /** Valor crudo de `uso` (no la etiqueta) — hace falta para diferenciar la
   * animación de fermentación alcohólica de la maloláctica. */
  usoRaw: string;
  etapa: string;
  capacidad: number | null;
  volumen: number | null;
  porcentaje: number;
  lotes: string[];
};

type VasijaFormValues = {
  codigo: string;
  tipo: string;
  capacidad_litros: string;
  uso: string;
  etapa: string;
};

const EMPTY_VASIJA_FORM: VasijaFormValues = {
  codigo: "",
  tipo: "",
  capacidad_litros: "",
  uso: "",
  etapa: "",
};

type MedicionFormValues = {
  vasijaId: string;
  fecha_hora: string;
  volumen_l: string;
  grado_alcohol: string;
  azucar_residual_g_l: string;
  // Control de fermentación: es otra medición más — solo tiene sentido
  // ofrecerla acá cuando la vasija elegida está en_fermentacion (ver
  // `esFermentando` donde se usa). Se guarda aparte porque es un recurso
  // distinto en el backend (controles-fermentacion, no existencias-vasija).
  densidad: string;
  temperatura: string;
  brix: string;
  ph: string;
  acidez: string;
  estado_fermentacion: string;
  observaciones: string;
};

function emptyMedicionForm(vasijaId = ""): MedicionFormValues {
  return {
    vasijaId,
    fecha_hora: nowDateTimeLocal(),
    volumen_l: "",
    grado_alcohol: "",
    azucar_residual_g_l: "",
    densidad: "",
    temperatura: "",
    brix: "",
    ph: "",
    acidez: "",
    estado_fermentacion: "",
    observaciones: "",
  };
}

type FermentacionFormValues = {
  fecha_hora: string;
  densidad: string;
  temperatura: string;
  brix: string;
  ph: string;
  acidez: string;
  estado_fermentacion: string;
  observaciones: string;
};

function emptyFermentacionForm(): FermentacionFormValues {
  return {
    fecha_hora: nowDateTimeLocal(),
    densidad: "",
    temperatura: "",
    brix: "",
    ph: "",
    acidez: "",
    estado_fermentacion: "",
    observaciones: "",
  };
}

const editIcon = (
  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M12 20h9" />
    <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" />
  </svg>
);
const deleteIcon = (
  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M3 6h18" />
    <path d="M8 6V4h8v2" />
    <path d="M19 6l-1 14H6L5 6" />
    <path d="M10 11v6" />
    <path d="M14 11v6" />
  </svg>
);
const plusIcon = (
  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M12 5v14" />
    <path d="M5 12h14" />
  </svg>
);
/** Trasiego / movimiento entre vasijas. */
const operacionIcon = (
  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="m16 3 4 4-4 4" />
    <path d="M20 7H4" />
    <path d="m8 21-4-4 4-4" />
    <path d="M4 17h16" />
  </svg>
);
/** Medición de laboratorio (volumen, grado alcohólico, azúcar residual). */
const medicionIcon = (
  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M9 3h6" />
    <path d="M10 3v6.343a2 2 0 0 1-.586 1.414L4.5 15.672A2 2 0 0 0 4 17.086V19a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-1.914a2 2 0 0 0-.5-1.414l-4.914-4.915A2 2 0 0 1 14 9.343V3" />
    <path d="M6.5 14.5h11" />
  </svg>
);
/** Control de fermentación — solo aparece en vasijas cuya etapa es "en fermentación". */
const fermentacionIcon = (
  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M14 4v10.54a4 4 0 1 1-4 0V4a2 2 0 0 1 4 0Z" />
  </svg>
);

/**
 * Etapas donde el vino se sigue mostrando (con su propia animación de
 * líquido). Estabilización y las "lista para X" además llevan una insignia
 * arriba del líquido (ver BADGE_BY_ETAPA) — acá solo se define cómo se mueve
 * el líquido en sí. El resto de etapas (vacía/disponible/limpieza/sanitizada/
 * mantenimiento/bloqueada/fuera de servicio) son estados administrativos, no
 * dicen nada del contenido, y se resuelven con un ícono fijo (ICON_STATE_BY_ETAPA).
 */
function liquidAnimClassFor(etapa: string, uso: string): string {
  switch (etapa) {
    case "en_fermentacion":
      // Alcohólica es vigorosa (burbujas grandes y rápidas, libera mucho CO2);
      // maloláctica es bacteriana y mucho más tranquila — apenas se mueve.
      return uso === "fermentacion_malolactica" ? "liquid-anim-fermenting-malo" : "liquid-anim-fermenting";
    case "en_maceracion":
      return "liquid-anim-macerating";
    case "en_crianza":
      return "liquid-anim-aging";
    case "en_estabilizacion":
      return "liquid-anim-settling";
    // ocupada / lista_para_trasiego / lista_para_fraccionamiento: hay vino
    // pero no está pasando nada activo en el líquido en sí — reposo (la
    // insignia de "lista" es la que comunica el estado).
    default:
      return "liquid-anim-resting";
  }
}

const wrenchIcon = (
  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />
  </svg>
);
const banIcon = (
  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <circle cx="12" cy="12" r="10" />
    <line x1="4.93" y1="4.93" x2="19.07" y2="19.07" />
  </svg>
);
const checkIcon = (
  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M20 6 9 17l-5-5" />
  </svg>
);
const dropletIcon = (
  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M12 2.69s-5 5.6-5 9.31a5 5 0 0 0 10 0c0-3.71-5-9.31-5-9.31z" />
  </svg>
);
const sparklesIcon = (
  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M9.937 15.5A2 2 0 0 0 8.5 14.063l-6.135-1.582a.5.5 0 0 1 0-.962L8.5 9.936A2 2 0 0 0 9.937 8.5l1.582-6.135a.5.5 0 0 1 .963 0L14.063 8.5A2 2 0 0 0 15.5 9.937l6.135 1.582a.5.5 0 0 1 0 .962L15.5 14.063a2 2 0 0 0-1.437 1.437l-1.582 6.135a.5.5 0 0 1-.963 0z" />
  </svg>
);
const warningIcon = (
  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" />
    <path d="M12 9v4" />
    <path d="M12 17h.01" />
  </svg>
);
/** "Ver detalle" — a propósito distinto de los íconos de acción chicos de abajo. */
const viewIcon = (
  <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M2.062 12.348a1 1 0 0 1 0-.696 10.75 10.75 0 0 1 19.876 0 1 1 0 0 1 0 .696 10.75 10.75 0 0 1-19.876 0" />
    <circle cx="12" cy="12" r="3" />
  </svg>
);
// Versiones chicas para la insignia que va arriba del líquido (tank ya es
// chico de por sí, un ícono de 18px no entra bien ahí encima).
const scaleIconSm = (
  <svg xmlns="http://www.w3.org/2000/svg" width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.25" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M12 3v18" />
    <path d="M5 8h14" />
    <path d="M5 8 3 13a3 3 0 0 0 6 0z" />
    <path d="m19 8-2 5a3 3 0 0 0 6 0z" />
  </svg>
);
const arrowIconSm = (
  <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M5 12h14" />
    <path d="m12 5 7 7-7 7" />
  </svg>
);
const packageIconSm = (
  <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
    <path d="M3.3 7 12 12l8.7-5" />
    <path d="M12 22V12" />
  </svg>
);
/** Vasija chiquita — el "destino" al que apunta la flechita de "lista para trasiego". */
const miniVasijaIcon = (
  <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <rect x="5" y="3" width="14" height="18" rx="2" />
  </svg>
);

type TankIconState = {
  icon: ReactNode;
  /** Clases de fondo + color del ícono (mismo estilo que ya usa el resto del archivo). */
  className: string;
  /** Sin animación = estado quieto/inactivo a propósito (fuera de servicio). */
  animClass?: string;
};

/**
 * Estados que no se representan con líquido — la etapa es administrativa, no
 * dice nada sobre qué está pasando adentro (o, como "vacía", ya dice
 * explícitamente que no hay nada adentro). Cada uno tiene su propio símbolo.
 */
const ICON_STATE_BY_ETAPA: Record<string, TankIconState> = {
  disponible: {
    icon: checkIcon,
    className: "bg-[color:var(--surface-accent-soft)] text-[color:var(--accent-primary)]",
    animClass: "icon-pulse",
  },
  en_limpieza: {
    icon: dropletIcon,
    className: "bg-[color:var(--surface-accent-soft)] text-[color:var(--text-accent)]",
    animClass: "icon-sweep",
  },
  sanitizada: {
    icon: sparklesIcon,
    className: "bg-[color:var(--surface-accent-soft)] text-[color:var(--accent-primary)]",
    animClass: "icon-twinkle",
  },
  en_mantenimiento: {
    icon: wrenchIcon,
    className: "tank-border-warning bg-[color:var(--feedback-warning-bg)] text-[color:var(--feedback-warning-text)]",
    animClass: "tool-wiggle",
  },
  bloqueada: {
    icon: banIcon,
    className: "tank-border-danger bg-[color:var(--feedback-danger-bg)] text-[color:var(--feedback-danger-text)]",
    animClass: "ban-pulse",
  },
  fuera_de_servicio: {
    icon: warningIcon,
    className: "tank-border-muted bg-[color:var(--surface-muted)] text-[color:var(--text-ink-muted)] opacity-70",
    // Sin animClass: a propósito quieta — "fuera de servicio" es un cartel, no algo en curso.
  },
};

/** Ícono simple de vasija con relleno proporcional al volumen actual sobre la capacidad. */
/**
 * Insignia que se apoya arriba del líquido (no lo reemplaza) para las etapas
 * "de estado" que igual necesitan mostrar el vino: estabilización (balanza
 * buscando el equilibrio) y las "lista para X" (flechita moviéndose hacia la
 * vasija destino / paquete listo).
 */
const BADGE_BY_ETAPA: Record<string, ReactNode> = {
  en_estabilizacion: <span className="icon-balance">{scaleIconSm}</span>,
  lista_para_trasiego: (
    <span className="flex items-center gap-0.5">
      <span className="icon-slide-to">{arrowIconSm}</span>
      {miniVasijaIcon}
    </span>
  ),
  lista_para_fraccionamiento: <span className="icon-bounce">{packageIconSm}</span>,
};

function TankIcon({
  percent,
  hasData,
  etapa,
  uso,
  tipo,
}: {
  percent: number;
  hasData: boolean;
  etapa: string;
  uso: string;
  tipo: string;
}) {
  const clamped = Math.max(0, Math.min(100, percent));
  const iconState = ICON_STATE_BY_ETAPA[etapa];

  if (iconState) {
    return (
      <div
        className={`relative flex h-16 w-11 shrink-0 items-center justify-center overflow-hidden rounded-t-[8px] rounded-b-[4px] border-2 border-[color:var(--border-default)] ${iconState.className}`}
      >
        <span className={iconState.animClass}>{iconState.icon}</span>
      </div>
    );
  }

  // "Vacía" es una declaración explícita de que no hay nada adentro — se
  // respeta aunque el ledger todavía tenga alguna fila vieja sin cerrar.
  const showLiquid = hasData && etapa !== "vacia";
  const badge = BADGE_BY_ETAPA[etapa];
  // Las barricas de roble son de madera, no de acero — grano + aros en vez
  // del contenedor liso. Francés y americano en tonos distintos.
  const barricaClass =
    tipo === "BarricaRobleFrances" ? "tank-barrica-fr" : tipo === "BarricaRobleAmericano" ? "tank-barrica-us" : "";

  return (
    <div
      className={`relative h-16 w-11 shrink-0 overflow-hidden rounded-t-[8px] rounded-b-[4px] border-2 border-[color:var(--border-default)] bg-[color:var(--surface-muted)] ${barricaClass}`}
    >
      {showLiquid ? (
        <div
          className={`liquid-fill ${liquidAnimClassFor(etapa, uso)} absolute inset-x-0 bottom-0 transition-all duration-500`}
          style={{ height: `${clamped}%` }}
        />
      ) : null}
      {badge ? <div className="tank-badge">{badge}</div> : null}
    </div>
  );
}

type VasijaEstadoPanelProps = {
  bodegaId: string | number | null;
  /** Cambiá este valor (ej. incrementando un contador) para forzar un refetch. */
  refreshKey?: number;
  /** Se dispara después de crear, editar o eliminar una vasija (para refrescar selects en otras secciones). */
  onChanged?: () => void;
  /** Abre el formulario de Operaciones Vasija (lo maneja el padre). Sin vasijaId = formulario en blanco. */
  onRegistrarOperacion?: (vasijaId?: string) => void;
};

/**
 * Pantalla principal de "Vasijas": el estado gráfico de cada tanque es lo primero
 * que se ve. Alta, edición y baja de vasijas, mediciones y control de fermentación
 * se resuelven ahí mismo (íconos por tarjeta + botones discretos arriba) — no hay
 * un listado de texto aparte.
 */
export default function VasijaEstadoPanel({
  bodegaId,
  refreshKey = 0,
  onChanged,
  onRegistrarOperacion,
}: VasijaEstadoPanelProps) {
  const navigate = useNavigate();
  const { notifySuccess, notifyError } = useAppNotifications();
  const { confirm, ConfirmDialog } = useConfirmDialog();
  const [vasijas, setVasijas] = useState<ElaboracionEntity[]>([]);
  // Volumen real, no una medición manual: sale del ledger de movimientos
  // (VasijaContenido) vía el mismo endpoint que usa el form de trasiego para
  // mostrar "disponible: X l" — así el ícono siempre refleja lo que de verdad
  // se cargó como ingreso/trasiego, sin depender de que alguien haya cargado
  // a mano una medición de laboratorio.
  const [composicionPorVasija, setComposicionPorVasija] = useState<
    Record<string, { volumenDisponibleL: number; lotes: string[] }>
  >({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const [formOpen, setFormOpen] = useState(false);
  const [formMode, setFormMode] = useState<"create" | "edit">("create");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formValues, setFormValues] = useState<VasijaFormValues>(EMPTY_VASIJA_FORM);
  const [formSaving, setFormSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const [medicionOpen, setMedicionOpen] = useState(false);
  const [medicionValues, setMedicionValues] = useState<MedicionFormValues>(emptyMedicionForm());
  const [medicionSaving, setMedicionSaving] = useState(false);
  const [medicionError, setMedicionError] = useState<string | null>(null);

  const [fermentacionOpen, setFermentacionOpen] = useState(false);
  const [fermentacionVasijaId, setFermentacionVasijaId] = useState<string | null>(null);
  const [fermentacionValues, setFermentacionValues] = useState<FermentacionFormValues>(emptyFermentacionForm());
  const [fermentacionSaving, setFermentacionSaving] = useState(false);
  const [fermentacionError, setFermentacionError] = useState<string | null>(null);

  const cardRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  // Queda seleccionada (no es un resalte que se apaga solo): así "Nueva
  // operación"/"Nueva medición" de arriba saben para qué vasija son.
  const [selectedVasijaId, setSelectedVasijaId] = useState<string>("");

  const loadVasijas = useCallback(async () => {
    if (!bodegaId) {
      setVasijas([]);
      setComposicionPorVasija({});
      return;
    }
    setLoading(true);
    setError(null);
    const bodegaIdStr = String(bodegaId);

    try {
      const vasijasData = await listElaboracionResource("vasijas", { bodegaId: bodegaIdStr });
      setVasijas(vasijasData);

      const entries = await Promise.all(
        vasijasData.map(async (v) => {
          const id = resolveVasijaId(v);
          if (!id) return null;
          try {
            const composicion = await fetchComposicionActualVasija(id);
            return [
              id,
              {
                volumenDisponibleL: composicion.volumen_disponible_l,
                lotes: composicion.composicion.map((c) => c.lote_codigo),
              },
            ] as const;
          } catch {
            return null;
          }
        }),
      );
      setComposicionPorVasija(
        Object.fromEntries(entries.filter((e): e is NonNullable<typeof e> => e !== null)),
      );
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [bodegaId]);

  useEffect(() => {
    void loadVasijas();
  }, [loadVasijas, refreshKey]);

  const rows = useMemo<VasijaRow[]>(() => {
    return vasijas
      .map((v) => {
        const id = resolveVasijaId(v);
        const composicion = composicionPorVasija[id] ?? null;
        const capacidad = numVal(v.capacidad_litros);
        const volumen = composicion ? composicion.volumenDisponibleL : null;
        const porcentaje =
          capacidad && capacidad > 0 && volumen !== null
            ? Math.max(0, Math.min(100, (volumen / capacidad) * 100))
            : 0;
        return {
          id,
          codigo: stringVal(v.codigo, "Sin código"),
          tipo: optionLabel(VASIJA_TIPOS, v.tipo),
          tipoRaw: stringVal(v.tipo),
          uso: optionLabel(VASIJA_USOS, v.uso),
          usoRaw: stringVal(v.uso),
          etapa: stringVal(v.etapa),
          capacidad,
          volumen,
          porcentaje,
          lotes: composicion?.lotes ?? [],
        };
      })
      .filter((row) => row.id)
      .sort((a, b) => a.codigo.localeCompare(b.codigo, "es"));
  }, [vasijas, composicionPorVasija]);

  const handleEtapaChange = async (id: string, value: string) => {
    setSavingId(id);
    try {
      await patchElaboracionResource("vasijas", id, { etapa: value });
      setVasijas((prev) =>
        prev.map((v) => (resolveVasijaId(v) === id ? { ...v, etapa: value } : v)),
      );
      notifySuccess({ title: "Etapa actualizada" });
    } catch (err) {
      notifyError({ title: "No se pudo actualizar la etapa", message: getApiErrorMessage(err) });
    } finally {
      setSavingId(null);
    }
  };

  const selectVasija = (id: string) => {
    setSelectedVasijaId(id);
    if (!id) return;
    cardRefs.current.get(id)?.scrollIntoView({ behavior: "smooth", block: "center" });
  };

  // ── Alta / edición de vasija ────────────────────────────────────────────
  const openCreateForm = () => {
    setFormMode("create");
    setEditingId(null);
    setFormValues(EMPTY_VASIJA_FORM);
    setFormError(null);
    setFormOpen(true);
  };

  const openEditForm = (id: string) => {
    const raw = vasijas.find((v) => resolveVasijaId(v) === id);
    if (!raw) return;
    setFormMode("edit");
    setEditingId(id);
    setFormValues({
      codigo: stringVal(raw.codigo),
      tipo: stringVal(raw.tipo),
      capacidad_litros:
        raw.capacidad_litros === null || raw.capacidad_litros === undefined || raw.capacidad_litros === ""
          ? ""
          : String(raw.capacidad_litros),
      uso: stringVal(raw.uso),
      etapa: stringVal(raw.etapa),
    });
    setFormError(null);
    setFormOpen(true);
  };

  const handleFormSubmit = async () => {
    if (!formValues.codigo.trim()) {
      setFormError("El código es obligatorio.");
      return;
    }
    setFormSaving(true);
    setFormError(null);
    const payload: Record<string, unknown> = {
      codigo: formValues.codigo.trim(),
      tipo: formValues.tipo || undefined,
      uso: formValues.uso || undefined,
      etapa: formValues.etapa || undefined,
      capacidad_litros: formValues.capacidad_litros.trim()
        ? Number(formValues.capacidad_litros)
        : undefined,
    };

    try {
      if (formMode === "edit" && editingId) {
        await patchElaboracionResource("vasijas", editingId, payload);
        notifySuccess({ title: "Vasija actualizada" });
      } else {
        if (!bodegaId) {
          setFormError("Seleccioná una bodega para continuar.");
          setFormSaving(false);
          return;
        }
        await createElaboracionResource("vasijas", { ...payload, bodegaId: String(bodegaId) });
        notifySuccess({ title: "Vasija creada" });
      }
      setFormOpen(false);
      await loadVasijas();
      onChanged?.();
    } catch (err) {
      setFormError(getApiErrorMessage(err));
    } finally {
      setFormSaving(false);
    }
  };

  const handleDelete = async (row: VasijaRow) => {
    const confirmed = await confirm(`¿Eliminar la vasija "${row.codigo}"?`);
    if (!confirmed) return;
    setDeletingId(row.id);
    try {
      await deleteElaboracionResource("vasijas", row.id);
      notifySuccess({ title: "Vasija eliminada" });
      await loadVasijas();
      onChanged?.();
    } catch (err) {
      notifyError({ title: "No se pudo eliminar", message: getApiErrorMessage(err) });
    } finally {
      setDeletingId(null);
    }
  };

  // ── Medición (existencias-vasija) ───────────────────────────────────────
  const openMedicionForm = (vasijaId?: string) => {
    setMedicionValues(emptyMedicionForm(vasijaId ?? ""));
    setMedicionError(null);
    setMedicionOpen(true);
  };

  // El control de fermentación es otra medición más — solo se ofrece cuando
  // la vasija elegida está en_fermentacion (fuera de eso no tiene sentido).
  const medicionVasijaEtapa = rows.find((r) => r.id === medicionValues.vasijaId)?.etapa;
  const medicionEsFermentando = medicionVasijaEtapa === "en_fermentacion";

  const handleMedicionSubmit = async () => {
    if (!medicionValues.vasijaId) {
      setMedicionError("Elegí una vasija.");
      return;
    }
    if (!medicionValues.fecha_hora) {
      setMedicionError("La fecha y hora son obligatorias.");
      return;
    }
    const parseNum = (v: string) => (v.trim() ? Number(v) : undefined);
    const fechaIso = toIsoDateTime(medicionValues.fecha_hora);
    const esFermentando = rows.find((r) => r.id === medicionValues.vasijaId)?.etapa === "en_fermentacion";

    const hasExistenciaValues = [
      medicionValues.volumen_l,
      medicionValues.grado_alcohol,
      medicionValues.azucar_residual_g_l,
    ].some((v) => v.trim());
    const hasFermentacionValues = esFermentando && [
      medicionValues.densidad,
      medicionValues.temperatura,
      medicionValues.brix,
      medicionValues.ph,
      medicionValues.acidez,
      medicionValues.estado_fermentacion,
    ].some((v) => v.trim());

    if (!hasExistenciaValues && !hasFermentacionValues) {
      setMedicionError("Completá al menos un valor de la medición.");
      return;
    }

    setMedicionSaving(true);
    setMedicionError(null);
    try {
      if (hasExistenciaValues) {
        await createElaboracionResource("existencias-vasija", {
          vasijaId: medicionValues.vasijaId,
          fecha_hora: fechaIso,
          volumen_l: parseNum(medicionValues.volumen_l),
          grado_alcohol: parseNum(medicionValues.grado_alcohol),
          azucar_residual_g_l: parseNum(medicionValues.azucar_residual_g_l),
          observaciones: medicionValues.observaciones.trim() || undefined,
        });
      }
      if (hasFermentacionValues) {
        await createElaboracionResource("controles-fermentacion", {
          vasijaId: medicionValues.vasijaId,
          fecha_hora: fechaIso,
          densidad: parseNum(medicionValues.densidad),
          temperatura: parseNum(medicionValues.temperatura),
          brix: parseNum(medicionValues.brix),
          ph: parseNum(medicionValues.ph),
          acidez: parseNum(medicionValues.acidez),
          estado_fermentacion: medicionValues.estado_fermentacion.trim() || undefined,
          observaciones: medicionValues.observaciones.trim() || undefined,
        });
      }
      notifySuccess({ title: "Medición registrada" });
      setMedicionOpen(false);
    } catch (err) {
      setMedicionError(getApiErrorMessage(err));
    } finally {
      setMedicionSaving(false);
    }
  };

  // ── Control de fermentación ─────────────────────────────────────────────
  const openFermentacionForm = (vasijaId: string) => {
    setFermentacionVasijaId(vasijaId);
    setFermentacionValues(emptyFermentacionForm());
    setFermentacionError(null);
    setFermentacionOpen(true);
  };

  const handleFermentacionSubmit = async () => {
    if (!fermentacionVasijaId) return;
    if (!fermentacionValues.fecha_hora) {
      setFermentacionError("La fecha y hora son obligatorias.");
      return;
    }
    setFermentacionSaving(true);
    setFermentacionError(null);
    const parseNum = (v: string) => (v.trim() ? Number(v) : undefined);
    const payload: Record<string, unknown> = {
      vasijaId: fermentacionVasijaId,
      fecha_hora: toIsoDateTime(fermentacionValues.fecha_hora),
      densidad: parseNum(fermentacionValues.densidad),
      temperatura: parseNum(fermentacionValues.temperatura),
      brix: parseNum(fermentacionValues.brix),
      ph: parseNum(fermentacionValues.ph),
      acidez: parseNum(fermentacionValues.acidez),
      estado_fermentacion: fermentacionValues.estado_fermentacion.trim() || undefined,
      observaciones: fermentacionValues.observaciones.trim() || undefined,
    };
    try {
      await createElaboracionResource("controles-fermentacion", payload);
      notifySuccess({ title: "Control de fermentación registrado" });
      setFermentacionOpen(false);
    } catch (err) {
      setFermentacionError(getApiErrorMessage(err));
    } finally {
      setFermentacionSaving(false);
    }
  };

  const fermentacionVasijaCodigo = rows.find((r) => r.id === fermentacionVasijaId)?.codigo;

  if (!bodegaId) return null;

  return (
    <>
      <AppCard as="section" tone="default" padding="lg">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            {rows.length > 1 ? (
              <select
                aria-label="Seleccionar vasija"
                className="min-h-9 rounded-[var(--radius-md)] border border-[color:var(--field-border)] bg-[color:var(--field-bg)] px-2 text-xs text-[color:var(--text-ink-muted)] shadow-[var(--shadow-inset-soft)] focus:border-[color:var(--field-border-focus)] focus:outline-none"
                value={selectedVasijaId}
                onChange={(event) => selectVasija(event.target.value)}
              >
                <option value="">Seleccionar vasija...</option>
                {rows.map((row) => (
                  <option key={row.id} value={row.id}>
                    {row.codigo}
                  </option>
                ))}
              </select>
            ) : null}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <AppButton type="button" variant="secondary" size="sm" leftSection={medicionIcon} onClick={() => openMedicionForm(selectedVasijaId || undefined)}>
              Nueva medición
            </AppButton>
            <AppButton type="button" variant="secondary" size="sm" leftSection={operacionIcon} onClick={() => onRegistrarOperacion?.(selectedVasijaId || undefined)}>
              Nueva operación
            </AppButton>
            <AppButton type="button" variant="primary" size="sm" leftSection={plusIcon} onClick={openCreateForm}>
              Nueva vasija
            </AppButton>
          </div>
        </div>

        {loading ? (
          <NoticeBanner className="mt-3">Cargando vasijas…</NoticeBanner>
        ) : error ? (
          <NoticeBanner tone="danger" className="mt-3">{error}</NoticeBanner>
        ) : rows.length === 0 ? (
          <GuidedState
            className="mt-3"
            title="Todavía no hay vasijas cargadas"
            description="Creá la primera vasija con el botón de arriba para empezar a ver su estado acá."
          />
        ) : (
          <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {rows.map((row) => (
              <div
                key={row.id}
                ref={(el) => {
                  if (el) cardRefs.current.set(row.id, el);
                  else cardRefs.current.delete(row.id);
                }}
                role="button"
                tabIndex={0}
                onClick={() => selectVasija(row.id)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") selectVasija(row.id);
                }}
                className={`relative flex cursor-pointer flex-col rounded-[var(--radius-lg)] border-2 bg-[color:var(--surface-soft)] p-3 transition-all duration-[var(--motion-fast)] ease-[var(--motion-standard)] hover:shadow-[var(--shadow-soft)] ${
                  selectedVasijaId === row.id
                    ? "border-[color:var(--accent-primary)] shadow-[var(--shadow-soft)]"
                    : "border-[color:var(--border-shell)] hover:border-[color:var(--border-default)]"
                }`}
              >
                <button
                  type="button"
                  aria-label={`Ver detalle de ${row.codigo}`}
                  title="Ver detalle"
                  onClick={(event) => {
                    event.stopPropagation();
                    navigate(`/bodega/vasijas/${encodeURIComponent(row.id)}`);
                  }}
                  className="absolute right-2 top-2 z-10 flex h-6 w-6 items-center justify-center rounded-full border border-[color:var(--border-default)] bg-[color:var(--surface-base)] text-[color:var(--text-ink-muted)] shadow-[var(--shadow-soft)] transition-colors hover:border-[color:var(--accent-primary)] hover:text-[color:var(--accent-primary)]"
                >
                  {viewIcon}
                </button>
                <div className="flex gap-3">
                  <TankIcon
                    percent={row.porcentaje}
                    hasData={row.volumen !== null}
                    etapa={row.etapa}
                    uso={row.usoRaw}
                    tipo={row.tipoRaw}
                  />
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-semibold text-[color:var(--text-ink)]">{row.codigo}</div>
                    <div className="truncate text-xs text-[color:var(--text-ink-muted)]">{row.tipo}</div>
                    <div className="mt-1 text-xs">
                      {row.volumen !== null ? (
                        <>
                          <span className="font-semibold text-[color:var(--text-ink)]">
                            {Math.round(row.porcentaje)}%
                          </span>{" "}
                          <span className="text-[color:var(--text-ink-muted)]">
                            · {row.volumen.toLocaleString("es-AR")}
                            {row.capacidad ? ` / ${row.capacidad.toLocaleString("es-AR")}` : ""} l
                          </span>
                        </>
                      ) : (
                        <span className="text-[color:var(--text-ink-muted)]">No se pudo leer el volumen</span>
                      )}
                    </div>
                    {row.lotes.length > 0 ? (
                      <div className="mt-0.5 truncate text-[11px] text-[color:var(--text-ink-muted)]">
                        Lote{row.lotes.length > 1 ? "s" : ""}: {row.lotes.join(", ")}
                      </div>
                    ) : null}
                    {row.uso !== "—" ? (
                      <div className="mt-0.5 truncate text-[11px] text-[color:var(--text-ink-muted)]">
                        Uso: {row.uso}
                      </div>
                    ) : null}
                  </div>
                </div>

                <div className="mt-auto pt-3" onClick={(event) => event.stopPropagation()}>
                  <AppSelect
                    uiSize="sm"
                    value={row.etapa}
                    disabled={savingId === row.id}
                    onChange={(event) => void handleEtapaChange(row.id, event.target.value)}
                  >
                    <option value="">Etapa: sin definir</option>
                    {VASIJA_ESTADOS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </AppSelect>
                </div>

                <div className="mt-2 flex flex-wrap items-center gap-1" onClick={(event) => event.stopPropagation()}>
                  <button
                    type="button"
                    aria-label={`Editar ${row.codigo}`}
                    title="Editar vasija"
                    onClick={() => openEditForm(row.id)}
                    className="shrink-0 rounded-[var(--radius-md)] p-2 text-[color:var(--text-ink-muted)] transition-colors hover:bg-[color:var(--action-ghost-hover)] hover:text-[color:var(--text-ink)]"
                  >
                    {editIcon}
                  </button>
                  <button
                    type="button"
                    aria-label={`Eliminar ${row.codigo}`}
                    title="Eliminar vasija"
                    disabled={deletingId === row.id}
                    onClick={() => void handleDelete(row)}
                    className="shrink-0 rounded-[var(--radius-md)] p-2 text-[color:var(--feedback-danger-text)] transition-colors hover:bg-[color:rgba(213,74,74,0.14)] disabled:opacity-50"
                  >
                    {deleteIcon}
                  </button>
                  <button
                    type="button"
                    aria-label={`Registrar operación de ${row.codigo}`}
                    title="Registrar operación"
                    onClick={() => onRegistrarOperacion?.(row.id)}
                    className="shrink-0 rounded-[var(--radius-md)] p-2 text-[color:var(--text-ink-muted)] transition-colors hover:bg-[color:var(--action-ghost-hover)] hover:text-[color:var(--text-ink)]"
                  >
                    {operacionIcon}
                  </button>
                  <button
                    type="button"
                    aria-label={`Nueva medición de ${row.codigo}`}
                    title="Nueva medición"
                    onClick={() => openMedicionForm(row.id)}
                    className="shrink-0 rounded-[var(--radius-md)] p-2 text-[color:var(--text-ink-muted)] transition-colors hover:bg-[color:var(--action-ghost-hover)] hover:text-[color:var(--text-ink)]"
                  >
                    {medicionIcon}
                  </button>
                  {row.etapa === "en_fermentacion" ? (
                    <button
                      type="button"
                      aria-label={`Registrar control de fermentación de ${row.codigo}`}
                      title="Registrar control de fermentación"
                      onClick={() => openFermentacionForm(row.id)}
                      className="shrink-0 rounded-[var(--radius-md)] p-2 text-[color:var(--feedback-warning-text)] transition-colors hover:bg-[color:var(--action-ghost-hover)]"
                    >
                      {fermentacionIcon}
                    </button>
                  ) : null}
                </div>
              </div>
            ))}
          </div>
        )}
      </AppCard>

      <AppModal
        opened={formOpen}
        onClose={() => { if (!formSaving) setFormOpen(false); }}
        title={formMode === "edit" ? "Editar vasija" : "Nueva vasija"}
        size="lg"
        showHeaderDivider
        footer={(
          <div className="flex justify-end gap-2">
            <AppButton type="button" variant="secondary" size="sm" onClick={() => setFormOpen(false)} disabled={formSaving}>
              Cancelar
            </AppButton>
            <AppButton type="button" variant="primary" size="sm" loading={formSaving} onClick={() => void handleFormSubmit()}>
              {formMode === "edit" ? "Guardar" : "Crear"}
            </AppButton>
          </div>
        )}
      >
        <div className="grid gap-3 md:grid-cols-2">
          <AppInput
            label="Código"
            value={formValues.codigo}
            onChange={(event) => setFormValues((prev) => ({ ...prev, codigo: event.target.value }))}
            uiSize="lg"
          />
          <AppSelect
            label="Tipo"
            value={formValues.tipo}
            onChange={(event) => setFormValues((prev) => ({ ...prev, tipo: event.target.value }))}
          >
            <option value="">Seleccionar...</option>
            {VASIJA_TIPOS.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </AppSelect>
          <AppInput
            label="Capacidad (litros)"
            type="number"
            value={formValues.capacidad_litros}
            onChange={(event) => setFormValues((prev) => ({ ...prev, capacidad_litros: event.target.value }))}
            uiSize="lg"
          />
          <AppSelect
            label="Uso"
            value={formValues.uso}
            onChange={(event) => setFormValues((prev) => ({ ...prev, uso: event.target.value }))}
          >
            <option value="">Seleccionar...</option>
            {VASIJA_USOS.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </AppSelect>
          <AppSelect
            label="Etapa"
            value={formValues.etapa}
            onChange={(event) => setFormValues((prev) => ({ ...prev, etapa: event.target.value }))}
          >
            <option value="">Seleccionar...</option>
            {VASIJA_ESTADOS.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </AppSelect>
        </div>
        {formError ? <NoticeBanner tone="danger" className="mt-3">{formError}</NoticeBanner> : null}
      </AppModal>

      <AppModal
        opened={medicionOpen}
        onClose={() => { if (!medicionSaving) setMedicionOpen(false); }}
        title="Nueva medición"
        size="lg"
        showHeaderDivider
        footer={(
          <div className="flex justify-end gap-2">
            <AppButton type="button" variant="secondary" size="sm" onClick={() => setMedicionOpen(false)} disabled={medicionSaving}>
              Cancelar
            </AppButton>
            <AppButton type="button" variant="primary" size="sm" loading={medicionSaving} onClick={() => void handleMedicionSubmit()}>
              Registrar
            </AppButton>
          </div>
        )}
      >
        <div className="grid gap-3 md:grid-cols-2">
          <AppSelect
            label="Vasija"
            value={medicionValues.vasijaId}
            onChange={(event) => setMedicionValues((prev) => ({ ...prev, vasijaId: event.target.value }))}
          >
            <option value="">Seleccionar...</option>
            {rows.map((row) => (
              <option key={row.id} value={row.id}>{row.codigo}</option>
            ))}
          </AppSelect>
          <AppInput
            label="Fecha y hora"
            type="datetime-local"
            value={medicionValues.fecha_hora}
            onChange={(event) => setMedicionValues((prev) => ({ ...prev, fecha_hora: event.target.value }))}
            uiSize="lg"
          />
          <AppInput
            label="Volumen (l)"
            type="number"
            value={medicionValues.volumen_l}
            onChange={(event) => setMedicionValues((prev) => ({ ...prev, volumen_l: event.target.value }))}
            uiSize="lg"
          />
          <AppInput
            label="Grado alcohol"
            type="number"
            value={medicionValues.grado_alcohol}
            onChange={(event) => setMedicionValues((prev) => ({ ...prev, grado_alcohol: event.target.value }))}
            uiSize="lg"
          />
          <AppInput
            label="Azúcar residual g/l"
            type="number"
            value={medicionValues.azucar_residual_g_l}
            onChange={(event) => setMedicionValues((prev) => ({ ...prev, azucar_residual_g_l: event.target.value }))}
            uiSize="lg"
          />
        </div>

        {medicionEsFermentando ? (
          <div className="mt-4 border-t border-[color:var(--border-shell)] pt-3">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-[color:var(--feedback-warning-text)]">
              Control de fermentación — esta vasija está en fermentación
            </p>
            <div className="grid gap-3 md:grid-cols-2">
              <AppInput
                label="Densidad"
                type="number"
                value={medicionValues.densidad}
                onChange={(event) => setMedicionValues((prev) => ({ ...prev, densidad: event.target.value }))}
                uiSize="lg"
              />
              <AppInput
                label="Temperatura"
                type="number"
                value={medicionValues.temperatura}
                onChange={(event) => setMedicionValues((prev) => ({ ...prev, temperatura: event.target.value }))}
                uiSize="lg"
              />
              <AppInput
                label="Brix"
                type="number"
                value={medicionValues.brix}
                onChange={(event) => setMedicionValues((prev) => ({ ...prev, brix: event.target.value }))}
                uiSize="lg"
              />
              <AppInput
                label="pH"
                type="number"
                value={medicionValues.ph}
                onChange={(event) => setMedicionValues((prev) => ({ ...prev, ph: event.target.value }))}
                uiSize="lg"
              />
              <AppInput
                label="Acidez"
                type="number"
                value={medicionValues.acidez}
                onChange={(event) => setMedicionValues((prev) => ({ ...prev, acidez: event.target.value }))}
                uiSize="lg"
              />
              <AppInput
                label="Estado fermentación"
                value={medicionValues.estado_fermentacion}
                onChange={(event) => setMedicionValues((prev) => ({ ...prev, estado_fermentacion: event.target.value }))}
                uiSize="lg"
              />
            </div>
          </div>
        ) : null}

        <div className="mt-3">
          <AppTextarea
            label="Observaciones"
            value={medicionValues.observaciones}
            onChange={(event) => setMedicionValues((prev) => ({ ...prev, observaciones: event.target.value }))}
          />
        </div>
        {medicionError ? <NoticeBanner tone="danger" className="mt-3">{medicionError}</NoticeBanner> : null}
      </AppModal>

      <AppModal
        opened={fermentacionOpen}
        onClose={() => { if (!fermentacionSaving) setFermentacionOpen(false); }}
        title={fermentacionVasijaCodigo ? `Control de fermentación — ${fermentacionVasijaCodigo}` : "Control de fermentación"}
        size="lg"
        showHeaderDivider
        footer={(
          <div className="flex justify-end gap-2">
            <AppButton type="button" variant="secondary" size="sm" onClick={() => setFermentacionOpen(false)} disabled={fermentacionSaving}>
              Cancelar
            </AppButton>
            <AppButton type="button" variant="primary" size="sm" loading={fermentacionSaving} onClick={() => void handleFermentacionSubmit()}>
              Registrar
            </AppButton>
          </div>
        )}
      >
        <div className="grid gap-3 md:grid-cols-2">
          <AppInput
            label="Fecha y hora"
            type="datetime-local"
            value={fermentacionValues.fecha_hora}
            onChange={(event) => setFermentacionValues((prev) => ({ ...prev, fecha_hora: event.target.value }))}
            uiSize="lg"
          />
          <AppInput
            label="Densidad"
            type="number"
            value={fermentacionValues.densidad}
            onChange={(event) => setFermentacionValues((prev) => ({ ...prev, densidad: event.target.value }))}
            uiSize="lg"
          />
          <AppInput
            label="Temperatura"
            type="number"
            value={fermentacionValues.temperatura}
            onChange={(event) => setFermentacionValues((prev) => ({ ...prev, temperatura: event.target.value }))}
            uiSize="lg"
          />
          <AppInput
            label="Brix"
            type="number"
            value={fermentacionValues.brix}
            onChange={(event) => setFermentacionValues((prev) => ({ ...prev, brix: event.target.value }))}
            uiSize="lg"
          />
          <AppInput
            label="pH"
            type="number"
            value={fermentacionValues.ph}
            onChange={(event) => setFermentacionValues((prev) => ({ ...prev, ph: event.target.value }))}
            uiSize="lg"
          />
          <AppInput
            label="Acidez"
            type="number"
            value={fermentacionValues.acidez}
            onChange={(event) => setFermentacionValues((prev) => ({ ...prev, acidez: event.target.value }))}
            uiSize="lg"
          />
          <AppInput
            label="Estado fermentación"
            value={fermentacionValues.estado_fermentacion}
            onChange={(event) => setFermentacionValues((prev) => ({ ...prev, estado_fermentacion: event.target.value }))}
            uiSize="lg"
          />
        </div>
        <div className="mt-3">
          <AppTextarea
            label="Observaciones"
            value={fermentacionValues.observaciones}
            onChange={(event) => setFermentacionValues((prev) => ({ ...prev, observaciones: event.target.value }))}
          />
        </div>
        {fermentacionError ? <NoticeBanner tone="danger" className="mt-3">{fermentacionError}</NoticeBanner> : null}
      </AppModal>

      {ConfirmDialog}
    </>
  );
}
