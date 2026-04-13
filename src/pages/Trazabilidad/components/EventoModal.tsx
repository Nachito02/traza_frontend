import type { Milestone } from "../../../features/milestones/api";
import type { Operario } from "../../../features/operarios/api";
import {
  AppButton,
  AppInput,
  AppModal,
  AppSelect,
  AppTextarea,
  NoticeBanner,
} from "../../../components/ui";
import type { EventoField } from "../eventoFields";

type Props = {
  milestone: Milestone;
  operarios: Operario[];
  fields: EventoField[];
  form: Record<string, string>;
  formError: string | null;
  saving: boolean;
  onChange: (key: string, value: string) => void;
  onSubmit: () => void;
  onClose: () => void;
};

const EventoModal = ({
  milestone,
  operarios,
  fields,
  form,
  formError,
  saving,
  onChange,
  onSubmit,
  onClose,
}: Props) => {
  const footer = (
    <div className="flex items-center justify-end gap-3">
      <AppButton variant="secondary" onClick={onClose}>
        Cancelar
      </AppButton>
      <AppButton variant="primary" loading={saving} onClick={() => void onSubmit()}>
        Registrar evento
      </AppButton>
    </div>
  );

  return (
    <AppModal
      opened
      onClose={onClose}
      title={`Registrar evento: ${milestone.protocolo_proceso.nombre}`}
      description={`Tipo: ${milestone.protocolo_proceso.evento_tipo}`}
      footer={footer}
      bodyClassName="space-y-4"
    >
      {fields.length > 0 ? (
        <div className="space-y-3">
            {fields.map((field) => (
              <div key={field.name}>
                {field.type === "textarea" ? (
                  <AppTextarea
                    label={field.label}
                    uiSize="lg"
                    value={form[field.name] ?? ""}
                    onChange={(e) => onChange(field.name, e.target.value)}
                    placeholder={field.placeholder}
                  />
                ) : field.type === "select" ? (
                  <AppSelect
                    label={field.label}
                    value={form[field.name] ?? ""}
                    onChange={(e) => onChange(field.name, e.target.value)}
                  >
                    <option value="">
                      {field.required ? "Seleccionar..." : "Sin especificar"}
                    </option>
                    {(field.options ?? []).map((option) => (
                      <option key={`${field.name}-${option.value}`} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </AppSelect>
                ) : field.type === "user_select" ? (
                  <AppSelect
                    label={field.label}
                    value={form[field.name] ?? ""}
                    onChange={(e) => onChange(field.name, e.target.value)}
                  >
                    <option value="">
                      {field.required ? "Seleccionar usuario..." : "Sin especificar"}
                    </option>
                    {operarios.map((op) => (
                      <option key={`${field.name}-${op.user_id}`} value={op.user_id}>
                        {op.email
                          ? `${op.nombre} (${op.email})`
                          : `${op.nombre}${op.whatsapp_e164 ? ` · ${op.whatsapp_e164}` : ""}`}
                      </option>
                    ))}
                  </AppSelect>
                ) : field.type === "checkbox" ? (
                  <label className="flex items-center gap-2 rounded-[var(--radius-md)] border border-[color:var(--border-default)] bg-white/95 px-3 py-2 text-sm text-[color:var(--text-ink)]">
                    <input
                      type="checkbox"
                      checked={form[field.name] === "true"}
                      onChange={(e) => onChange(field.name, e.target.checked ? "true" : "false")}
                    />
                    <span>{field.placeholder ?? field.label}</span>
                  </label>
                ) : (
                  <AppInput
                    label={field.label}
                    type={field.type}
                    step={field.step}
                    value={form[field.name] ?? ""}
                    onChange={(e) => onChange(field.name, e.target.value)}
                    placeholder={field.placeholder}
                  />
                )}
              </div>
            ))}
        </div>
      ) : (
          <NoticeBanner tone="warning">
            Tipo de evento no soportado todavía.
          </NoticeBanner>
      )}

      {formError && (
        <NoticeBanner tone="danger">
          {formError}
        </NoticeBanner>
      )}
    </AppModal>
  );
};

export default EventoModal;
