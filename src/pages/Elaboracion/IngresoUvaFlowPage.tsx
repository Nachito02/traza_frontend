import { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { AppButton, AppCard, AppModal, NoticeBanner, SectionIntro } from "../../components/ui";
import type { ElaboracionEntity } from "../../features/elaboracion/api";
import CiuQcPage from "./CiuQcPage";
import RecepcionPage from "./RecepcionPage";

type IngresoUvaStep = "remito" | "recepcion" | "analisis" | "ciu" | "vasija";

type StepConfig = {
  key: IngresoUvaStep;
  eyebrow: string;
  title: string;
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
  {
    key: "remito",
    eyebrow: "01",
    title: "Remito de uva",
  },
  {
    key: "recepcion",
    eyebrow: "02",
    title: "Recepción y pesaje",
  },
  {
    key: "analisis",
    eyebrow: "03",
    title: "Análisis de recepción",
  },
  {
    key: "ciu",
    eyebrow: "04",
    title: "Emitir CIU",
  },
  {
    key: "vasija",
    eyebrow: "05",
    title: "Enviar a vasija",
  },
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
  const [pendingCiuNextStep, setPendingCiuNextStep] = useState<PendingCiuNextStep | null>(null);
  const activeStep = getStepFromParams(searchParams.get("paso") ?? searchParams.get("section"));
  const activeStepIndex = STEPS.findIndex((step) => step.key === activeStep);

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
        <div className="mt-5 grid gap-3 lg:grid-cols-5">
          {STEPS.map((step, index) => {
            const isActive = step.key === activeStep;
            const isDone = index < activeStepIndex;
            return (
              <button
                key={step.key}
                type="button"
                onClick={() => goToStep(step.key)}
                className={[
                  "group rounded-[var(--radius-md)] border p-4 text-left shadow-[var(--shadow-inset-soft)] transition-all duration-[var(--motion-fast)] ease-[var(--motion-standard)]",
                  isActive
                    ? "border-[color:var(--accent-primary)] bg-[color:var(--surface-elevated)] text-[color:var(--text-on-dark)]"
                    : "border-[color:var(--border-shell)] bg-[color:var(--surface-muted)] text-[color:var(--text-on-dark-muted)] hover:border-[color:var(--border-default)] hover:bg-[color:var(--action-secondary-hover)] hover:text-[color:var(--text-on-dark)]",
                ].join(" ")}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[0.68rem] font-black uppercase tracking-[0.28em] text-[color:var(--accent-primary)]">
                    {step.eyebrow}
                  </span>
                  {isDone ? (
                    <span className="rounded-full border border-[color:var(--accent-primary)] px-2 py-0.5 text-[0.65rem] font-bold text-[color:var(--accent-primary)]">
                      listo
                    </span>
                  ) : null}
                </div>
                <h3 className="mt-3 text-sm font-bold">{step.title}</h3>
              </button>
            );
          })}
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
            onCiuCreated={handleCiuCreated}
          />
          <CiuQcPage
            initialSection="vinculo"
            hideSectionSelector
            vinculoDefaults={vinculoDefaults}
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
