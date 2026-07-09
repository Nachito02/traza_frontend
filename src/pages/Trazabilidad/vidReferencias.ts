// Catálogo estandarizado de enfermedades y plagas de la vid, tomado del documento
// "PLAGAS ENFERMEDADES PRODUCTOS". Se usa como picklist en los eventos de
// monitoreo (el valor guardado es el nombre; el label agrega el agente causal).

export type ReferenciaVid = { value: string; label: string };

export const ENFERMEDADES_VID: ReferenciaVid[] = [
  { value: "Oídio", label: "Oídio — Erysiphe necator" },
  { value: "Yesca", label: "Yesca — Complejo de hongos de madera" },
  { value: "Botrytis", label: "Botrytis — Botrytis cinerea" },
  { value: "Mildiu", label: "Mildiu — Plasmopara viticola" },
  { value: "Podredumbre ácida", label: "Podredumbre ácida — Levaduras y bacterias" },
  { value: "Eutipiosis", label: "Eutipiosis — Eutypa lata" },
  { value: "Brazo negro", label: "Brazo negro — Botryosphaeriaceae" },
  { value: "Enrollado de la vid", label: "Enrollado de la vid — Virus GLRaV" },
  { value: "Fanleaf", label: "Fanleaf — Nepovirus" },
];

export const PLAGAS_VID: ReferenciaVid[] = [
  { value: "Lobesia botrana", label: "Lobesia botrana — Lepidóptero" },
  { value: "Arañuela roja", label: "Arañuela roja — Tetranychus urticae" },
  { value: "Cochinillas", label: "Cochinillas — Pseudococcidae" },
  { value: "Trips", label: "Trips — Thysanoptera" },
  { value: "Filoxera", label: "Filoxera — Phylloxera vitifoliae" },
  { value: "Xiphinema index", label: "Xiphinema index — Nematodo" },
  { value: "Meloidogyne spp.", label: "Meloidogyne spp. — Nematodo agallador" },
];
