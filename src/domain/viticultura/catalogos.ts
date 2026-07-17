export type TipoVariedadVid = "tinta" | "blanca" | "rosada";

export type VariedadVidOption = {
  value: string;
  label: string;
  tipo: TipoVariedadVid;
};

export const TIPO_VARIEDAD_OPTIONS: Array<{ value: TipoVariedadVid; label: string }> = [
  { value: "tinta", label: "Tinta" },
  { value: "blanca", label: "Blanca" },
  { value: "rosada", label: "Rosada" },
];

// Valor centinela para "otra variedad" / "otro sistema": al elegirlo, el
// formulario muestra un campo de texto libre y guarda ese texto como valor real.
export const OTRA_VARIEDAD_VALUE = "otra";
export const OTRO_RIEGO_VALUE = "otro";

export const VARIEDADES_VID: VariedadVidOption[] = [
  { value: "malbec", label: "Malbec", tipo: "tinta" },
  { value: "bonarda", label: "Bonarda Argentina", tipo: "tinta" },
  { value: "cabernet_sauvignon", label: "Cabernet Sauvignon", tipo: "tinta" },
  { value: "syrah", label: "Syrah", tipo: "tinta" },
  { value: "merlot", label: "Merlot", tipo: "tinta" },
  { value: "tempranillo", label: "Tempranillo", tipo: "tinta" },
  { value: "pinot_noir", label: "Pinot Noir", tipo: "tinta" },
  { value: "ancellotta", label: "Ancellotta", tipo: "tinta" },
  { value: "cabernet_franc", label: "Cabernet Franc", tipo: "tinta" },
  { value: "sangiovese", label: "Sangiovese", tipo: "tinta" },
  { value: "aspiran_bouschet", label: "Aspirant Bouschet", tipo: "tinta" },
  { value: "pedro_gimenez", label: "Pedro Giménez", tipo: "blanca" },
  { value: "torrontes_riojano", label: "Torrontés Riojano", tipo: "blanca" },
  { value: "torrontes_sanjuanino", label: "Torrontés Sanjuanino", tipo: "blanca" },
  { value: "chardonnay", label: "Chardonnay", tipo: "blanca" },
  { value: "sauvignon_blanc", label: "Sauvignon Blanc", tipo: "blanca" },
  { value: "chenin", label: "Chenin", tipo: "blanca" },
  { value: "semillon", label: "Semillón", tipo: "blanca" },
  { value: "viognier", label: "Viognier", tipo: "blanca" },
  { value: "ugni_blanc", label: "Ugni Blanc", tipo: "blanca" },
  { value: "riesling", label: "Riesling", tipo: "blanca" },
  { value: "cereza", label: "Cereza", tipo: "rosada" },
  { value: "criolla_grande", label: "Criolla Grande", tipo: "rosada" },
  { value: "criolla_mediana", label: "Criolla Mediana", tipo: "rosada" },
  { value: "criolla_chica", label: "Criolla Chica", tipo: "rosada" },
  { value: "criolla_n1", label: "Criolla N°1", tipo: "rosada" },
  { value: "moscatel_rosado", label: "Moscatel Rosado", tipo: "rosada" },
  { value: "moscatel_amarillo", label: "Moscatel Amarillo", tipo: "rosada" },
  { value: "moscatel_de_austria", label: "Moscatel de Austria", tipo: "rosada" },
  { value: "canela", label: "Canela", tipo: "rosada" },
];

export const MANEJO_CULTIVO_OPTIONS = [
  { value: "convencional", label: "Manejo convencional" },
  { value: "organico_ecologico", label: "Manejo orgánico / ecológico" },
  { value: "regenerativo", label: "Manejo regenerativo" },
  { value: "labranza_cero_cobertura_vegetal", label: "Labranza cero / cobertura vegetal" },
  { value: "biodinamica", label: "Biodinámica" },
];

export const SISTEMA_RIEGO_OPTIONS = [
  { value: "goteo", label: "Goteo" },
  { value: "surco", label: "Surco" },
  { value: "manto", label: "Manto" },
  { value: "aspersion", label: "Aspersión" },
  { value: "microaspersion", label: "Microaspersión" },
];

export const SISTEMA_CONDUCCION_OPTIONS = [
  { value: "espaldera", label: "Espaldera" },
  { value: "parral", label: "Parral" },
  { value: "vaso", label: "Vaso" },
  { value: "guyot", label: "Guyot" },
  { value: "cordon_bilateral_doble_cordon", label: "Cordón bilateral / doble cordón" },
  { value: "cordon_unilateral", label: "Cordón unilateral" },
];

export function getVariedadesByTipo(tipo: TipoVariedadVid) {
  return VARIEDADES_VID.filter((variedad) => variedad.tipo === tipo);
}

export function getVariedadLabel(value?: string | null) {
  if (!value) return "-";
  return VARIEDADES_VID.find((variedad) => variedad.value === value)?.label ?? value;
}

export function getTipoVariedadForVariedad(value?: string | null): TipoVariedadVid {
  const tipo = VARIEDADES_VID.find((variedad) => variedad.value === value)?.tipo;
  return tipo ?? "tinta";
}

export function getManejoCultivoLabel(value?: string | null) {
  if (!value) return "-";
  return MANEJO_CULTIVO_OPTIONS.find((option) => option.value === value)?.label ?? value;
}

export function getSistemaRiegoLabel(value?: string | null) {
  if (!value) return "-";
  return SISTEMA_RIEGO_OPTIONS.find((option) => option.value === value)?.label ?? value;
}

export function getSistemaConduccionLabel(value?: string | null) {
  if (!value) return "-";
  return SISTEMA_CONDUCCION_OPTIONS.find((option) => option.value === value)?.label ?? value;
}

// True si el valor corresponde a una opción del catálogo. Se usa al editar para
// decidir si preseleccionar "Otra/Otro" y mostrar el texto libre guardado.
export function isKnownVariedad(value?: string | null) {
  return !!value && VARIEDADES_VID.some((variedad) => variedad.value === value);
}

export function isKnownSistemaRiego(value?: string | null) {
  return !!value && SISTEMA_RIEGO_OPTIONS.some((option) => option.value === value);
}
