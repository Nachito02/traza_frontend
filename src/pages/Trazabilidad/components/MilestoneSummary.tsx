import { CheckCircle2, ListChecks, Clock3, AlertTriangle } from "lucide-react";
import { MetricCard } from "../../../components/ui";
import type { GlobalSummary } from "../useMilestonesPlan";

type Props = {
  summary: GlobalSummary;
};

const MilestoneSummary = ({ summary }: Props) => {
  return (
    <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      <MetricCard label="Total hitos" value={summary.total} icon={<ListChecks className="h-4 w-4" />} />
      <MetricCard
        label="Completados"
        value={summary.completed}
        tone="success"
        icon={<CheckCircle2 className="h-4 w-4" />}
      />
      <MetricCard
        label="Avance"
        value={`${summary.progress}%`}
        tone="warning"
        icon={<Clock3 className="h-4 w-4" />}
      />
      <MetricCard
        label="Obligatorios pendientes"
        value={summary.requiredPending}
        tone="danger"
        icon={<AlertTriangle className="h-4 w-4" />}
      />
    </section>
  );
};

export default MilestoneSummary;
