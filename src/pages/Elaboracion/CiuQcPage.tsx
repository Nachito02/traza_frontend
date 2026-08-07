import { useCallback, useEffect, useMemo, useState } from "react";
import {
  listElaboracionResource,
  type ElaboracionEntity,
} from "../../features/elaboracion/api";
import { AppButton, AppCard } from "../../components/ui";
import { useAuthStore } from "../../store/authStore";
import GenericCrudSection, { type SelectOption } from "./components/GenericCrudSection";

function formatRecepcionOption(item: ElaboracionEntity): SelectOption | null {
  const id = item.recepcion_bodega_id ?? item.id_recepcion ?? item.recepcion_id ?? item.id;
  if (typeof id !== "string" && typeof id !== "number") return null;

  const fecha = typeof item.fecha_hora === "string" ? new Date(item.fecha_hora) : null;
  const fechaLabel = fecha && !Number.isNaN(fecha.getTime())
    ? fecha.toLocaleString("es-AR", {
        day: "2-digit",
        month: "2-digit",
        year: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
      })
    : "Sin fecha";

  const remito = item.remito_uva && typeof item.remito_uva === "object"
    ? item.remito_uva as Record<string, unknown>
    : {};
  const finca = remito.finca && typeof remito.finca === "object"
    ? remito.finca as Record<string, unknown>
    : {};
  const cuartel = remito.cuartel && typeof remito.cuartel === "object"
    ? remito.cuartel as Record<string, unknown>
    : {};

  const fincaLabel = typeof finca.nombre_finca === "string" ? finca.nombre_finca : null;
  const cuartelLabel = typeof cuartel.codigo_cuartel === "string" ? cuartel.codigo_cuartel : null;
  const kgPesados = typeof item.kg_pesados === "string" || typeof item.kg_pesados === "number"
    ? `${item.kg_pesados} kg`
    : null;
  const patente = typeof remito.patente === "string" && remito.patente.trim()
    ? `Patente ${remito.patente}`
    : null;
  const transportista = typeof remito.transportista === "string" && remito.transportista.trim()
    ? remito.transportista.trim()
    : null;

  return {
    value: String(id),
    label: [
      fechaLabel,
      [fincaLabel, cuartelLabel].filter(Boolean).join(" / "),
      kgPesados,
      patente,
      transportista,
    ].filter(Boolean).join(" · "),
  };
}

type CiuQcPageProps = {
  hideSectionSelector?: boolean;
  hidePrimaryAction?: boolean;
  /** Recepción (ingreso) preseleccionada cuando se llega desde el flujo asistido. */
  ciuDefaultValues?: Record<string, string | boolean>;
  autoOpenForm?: boolean;
  referenceOptionsVersion?: number;
  onCiuCreated?: (item: ElaboracionEntity) => void | Promise<void>;
};

export default function CiuQcPage({
  hidePrimaryAction = false,
  ciuDefaultValues,
  autoOpenForm = false,
  referenceOptionsVersion = 0,
  onCiuCreated,
}: CiuQcPageProps) {
  const activeBodegaId = useAuthStore((state) => state.activeBodegaId);
  const [recepcionOptions, setRecepcionOptions] = useState<SelectOption[]>([]);
  // Ingreso elegido haciendo clic en la lista de "pendientes" (en vez de entrar
  // por "Nuevo registro" y buscarlo en el desplegable). `formKey` fuerza que
  // GenericCrudSection se vuelva a montar para que tome el nuevo default y
  // reabra el form — el auto-open normal solo se dispara una vez por montaje.
  const [recepcionElegidaId, setRecepcionElegidaId] = useState<string | null>(null);
  const [formKey, setFormKey] = useState(0);

  const loadReferenceOptions = useCallback(async () => {
    if (!activeBodegaId) {
      setRecepcionOptions([]);
      return;
    }
    const [recepciones, cius] = await Promise.all([
      listElaboracionResource("recepciones-bodega", { bodegaId: String(activeBodegaId) }),
      listElaboracionResource("cius", { bodegaId: String(activeBodegaId) }),
    ]);
    // Una recepción que ya tiene CIU cargado no se puede volver a elegir para otro.
    const recepcionesConCiu = new Set(
      cius
        .map((c) => c.recepcion_bodega_id)
        .filter((id): id is string => typeof id === "string"),
    );
    setRecepcionOptions(
      recepciones
        .map(formatRecepcionOption)
        .filter((option): option is SelectOption => option !== null)
        .map((option) => ({ ...option, disabled: recepcionesConCiu.has(option.value) })),
    );
  }, [activeBodegaId]);

  useEffect(() => {
    const run = async () => {
      await loadReferenceOptions();
    };
    void run();
  }, [loadReferenceOptions, referenceOptionsVersion]);

  const pendientes = useMemo(() => recepcionOptions.filter((o) => !o.disabled), [recepcionOptions]);

  const elegirRecepcion = (recepcionBodegaId: string) => {
    setRecepcionElegidaId(recepcionBodegaId);
    setFormKey((k) => k + 1);
  };

  return (
    <div className="space-y-4">
      {pendientes.length > 0 ? (
        <AppCard padding="lg" header={<h3 className="text-base font-semibold">Ingresos pendientes de CIU</h3>}>
          <ul className="space-y-2">
            {pendientes.map((r) => (
              <li
                key={r.value}
                className="flex flex-wrap items-center justify-between gap-2 rounded-[var(--radius-md)] border border-[color:var(--border-shell)] bg-[color:var(--surface-soft)] px-3 py-2 text-sm"
              >
                <span className="text-[color:var(--text-ink)]">{r.label}</span>
                <AppButton type="button" variant="secondary" size="sm" onClick={() => elegirRecepcion(r.value)}>
                  Registrar CIU
                </AppButton>
              </li>
            ))}
          </ul>
        </AppCard>
      ) : null}

      <GenericCrudSection
        key={formKey}
        title="CIU"
        description="Datos del viaje para declarar el CIU. El número lo asigna la bodega. Estos datos arman el lote y generan el archivo .txt que después se carga en el Sistema de Cosecha del INV para declararlo."
        resource="cius"
        bodegaId={activeBodegaId}
        hidePrimaryAction={hidePrimaryAction}
        formInModal={!hidePrimaryAction}
        autoOpenForm={autoOpenForm || recepcionElegidaId !== null}
        fields={[
          {
            name: "recepcionBodegaId",
            label: "Ingreso (recepción)",
            type: "select",
            required: true,
            options: recepcionOptions,
            sourceKey: "recepcion_bodega_id",
          },
          { name: "codigo_ciu", label: "Número de CIU", type: "text", required: true },
          { name: "emitido_at", label: "Fecha del CIU", type: "datetime-local", required: true },
          {
            name: "variedad_codigo_inv",
            label: "Variedad — código INV",
            type: "text",
            placeholder: "ej. 120",
          },
          {
            name: "variedad_nombre",
            label: "Variedad — nombre",
            type: "text",
            placeholder: "ej. SYRAH (SHIRAZ-SIRAH)",
          },
          { name: "tenor_azucarino_gl", label: "Tenor azucarino (g/l)", type: "number" },
          { name: "uva_organica", label: "Uva orgánica", type: "checkbox" },
          { name: "observaciones", label: "Observaciones", type: "textarea" },
        ]}
        defaultValues={
          recepcionElegidaId
            ? { ...(ciuDefaultValues ?? {}), recepcionBodegaId: recepcionElegidaId }
            : ciuDefaultValues
        }
        onCreated={async (item) => {
          setRecepcionElegidaId(null);
          await loadReferenceOptions();
          await onCiuCreated?.(item);
        }}
      />
    </div>
  );
}
