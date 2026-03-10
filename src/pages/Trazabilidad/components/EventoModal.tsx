import type { Milestone } from "../../../features/milestones/api";
import { EVENTO_CONFIG } from "../eventoConfig";

type Props = {
  milestone: Milestone;
  form: Record<string, string>;
  formError: string | null;
  saving: boolean;
  onChange: (key: string, value: string) => void;
  onSubmit: () => void;
  onClose: () => void;
};

const EventoModal = ({
  milestone,
  form,
  formError,
  saving,
  onChange,
  onSubmit,
  onClose,
}: Props) => {
  const config = EVENTO_CONFIG[milestone.protocolo_proceso.evento_tipo];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-xl rounded-2xl bg-white p-6 shadow-xl">
        <div className="mb-4">
          <h2 className="text-xl text-[#3D1B1F]">
            Registrar evento: {milestone.protocolo_proceso.nombre}
          </h2>
          <p className="text-xs text-[#7A4A50]">
            Tipo: {milestone.protocolo_proceso.evento_tipo}
          </p>
        </div>

        {config ? (
          <div className="space-y-3">
            {config.fields.map((field) => (
              <div key={field.name}>
                <label className="block text-xs text-[#722F37] mb-2">{field.label}</label>
                {field.type === "textarea" ? (
                  <textarea
                    className="w-full rounded-lg border-2 border-[#C9A961]/30 px-3 py-2 text-sm text-[#3D1B1F] outline-none focus:border-[#722F37]"
                    value={form[field.name] ?? ""}
                    onChange={(e) => onChange(field.name, e.target.value)}
                    placeholder={field.placeholder}
                  />
                ) : (
                  <input
                    type={field.type}
                    step={field.step}
                    className="w-full rounded-lg border-2 border-[#C9A961]/30 px-3 py-2 text-sm text-[#3D1B1F] outline-none focus:border-[#722F37]"
                    value={form[field.name] ?? ""}
                    onChange={(e) => onChange(field.name, e.target.value)}
                    placeholder={field.placeholder}
                  />
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
            Tipo de evento no soportado todavía.
          </div>
        )}

        {formError && (
          <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {formError}
          </div>
        )}

        <div className="mt-6 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-[#C9A961]/40 px-4 py-2 text-sm font-semibold text-[#722F37] transition hover:border-[#C9A961] hover:bg-[#F8F3EE]"
          >
            Cancelar
          </button>
          <button
            type="button"
            disabled={saving}
            onClick={() => void onSubmit()}
            className="rounded-lg border border-[#C9A961]/40 px-4 py-2 text-sm font-semibold text-[#722F37] transition hover:border-[#C9A961] hover:bg-[#F8F3EE] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {saving ? "Guardando..." : "Registrar evento"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default EventoModal;
