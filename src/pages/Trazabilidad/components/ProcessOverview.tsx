import { AlertTriangle, ArrowRightCircle, FlaskConical, MapPin, ScrollText } from "lucide-react";
import type { CumplimientoIndicadores, HallazgoCumplimiento } from "../../../features/cumplimiento/api";
import type { GlobalSummary, StageGroup } from "../useMilestonesPlan";

type ProcessContext = {
  nombre: string;
  estado: string;
  bodegaNombre: string;
  fincaNombre: string;
  cuartelNombre: string;
  campaniaNombre: string;
  protocoloNombre: string;
};

type NextStep = {
  stageName: string;
  processName: string;
  isRequired: boolean;
};

type Props = {
  context: ProcessContext;
  summary: GlobalSummary;
  selectedStage: StageGroup | null;
  nextStep: NextStep | null;
  hallazgos: HallazgoCumplimiento[];
  indicadores: CumplimientoIndicadores | null;
};

function badgeClasses(status: string) {
  const normalized = status.toLowerCase();
  if (normalized === "completado" || normalized === "finalizada" || normalized === "certificada") {
    return "bg-[#F3FBF2] text-[#2D6B2D]";
  }
  if (normalized === "en_curso") {
    return "bg-[#FFF9E9] text-[#8A6B1F]";
  }
  return "bg-[#F8E7E9] text-[#8B4049]";
}

export default function ProcessOverview({
  context,
  summary,
  selectedStage,
  nextStep,
  hallazgos,
  indicadores,
}: Props) {
  const hallazgosAbiertos = hallazgos.filter((item) =>
    ["abierto", "en_proceso"].includes(String(item.estado ?? "").toLowerCase()),
  );
  const bloqueos = hallazgosAbiertos.filter((item) => item.severidad === "bloqueo").length;
  const alertas = hallazgosAbiertos.filter((item) => item.severidad === "alerta").length;
  const agua = indicadores?.agua;
  const fitos = indicadores?.fitosanitarios;

  return (
    <section className="grid gap-4 lg:grid-cols-[1.5fr_1fr]">
      <article className="rounded-3xl border border-[#C9A961]/30 bg-white/95 p-6 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#8B5E34]">
              Proceso activo
            </p>
            <h2 className="mt-2 text-2xl font-bold text-[#3D1B1F]">{context.nombre}</h2>
            <p className="mt-2 max-w-2xl text-sm text-[#6B3A3F]">
              Esta vista concentra qué contexto estás operando, qué falta completar y qué riesgos
              abiertos tiene la trazabilidad.
            </p>
          </div>
          <span className={`rounded-full px-3 py-1 text-xs font-semibold ${badgeClasses(context.estado)}`}>
            {context.estado}
          </span>
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          <div className="rounded-2xl border border-[#C9A961]/25 bg-[#FFF9F0] p-4">
            <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-[#8B5E34]">
              <MapPin className="h-4 w-4" />
              Contexto
            </div>
            <div className="mt-2 space-y-1 text-sm text-[#3D1B1F]">
              <div>Bodega: {context.bodegaNombre}</div>
              <div>Finca: {context.fincaNombre}</div>
              <div>Cuartel: {context.cuartelNombre}</div>
            </div>
          </div>

          <div className="rounded-2xl border border-[#C9A961]/25 bg-[#FFF9F0] p-4">
            <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-[#8B5E34]">
              <ScrollText className="h-4 w-4" />
              Marco
            </div>
            <div className="mt-2 space-y-1 text-sm text-[#3D1B1F]">
              <div>Campaña: {context.campaniaNombre}</div>
              <div>Protocolo: {context.protocoloNombre}</div>
              <div>Avance: {summary.progress}%</div>
            </div>
          </div>

          <div className="rounded-2xl border border-[#C9A961]/25 bg-[#FFF9F0] p-4">
            <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-[#8B5E34]">
              <ArrowRightCircle className="h-4 w-4" />
              Próximo paso
            </div>
            <div className="mt-2 text-sm text-[#3D1B1F]">
              {nextStep ? (
                <>
                  <div className="font-semibold">{nextStep.processName}</div>
                  <div className="mt-1 text-[#6B3A3F]">Etapa: {nextStep.stageName}</div>
                  <div className="mt-1 text-xs text-[#8B4049]">
                    {nextStep.isRequired ? "Proceso obligatorio pendiente" : "Proceso opcional pendiente"}
                  </div>
                </>
              ) : (
                <div className="font-semibold text-[#2D6B2D]">No hay pasos pendientes</div>
              )}
            </div>
          </div>
        </div>
      </article>

      <article className="rounded-3xl border border-[#C9A961]/30 bg-[#FFF9F0] p-6 shadow-sm">
        <h3 className="text-sm font-semibold uppercase tracking-[0.18em] text-[#8B5E34]">
          Riesgos y señales
        </h3>

        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
          <div className="rounded-2xl border border-[#D9B87A]/35 bg-white p-4">
            <div className="flex items-center gap-2 text-xs text-[#7A4A50]">
              <AlertTriangle className="h-4 w-4 text-[#B45309]" />
              Cumplimiento
            </div>
            <div className="mt-2 text-2xl font-bold text-[#3D1B1F]">{hallazgosAbiertos.length}</div>
            <div className="mt-1 text-xs text-[#7A4A50]">
              {bloqueos} bloqueos · {alertas} alertas
            </div>
          </div>

          <div className="rounded-2xl border border-[#D9B87A]/35 bg-white p-4">
            <div className="flex items-center gap-2 text-xs text-[#7A4A50]">
              <FlaskConical className="h-4 w-4 text-[#722F37]" />
              Indicadores rápidos
            </div>
            <div className="mt-2 space-y-1 text-sm text-[#3D1B1F]">
              <div>Riegos: {agua?.total_riegos ?? 0}</div>
              <div>m3/ha: {agua?.m3_por_ha ?? "-"}</div>
              <div>Aplicaciones: {fitos?.aplicaciones_total ?? 0}</div>
            </div>
          </div>

          <div className="rounded-2xl border border-[#D9B87A]/35 bg-white p-4">
            <div className="text-xs text-[#7A4A50]">Etapa enfocada</div>
            <div className="mt-2 text-lg font-semibold text-[#3D1B1F]">
              {selectedStage?.name ?? "Sin etapa seleccionada"}
            </div>
            <div className="mt-1 text-xs text-[#7A4A50]">
              {selectedStage
                ? `${selectedStage.completed}/${selectedStage.total} procesos completos`
                : "Elegí una etapa para trabajar"}
            </div>
          </div>
        </div>
      </article>
    </section>
  );
}
