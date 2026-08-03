import type { CrudField } from "../../pages/Elaboracion/components/GenericCrudSection";

export const VASIJA_TIPOS = [
  { value: "TanqueAceroInoxidable", label: "Tanque Acero Inoxidable" },
  { value: "VasijaHormigon",        label: "Vasija de Hormigón" },
  { value: "VasijaMamposteria",     label: "Vasija de Mampostería" },
  { value: "TanqueFibraDeVidrio",   label: "Tanque de Fibra de Vidrio" },
  { value: "TanquePRFV",            label: "Tanque PRFV" },
  { value: "BarricaRobleFrances",   label: "Barrica Roble Francés" },
  { value: "BarricaRobleAmericano", label: "Barrica Roble Americano" },
  { value: "HuevoHormigon",         label: "Huevo de Hormigón" },
  { value: "TanqueMovilInoxidable", label: "Tanque móvil inoxidable" },
  { value: "Otro",                  label: "Otro (especificar)" },
] as const;

/** Uso principal: la función para la que fue diseñada la vasija. */
export const VASIJA_USOS = [
  { value: "ingreso",                    label: "Ingreso" },
  { value: "fermentacion_alcoholica",    label: "Fermentación alcohólica" },
  { value: "fermentacion_malolactica",   label: "Fermentación maloláctica" },
  { value: "conservacion",               label: "Conservación" },
  { value: "clarificacion",              label: "Clarificación" },
  { value: "estabilizacion",             label: "Estabilización" },
  { value: "corte",                      label: "Corte" },
  { value: "preparacion_fraccionamiento",label: "Preparación para fraccionamiento" },
  { value: "pulmon_de_linea",            label: "Pulmón de línea" },
  { value: "fermentacion_en_barrica",    label: "Fermentación en barrica" },
  { value: "crianza",                    label: "Crianza" },
  { value: "microoxigenacion",           label: "Microoxigenación" },
  { value: "otro",                       label: "Otro (especificar)" },
] as const;

/** Estado actual: la operación que la vasija está realizando en este momento (dato dinámico). */
export const VASIJA_ESTADOS = [
  { value: "vacia",                      label: "Vacía" },
  { value: "disponible",                 label: "Disponible" },
  { value: "en_limpieza",                label: "En limpieza" },
  { value: "sanitizada",                 label: "Sanitizada" },
  { value: "ocupada",                    label: "Ocupada" },
  { value: "en_fermentacion",            label: "En fermentación" },
  { value: "en_maceracion",              label: "En maceración" },
  { value: "en_crianza",                 label: "En crianza" },
  { value: "en_estabilizacion",          label: "En estabilización" },
  { value: "lista_para_trasiego",        label: "Lista para trasiego" },
  { value: "lista_para_fraccionamiento", label: "Lista para fraccionamiento" },
  { value: "en_mantenimiento",           label: "En mantenimiento" },
  { value: "bloqueada",                  label: "Bloqueada" },
  { value: "fuera_de_servicio",          label: "Fuera de servicio" },
] as const;

/** Tipos de evento del historial de "Operaciones Vasija" (enum TipoOperacionVasija del backend). */
export const OPERACION_TIPOS = [
  { value: "ingreso",       label: "Ingreso" },
  { value: "fermentacion",  label: "Fermentación" },
  { value: "trasiego",      label: "Trasiego" },
  { value: "descube",       label: "Descube" },
  { value: "correccion",    label: "Corrección" },
  { value: "corte_parcial", label: "Corte parcial" },
] as const;

export const VASIJA_FIELDS: CrudField[] = [
  { name: "codigo",           label: "Código",             type: "text",   required: true },
  { name: "tipo",             label: "Tipo",               type: "select", options: [...VASIJA_TIPOS] },
  { name: "capacidad_litros", label: "Capacidad (litros)", type: "number" },
  { name: "uso",              label: "Uso",                type: "select", options: [...VASIJA_USOS] },
  {
    name: "etapa",
    label: "Etapa",
    description: "Estado actual: la operación que está realizando la vasija en este momento.",
    type: "select",
    options: [...VASIJA_ESTADOS],
  },
];
