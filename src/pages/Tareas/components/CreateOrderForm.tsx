import {
  AppButton,
  AppInput,
  AppSelect,
  AppTextarea,
} from "../../../components/ui";
import type { Finca } from "../../../features/fincas/api";
import type { Cuartel } from "../../../features/cuarteles/api";
import type { ProtocoloExpanded } from "../../../features/protocolos/api";
import type { OperacionTaskTemplate, OperacionCategoria, ProtocoloTaskOption } from "../tareas.constants";
import { getMatchedCatalogTaskId } from "../tareas.helpers";

// ─── Tipos compartidos ────────────────────────────────────────────────────────

export type FormState = {
  tareaProtocolo: string;
  tareaCatalogoId: string;
  categoriaOperacion: OperacionCategoria;
  selectedProcesoId: string;
  titulo: string;
  descripcion: string;
  fechaFin: string;
  prioridad: "baja" | "media" | "alta";
  fincaId: string;
  cuartelId: string;
  assigneeKey: string;
};

export type ProtocolProcess = {
  proceso_id: string;
  nombre: string;
  evento_tipo: string;
  obligatorio: boolean;
  orden: number;
  etapaNombre: string;
  etapaOrden: number;
};

export type AssigneeOption = {
  key: string;
  label: string;
  userId: string;
  hasAccount: boolean;
};

export type GroupedProtocolProcess = {
  nombre: string;
  orden: number;
  procesos: ProtocolProcess[];
};

export type GroupedProtocoloTaskOption = {
  label: string;
  orden: number;
  options: ProtocoloTaskOption[];
};

// ─── Props ────────────────────────────────────────────────────────────────────

type CreateOrderFormProps = {
  managerScope: "finca" | "bodega";

  form: FormState;
  onFormChange: (updates: Partial<FormState>) => void;

  // Protocolo activo (scope bodega)
  activeProtocolo: ProtocoloExpanded | null;
  protocolProcesses: ProtocolProcess[];
  groupedProtocolProcesses: GroupedProtocolProcess[];

  // Opciones de protocolo (scope finca)
  scopedProtocoloTaskOptions: ProtocoloTaskOption[];
  groupedProtocoloTaskOptions: GroupedProtocoloTaskOption[];

  // Destino de finca
  requiresFincaTarget: boolean;
  fincas: Finca[];
  cuartelOptions: Cuartel[];

  // Asignación
  assigneeOptions: AssigneeOption[];

  // Catálogo (feedback contextual)
  selectedCatalogTask: OperacionTaskTemplate | null;

  // Acciones
  saving: boolean;
  onSubmit: () => void;
};

// ─── Componente ───────────────────────────────────────────────────────────────

export default function CreateOrderForm({
  managerScope,
  form,
  onFormChange,
  activeProtocolo,
  protocolProcesses,
  groupedProtocolProcesses,
  scopedProtocoloTaskOptions,
  groupedProtocoloTaskOptions,
  requiresFincaTarget,
  fincas,
  cuartelOptions,
  assigneeOptions,
  selectedCatalogTask,
  saving,
  onSubmit,
}: CreateOrderFormProps) {
  return (
    <>
      <div className="grid gap-4 md:grid-cols-2">

        {/* ── Selector de actividad (bodega) o tarea de protocolo (finca) ── */}
        {managerScope === "bodega" ? (
          activeProtocolo ? (
            <AppSelect
              label="Actividad del protocolo"
              value={form.selectedProcesoId}
              onChange={(e) => {
                const procesoId = e.target.value;
                const proceso = protocolProcesses.find((p) => p.proceso_id === procesoId);
                onFormChange({
                  selectedProcesoId: procesoId,
                  titulo: proceso?.nombre ?? "",
                  tareaCatalogoId: proceso?.evento_tipo
                    ? (getMatchedCatalogTaskId(proceso.nombre, proceso.evento_tipo) ?? "")
                    : "",
                });
              }}
              className="md:col-span-2"
            >
              <option value="">Seleccionar actividad del protocolo</option>
              {groupedProtocolProcesses.map((group) => (
                <optgroup key={group.nombre} label={group.nombre}>
                  {group.procesos.map((proceso) => (
                    <option key={proceso.proceso_id} value={proceso.proceso_id}>
                      {proceso.nombre}
                      {proceso.obligatorio ? " *" : ""}
                    </option>
                  ))}
                </optgroup>
              ))}
            </AppSelect>
          ) : (
            <div className="md:col-span-2 rounded-[var(--radius-lg)] border border-[color:var(--border-default)] bg-[color:var(--surface-soft)] px-4 py-3 text-sm text-[color:var(--text-ink-muted)]">
              Seleccioná un <strong>Protocolo activo</strong> en el encabezado para ver las actividades disponibles.
            </div>
          )
        ) : (
          <AppSelect
            label="Tarea del protocolo"
            value={form.tareaProtocolo}
            onChange={(e) => {
              const selected = e.target.value;
              const task = scopedProtocoloTaskOptions.find((item) => item.value === selected);
              onFormChange({
                tareaProtocolo: selected,
                titulo: task?.titulo ?? "",
              });
            }}
            className="md:col-span-2"
          >
            <option value="">Seleccionar tarea del protocolo</option>
            {groupedProtocoloTaskOptions.map((group) => (
              <optgroup key={group.label} label={group.label}>
                {group.options.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.titulo}
                  </option>
                ))}
              </optgroup>
            ))}
          </AppSelect>
        )}

        {/* ── Prioridad ─────────────────────────────────────────────────────── */}
        <AppSelect
          label="Prioridad"
          value={form.prioridad}
          onChange={(e) => onFormChange({ prioridad: e.target.value as "baja" | "media" | "alta" })}
        >
          <option value="baja">Baja</option>
          <option value="media">Media</option>
          <option value="alta">Alta</option>
        </AppSelect>

        {/* ── Destino finca / cuartel (cuando aplica) ────────────────────── */}
        {requiresFincaTarget ? (
          <>
            <div className="md:col-span-2 rounded-[var(--radius-lg)] border border-[color:var(--border-shell)] bg-[color:var(--surface-muted)] px-4 py-3">
              <p className="text-sm font-semibold text-[color:var(--text-on-dark)]">
                Destino obligatorio de finca
              </p>
              <p className="mt-1 text-xs leading-relaxed text-[color:var(--text-on-dark-muted)]">
                Esta orden necesita finca y cuartel para que el operario sepa exactamente dónde ejecutarla.
              </p>
            </div>
            <AppSelect
              label="Finca"
              value={form.fincaId}
              onChange={(e) => onFormChange({ fincaId: e.target.value, cuartelId: "" })}
            >
              <option value="">Seleccionar finca</option>
              {fincas.map((finca) => {
                const id = String(finca.finca_id ?? finca.id ?? "");
                const label = finca.nombre_finca ?? "Finca";
                return (
                  <option key={id} value={id}>
                    {label}
                  </option>
                );
              })}
            </AppSelect>
            <AppSelect
              label="Cuartel"
              value={form.cuartelId}
              onChange={(e) => onFormChange({ cuartelId: e.target.value })}
              disabled={!form.fincaId}
            >
              <option value="">Seleccionar cuartel</option>
              {cuartelOptions.map((cuartel) => {
                const id = String(cuartel.cuartel_id ?? cuartel.id ?? "");
                return (
                  <option key={id} value={id}>
                    {cuartel.codigo_cuartel}
                  </option>
                );
              })}
            </AppSelect>
          </>
        ) : null}

        {/* ── Asignar a ─────────────────────────────────────────────────────── */}
        <AppSelect
          label="Asignar a"
          value={form.assigneeKey}
          onChange={(e) => onFormChange({ assigneeKey: e.target.value })}
        >
          <option value="">Asignar a... (opcional)</option>
          {assigneeOptions.length > 0 ? (
            <>
              <optgroup label="Con cuenta">
                {assigneeOptions.filter((o) => o.hasAccount).map((o) => (
                  <option key={o.key} value={o.key}>{o.label}</option>
                ))}
              </optgroup>
              <optgroup label="Sin cuenta (operarios de campo)">
                {assigneeOptions.filter((o) => !o.hasAccount).map((o) => (
                  <option key={o.key} value={o.key}>{o.label}</option>
                ))}
              </optgroup>
            </>
          ) : null}
        </AppSelect>

        {/* ── Fecha límite ──────────────────────────────────────────────────── */}
        <AppInput
          label="Fecha límite"
          type="datetime-local"
          value={form.fechaFin}
          onChange={(e) => onFormChange({ fechaFin: e.target.value })}
        />

        {/* ── Descripción ───────────────────────────────────────────────────── */}
        <AppTextarea
          label="Descripción"
          value={form.descripcion}
          onChange={(e) => onFormChange({ descripcion: e.target.value })}
          placeholder="Opcional"
          className="md:col-span-2"
          uiSize="lg"
        />
      </div>

      {/* ── Banner contextual de catálogo ─────────────────────────────────── */}
      {managerScope === "bodega" && selectedCatalogTask ? (
        <div className="mt-6 rounded-[var(--radius-lg)] border border-[color:var(--border-shell)] bg-[color:var(--surface-muted)] p-4 shadow-[var(--shadow-inset-soft)]">
          <p className="text-sm font-semibold text-[color:var(--text-on-dark)]">
            Primero creamos la orden de trabajo
          </p>
          <p className="mt-1 text-xs leading-relaxed text-[color:var(--text-on-dark-muted)]">
            La carga operativa se completa al abrir la orden asignada. De esta forma no mezclamos
            la planificación del trabajo con el registro técnico de recepción, vasijas, cortes o despacho.
          </p>
        </div>
      ) : null}

      {/* ── Botón de guardar ──────────────────────────────────────────────── */}
      <div className="mt-6">
        <AppButton type="button" onClick={onSubmit} disabled={saving} loading={saving}>
          {saving ? "Guardando..." : "Registrar orden de trabajo"}
        </AppButton>
      </div>
    </>
  );
}
