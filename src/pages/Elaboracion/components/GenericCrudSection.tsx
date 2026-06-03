import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import {
  createElaboracionResource,
  deleteElaboracionResource,
  listElaboracionResource,
  patchElaboracionResource,
  type ElaboracionEntity,
  type ElaboracionResourceKey,
} from "../../../features/elaboracion/api";
import {
  AppButton,
  AppCard,
  GuidedState,
  AppInput,
  AppModal,
  AppSelect,
  AppTextarea,
  NoticeBanner,
  SectionIntro,
  useAppNotifications,
} from "../../../components/ui";
import { getApiErrorMessage } from "../../../lib/api";

export type SelectOption = {
  label: string;
  value: string;
};

type FieldType = "text" | "textarea" | "number" | "date" | "datetime-local" | "checkbox" | "select";
type FieldErrors = Record<string, string>;
type ValidationResult = string | { fieldErrors?: FieldErrors; formError?: string } | null;

export type CrudField = {
  name: string;
  label: string;
  type: FieldType;
  required?: boolean;
  placeholder?: string;
  options?: SelectOption[];
  getOptions?: (values: Record<string, string | boolean>) => SelectOption[];
  sourceKey?: string;
  clearOnChange?: string[];
  /**
   * Cuando se define, el campo es de solo lectura y su valor se calcula a partir
   * de los demás valores del formulario. No se envía en el payload (lo calcula el
   * backend), solo se muestra para feedback en vivo.
   */
  computed?: (values: Record<string, string | boolean>) => string;
};

type GenericCrudSectionProps = {
  title: string;
  description: string;
  resource: ElaboracionResourceKey;
  bodegaId: string | number | null;
  fields: CrudField[];
  listParams?: Record<string, string | number | undefined>;
  withBodegaId?: boolean;
  validate?: (values: Record<string, string | boolean>) => ValidationResult;
  idResolver?: (item: ElaboracionEntity) => string;
  controller?: {
    list?: (
      params: Record<string, string | number | undefined>,
    ) => Promise<ElaboracionEntity[]>;
    create?: (payload: Record<string, unknown>) => Promise<unknown>;
    update?: (
      context: { id: string; item: ElaboracionEntity },
      payload: Record<string, unknown>,
    ) => Promise<unknown>;
    remove?: (context: { id: string; item: ElaboracionEntity }) => Promise<unknown>;
  };
  hidePrimaryAction?: boolean;
  separatedLayout?: boolean;
  /** When true the create/edit form opens inside an AppModal instead of inline. */
  formInModal?: boolean;
  /** When true (with formInModal), auto-opens the create modal on mount if defaultValues are provided. */
  autoOpenForm?: boolean;
  defaultValues?: Record<string, string | boolean>;
  onCreated?: (item: ElaboracionEntity) => void | Promise<void>;
};

const ID_KEYS = [
  "id",
  "ciu_id",
  "id_ciu",
  "qc_ingreso_uva_id",
  "id_qc_ingreso_uva",
  "existencia_vasija_id",
  "id_existencia_vasija",
  "control_fermentacion_id",
  "id_control_fermentacion",
  "vasija_id",
  "id_vasija",
  "id_corte",
  "corte_id",
  "id_producto",
  "producto_id",
  "id_lote_frac",
  "lote_fraccionamiento_id",
  "id_codigo",
  "codigo_envase_id",
  "remito_uva_id",
  "id_remito",
  "remito_id",
  "recepcion_bodega_id",
  "id_recepcion",
  "recepcion_id",
  "analisis_recepcion_id",
  "id_analisis",
  "analisis_id",
  "id_operacion",
  "operacion_id",
  "id_despacho",
  "despacho_id",
];

const RESOURCE_ID_KEYS: Partial<Record<ElaboracionResourceKey, string[]>> = {
  "analisis-recepcion": ["analisis_recepcion_id", "id_analisis", "analisis_id", "id"],
  "recepciones-bodega": ["recepcion_bodega_id", "id_recepcion", "recepcion_id", "id"],
  "remitos-uva": ["remito_uva_id", "id_remito", "remito_id", "id"],
  "operaciones-vasija": ["operacion_vasija_id", "id_operacion", "operacion_id", "id"],
  vasijas: ["vasija_id", "id_vasija", "id"],
  cius: ["ciu_id", "id_ciu", "id"],
  "qc-ingreso-uva": ["qc_ingreso_uva_id", "id_qc_ingreso_uva", "id"],
  "existencias-vasija": ["existencia_vasija_id", "id_existencia_vasija", "id"],
  "controles-fermentacion": ["control_fermentacion_id", "id_control_fermentacion", "id"],
  cortes: ["corte_id", "id_corte", "id"],
  productos: ["producto_id", "id_producto", "id"],
  "lotes-fraccionamiento": ["lote_fraccionamiento_id", "id_lote_frac", "id"],
  "codigos-envase": ["codigo_envase_id", "id_codigo", "id"],
  despachos: ["despacho_id", "id_despacho", "id"],
};

function resolveId(item: ElaboracionEntity, resource?: ElaboracionResourceKey) {
  const keys = [...(resource ? (RESOURCE_ID_KEYS[resource] ?? []) : []), ...ID_KEYS];
  for (const key of keys) {
    const value = item[key];
    if (typeof value === "string" && value.trim()) return value;
    if (typeof value === "number") return String(value);
  }
  return "";
}

function toDateTimeLocal(raw: unknown) {
  if (typeof raw !== "string" || !raw) return "";
  const parsed = new Date(raw);
  if (Number.isNaN(parsed.getTime())) return "";
  const offset = parsed.getTimezoneOffset();
  const local = new Date(parsed.getTime() - offset * 60_000);
  return local.toISOString().slice(0, 16);
}

function toIsoDateTime(raw: string) {
  if (!raw.trim()) return "";
  const parsed = new Date(raw);
  if (Number.isNaN(parsed.getTime())) return raw;
  return parsed.toISOString();
}

function getInitialValues(fields: CrudField[]) {
  const entries = fields.map((field) => [field.name, field.type === "checkbox" ? false : ""]);
  return Object.fromEntries(entries) as Record<string, string | boolean>;
}

function formatItemFieldValue(value: unknown) {
  if (value === null || value === undefined || value === "") return "—";
  if (typeof value === "boolean") return value ? "Sí" : "No";
  if (typeof value === "number") return String(value);
  if (typeof value === "string") return value;
  return String(value);
}

function formatDateTimeValue(value: unknown) {
  if (typeof value !== "string" || !value.trim()) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleString("es-AR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function getNestedRecord(item: ElaboracionEntity, key: string) {
  const value = item[key];
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null;
}

function formatRelatedFieldValue(
  item: ElaboracionEntity,
  field: CrudField,
  resource: ElaboracionResourceKey,
) {
  const sourceKey = field.sourceKey ?? field.name;

  if (field.type === "date" || field.type === "datetime-local") {
    return formatDateTimeValue(item[sourceKey]) ?? formatItemFieldValue(item[sourceKey]);
  }

  if (resource === "remitos-uva") {
    if (sourceKey === "finca_id") {
      const finca = getNestedRecord(item, "finca");
      const nombre = finca?.nombre_finca ?? item[sourceKey];
      return formatItemFieldValue(nombre);
    }

    if (sourceKey === "cuartel_id") {
      const cuartel = getNestedRecord(item, "cuartel");
      const codigo = cuartel?.codigo_cuartel ?? item[sourceKey];
      return formatItemFieldValue(codigo);
    }

    if (sourceKey === "lote_cosecha_id") {
      const lote = getNestedRecord(item, "evento_cosecha");
      const fecha = formatDateTimeValue(lote?.fecha_cosecha);
      const cantidad = lote?.cantidad !== undefined && lote?.cantidad !== null
        ? `${lote.cantidad} ${typeof lote.unidad === "string" ? lote.unidad : ""}`.trim()
        : null;
      const label = [fecha, cantidad].filter(Boolean).join(" · ");
      return label || formatItemFieldValue(item[sourceKey]);
    }
  }

  if (resource === "cius" && sourceKey === "finca_id") {
    const finca = getNestedRecord(item, "finca");
    return formatItemFieldValue(finca?.nombre_finca ?? item[sourceKey]);
  }

  if (resource === "recepciones-bodega" && sourceKey === "remito_uva_id") {
    const remito = getNestedRecord(item, "remito_uva");
    const finca = remito?.finca && typeof remito.finca === "object" && !Array.isArray(remito.finca)
      ? remito.finca as Record<string, unknown>
      : null;
    const cuartel = remito?.cuartel && typeof remito.cuartel === "object" && !Array.isArray(remito.cuartel)
      ? remito.cuartel as Record<string, unknown>
      : null;
    const salida = formatDateTimeValue(remito?.salida_finca);
    const origen = [finca?.nombre_finca, cuartel?.codigo_cuartel].filter(Boolean).join(" / ");
    const patente = typeof remito?.patente === "string" && remito.patente.trim()
      ? `Patente ${remito.patente}`
      : null;
    const label = [salida, origen, patente].filter(Boolean).join(" · ");
    return label || formatItemFieldValue(item[sourceKey]);
  }

  if (resource === "operaciones-vasija") {
    if (sourceKey === "vasija_origen_id") {
      const vasija = getNestedRecord(item, "vasija_origen");
      return formatItemFieldValue(vasija?.codigo ?? item[sourceKey]);
    }
    if (sourceKey === "vasija_destino_id") {
      const vasija = getNestedRecord(item, "vasija_destino");
      return formatItemFieldValue(vasija?.codigo ?? item[sourceKey]);
    }
    if (sourceKey === "recepcion_bodega_id") {
      const recepcion = getNestedRecord(item, "recepcion_bodega");
      const fecha = formatDateTimeValue(recepcion?.fecha_hora);
      const kilos = recepcion?.kg_pesados !== undefined && recepcion?.kg_pesados !== null
        ? `${recepcion.kg_pesados} kg`
        : null;
      const label = [fecha, kilos].filter(Boolean).join(" · ");
      return label || formatItemFieldValue(item[sourceKey]);
    }
    if (sourceKey === "enologo_user_id") {
      return formatItemFieldValue(item.enologo_nombre ?? item[sourceKey]);
    }
    if (sourceKey === "user_id") {
      return formatItemFieldValue(item.actor_nombre ?? item[sourceKey]);
    }
  }

  if (
    (resource === "existencias-vasija" || resource === "controles-fermentacion") &&
    sourceKey === "vasija_id"
  ) {
    const vasija = getNestedRecord(item, "vasija");
    return formatItemFieldValue(vasija?.codigo ?? item[sourceKey]);
  }

  if (resource === "analisis-recepcion" && sourceKey === "recepcion_bodega_id") {
    const recepcion = getNestedRecord(item, "recepcion_bodega");
    const fecha = formatDateTimeValue(recepcion?.fecha_hora);
    const kilos = recepcion?.kg_pesados !== undefined && recepcion?.kg_pesados !== null
      ? `${recepcion.kg_pesados} kg`
      : null;
    const label = [fecha, kilos].filter(Boolean).join(" · ");
    return label || formatItemFieldValue(item[sourceKey]);
  }

  return formatItemFieldValue(item[sourceKey]);
}

function applyFieldValueChange(
  prev: Record<string, string | boolean>,
  field: CrudField,
  value: string | boolean,
) {
  const next = { ...prev, [field.name]: value };
  for (const fieldName of field.clearOnChange ?? []) {
    next[fieldName] = "";
  }
  return next;
}

export default function GenericCrudSection({
  title,
  description,
  resource,
  bodegaId,
  fields,
  listParams,
  withBodegaId = true,
  validate,
  idResolver,
  controller,
  hidePrimaryAction = false,
  separatedLayout = false,
  formInModal = false,
  autoOpenForm = false,
  defaultValues,
  onCreated,
}: GenericCrudSectionProps) {
  const { notifyError, notifySuccess } = useAppNotifications();
  const [items, setItems] = useState<ElaboracionEntity[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingItem, setEditingItem] = useState<ElaboracionEntity | null>(null);
  const [values, setValues] = useState<Record<string, string | boolean>>(() => getInitialValues(fields));
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [confirmDelete, setConfirmDelete] = useState<ElaboracionEntity | null>(null);
  const [viewMode, setViewMode] = useState<"list" | "form">(separatedLayout ? "list" : "form");
  const [showFormModal, setShowFormModal] = useState(false);

  const mergedParams = useMemo(() => {
    const params: Record<string, string | number | undefined> = {
      ...(listParams ?? {}),
    };
    if (bodegaId && params.bodegaId === undefined) {
      params.bodegaId = String(bodegaId);
    }
    return params;
  }, [bodegaId, listParams]);

  const mergedParamsRef = useRef(mergedParams);
  mergedParamsRef.current = mergedParams;

  const load = useCallback(async () => {
    if (!bodegaId && withBodegaId) {
      setItems([]);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const data = controller?.list
        ? await controller.list(mergedParamsRef.current)
        : await listElaboracionResource(resource, mergedParamsRef.current);
      setItems(data);
    } catch (requestError) {
      setError(getApiErrorMessage(requestError));
    } finally {
      setLoading(false);
    }
  }, [bodegaId, controller, resource, withBodegaId]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    const hasDefaultValues = defaultValues && Object.keys(defaultValues).length > 0;
    setValues({ ...getInitialValues(fields), ...(defaultValues ?? {}) });
    setEditingId(null);
    setEditingItem(null);
    setError(null);
    setFieldErrors({});
    setViewMode(separatedLayout && !hasDefaultValues ? "list" : "form");
  }, [defaultValues, fields, resource]);

  const autoOpenHandledRef = useRef(false);
  useEffect(() => {
    if (autoOpenHandledRef.current) return;
    if (!autoOpenForm || !formInModal) return;
    const hasDefaultValues = defaultValues && Object.keys(defaultValues).length > 0;
    if (!hasDefaultValues) return;
    autoOpenHandledRef.current = true;
    setShowFormModal(true);
  }, [autoOpenForm, formInModal, defaultValues]);

  const onSubmit = async () => {
    if (!bodegaId && withBodegaId) {
      setError("Seleccioná una bodega para continuar.");
      setFieldErrors({});
      return;
    }

    const nextFieldErrors: FieldErrors = {};
    for (const field of fields) {
      if (field.computed) continue;
      if (!field.required) continue;
      const currentValue = values[field.name];
      if (field.type === "checkbox") continue;
      if (typeof currentValue !== "string" || !currentValue.trim()) {
        nextFieldErrors[field.name] = `${field.label} es obligatorio.`;
      }
    }

    if (Object.keys(nextFieldErrors).length > 0) {
      setFieldErrors(nextFieldErrors);
      setError(null);
      return;
    }

    if (validate) {
      const result = validate(values);
      if (typeof result === "string" && result) {
        setError(result);
        setFieldErrors({});
        return;
      }
      if (result && typeof result === "object") {
        const validationFieldErrors = result.fieldErrors ?? {};
        if (Object.keys(validationFieldErrors).length > 0) {
          setFieldErrors(validationFieldErrors);
          setError(result.formError ?? null);
          return;
        }
        if (result.formError) {
          setError(result.formError);
          setFieldErrors({});
          return;
        }
      }
    }

    setFieldErrors({});

    const payload: Record<string, unknown> = {};
    if (withBodegaId) {
      payload.bodegaId = String(bodegaId);
    }

    for (const field of fields) {
      if (field.computed) continue;
      const value = values[field.name];
      if (field.type === "checkbox") {
        payload[field.name] = Boolean(value);
        continue;
      }

      if (typeof value !== "string") continue;
      if (!value.trim()) continue;

      if (field.type === "number") {
        const parsed = Number(value);
        if (Number.isNaN(parsed)) {
          setFieldErrors({ [field.name]: `${field.label} debe ser numérico.` });
          setError(null);
          return;
        }
        payload[field.name] = parsed;
        continue;
      }

      if (field.type === "datetime-local") {
        payload[field.name] = toIsoDateTime(value);
        continue;
      }

      payload[field.name] = value;
    }

    setSaving(true);
    setError(null);
    try {
      let createdItem: ElaboracionEntity | null = null;
      if (editingId) {
        if (controller?.update && editingItem) {
          await controller.update({ id: editingId, item: editingItem }, payload);
        } else {
          await patchElaboracionResource(resource, editingId, payload);
        }
        notifySuccess({
          title: `${title} actualizado`,
          message: "Los cambios quedaron guardados correctamente.",
        });
      } else {
        let created: unknown;
        if (controller?.create) {
          created = await controller.create(payload);
        } else {
          created = await createElaboracionResource(resource, payload);
        }
        notifySuccess({
          title: `${title} creado`,
          message: "El registro quedó disponible para continuar el flujo operativo.",
        });
        if (created && typeof created === "object") {
          createdItem = created as ElaboracionEntity;
        }
      }
      setValues({ ...getInitialValues(fields), ...(defaultValues ?? {}) });
      setEditingId(null);
      setEditingItem(null);
      setFieldErrors({});
      if (formInModal) {
        setShowFormModal(false);
      } else if (separatedLayout) {
        setViewMode("list");
      }
      await load();
      if (createdItem) {
        await onCreated?.(createdItem);
      }
    } catch (requestError) {
      const message = getApiErrorMessage(requestError);
      setError(message);
      notifyError({
        title: `No se pudo guardar ${title.toLowerCase()}`,
        message,
      });
    } finally {
      setSaving(false);
    }
  };

  const onEdit = (item: ElaboracionEntity) => {
    const recordId = idResolver ? idResolver(item) : resolveId(item, resource);
    if (!recordId) return;

    const nextValues = getInitialValues(fields);
    for (const field of fields) {
      const key = field.sourceKey ?? field.name;
      const raw = item[key];
      if (field.type === "checkbox") {
        nextValues[field.name] = Boolean(raw);
      } else if (field.type === "datetime-local") {
        nextValues[field.name] = toDateTimeLocal(raw);
      } else if (field.type === "number") {
        nextValues[field.name] =
          raw === null || raw === undefined || raw === "" ? "" : String(raw);
      } else {
        nextValues[field.name] = typeof raw === "string" ? raw : "";
      }
    }

    setValues(nextValues);
    setEditingId(recordId);
    setEditingItem(item);
    setError(null);
    setFieldErrors({});
    if (formInModal) {
      setShowFormModal(true);
    } else if (separatedLayout) {
      setViewMode("form");
    }
  };

  const onDeleteConfirm = async () => {
    if (!confirmDelete) return;
    const item = confirmDelete;
    const recordId = idResolver ? idResolver(item) : resolveId(item, resource);
    setConfirmDelete(null);

    setSaving(true);
    setError(null);
    setFieldErrors({});
    try {
      if (controller?.remove) {
        await controller.remove({ id: recordId, item });
      } else {
        await deleteElaboracionResource(resource, recordId);
      }
      notifySuccess({
        title: `${title} eliminado`,
        message: "El registro fue eliminado correctamente.",
      });
      await load();
    } catch (requestError) {
      const message = getApiErrorMessage(requestError);
      setError(message);
      notifyError({
        title: `No se pudo eliminar ${title.toLowerCase()}`,
        message,
      });
    } finally {
      setSaving(false);
    }
  };

  const onDelete = (item: ElaboracionEntity) => {
    const recordId = idResolver ? idResolver(item) : resolveId(item, resource);
    if (!recordId) {
      setError("No se pudo resolver el identificador del registro.");
      setFieldErrors({});
      return;
    }
    setConfirmDelete(item);
  };

  const onStartCreate = () => {
    setValues({ ...getInitialValues(fields), ...(defaultValues ?? {}) });
    setEditingId(null);
    setEditingItem(null);
    setError(null);
    setFieldErrors({});
    if (formInModal) {
      setShowFormModal(true);
    } else {
      setViewMode("form");
    }
  };

  const onCancelForm = () => {
    setEditingId(null);
    setEditingItem(null);
    setValues({ ...getInitialValues(fields), ...(defaultValues ?? {}) });
    setError(null);
    setFieldErrors({});
    if (formInModal) {
      setShowFormModal(false);
    } else if (separatedLayout) {
      setViewMode("list");
    }
  };

  const setFieldValue = (field: CrudField, value: string | boolean) => {
    setValues((prev) => applyFieldValueChange(prev, field, value));
    setFieldErrors((prev) => {
      if (!prev[field.name] && !field.clearOnChange?.some((fieldName) => prev[fieldName])) {
        return prev;
      }
      const next = { ...prev };
      delete next[field.name];
      for (const fieldName of field.clearOnChange ?? []) {
        delete next[fieldName];
      }
      return next;
    });
  };

  const renderFeedback = () => (
    <>
      {error ? (
        <NoticeBanner tone="danger" className="mt-3">{error}</NoticeBanner>
      ) : null}
    </>
  );

  const renderList = () => (
    <div className="mt-3 max-h-72 space-y-2 overflow-auto">
      {!bodegaId && withBodegaId ? (
        <GuidedState
          title="Seleccioná una bodega para registrar datos"
          description={`La sección ${title.toLowerCase()} necesita una bodega activa para listar y guardar registros correctamente.`}
          action={(
            <Link to="/contexto">
              <AppButton variant="primary" size="sm">Elegir bodega</AppButton>
            </Link>
          )}
        />
      ) : loading ? (
        <NoticeBanner>Cargando registros...</NoticeBanner>
      ) : items.length === 0 ? (
        <GuidedState
          title={`Sin registros en ${title.toLowerCase()}`}
          description="Cuando cargues el primer registro, aparecerá acá para editarlo, revisarlo o continuar el flujo operativo."
        />
      ) : (
        items.map((item, index) => {
          const itemId = idResolver ? idResolver(item) : resolveId(item, resource);
          const displayId = itemId || `fila-${index}`;
          const shortId = itemId ? itemId.slice(0, 8) : String(index + 1).padStart(2, "0");
          const previewRows = fields
            .map((field) => {
              const sourceKey = field.sourceKey ?? field.name;
              const raw = item[sourceKey];
              if (raw === undefined || raw === null || raw === "") return null;
              return {
                key: field.name,
                label: field.label,
                value: formatRelatedFieldValue(item, field, resource),
              };
            })
            .filter((row): row is { key: string; label: string; value: string } => row !== null)
            .slice(0, 5);
          return (
            <div
              key={displayId}
              className="rounded-[var(--radius-lg)] border border-[color:var(--border-shell)] bg-[color:var(--surface-soft)] px-4 py-3"
            >
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="text-xs font-semibold text-[color:var(--text-ink)]">
                    {title} <span className="font-normal text-[color:var(--text-ink-muted)]">#{shortId}</span>
                  </div>
                  {previewRows.length > 0 ? (
                    <div className="mt-1.5 flex flex-wrap gap-x-5 gap-y-1">
                      {previewRows.map((row) => (
                        <span key={row.key} className="text-xs text-[color:var(--text-ink-muted)]">
                          <span className="font-medium text-[color:var(--text-ink-muted)]">{row.label}:</span>{" "}
                          <span className="text-[color:var(--text-ink)]">{row.value}</span>
                        </span>
                      ))}
                    </div>
                  ) : null}
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <AppButton
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={() => onEdit(item)}
                  >
                    Editar
                  </AppButton>
                  <AppButton
                    type="button"
                    variant="danger"
                    size="sm"
                    onClick={() => onDelete(item)}
                  >
                    Eliminar
                  </AppButton>
                </div>
              </div>
            </div>
          );
        })
      )}
    </div>
  );

  const renderForm = () => (
    <>
      <div className="mt-3 grid gap-3 md:grid-cols-2">
        {fields.map((field) => (
          <div key={field.name}>
            {field.computed ? (
              <AppInput
                label={field.label}
                type="text"
                value={field.computed(values)}
                readOnly
                disabled
                uiSize="lg"
              />
            ) : field.type === "textarea" ? (
              <AppTextarea
                label={field.label}
                error={fieldErrors[field.name]}
                value={String(values[field.name] ?? "")}
                onChange={(event) =>
                  setFieldValue(field, event.target.value)
                }
                placeholder={field.placeholder}
                uiSize="lg"
              />
            ) : field.type === "checkbox" ? (
              <div className="space-y-2">
                <label className="flex min-h-11 items-center gap-2 rounded-[var(--radius-md)] border border-[color:var(--border-shell)] bg-[color:var(--surface-muted)] px-4 py-2 text-sm text-[color:var(--text-on-dark)]">
                  <input
                    type="checkbox"
                    checked={Boolean(values[field.name])}
                    onChange={(event) => setFieldValue(field, event.target.checked)}
                    className="h-4 w-4"
                  />
                  {field.label}
                </label>
                {fieldErrors[field.name] ? (
                  <p className="text-sm font-medium text-[color:var(--field-error)]">
                    {fieldErrors[field.name]}
                  </p>
                ) : null}
              </div>
            ) : field.type === "select" ? (
              (() => {
                const options = field.getOptions ? field.getOptions(values) : (field.options ?? []);
                return (
                  <AppSelect
                    label={field.label}
                    error={fieldErrors[field.name]}
                    value={String(values[field.name] ?? "")}
                    onChange={(event) =>
                      setFieldValue(field, event.target.value)
                    }
                  >
                    <option value="">Seleccionar...</option>
                    {options.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </AppSelect>
                );
              })()
            ) : (
              <AppInput
                label={field.label}
                type={field.type}
                error={fieldErrors[field.name]}
                value={String(values[field.name] ?? "")}
                onChange={(event) =>
                  setFieldValue(field, event.target.value)
                }
                placeholder={field.placeholder}
                uiSize="lg"
              />
            )}
          </div>
        ))}
      </div>

      {!hidePrimaryAction ? (
        <div className="mt-3 flex flex-wrap gap-2">
          <AppButton
            type="button"
            variant="primary"
            loading={saving}
            onClick={() => void onSubmit()}
            disabled={saving}
          >
            {editingId ? "Guardar" : "Crear"}
          </AppButton>
          <AppButton
            type="button"
            variant="ghost"
            onClick={onCancelForm}
          >
            Cancelar
          </AppButton>
        </div>
      ) : null}
    </>
  );

  return (
    <AppCard
      as="section"
      tone="default"
      padding="md"
      header={(
        <SectionIntro
          title={title}
          description={description}
          actions={
            ((separatedLayout && viewMode === "list") || formInModal) && !hidePrimaryAction ? (
              <AppButton type="button" variant="primary" size="sm" onClick={onStartCreate}>
                Nuevo registro
              </AppButton>
            ) : undefined
          }
        />
      )}
    >

      {formInModal
        ? renderList()
        : separatedLayout
          ? (viewMode === "form" ? renderForm() : renderList())
          : renderForm()
      }

      {renderFeedback()}

      {formInModal ? (
        <AppModal
          opened={showFormModal}
          onClose={onCancelForm}
          title={(
            <div className="flex w-full items-center justify-between">
              <span>{editingId ? `Editar ${title}` : `Nuevo ${title}`}</span>
              <button
                type="button"
                aria-label="Cerrar"
                onClick={onCancelForm}
                className="rounded-[var(--radius-md)] p-1.5 text-[color:var(--text-ink-muted)] transition-colors hover:bg-white/10 hover:text-[color:var(--text-ink)]"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>
          )}
          size="lg"
          showHeaderDivider
        >
          {renderForm()}
        </AppModal>
      ) : null}

      {confirmDelete && (
        <AppModal
          opened
          onClose={() => setConfirmDelete(null)}
          title="¿Eliminar registro?"
          size="sm"
          footer={(
            <div className="flex justify-end gap-2">
              <AppButton
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => setConfirmDelete(null)}
              >
                Cancelar
              </AppButton>
              <AppButton
                type="button"
                variant="danger"
                size="sm"
                onClick={() => void onDeleteConfirm()}
              >
                Eliminar
              </AppButton>
            </div>
          )}
        >
          <p className="text-xs text-[color:var(--text-ink-muted)]">
            Esta acción no se puede deshacer.
          </p>
        </AppModal>
      )}
    </AppCard>
  );
}
