import type { CrudField } from "../../pages/Elaboracion/components/GenericCrudSection";

export const VASIJA_TIPOS = [
  { value: "Hormigon",        label: "Hormigón" },
  { value: "AceroInoxidable", label: "Acero inoxidable" },
  { value: "Roble",           label: "Roble" },
  { value: "FibraDeVidrio",   label: "Fibra de vidrio" },
  { value: "Polietileno",     label: "Polietileno" },
  { value: "Ceramica",        label: "Cerámica / Ánfora" },
] as const;

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
  { name: "etapa",            label: "Etapa",              type: "select", options: [...OPERACION_TIPOS] },
  { name: "ubicacion",        label: "Ubicación",          type: "text" },
];
