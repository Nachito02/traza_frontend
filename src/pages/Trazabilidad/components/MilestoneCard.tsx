import { Upload, FileText, ExternalLink } from "lucide-react";
import { AppButton, AppCard } from "../../../components/ui";
import type { Milestone } from "../../../features/milestones/api";

type Props = {
  milestone: Milestone;
  trazabilidadId: string | undefined;
  onOpenModal: (milestone: Milestone) => void;
  onOpenUpload: (milestone: Milestone) => void;
  onNavigateToTareas: (milestoneId: string) => void;
};

const MilestoneCard = ({
  milestone: m,
  onOpenModal,
  onOpenUpload,
  onNavigateToTareas,
}: Props) => {
  const statusBadgeClasses =
    m.estado === "completado"
      ? "border-[color:var(--feedback-success-border)] bg-[color:var(--feedback-success-bg)] text-[color:var(--feedback-success-text)]"
      : "border-[color:var(--feedback-warning-border)] bg-[color:var(--feedback-warning-bg)] text-[color:var(--feedback-warning-text)]";

  const statusLabel =
    m.estado === "completado"
      ? "Completado"
      : m.protocolo_proceso.obligatorio
        ? "Pendiente obligatorio"
        : "Pendiente opcional";

  return (
    <AppCard as="article" tone="soft" padding="md" className="shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-sm font-semibold text-[color:var(--text-ink)]">
            {m.protocolo_proceso.orden}. {m.protocolo_proceso.nombre}
            {m.evidencia && m.evidencia.length > 0 && (
              <FileText className="h-4 w-4 text-[color:var(--feedback-info-text)]" />
            )}
          </div>
          <div className="mt-1 text-xs text-[color:var(--text-ink-muted)]">
            Tipo: {m.protocolo_proceso.evento_tipo} •{" "}
            {m.protocolo_proceso.obligatorio ? "Obligatorio" : "Opcional"}
          </div>
          <div className="mt-2 text-xs text-[color:var(--accent-primary)]">
            {m.estado === "completado"
              ? "Ya tiene registro cargado para este proceso."
              : "Todavía falta cargar el evento o derivarlo a una tarea."}
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span
            className={`rounded-full border px-3 py-1 text-xs font-semibold ${statusBadgeClasses}`}
          >
            {statusLabel}
          </span>

          <button
            type="button"
            onClick={() => onOpenUpload(m)}
            className="rounded-lg p-2 text-[color:var(--accent-primary)] transition hover:bg-[color:var(--surface-soft)]"
            title="Adjuntar evidencia"
          >
            <Upload className="w-4 h-4" />
          </button>

          <AppButton
            type="button"
            onClick={() => onOpenModal(m)}
            disabled={m.estado === "completado"}
            variant="secondary"
            size="sm"
          >
            {m.estado === "completado" ? "Evento registrado" : "Cargar evento"}
          </AppButton>
          {m.estado !== "completado" && (
            <AppButton
              type="button"
              onClick={() => onNavigateToTareas(m.milestone_id)}
              variant="secondary"
              size="sm"
            >
              Asignar tarea
            </AppButton>
          )}
        </div>
      </div>

      {m.evidencia && m.evidencia.length > 0 && (
        <div className="mt-4 border-l-2 border-[color:var(--border-default)] pl-4">
          <p className="mb-2 text-xs font-semibold text-[color:var(--text-ink-muted)]">Evidencia adjunta:</p>
          <div className="flex flex-wrap gap-2">
            {m.evidencia.map((evidence) => (
              <a
                key={evidence.evidencia_id}
                href={`${import.meta.env.VITE_API_URL ?? ""}${evidence.url}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 rounded-[var(--radius-md)] border border-[color:var(--border-default)] bg-[color:var(--surface-soft)] px-2 py-1 text-xs text-[color:var(--accent-primary)] hover:underline"
              >
                <ExternalLink className="w-3 h-3" />
                Ver archivo
              </a>
            ))}
          </div>
        </div>
      )}
    </AppCard>
  );
};

export default MilestoneCard;
