// ─── Roles ───────────────────────────────────────────────────────────────────
// Single source of truth lives in src/lib/permissions.ts — re-exported here
// with the names this module's consumers already import.

export {
  GLOBAL_ADMIN_ROLES as GLOBAL_MANAGER_ROLES,
  BODEGA_ROLES as BODEGA_MANAGER_ROLES,
  OPERATOR_ROLES,
} from "../../lib/permissions";

/** Roles that grant finca-management access (subset of FINCA_ROLES). */
export const FINCA_MANAGER_ROLES = ["encargado_finca"];

// ─── Tipos propios del módulo ─────────────────────────────────────────────────

export type ProtocoloTaskOption = {
  value: string;
  label: string;
  titulo: string;
  eventoTipo: string;
  etapaLabel: string;
  protocoloLabel: string;
  ordenEtapa: number;
  ordenProceso: number;
};

export type OperacionCategoria =
  | "recepcion"
  | "vasijas"
  | "cortes"
  | "fraccionamiento"
  | "qr";

export type OperacionTaskTemplate = {
  id: string;
  categoria: OperacionCategoria;
  titulo: string;
  label: string;
};

// ─── Catálogo de operaciones bodega ──────────────────────────────────────────

export const OPERACION_CATEGORY_OPTIONS: Array<{ value: OperacionCategoria; label: string }> = [
  { value: "recepcion",      label: "Ingreso de uva" },
  { value: "vasijas",        label: "Vasijas y Proceso" },
  { value: "cortes",         label: "Cortes y Producto" },
  { value: "fraccionamiento", label: "Fraccionamiento y Despacho" },
  { value: "qr",             label: "Producto y Trazabilidad" },
];

export const OPERACION_TASK_TEMPLATES: OperacionTaskTemplate[] = [
  { id: "remito_uva",          categoria: "recepcion",       titulo: "Remito Uva",              label: "Remito Uva" },
  { id: "recepcion_bodega",    categoria: "recepcion",       titulo: "Recepción Bodega",         label: "Recepción Bodega" },
  { id: "analisis_recepcion",  categoria: "recepcion",       titulo: "Análisis Recepción",       label: "Análisis Recepción" },
  { id: "ciu",                 categoria: "recepcion",       titulo: "CIU",                      label: "CIU" },
  { id: "vasija",              categoria: "vasijas",         titulo: "Vasija",                   label: "Vasija" },
  { id: "operacion_vasija",    categoria: "vasijas",         titulo: "Operación Vasija",         label: "Operación Vasija" },
  { id: "existencia_vasija",   categoria: "vasijas",         titulo: "Existencia Vasija",        label: "Existencia Vasija" },
  { id: "control_fermentacion", categoria: "vasijas",        titulo: "Control Fermentación",     label: "Control Fermentación" },
  { id: "corte",               categoria: "cortes",          titulo: "Corte",                    label: "Corte" },
  { id: "producto",            categoria: "cortes",          titulo: "Producto",                 label: "Producto" },
  { id: "lote_fraccionamiento", categoria: "fraccionamiento", titulo: "Lote Fraccionamiento",   label: "Lote Fraccionamiento" },
  { id: "codigo_envase",       categoria: "fraccionamiento", titulo: "Código de Envase",         label: "Código de Envase" },
  { id: "despacho",            categoria: "fraccionamiento", titulo: "Despacho",                 label: "Despacho" },
  { id: "producto_trazabilidad", categoria: "qr",            titulo: "Producto y Trazabilidad",  label: "Producto y Trazabilidad" },
];

/** Mapea cada id de tarea de catálogo a su ruta en la app de operación. */
export const OPERACION_TASK_ROUTES: Record<string, string> = {
  remito_uva:           "/operacion/recepcion?section=remito",
  recepcion_bodega:     "/operacion/recepcion?section=recepcion",
  analisis_recepcion:   "/operacion/recepcion?section=analisis",
  ciu:                  "/operacion/recepcion?paso=ciu",
  vasija:               "/operacion/vasijas?section=vasijas",
  operacion_vasija:     "/operacion/vasijas?section=operaciones",
  existencia_vasija:    "/operacion/vasijas?section=existencias",
  control_fermentacion: "/operacion/vasijas?section=fermentacion",
  corte:                "/operacion/cortes?section=cortes",
  producto:             "/operacion/cortes?section=productos",
  lote_fraccionamiento: "/operacion/fraccionamiento?section=lotes",
  codigo_envase:        "/operacion/fraccionamiento?section=codigos",
  despacho:             "/operacion/fraccionamiento?section=despachos",
  producto_trazabilidad: "/operacion/qr",
};

// ─── Misc ─────────────────────────────────────────────────────────────────────

/** Clave de localStorage para recordar el scope preferido (finca / bodega). */
export const OPERACION_SCOPE_STORAGE_KEY = "operacion_scope";

/** Tipos de evento que exigen finca + cuartel (actividad puntual sobre un cuartel). */
export const FINCA_PRODUCCION_EVENT_TYPES = new Set([
  "riego",
  "cosecha",
  "fenologia",
  "fertilizacion",
  "labor_suelo",
  "canopia",
  "aplicacion_fitosanitaria",
  "monitoreo_enfermedad",
  "monitoreo_plaga",
  "analisis_suelo",
  "precipitacion",
]);

/** Tipos de evento que exigen al menos una finca (el cuartel es opcional). */
export const FINCA_REQUERIDA_EVENT_TYPES = new Set([
  "enmienda",
  "inventario_insumos",
  "energia",
  "cobertura_erosion",
  "limpieza_cosecha",
  "mantenimiento",
  "residuo",
  "sanitizacion_banos",
  "sobrante_lavado",
  "origen_unidad_productiva",
  "entrega_epp",
  "accidente",
  "capacitacion",
  "no_conforme",
  "reclamo",
]);

/** Tipos de evento que solo aplican en el flujo de setup inicial. */
export const SETUP_ONLY_EVENT_TYPES = new Set([
  "origen_unidad_productiva",
]);
