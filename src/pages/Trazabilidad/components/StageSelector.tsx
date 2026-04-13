import { AppCard } from "../../../components/ui";
import type { StageGroup } from "../useMilestonesPlan";

type Props = {
  stages: StageGroup[];
  selectedStage: StageGroup | null;
  onSelectStage: (name: string) => void;
};

const StageSelector = ({ stages, selectedStage, onSelectStage }: Props) => {
  return (
    <AppCard
      as="section"
      tone="soft"
      padding="sm"
      header={<h3 className="text-sm font-semibold text-[color:var(--accent-primary)]">Etapas del protocolo</h3>}
    >
      <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
        {stages.map((stage) => {
          const isActive = selectedStage?.name === stage.name;
          const stageProgress =
            stage.total === 0 ? 0 : Math.round((stage.completed / stage.total) * 100);
          return (
            <button
              key={stage.name}
              type="button"
              onClick={() => onSelectStage(stage.name)}
              className={[
                "min-w-[220px] rounded-xl border px-3 py-2 text-left transition",
                isActive
                  ? "border-[color:var(--accent-secondary)] bg-[color:var(--surface-soft)]"
                  : "border-[color:var(--border-default)] bg-white hover:bg-[color:var(--surface-soft)]",
              ].join(" ")}
            >
              <div className="text-sm font-semibold text-[color:var(--text-ink)]">{stage.name}</div>
              <div className="mt-1 text-xs text-[color:var(--text-ink-muted)]">
                {stage.completed}/{stage.total} completos ({stageProgress}%)
              </div>
              <div className="mt-1 text-xs text-[color:var(--accent-primary)]">
                Pendientes obligatorios: {stage.requiredPending}
              </div>
            </button>
          );
        })}
      </div>
    </AppCard>
  );
};

export default StageSelector;
