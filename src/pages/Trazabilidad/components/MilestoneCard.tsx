import { Upload, FileText, ExternalLink } from "lucide-react";
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
  const statusLabel =
    m.estado === "completado"
      ? "Completado"
      : m.protocolo_proceso.obligatorio
        ? "Pendiente obligatorio"
        : "Pendiente opcional";

  return (
    <div className="rounded-2xl border border-[#C9A961]/30 bg-white/90 p-5 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="text-sm font-semibold text-[#3D1B1F] flex items-center gap-2">
            {m.protocolo_proceso.orden}. {m.protocolo_proceso.nombre}
            {m.evidencia && m.evidencia.length > 0 && (
              <FileText className="w-4 h-4 text-blue-500" />
            )}
          </div>
          <div className="mt-1 text-xs text-[#7A4A50]">
            Tipo: {m.protocolo_proceso.evento_tipo} •{" "}
            {m.protocolo_proceso.obligatorio ? "Obligatorio" : "Opcional"}
          </div>
          <div className="mt-2 text-xs text-[#8B4049]">
            {m.estado === "completado"
              ? "Ya tiene registro cargado para este proceso."
              : "Todavía falta cargar el evento o derivarlo a una tarea."}
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span
            className={`rounded-full px-3 py-1 text-xs font-semibold ${
              m.estado === "completado"
                ? "bg-[#F3FBF2] text-[#2D6B2D]"
                : "bg-[#FFF9E9] text-[#8A6B1F]"
            }`}
          >
            {statusLabel}
          </span>

          <button
            type="button"
            onClick={() => onOpenUpload(m)}
            className="p-2 text-[#722F37] hover:bg-[#F8F3EE] rounded-lg transition"
            title="Adjuntar evidencia"
          >
            <Upload className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={() => onOpenModal(m)}
            disabled={m.estado === "completado"}
            className="rounded-lg border border-[#C9A961]/40 px-3 py-2 text-xs font-semibold text-[#722F37] transition hover:border-[#C9A961] hover:bg-[#F8F3EE] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {m.estado === "completado" ? "Evento registrado" : "Cargar evento"}
          </button>
          {m.estado !== "completado" && (
            <button
              type="button"
              onClick={() => onNavigateToTareas(m.milestone_id)}
              className="rounded-lg border border-[#C9A961]/40 px-3 py-2 text-xs font-semibold text-[#722F37] transition hover:border-[#C9A961] hover:bg-[#F8F3EE]"
            >
              Asignar tarea
            </button>
          )}
        </div>
      </div>

      {m.evidencia && m.evidencia.length > 0 && (
        <div className="mt-4 pl-4 border-l-2 border-[#C9A961]/20">
          <p className="text-xs font-semibold text-[#7A4A50] mb-2">Evidencia adjunta:</p>
          <div className="flex flex-wrap gap-2">
            {m.evidencia.map((evidence) => (
              <a
                key={evidence.evidencia_id}
                href={`${import.meta.env.VITE_API_URL ?? ""}${evidence.url}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 text-xs text-blue-600 hover:underline bg-blue-50 px-2 py-1 rounded"
              >
                <ExternalLink className="w-3 h-3" />
                Ver archivo
              </a>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default MilestoneCard;
