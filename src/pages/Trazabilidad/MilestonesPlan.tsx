import { useMilestonesPlan } from "./useMilestonesPlan";
import MilestoneSummary from "./components/MilestoneSummary";
import StageSelector from "./components/StageSelector";
import MilestoneCard from "./components/MilestoneCard";
import EventoModal from "./components/EventoModal";
import UploadModal from "./components/UploadModal";
import { useParams } from "react-router-dom";

const MilestonesPlan = () => {
  const { id } = useParams();
  const {
    loading,
    error,
    milestones,
    active,
    uploadActive,
    saving,
    uploading,
    formError,
    fileToUpload,
    form,
    milestonesByStage,
    selectedStage,
    globalSummary,
    obligatorioPendiente,
    setSelectedStageName,
    setFileToUpload,
    openModal,
    closeModal,
    openUploadModal,
    closeUploadModal,
    onChange,
    handleUpload,
    handleSubmit,
    navigateToTareas,
  } = useMilestonesPlan();

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#F9F6F2] via-[#F3E7DA] to-[#EAD8C6] px-6 py-10">
      <div className="mx-auto w-full max-w-5xl">
        <div className="mb-8">
          <h1 className="text-3xl text-[#3D1B1F]">Plan de trabajo</h1>
          <p className="mt-2 text-sm text-[#6B3A3F]">
            Completá los milestones del protocolo para cerrar la trazabilidad.
          </p>
        </div>

        {loading ? (
          <div className="rounded-2xl border border-[#C9A961]/30 bg-white/90 p-6 text-center text-sm text-[#6B3A3F]">
            Cargando milestones…
          </div>
        ) : error ? (
          <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-center text-sm text-red-700">
            {error}
          </div>
        ) : milestones.length === 0 ? (
          <div className="rounded-2xl border border-[#C9A961]/30 bg-white/90 p-6 text-center text-sm text-[#6B3A3F]">
            No hay milestones para esta trazabilidad.
          </div>
        ) : (
          <div className="space-y-8">
            <MilestoneSummary summary={globalSummary} />

            <StageSelector
              stages={milestonesByStage}
              selectedStage={selectedStage}
              onSelectStage={setSelectedStageName}
            />

            {selectedStage && (
              <section className="rounded-2xl border border-[#C9A961]/30 bg-[#FFF9F0] p-4">
                <h3 className="text-sm font-semibold text-[#722F37]">
                  Checklist de obligatorios · {selectedStage.name}
                </h3>
                <div className="mt-2 space-y-1">
                  {selectedStage.milestones
                    .filter((m) => m.protocolo_proceso.obligatorio)
                    .map((m) => (
                      <div
                        key={`req-${m.milestone_id}`}
                        className="flex items-center justify-between rounded-lg bg-white px-3 py-2 text-xs"
                      >
                        <span className="text-[#3D1B1F]">
                          {m.protocolo_proceso.orden}. {m.protocolo_proceso.nombre}
                        </span>
                        <span
                          className={`font-semibold ${
                            m.estado === "completado" ? "text-[#2D6B2D]" : "text-[#8A6B1F]"
                          }`}
                        >
                          {m.estado === "completado" ? "Listo" : "Pendiente"}
                        </span>
                      </div>
                    ))}
                </div>
              </section>
            )}

            {selectedStage && (
              <div key={selectedStage.name} className="space-y-3">
                <h3 className="border-b border-[#C9A961]/30 pb-2 text-lg font-bold text-[#722F37]">
                  {selectedStage.name}
                </h3>
                {selectedStage.milestones.map((m) => (
                  <MilestoneCard
                    key={m.milestone_id}
                    milestone={m}
                    trazabilidadId={id}
                    onOpenModal={openModal}
                    onOpenUpload={openUploadModal}
                    onNavigateToTareas={navigateToTareas}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        <div className="mt-8 flex justify-end">
          <button
            type="button"
            disabled={obligatorioPendiente}
            className="rounded-lg border border-[#C9A961]/40 px-4 py-2 text-sm font-semibold text-[#722F37] transition hover:border-[#C9A961] hover:bg-[#F8F3EE] disabled:cursor-not-allowed disabled:opacity-60"
          >
            Finalizar trazabilidad
          </button>
        </div>
      </div>

      {active && (
        <EventoModal
          milestone={active}
          form={form}
          formError={formError}
          saving={saving}
          onChange={onChange}
          onSubmit={handleSubmit}
          onClose={closeModal}
        />
      )}

      {uploadActive && (
        <UploadModal
          milestone={uploadActive}
          fileToUpload={fileToUpload}
          uploading={uploading}
          onFileChange={setFileToUpload}
          onUpload={handleUpload}
          onClose={closeUploadModal}
        />
      )}
    </div>
  );
};

export default MilestonesPlan;
