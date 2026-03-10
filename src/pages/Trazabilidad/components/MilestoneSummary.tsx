import { CheckCircle2, ListChecks, Clock3, AlertTriangle } from "lucide-react";
import type { GlobalSummary } from "../useMilestonesPlan";

type Props = {
  summary: GlobalSummary;
};

const MilestoneSummary = ({ summary }: Props) => {
  return (
    <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      <div className="rounded-2xl border border-[#C9A961]/30 bg-white/90 p-4">
        <div className="flex items-center gap-2 text-xs text-[#7A4A50]">
          <ListChecks className="h-4 w-4" />
          Total hitos
        </div>
        <div className="mt-2 text-2xl font-bold text-[#3D1B1F]">{summary.total}</div>
      </div>
      <div className="rounded-2xl border border-[#C9A961]/30 bg-white/90 p-4">
        <div className="flex items-center gap-2 text-xs text-[#7A4A50]">
          <CheckCircle2 className="h-4 w-4 text-green-600" />
          Completados
        </div>
        <div className="mt-2 text-2xl font-bold text-[#2D6B2D]">{summary.completed}</div>
      </div>
      <div className="rounded-2xl border border-[#C9A961]/30 bg-white/90 p-4">
        <div className="flex items-center gap-2 text-xs text-[#7A4A50]">
          <Clock3 className="h-4 w-4 text-amber-600" />
          Avance
        </div>
        <div className="mt-2 text-2xl font-bold text-[#8A6B1F]">{summary.progress}%</div>
      </div>
      <div className="rounded-2xl border border-[#C9A961]/30 bg-white/90 p-4">
        <div className="flex items-center gap-2 text-xs text-[#7A4A50]">
          <AlertTriangle className="h-4 w-4 text-red-600" />
          Obligatorios pendientes
        </div>
        <div className="mt-2 text-2xl font-bold text-[#8B2A2A]">{summary.requiredPending}</div>
      </div>
    </section>
  );
};

export default MilestoneSummary;
