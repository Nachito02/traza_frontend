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

export const VARIEDADES_VID: VariedadVidOption[] = [
  { value: "malbec", label: "Malbec", tipo: "tinta" },
  { value: "bonarda", label: "Bonarda", tipo: "tinta" },
  { value: "cabernet_sauvignon", label: "Cabernet Sauvignon", tipo: "tinta" },
  { value: "syrah", label: "Syrah", tipo: "tinta" },
  { value: "merlot", label: "Merlot", tipo: "tinta" },
  { value: "tempranillo", label: "Tempranillo", tipo: "tinta" },
  { value: "pinot_noir", label: "Pinot Noir", tipo: "tinta" },
  { value: "sangiovese", label: "Sangiovese", tipo: "tinta" },
  { value: "aspiran_bouschet", label: "Aspirant Bouschet", tipo: "tinta" },
  { value: "pedro_gimenez", label: "Pedro Gimenez", tipo: "blanca" },
  { value: "torrontes_riojano", label: "Torrontes Riojano", tipo: "blanca" },
  { value: "torrontes_sanjuanino", label: "Torrontes Sanjuanino", tipo: "blanca" },
  { value: "chardonnay", label: "Chardonnay", tipo: "blanca" },
  { value: "sauvignon_blanc", label: "Sauvignon Blanc", tipo: "blanca" },
  { value: "chenin", label: "Chenin", tipo: "blanca" },
  { value: "semillon", label: "Semillon", tipo: "blanca" },
  { value: "viognier", label: "Viognier", tipo: "blanca" },
  { value: "ugni_blanc", label: "Ugni Blanc", tipo: "blanca" },
  { value: "cereza", label: "Cereza", tipo: "rosada" },
  { value: "criolla_grande", label: "Criolla Grande", tipo: "rosada" },
  { value: "moscatel_rosado", label: "Moscatel Rosado", tipo: "rosada" },
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
  { value: "aspersion", label: "Aspersión" },
  { value: "microaspersion", label: "Microaspersión" },
  { value: "secano", label: "Secano" },
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
