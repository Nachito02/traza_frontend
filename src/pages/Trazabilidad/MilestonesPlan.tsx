import { useMilestonesPlan } from "./useMilestonesPlan";
import MilestoneSummary from "./components/MilestoneSummary";
import StageSelector from "./components/StageSelector";
import MilestoneCard from "./components/MilestoneCard";
import EventoModal from "./components/EventoModal";
import UploadModal from "./components/UploadModal";
import { useParams } from "react-router-dom";
import ProcessOverview from "./components/ProcessOverview";
import { AppButton, AppCard, NoticeBanner, SectionIntro } from "../../components/ui";

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
    activeFields,
    operarios,
    milestonesByStage,
    selectedStage,
    globalSummary,
    obligatorioPendiente,
    hallazgos,
    indicadores,
    contextSummary,
    nextStep,
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
    <div className="min-h-screen bg-secondary px-6 py-10">
      <div className="mx-auto w-full max-w-5xl">
        <SectionIntro
          className="mb-8"
          title="Workspace del proceso"
          description={(
            <>
            Seguí el estado de la trazabilidad, completá procesos y detectá bloqueos antes de cerrar.
            </>
          )}
        />

        {loading ? (
          <NoticeBanner className="p-6 text-center">
            Cargando milestones…
          </NoticeBanner>
        ) : error ? (
          <NoticeBanner tone="danger" className="p-6 text-center">
            {error}
          </NoticeBanner>
        ) : milestones.length === 0 ? (
          <NoticeBanner className="p-6 text-center">
            No hay milestones para esta trazabilidad.
          </NoticeBanner>
        ) : (
          <div className="space-y-8">
            {contextSummary ? (
              <ProcessOverview
                context={contextSummary}
                summary={globalSummary}
                selectedStage={selectedStage}
                nextStep={nextStep}
                hallazgos={hallazgos}
                indicadores={indicadores}
              />
            ) : null}

            <MilestoneSummary summary={globalSummary} />

            <StageSelector
              stages={milestonesByStage}
              selectedStage={selectedStage}
              onSelectStage={setSelectedStageName}
            />

            {selectedStage && (
              <AppCard
                as="section"
                tone="soft"
                padding="sm"
                header={(
                  <h3 className="text-sm font-semibold text-[color:var(--accent-primary)]">
                    Checklist de obligatorios · {selectedStage.name}
                  </h3>
                )}
              >
                <div className="mt-2 space-y-1">
                  {selectedStage.milestones
                    .filter((m) => m.protocolo_proceso.obligatorio)
                    .map((m) => (
                      <div
                        key={`req-${m.milestone_id}`}
                        className="flex items-center justify-between rounded-lg bg-white px-3 py-2 text-xs"
                      >
                        <span className="text-[color:var(--text-ink)]">
                          {m.protocolo_proceso.orden}. {m.protocolo_proceso.nombre}
                        </span>
                        <span
                          className={`font-semibold ${
                            m.estado === "completado"
                              ? "text-[color:var(--feedback-success-text)]"
                              : "text-[color:var(--feedback-warning-text)]"
                          }`}
                        >
                          {m.estado === "completado" ? "Listo" : "Pendiente"}
                        </span>
                      </div>
                    ))}
                </div>
              </AppCard>
            )}

            {selectedStage && (
              <div key={selectedStage.name} className="space-y-3">
                <h3 className="border-b border-[color:var(--border-default)] pb-2 text-lg font-bold text-[color:var(--accent-primary)]">
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
          <AppButton
            type="button"
            disabled={obligatorioPendiente}
            variant={obligatorioPendiente ? "secondary" : "primary"}
          >
            {obligatorioPendiente ? "Faltan obligatorios para cerrar" : "Lista para cierre"}
          </AppButton>
        </div>
      </div>

      {active && (
        <EventoModal
          milestone={active}
          operarios={operarios}
          fields={activeFields}
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
