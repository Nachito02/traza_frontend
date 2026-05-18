import { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { AppButton, AppCard, AppModal, NoticeBanner, SectionIntro } from "../../components/ui";
import type { ElaboracionEntity } from "../../features/elaboracion/api";
import CiuQcPage from "./CiuQcPage";
import RecepcionPage from "./RecepcionPage";
import SectionSelector from "./components/SectionSelector";

type IngresoUvaStep = "remito" | "recepcion" | "analisis" | "ciu" | "vasija";

type StepConfig = {
  key: IngresoUvaStep;
  label: string;
};

type PendingCiuNextStep =
  | {
      from: "ciu";
      title: string;
      description: string;
      primaryLabel: string;
      ciuId: string;
    }
  | {
      from: "vinculo";
      title: string;
      description: string;
      primaryLabel: string;
    };

const STEPS: StepConfig[] = [
  { key: "remito",   label: "Remito de uva" },
  { key: "recepcion", label: "Recepción y pesaje" },
  { key: "analisis", label: "Análisis de recepción" },
  { key: "ciu",     label: "Emitir CIU" },
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
  const [searchParams, setSearchParams] = useSearchParams();
  const [recepcionDefaults, setRecepcionDefaults] = useState<Record<string, string | boolean>>({});
  const [analisisDefaults, setAnalisisDefaults] = useState<Record<string, string | boolean>>({});
  const [vinculoDefaults, setVinculoDefaults] = useState<Record<string, string | boolean>>({});
  const [referenceOptionsVersion, setReferenceOptionsVersion] = useState(0);
  const [pendingCiuNextStep, setPendingCiuNextStep] = useState<PendingCiuNextStep | null>(null);
  const activeStep = getStepFromParams(searchParams.get("paso") ?? searchParams.get("section"));

  const goToStep = (step: IngresoUvaStep) => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.delete("section");
      next.set("paso", step);
      return next;
    });
  };

  const handleCiuCreated = (item: ElaboracionEntity) => {
    const ciuId = resolveStringId(item, ["ciu_id", "id_ciu", "id"]);
    if (!ciuId) return;
    setReferenceOptionsVersion((current) => current + 1);
    setVinculoDefaults({ ciuId });
    setPendingCiuNextStep({
      from: "ciu",
      title: "CIU guardado",
      description:
        "El comprobante ya quedó registrado. Ahora podés vincularlo con la recepción correspondiente para cerrar el ingreso sin dejar el CIU suelto.",
      primaryLabel: "Vincular recepción",
      ciuId,
    });
  };

  const handleVinculoCreated = () => {
    setPendingCiuNextStep({
      from: "vinculo",
      title: "CIU vinculado",
      description:
        "El CIU ya quedó asociado a la recepción. Podés continuar con el ingreso a vasija o volver más tarde si todavía no está definido el destino.",
      primaryLabel: "Continuar a vasija",
    });
  };

  const continueCiuNextStep = () => {
    if (!pendingCiuNextStep) return;
    if (pendingCiuNextStep.from === "ciu") {
      setVinculoDefaults({ ciuId: pendingCiuNextStep.ciuId });
    } else {
      goToStep("vasija");
    }
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
            onChange={(key) => goToStep(key)}
            options={STEPS}
          />
        </div>
      </AppCard>

      {activeStep === "remito" ? (
        <RecepcionPage
          initialSection="remito"
          hideSectionSelector
          onSectionChange={(section) => goToStep(section)}
          onRecepcionDefaultsChange={setRecepcionDefaults}
          onAnalisisDefaultsChange={setAnalisisDefaults}
        />
      ) : null}

      {activeStep === "recepcion" ? (
        <RecepcionPage
          initialSection="recepcion"
          hideSectionSelector
          onSectionChange={(section) => goToStep(section)}
          recepcionDefaultValues={recepcionDefaults}
          onRecepcionDefaultsChange={setRecepcionDefaults}
          onAnalisisDefaultsChange={setAnalisisDefaults}
        />
      ) : null}

      {activeStep === "analisis" ? (
        <RecepcionPage
          initialSection="analisis"
          hideSectionSelector
          onSectionChange={(section) => goToStep(section)}
          analisisDefaultValues={analisisDefaults}
          onRecepcionDefaultsChange={setRecepcionDefaults}
          onAnalisisDefaultsChange={setAnalisisDefaults}
        />
      ) : null}

      {activeStep === "ciu" ? (
        <div className="space-y-3">
          <NoticeBanner tone="info" title="CIU como cierre del ingreso">
            Creá el CIU cuando la recepción ya exista. Después vinculalo con esa recepción para que el comprobante no quede suelto.
          </NoticeBanner>
          <CiuQcPage
            initialSection="ciu"
            hideSectionSelector
            referenceOptionsVersion={referenceOptionsVersion}
            onCiuCreated={handleCiuCreated}
          />
          <CiuQcPage
            initialSection="vinculo"
            hideSectionSelector
            vinculoDefaults={vinculoDefaults}
            referenceOptionsVersion={referenceOptionsVersion}
            onVinculoCreated={handleVinculoCreated}
          />
        </div>
      ) : null}

      {activeStep === "vasija" ? (
        <AppCard
          as="section"
          tone="default"
          padding="lg"
          header={(
            <SectionIntro
              title="Ingreso a vasija"
              description="Registrá la operación de vasija asociada a la recepción para que el inventario refleje el destino operativo de la uva."
            />
          )}
        >
          <NoticeBanner tone="info" title="Siguiente paso operativo">
            En Concos este paso aparece como registro del CIU en inventario de vasijas. En Traza se resuelve desde Operación de vasijas, usando la recepción como referencia.
          </NoticeBanner>
          <div className="mt-4 flex flex-wrap gap-2">
            <Link to="/operacion/vasijas">
              <AppButton variant="primary">Abrir vasijas y proceso</AppButton>
            </Link>
            <AppButton type="button" variant="secondary" onClick={() => goToStep("remito")}>
              Registrar otro ingreso
            </AppButton>
          </div>
        </AppCard>
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
