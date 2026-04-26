import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
  AppInput,
  AppModal,
  AppSelect,
  AppTextarea,
  NoticeBanner,
  SectionIntro,
} from "../../../components/ui";
import { getApiErrorMessage } from "../../../lib/api";

export type SelectOption = {
  label: string;
  value: string;
};

type FieldType = "text" | "textarea" | "number" | "date" | "datetime-local" | "checkbox" | "select";

export type CrudField = {
  name: string;
  label: string;
  type: FieldType;
  required?: boolean;
  placeholder?: string;
  options?: SelectOption[];
  sourceKey?: string;
};

type GenericCrudSectionProps = {
  title: string;
  description: string;
  resource: ElaboracionResourceKey;
  bodegaId: string | number | null;
  fields: CrudField[];
  listParams?: Record<string, string | number | undefined>;
  withBodegaId?: boolean;
  validate?: (values: Record<string, string | boolean>) => string | null;
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
  "id_remito",
  "remito_id",
  "id_recepcion",
  "recepcion_id",
  "id_analisis",
  "analisis_id",
  "id_operacion",
  "operacion_id",
  "id_despacho",
  "despacho_id",
];

function resolveId(item: ElaboracionEntity) {
  for (const key of ID_KEYS) {
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
}: GenericCrudSectionProps) {
  const [items, setItems] = useState<ElaboracionEntity[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingItem, setEditingItem] = useState<ElaboracionEntity | null>(null);
  const [values, setValues] = useState<Record<string, string | boolean>>(() => getInitialValues(fields));
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<ElaboracionEntity | null>(null);
  const [viewMode, setViewMode] = useState<"list" | "form">(separatedLayout ? "list" : "form");

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
    setValues(getInitialValues(fields));
    setEditingId(null);
    setEditingItem(null);
    setError(null);
    setSuccess(null);
    setViewMode(separatedLayout ? "list" : "form");
  }, [fields, resource]);

  const onSubmit = async () => {
    if (!bodegaId && withBodegaId) {
      setError("Seleccioná una bodega para continuar.");
      return;
    }

    for (const field of fields) {
      if (!field.required) continue;
      const currentValue = values[field.name];
      if (field.type === "checkbox") continue;
      if (typeof currentValue !== "string" || !currentValue.trim()) {
        setError(`El campo ${field.label} es obligatorio.`);
        return;
      }
    }

    if (validate) {
      const message = validate(values);
      if (message) {
        setError(message);
        return;
      }
    }

    const payload: Record<string, unknown> = {};
    if (withBodegaId) {
      payload.bodegaId = String(bodegaId);
    }

    for (const field of fields) {
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
          setError(`El campo ${field.label} debe ser numérico.`);
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
    setSuccess(null);
    try {
      if (editingId) {
        if (controller?.update && editingItem) {
          await controller.update({ id: editingId, item: editingItem }, payload);
        } else {
          await patchElaboracionResource(resource, editingId, payload);
        }
        setSuccess(`${title}: actualizado correctamente.`);
      } else {
        if (controller?.create) {
          await controller.create(payload);
        } else {
          await createElaboracionResource(resource, payload);
        }
        setSuccess(`${title}: creado correctamente.`);
      }
      setValues(getInitialValues(fields));
      setEditingId(null);
      setEditingItem(null);
      if (separatedLayout) {
        setViewMode("list");
      }
      await load();
    } catch (requestError) {
      setError(getApiErrorMessage(requestError));
    } finally {
      setSaving(false);
    }
  };

  const onEdit = (item: ElaboracionEntity) => {
    const recordId = idResolver ? idResolver(item) : resolveId(item);
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
    setSuccess(null);
    if (separatedLayout) {
      setViewMode("form");
    }
  };

  const onDeleteConfirm = async () => {
    if (!confirmDelete) return;
    const item = confirmDelete;
    const recordId = idResolver ? idResolver(item) : resolveId(item);
    setConfirmDelete(null);

    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      if (controller?.remove) {
        await controller.remove({ id: recordId, item });
      } else {
        await deleteElaboracionResource(resource, recordId);
      }
      setSuccess(`${title}: eliminado.`);
      await load();
    } catch (requestError) {
      setError(getApiErrorMessage(requestError));
    } finally {
      setSaving(false);
    }
  };

  const onDelete = (item: ElaboracionEntity) => {
    const recordId = idResolver ? idResolver(item) : resolveId(item);
    if (!recordId) {
      setError("No se pudo resolver el identificador del registro.");
      return;
    }
    setConfirmDelete(item);
  };

  const onStartCreate = () => {
    setValues(getInitialValues(fields));
    setEditingId(null);
    setEditingItem(null);
    setError(null);
    setSuccess(null);
    setViewMode("form");
  };

  const onCancelForm = () => {
    setEditingId(null);
    setEditingItem(null);
    setValues(getInitialValues(fields));
    setError(null);
    setSuccess(null);
    if (separatedLayout) {
      setViewMode("list");
    }
  };

  const renderFeedback = () => (
    <>
      {error ? (
        <NoticeBanner tone="danger" className="mt-3">{error}</NoticeBanner>
      ) : null}
      {success ? (
        <NoticeBanner tone="success" className="mt-3">{success}</NoticeBanner>
      ) : null}
    </>
  );

  const renderList = () => (
    <div className="mt-3 max-h-72 space-y-2 overflow-auto">
      {loading ? (
        <NoticeBanner>Cargando registros...</NoticeBanner>
      ) : items.length === 0 ? (
        <NoticeBanner>Sin registros.</NoticeBanner>
      ) : (
        items.map((item, index) => {
          const itemId = idResolver ? idResolver(item) : resolveId(item);
          const displayId = itemId || `fila-${index}`;
          const previewRows = fields
            .map((field) => {
              const sourceKey = field.sourceKey ?? field.name;
              const raw = item[sourceKey];
              if (raw === undefined || raw === null || raw === "") return null;
              return {
                key: field.name,
                label: field.label,
                value: formatItemFieldValue(raw),
              };
            })
            .filter((row): row is { key: string; label: string; value: string } => row !== null)
            .slice(0, 5);
          return (
            <AppCard key={displayId} as="article" tone="soft" padding="sm">
              <div className="text-xs font-semibold text-[color:var(--accent-primary)]">ID: {displayId}</div>
              {previewRows.length > 0 ? (
                <div className="mt-2 grid gap-1 rounded-[var(--radius-md)] border border-[color:var(--border-shell)] bg-[color:var(--surface-muted)] p-2 text-xs text-[color:var(--text-on-dark)]">
                  {previewRows.map((row) => (
                    <div key={row.key}>
                      <span className="font-semibold">{row.label}:</span> {row.value}
                    </div>
                  ))}
                </div>
              ) : null}
              <div className="mt-2 flex gap-2">
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
            </AppCard>
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
            {field.type === "textarea" ? (
              <AppTextarea
                label={field.label}
                value={String(values[field.name] ?? "")}
                onChange={(event) =>
                  setValues((prev) => ({ ...prev, [field.name]: event.target.value }))
                }
                placeholder={field.placeholder}
                uiSize="lg"
              />
            ) : field.type === "checkbox" ? (
              <label className="flex min-h-11 items-center gap-2 rounded-[var(--radius-md)] border border-[color:var(--border-shell)] bg-[color:var(--surface-muted)] px-4 py-2 text-sm text-[color:var(--text-on-dark)]">
                <input
                  type="checkbox"
                  checked={Boolean(values[field.name])}
                  onChange={(event) =>
                    setValues((prev) => ({ ...prev, [field.name]: event.target.checked }))
                  }
                  className="h-4 w-4"
                />
                {field.label}
              </label>
            ) : field.type === "select" ? (
              <AppSelect
                label={field.label}
                value={String(values[field.name] ?? "")}
                onChange={(event) =>
                  setValues((prev) => ({ ...prev, [field.name]: event.target.value }))
                }
              >
                <option value="">Seleccionar...</option>
                {(field.options ?? []).map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </AppSelect>
            ) : (
              <AppInput
                label={field.label}
                type={field.type}
                value={String(values[field.name] ?? "")}
                onChange={(event) =>
                  setValues((prev) => ({ ...prev, [field.name]: event.target.value }))
                }
                placeholder={field.placeholder}
                uiSize="lg"
              />
            )}
          </div>
        ))}
      </div>

      {!hidePrimaryAction ? (
        <div className="mt-3 flex flex-wrap justify-end gap-2">
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
            variant="secondary"
            onClick={onCancelForm}
          >
            {editingId ? "Cancelar edición" : "Volver al listado"}
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
            separatedLayout && viewMode === "list" && !hidePrimaryAction ? (
              <AppButton type="button" variant="primary" size="sm" onClick={onStartCreate}>
                Nuevo registro
              </AppButton>
            ) : undefined
          }
        />
      )}
    >

      {separatedLayout ? (viewMode === "form" ? renderForm() : renderList()) : renderForm()}

      {renderFeedback()}

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
