import { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { AppButton, AppCard, AppModal, NoticeBanner, SectionIntro } from "../../components/ui";
import type { ElaboracionEntity } from "../../features/elaboracion/api";
import { useAuthStore } from "../../store/authStore";
import CiuQcPage from "./CiuQcPage";
import RecepcionPage from "./RecepcionPage";
import VasijasProcesoPage from "./VasijasProcesoPage";
import SectionSelector from "./components/SectionSelector";
import LoteSelectorPanel from "./components/LoteSelectorPanel";

type IngresoUvaStep = "remito" | "recepcion" | "analisis" | "ciu" | "vasija";

type StepConfig = {
  key: IngresoUvaStep;
  label: string;
};

type PendingCiuNextStep = {
  title: string;
  description: string;
  primaryLabel: string;
};

const STEPS: StepConfig[] = [
  { key: "remito",   label: "Remito de uva" },
  { key: "recepcion", label: "Recepción y pesaje" },
  { key: "analisis", label: "Análisis de recepción" },
  { key: "ciu",     label: "Registrar CIU" },
  { key: "vasija",  label: "Enviar a vasija" },
];

function getStepFromParams(value: string | null): IngresoUvaStep {
  return STEPS.some((step) => step.key === value) ? (value as IngresoUvaStep) : "remito";
}

function resolveStringId(item: ElaboracionEntity, keys: string[]) {
  const id = keys
    .map((key) => item[key])
    .find((value) => typeof value === "string" || typeof value === "number");
  return id === undefined || id === null ? "" : String(id);
}

export default function IngresoUvaFlowPage() {
  const activeBodegaId = useAuthStore((state) => state.activeBodegaId);
  const [searchParams, setSearchParams] = useSearchParams();
  const [recepcionDefaults, setRecepcionDefaults] = useState<Record<string, string | boolean>>({});
  const [analisisDefaults, setAnalisisDefaults] = useState<Record<string, string | boolean>>({});
  const [referenceOptionsVersion, setReferenceOptionsVersion] = useState(0);
  const [pendingCiuNextStep, setPendingCiuNextStep] = useState<PendingCiuNextStep | null>(null);
  // Solo se abre el modal automáticamente cuando se llega a un paso vía "Continuar".
  // Si el usuario navega manualmente por los tabs para consultar registros, no se abre.
  const [autoOpenStep, setAutoOpenStep] = useState<IngresoUvaStep | null>(null);
  const [loteReady, setLoteReady] = useState<{ lote_id: string; codigo: string } | null>(null);
  // Después de armar el lote, primero se ofrece descargar el .txt para el INV y
  // recién con "Continuar a vasija" se muestra el form de destino.
  const [vasijaConfirmado, setVasijaConfirmado] = useState(false);
  // Fuerza que LoteSelectorPanel se vuelva a montar (lista y selección desde cero)
  // al arrancar un lote nuevo, sin depender del "ingreso actual" del wizard — ese
  // contexto se pierde en cuanto se navega manualmente entre pasos.
  const [loteSelectorKey, setLoteSelectorKey] = useState(0);
  const activeStep = getStepFromParams(searchParams.get("paso") ?? searchParams.get("section"));

  const goToStep = (step: IngresoUvaStep) => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.delete("section");
      next.set("paso", step);
      return next;
    });
  };

  // Navegación manual por los tabs: nunca auto-abre el modal.
  const goToStepManually = (step: IngresoUvaStep) => {
    setAutoOpenStep(null);
    goToStep(step);
  };

  // Estos callbacks se disparan únicamente al confirmar "Continuar" desde el paso previo,
  // por eso marcamos el destino como auto-abrible.
  const handleRecepcionDefaults = (values: Record<string, string | boolean>) => {
    setRecepcionDefaults(values);
    setAutoOpenStep("recepcion");
  };

  const handleAnalisisDefaults = (values: Record<string, string | boolean>) => {
    setAnalisisDefaults(values);
    setAutoOpenStep("analisis");
  };

  const handleCiuCreated = (item: ElaboracionEntity) => {
    const ciuId = resolveStringId(item, ["ciu_id", "id_ciu", "id"]);
    if (!ciuId) return;
    setReferenceOptionsVersion((current) => current + 1);
    setPendingCiuNextStep({
      title: "CIU registrado",
      description:
        "El CIU quedó asociado al ingreso correspondiente. Podés continuar con el ingreso a vasija o volver más tarde si todavía no está definido el destino.",
      primaryLabel: "Continuar a vasija",
    });
  };

  const continueCiuNextStep = () => {
    if (!pendingCiuNextStep) return;
    goToStep("vasija");
    setPendingCiuNextStep(null);
  };

  return (
    <div className="space-y-5">
      <AppCard
        as="section"
        tone="default"
        padding="lg"
        className="bg-[color:var(--surface-hero)] text-[color:var(--text-on-dark)]"
        header={(
          <SectionIntro
            eyebrow="Ingreso de uva"
            title="Flujo asistido de CIU"
            description="Un solo recorrido operativo para cargar origen, recepción, análisis, comprobante e ingreso a vasija."
            descriptionClassName="text-[color:var(--text-on-dark-muted)]"
          />
        )}
      >
        <div className="mt-5">
          <SectionSelector
            bare
            value={activeStep}
            onChange={(key) => goToStepManually(key)}
            options={STEPS}
          />
        </div>
      </AppCard>

      {activeStep === "remito" ? (
        <RecepcionPage
          initialSection="remito"
          hideSectionSelector
          onSectionChange={(section) => goToStep(section)}
          onRecepcionDefaultsChange={handleRecepcionDefaults}
          onAnalisisDefaultsChange={handleAnalisisDefaults}
        />
      ) : null}

      {activeStep === "recepcion" ? (
        <RecepcionPage
          initialSection="recepcion"
          hideSectionSelector
          autoOpenForm={autoOpenStep === "recepcion"}
          onSectionChange={(section) => goToStep(section)}
          recepcionDefaultValues={recepcionDefaults}
          onRecepcionDefaultsChange={handleRecepcionDefaults}
          onAnalisisDefaultsChange={handleAnalisisDefaults}
        />
      ) : null}

      {activeStep === "analisis" ? (
        <RecepcionPage
          initialSection="analisis"
          hideSectionSelector
          autoOpenForm={autoOpenStep === "analisis"}
          onSectionChange={(section) => goToStep(section)}
          analisisDefaultValues={analisisDefaults}
          onRecepcionDefaultsChange={handleRecepcionDefaults}
          onAnalisisDefaultsChange={handleAnalisisDefaults}
        />
      ) : null}

      {activeStep === "ciu" ? (
        <div className="space-y-3">
          <NoticeBanner tone="info" title="Datos para declarar el CIU">
            El número de CIU lo asigna la bodega. Estos datos, junto con los del resto de los viajes
            del mismo cuartel, arman el lote y generan el archivo que se carga en el Sistema de
            Cosecha del INV para declararlos. Cada ingreso admite un único CIU.
          </NoticeBanner>
          <CiuQcPage
            hideSectionSelector
            ciuDefaultValues={analisisDefaults}
            referenceOptionsVersion={referenceOptionsVersion}
            onCiuCreated={handleCiuCreated}
          />
        </div>
      ) : null}

      {activeStep === "vasija" ? (
        <div className="space-y-3">
          {!vasijaConfirmado && activeBodegaId ? (
            <LoteSelectorPanel
              key={loteSelectorKey}
              bodegaId={String(activeBodegaId)}
              onLoteReady={setLoteReady}
              onContinuarAVasija={() => setVasijaConfirmado(true)}
            />
          ) : null}

          {loteReady && vasijaConfirmado ? (
            <VasijasProcesoPage
              initialSection="operaciones"
              hideSectionSelector
              inlineOperacionForm
              operacionDefaultValues={{
                tipo: "ingreso",
                loteId: loteReady.lote_id,
              }}
            />
          ) : null}

          {loteReady && vasijaConfirmado ? (
            <AppButton
              type="button"
              variant="ghost"
              onClick={() => {
                setLoteReady(null);
                setVasijaConfirmado(false);
                setLoteSelectorKey((current) => current + 1);
              }}
            >
              Armar otro lote
            </AppButton>
          ) : null}

          <div className="flex flex-wrap gap-2">
            <Link to="/operacion/vasijas">
              <AppButton variant="secondary">Abrir vasijas y proceso</AppButton>
            </Link>
            <AppButton
              type="button"
              variant="ghost"
              onClick={() => {
                setLoteReady(null);
                setVasijaConfirmado(false);
                setLoteSelectorKey((current) => current + 1);
                goToStep("remito");
              }}
            >
              Registrar otro ingreso
            </AppButton>
          </div>
        </div>
      ) : null}

      <AppModal
        opened={pendingCiuNextStep !== null}
        onClose={() => setPendingCiuNextStep(null)}
        title={pendingCiuNextStep?.title}
        description="Flujo asistido de CIU"
        size="sm"
        footer={(
          <div className="flex flex-wrap justify-end gap-2">
            <AppButton
              type="button"
              variant="secondary"
              onClick={() => setPendingCiuNextStep(null)}
            >
              Continuar más tarde
            </AppButton>
            <AppButton
              type="button"
              variant="primary"
              onClick={continueCiuNextStep}
            >
              {pendingCiuNextStep?.primaryLabel ?? "Continuar"}
            </AppButton>
          </div>
        )}
      >
        <p className="text-sm leading-relaxed text-[color:var(--text-ink-muted)]">
          {pendingCiuNextStep?.description}
        </p>
      </AppModal>
    </div>
  );
}
