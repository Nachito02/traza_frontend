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
      { name: "sistema_productivo", label: "Sistema productivo", type: "text" },
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
      { name: "volumen", label: "Volumen", type: "number", required: true, step: "0.01" },
      { name: "unidad", label: "Unidad", type: "text", required: true, defaultValue: "m3" },
      { name: "sistema_riego", label: "Sistema de riego", type: "text", defaultValue: "goteo" },
      { name: "tiempo_horas", label: "Tiempo (horas)", type: "number", required: true, step: "0.01" },
    ],
  },
  cosecha: {
    label: "Cosecha",
    fields: [
      { name: "fecha_cosecha", label: "Fecha de cosecha", type: "date", required: true },
      { name: "cantidad", label: "Cantidad", type: "number", required: true, step: "0.01" },
      { name: "unidad", label: "Unidad", type: "text", required: true, defaultValue: "kg" },
      { name: "destino", label: "Destino", type: "text", required: true, defaultValue: "bodega" },
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
      { name: "dosis", label: "Dosis", type: "number", required: true },
      { name: "unidad", label: "Unidad", type: "text", required: true },
      {
        name: "metodo",
        label: "Método",
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
      { name: "cantidad_total", label: "Cantidad total", type: "number" },
      { name: "insumo_id", label: "Insumo (ID)", type: "text" },
    ],
  },
  labor_suelo: {
    label: "Labor de suelo",
    fields: [
      { name: "fecha", label: "Fecha", type: "date", required: true },
      { name: "tipo_labor", label: "Tipo de labor", type: "text", required: true },
      { name: "intensidad", label: "Intensidad", type: "text", required: true },
      { name: "horas", label: "Horas", type: "number", step: "0.01" },
      { name: "hs_por_ha", label: "Hs por ha", type: "number", step: "0.01" },
      { name: "total_horas_cuartel", label: "Total horas cuartel", type: "number", step: "0.01" },
    ],
  },
  canopia: {
    label: "Canopia",
    fields: [
      { name: "fecha", label: "Fecha", type: "date", required: true },
      { name: "tipo_practica", label: "Tipo de práctica", type: "text", required: true },
      { name: "intensidad", label: "Intensidad", type: "text" },
      { name: "jornales", label: "Jornales", type: "number", step: "0.01" },
      { name: "observaciones", label: "Observaciones", type: "textarea" },
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
      { name: "tipo", label: "Tipo (ej: cal, yeso)", type: "text", required: true },
      { name: "dosis", label: "Dosis", type: "number", step: "0.01" },
      {
        name: "unidad",
        label: "Unidad",
        type: "select",
        options: [
          { value: "kg/ha", label: "kg/ha" },
          { value: "ton/ha", label: "ton/ha" },
          { value: "kg", label: "kg" },
          { value: "litros", label: "litros" },
        ],
      },
      { name: "responsable_user_id", label: "Responsable", type: "user_select", required: true },
    ],
  },
  cobertura_erosion: {
    label: "Cobertura / Erosión",
    fields: [
      { name: "fecha", label: "Fecha", type: "date", required: true },
      { name: "tipo_cobertura", label: "Tipo de cobertura (ej: mulch)", type: "text", required: true },
      { name: "manejo", label: "Manejo / descripción", type: "textarea" },
      { name: "responsable_user_id", label: "Responsable", type: "user_select", required: true },
    ],
  },
  analisis_suelo: {
    label: "Análisis de suelo",
    fields: [
      { name: "fecha", label: "Fecha", type: "date", required: true },
      { name: "unidad_muestreada", label: "Unidad muestreada", type: "text", required: true },
      { name: "laboratorio", label: "Laboratorio", type: "text" },
      {
        name: "parametros",
        label: "Parámetros (JSON)",
        type: "textarea",
        placeholder: "{\"ph\": 6.8}",
      },
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
      { name: "tipo_sobrante", label: "Tipo", type: "text", required: true },
      { name: "volumen", label: "Volumen", type: "number", step: "0.01" },
      { name: "disposicion", label: "Disposición", type: "text" },
      { name: "responsable_user_id", label: "Responsable", type: "user_select" },
    ],
  },
};
