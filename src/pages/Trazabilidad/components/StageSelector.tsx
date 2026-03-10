import type { StageGroup } from "../useMilestonesPlan";

type Props = {
  stages: StageGroup[];
  selectedStage: StageGroup | null;
  onSelectStage: (name: string) => void;
};

const StageSelector = ({ stages, selectedStage, onSelectStage }: Props) => {
  return (
    <section className="rounded-2xl border border-[#C9A961]/30 bg-white/90 p-4">
      <h3 className="text-sm font-semibold text-[#722F37]">Etapas del protocolo</h3>
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
                  ? "border-[#C9A961] bg-[#FFF9F0]"
                  : "border-[#C9A961]/30 bg-white hover:bg-[#F8F3EE]",
              ].join(" ")}
            >
              <div className="text-sm font-semibold text-[#3D1B1F]">{stage.name}</div>
              <div className="mt-1 text-xs text-[#7A4A50]">
                {stage.completed}/{stage.total} completos ({stageProgress}%)
              </div>
              <div className="mt-1 text-xs text-[#8B4049]">
                Pendientes obligatorios: {stage.requiredPending}
              </div>
            </button>
          );
        })}
      </div>
    </section>
  );
};

export default StageSelector;
