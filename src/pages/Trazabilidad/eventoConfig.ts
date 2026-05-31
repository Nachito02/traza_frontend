export type FieldType = "date" | "text" | "number" | "textarea" | "select" | "user_select";

export type FieldDef = {
  name: string;
  label: string;
  type: FieldType;
  required?: boolean;
  step?: string;
  placeholder?: string;
  defaultValue?: string;
  options?: { value: string; label: string }[];
  optionsSource?: "bodegas";
  /** Muestra este campo solo cuando otro campo tiene el valor indicado */
  showWhen?: { field: string; value: string };
};

export type EventoConfig = {
  label: string;
  fields: FieldDef[];
};

export const EVENTO_CONFIG: Record<string, EventoConfig> = {
  origen_unidad_productiva: {
    label: "Origen / unidad productiva",
    fields: [
      { name: "fecha", label: "Fecha", type: "date", required: true },
      {
        name: "productor_razon_social",
        label: "Productor / Razón social",
        type: "text",
        required: true,
      },
      { name: "localidad", label: "Localidad", type: "text", required: true },
      { name: "provincia", label: "Provincia", type: "text", required: true },
      { name: "codigo_cuartel", label: "Código de cuartel", type: "text", required: true },
      {
        name: "superficie_ha",
        label: "Superficie (ha)",
        type: "number",
        required: true,
        step: "0.01",
      },
      { name: "cultivo", label: "Cultivo", type: "text", required: true },
      { name: "variedad", label: "Variedad", type: "text", required: true },
      { name: "sistema_productivo", label: "Manejo de cultivo", type: "text" },
      { name: "sistema_riego", label: "Sistema de riego", type: "text" },
      { name: "sistema_conduccion", label: "Sistema de conducción", type: "text" },
      { name: "coordenadas", label: "Coordenadas / polígono", type: "textarea" },
      { name: "responsable_user_id", label: "Responsable", type: "user_select" },
    ],
  },
  riego: {
    label: "Riego",
    fields: [
      { name: "fecha", label: "Fecha", type: "date", required: true },
      { name: "volumen", label: "Volumen aplicado", type: "number", required: true, step: "0.01" },
      {
        name: "unidad",
        label: "Unidad",
        type: "select",
        required: true,
        options: [
          { value: "m3", label: "m³" },
          { value: "mm", label: "mm" },
          { value: "litros", label: "Litros" },
        ],
      },
      { name: "tiempo_horas", label: "Tiempo de riego (horas)", type: "number", required: true, step: "0.01" },
      {
        name: "sistema_riego",
        label: "Sistema de riego",
        type: "select",
        options: [
          { value: "goteo", label: "Goteo" },
          { value: "aspersion", label: "Aspersión" },
          { value: "surco", label: "Surco" },
          { value: "otro", label: "Otro" },
        ],
      },
      { name: "jornales", label: "Jornales", type: "number", step: "0.01" },
      { name: "responsable_user_id", label: "Responsable", type: "user_select" },
    ],
  },
  cosecha: {
    label: "Cosecha",
    fields: [
      { name: "fecha_cosecha", label: "Fecha de cosecha", type: "date", required: true },
      { name: "cantidad", label: "Cantidad", type: "number", required: true, step: "0.01" },
      {
        name: "unidad",
        label: "Unidad",
        type: "select",
        required: true,
        options: [
          { value: "kg", label: "Kg" },
          { value: "quintales", label: "Quintales" },
          { value: "tachos", label: "Tachos" },
        ],
      },
      { name: "destino", label: "Destino", type: "select", required: true, optionsSource: "bodegas" },
      { name: "jornales", label: "Jornales", type: "number", step: "0.01" },
      { name: "responsable_user_id", label: "Responsable", type: "user_select" },
    ],
  },
  fenologia: {
    label: "Fenología",
    fields: [
      { name: "fecha", label: "Fecha", type: "date", required: true },
      { name: "estado_fenologico", label: "Estado fenológico", type: "text", required: true },
      { name: "porcentaje_avance", label: "Porcentaje de avance", type: "number", step: "0.01" },
      { name: "brix", label: "Grados Brix", type: "number", step: "0.01" },
    ],
  },
  fertilizacion: {
    label: "Fertilización",
    fields: [
      { name: "fecha", label: "Fecha", type: "date", required: true },
      { name: "producto_fuente", label: "Producto / fuente nutricional", type: "text", required: true, placeholder: "Ej: Urea, Nitrato de calcio, Guano..." },
      { name: "dosis", label: "Dosis", type: "number", required: true, step: "0.01" },
      {
        name: "unidad",
        label: "Unidad",
        type: "select",
        required: true,
        options: [
          { value: "kg/ha", label: "kg/ha" },
          { value: "l/ha", label: "l/ha" },
          { value: "kg", label: "kg" },
          { value: "litros", label: "Litros" },
        ],
      },
      {
        name: "metodo",
        label: "Método de aplicación",
        type: "select",
        required: true,
        options: [
          { value: "fertirriego", label: "Fertirriego" },
          { value: "foliar", label: "Foliar" },
          { value: "incorporado", label: "Incorporado" },
          { value: "voleo", label: "Voleo" },
          { value: "otro", label: "Otro" },
        ],
      },
      { name: "responsable_user_id", label: "Responsable", type: "user_select" },
    ],
  },
  labor_suelo: {
    label: "Labor de suelo",
    fields: [
      { name: "fecha", label: "Fecha", type: "date", required: true },
      {
        name: "tipo_labor",
        label: "Tipo de labor",
        type: "select",
        required: true,
        options: [
          { value: "rastrear", label: "Rastrear" },
          { value: "subsolar", label: "Subsolar" },
          { value: "desmalezar", label: "Desmalezar" },
          { value: "otro", label: "Otro" },
        ],
      },
      {
        name: "otro_labor",
        label: "Especificar labor",
        type: "text",
        required: true,
        placeholder: "Describí la labor realizada",
        showWhen: { field: "tipo_labor", value: "otro" },
      },
      { name: "tractor", label: "Tractor", type: "text" },
      { name: "combustible_litros", label: "Combustible (litros)", type: "number", step: "0.01" },
      { name: "horas", label: "Horas", type: "number", step: "0.01" },
      { name: "jornales", label: "Jornales", type: "number", step: "0.01" },
      { name: "observaciones", label: "Observaciones", type: "textarea" },
      { name: "responsable_user_id", label: "Responsable", type: "user_select" },
    ],
  },
  canopia: {
    label: "Canopia",
    fields: [
      { name: "fecha", label: "Fecha", type: "date", required: true },
      {
        name: "tipo_practica",
        label: "Tipo de práctica",
        type: "select",
        required: true,
        options: [
          { value: "poda", label: "Poda" },
          { value: "desbrote", label: "Desbrote" },
          { value: "despampanado", label: "Despampanado" },
          { value: "raleo", label: "Raleo" },
          { value: "otro", label: "Otro" },
        ],
      },
      {
        name: "otro_practica",
        label: "Especificar práctica",
        type: "text",
        required: true,
        placeholder: "Describí la práctica realizada",
        showWhen: { field: "tipo_practica", value: "otro" },
      },
      { name: "jornales", label: "Jornales", type: "number", step: "0.01" },
      { name: "observaciones", label: "Observaciones", type: "textarea" },
      { name: "responsable_user_id", label: "Responsable", type: "user_select" },
    ],
  },
  aplicacion_fitosanitaria: {
    label: "Aplicación fitosanitaria",
    fields: [
      { name: "fecha", label: "Fecha", type: "date", required: true },
      { name: "dosis", label: "Dosis", type: "number", required: true },
      { name: "unidad", label: "Unidad", type: "text", required: true },
      { name: "carencia_dias", label: "Carencia (días)", type: "number", required: true },
      { name: "principio_activo", label: "Principio activo", type: "text" },
      { name: "insumo_lote_id", label: "Insumo lote (ID)", type: "text" },
      { name: "motivo", label: "Motivo", type: "text" },
    ],
  },
  monitoreo_enfermedad: {
    label: "Monitoreo de enfermedad",
    fields: [
      { name: "fecha", label: "Fecha", type: "date", required: true },
      { name: "enfermedad", label: "Enfermedad", type: "text", required: true },
      { name: "incidencia", label: "Incidencia", type: "text" },
    ],
  },
  monitoreo_plaga: {
    label: "Monitoreo de plaga",
    fields: [
      { name: "fecha", label: "Fecha", type: "date", required: true },
      { name: "plaga", label: "Plaga", type: "text", required: true },
      { name: "nivel", label: "Nivel", type: "text" },
    ],
  },
  enmienda: {
    label: "Enmienda",
    fields: [
      { name: "fecha", label: "Fecha", type: "date", required: true },
      {
        name: "tipo",
        label: "Tipo de enmienda",
        type: "select",
        required: true,
        options: [
          { value: "guano_gallina", label: "Guano de gallina" },
          { value: "guano_cabra", label: "Guano de cabra" },
          { value: "guano_caballo", label: "Guano de caballo" },
          { value: "lombricompuesto", label: "Lombricompuesto" },
          { value: "compost", label: "Compost" },
          { value: "otro", label: "Otro (describir en observaciones)" },
        ],
      },
      { name: "dosis", label: "Dosis", type: "number", required: true, step: "0.01" },
      {
        name: "unidad",
        label: "Unidad",
        type: "select",
        required: true,
        options: [
          { value: "kg/ha", label: "kg/ha" },
          { value: "ton/ha", label: "ton/ha" },
          { value: "kg", label: "kg" },
          { value: "litros", label: "litros" },
        ],
      },
      { name: "observaciones", label: "Observaciones", type: "textarea" },
      { name: "responsable_user_id", label: "Responsable", type: "user_select", required: true },
    ],
  },
  cobertura_erosion: {
    label: "Cobertura / Erosión",
    fields: [
      { name: "fecha", label: "Fecha", type: "date", required: true },
      {
        name: "tipo_cobertura",
        label: "Tipo de cobertura",
        type: "select",
        required: true,
        options: [
          { value: "vicia", label: "Verdeo — Vicia" },
          { value: "cebada", label: "Verdeo — Cebada" },
          { value: "centeno", label: "Verdeo — Centeno" },
          { value: "mulch", label: "Mulch" },
          { value: "otro", label: "Otro (describir en observaciones)" },
        ],
      },
      { name: "dosis", label: "Dosis (kg/ha)", type: "number", step: "0.01" },
      { name: "manejo", label: "Manejo aplicado", type: "textarea" },
      { name: "observaciones", label: "Observaciones", type: "textarea" },
      { name: "responsable_user_id", label: "Responsable", type: "user_select", required: true },
    ],
  },
  analisis_suelo: {
    label: "Análisis de suelo",
    fields: [
      { name: "fecha", label: "Fecha", type: "date", required: true },
      { name: "unidad_muestreada", label: "Unidad muestreada", type: "text", required: true, placeholder: "Ej: Cuartel Norte, bloque A" },
      { name: "laboratorio", label: "Origen / laboratorio", type: "text", placeholder: "Ej: Lab. Suelos Mendoza" },
      { name: "parametros_analizados", label: "Parámetros analizados", type: "textarea", placeholder: "Ej: pH, materia orgánica, nitrógeno, fósforo, potasio..." },
    ],
  },
  precipitacion: {
    label: "Precipitación",
    fields: [
      { name: "fecha", label: "Fecha", type: "date", required: true },
      { name: "milimetros", label: "Milímetros", type: "number", required: true, step: "0.01" },
    ],
  },
  energia_riego: {
    label: "Gasto energético para riego",
    fields: [
      { name: "fecha", label: "Fecha", type: "date", required: true },
      { name: "periodo", label: "Período", type: "text", required: true },
      {
        name: "tipo_energia",
        label: "Tipo de energía",
        type: "select",
        required: true,
        options: [
          { value: "electrica", label: "Eléctrica" },
          { value: "combustible", label: "Combustible" },
        ],
      },
      { name: "consumo", label: "Consumo", type: "number", required: true, step: "0.01" },
      {
        name: "unidad",
        label: "Unidad",
        type: "select",
        required: true,
        options: [
          { value: "kWh", label: "kWh" },
          { value: "litros", label: "Litros" },
        ],
      },
    ],
  },
  energia_heladas: {
    label: "Gasto energético para defensa contra heladas",
    fields: [
      { name: "fecha", label: "Fecha", type: "date", required: true },
      { name: "periodo", label: "Periodo", type: "text", required: true },
      {
        name: "tipo_energia",
        label: "Tipo de energía",
        type: "select",
        required: true,
        options: [
          { value: "electrica", label: "Eléctrica" },
          { value: "combustible", label: "Combustible" },
        ],
      },
      { name: "consumo", label: "Consumo", type: "number", required: true, step: "0.01" },
      {
        name: "unidad",
        label: "Unidad",
        type: "select",
        required: true,
        options: [
          { value: "kWh", label: "kWh" },
          { value: "litros", label: "Litros" },
        ],
      },
    ],
  },
  inventario_insumos: {
    label: "Inventario de insumos y productos caducados",
    fields: [
      { name: "fecha", label: "Fecha", type: "date", required: true },
      { name: "producto", label: "Producto", type: "text", required: true },
      { name: "cantidad", label: "Cantidad", type: "number", required: true, step: "0.01" },
      { name: "fecha_vencimiento", label: "Fecha de vencimiento", type: "date" },
      {
        name: "estado",
        label: "Estado",
        type: "select",
        required: true,
        options: [
          { value: "vigente", label: "Vigente" },
          { value: "bloqueado", label: "Bloqueado" },
          { value: "vencido", label: "Vencido" },
        ],
      },
      { name: "responsable_user_id", label: "Responsable", type: "user_select" },
    ],
  },
  accidente: {
    label: "Accidente",
    fields: [
      { name: "fecha", label: "Fecha", type: "date", required: true },
      { name: "tipo", label: "Tipo de accidente", type: "text", required: true },
      { name: "accidentado_user_id", label: "Accidentado", type: "user_select", required: true },
      { name: "accion_correctiva", label: "Acción correctiva", type: "textarea" },
    ],
  },
  capacitacion: {
    label: "Capacitación",
    fields: [
      { name: "fecha", label: "Fecha", type: "date", required: true },
      { name: "tema", label: "Tema", type: "text", required: true },
      { name: "responsable_user_id", label: "Responsable", type: "user_select", required: true },
    ],
  },
  entrega_epp: {
    label: "Entrega EPP",
    fields: [
      { name: "fecha", label: "Fecha", type: "date", required: true },
      { name: "receptor_user_id", label: "Receptor", type: "user_select", required: true },
      { name: "epp", label: "EPP", type: "text", required: true },
    ],
  },
  limpieza_cosecha: {
    label: "Limpieza de cosecha",
    fields: [
      { name: "fecha", label: "Fecha", type: "date", required: true },
      { name: "elemento", label: "Elemento", type: "text", required: true },
      { name: "metodo", label: "Método", type: "text" },
      { name: "responsable_user_id", label: "Responsable", type: "user_select" },
    ],
  },
  mantenimiento: {
    label: "Mantenimiento",
    fields: [
      { name: "fecha", label: "Fecha", type: "date", required: true },
      { name: "equipo", label: "Equipo", type: "text", required: true },
      { name: "tipo_mantenimiento", label: "Tipo", type: "text", required: true },
      { name: "responsable_user_id", label: "Responsable", type: "user_select" },
    ],
  },
  no_conforme: {
    label: "No conforme",
    fields: [
      { name: "fecha", label: "Fecha", type: "date", required: true },
      { name: "descripcion", label: "Descripción", type: "textarea", required: true },
      { name: "estado", label: "Estado", type: "text", defaultValue: "abierta" },
      { name: "accion_correctiva", label: "Acción correctiva", type: "textarea" },
      { name: "responsable_user_id", label: "Responsable", type: "user_select", required: true },
    ],
  },
  reclamo: {
    label: "Reclamo",
    fields: [
      { name: "fecha", label: "Fecha", type: "date", required: true },
      { name: "origen", label: "Origen", type: "text", required: true },
      { name: "descripcion", label: "Descripción", type: "textarea" },
      { name: "estado", label: "Estado", type: "text", defaultValue: "abierto" },
      { name: "responsable_user_id", label: "Responsable", type: "user_select", required: true },
    ],
  },
  residuo: {
    label: "Residuo",
    fields: [
      { name: "fecha", label: "Fecha", type: "date", required: true },
      { name: "tipo_residuo", label: "Tipo de residuo", type: "text", required: true },
      { name: "cantidad", label: "Cantidad", type: "number", step: "0.01" },
      { name: "unidad", label: "Unidad", type: "text" },
      { name: "destino", label: "Destino", type: "text", required: true },
      { name: "responsable_user_id", label: "Responsable", type: "user_select" },
    ],
  },
  sanitizacion_banos: {
    label: "Sanitización de baños",
    fields: [
      { name: "fecha", label: "Fecha", type: "date", required: true },
      { name: "tipo_bano", label: "Tipo de baño", type: "text", required: true },
      {
        name: "checklist",
        label: "Checklist (JSON)",
        type: "textarea",
        placeholder: "{\"lavado\": true}",
      },
      { name: "responsable_user_id", label: "Responsable", type: "user_select" },
    ],
  },
  sobrante_lavado: {
    label: "Sobrante de lavado",
    fields: [
      { name: "fecha", label: "Fecha", type: "date", required: true },
      {
        name: "tipo_sobrante",
        label: "Tipo",
        type: "select",
        required: true,
        options: [
          { value: "sobrante_caldo", label: "Sobrante de caldo" },
          { value: "lavado_pulverizadora", label: "Lavado de pulverizadora" },
        ],
      },
      { name: "volumen", label: "Volumen (litros)", type: "number", required: true, step: "0.01" },
      {
        name: "disposicion",
        label: "Forma de disposición",
        type: "select",
        required: true,
        options: [
          { value: "aplicado_campo", label: "Aplicado a campo" },
          { value: "neutralizado", label: "Neutralizado" },
          { value: "retencion", label: "Pileta de retención" },
          { value: "otro", label: "Otro (describir en observaciones)" },
        ],
      },
      { name: "observaciones", label: "Observaciones", type: "textarea" },
      { name: "responsable_user_id", label: "Responsable", type: "user_select", required: true },
    ],
  },
};
