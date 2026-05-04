import { Link, useSearchParams } from "react-router-dom";
import { AppButton, AppCard, NoticeBanner, SectionIntro } from "../../components/ui";
import CiuQcPage from "./CiuQcPage";
import RecepcionPage from "./RecepcionPage";

type IngresoUvaStep = "remito" | "recepcion" | "analisis" | "ciu" | "vasija";

type StepConfig = {
  key: IngresoUvaStep;
  eyebrow: string;
  title: string;
  description: string;
  helper: string;
};

const STEPS: StepConfig[] = [
  {
    key: "remito",
    eyebrow: "01",
    title: "Remito de uva",
    description: "Origen, finca, cuartel, lote cosecha y traslado.",
    helper: "Arrancá por el origen real de la uva. Este paso deja trazado de dónde viene el ingreso.",
  },
  {
    key: "recepcion",
    eyebrow: "02",
    title: "Recepción y pesaje",
    description: "Ingreso efectivo a bodega, kilos pesados y clasificación.",
    helper: "Usá este paso cuando la uva ya llegó a bodega y tenés el dato de báscula.",
  },
  {
    key: "analisis",
    eyebrow: "03",
    title: "Análisis de recepción",
    description: "Brix, pH, acidez, temperatura, sanidad y observaciones.",
    helper: "Podés cargarlo en el momento o volver después si laboratorio todavía no entregó los datos.",
  },
  {
    key: "ciu",
    eyebrow: "04",
    title: "Emitir CIU",
    description: "Comprobante interno del ingreso de uva.",
    helper: "El CIU debería representar el ingreso ya recepcionado. En esta etapa evitamos que quede como un registro aislado.",
  },
  {
    key: "vasija",
    eyebrow: "05",
    title: "Enviar a vasija",
    description: "Registrar el ingreso al inventario de vasijas.",
    helper: "El cierre natural del ingreso es indicar a qué vasija entra la uva o mosto para continuar elaboración.",
  },
];

function getStepFromParams(value: string | null): IngresoUvaStep {
  return STEPS.some((step) => step.key === value) ? (value as IngresoUvaStep) : "remito";
}

export default function IngresoUvaFlowPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const activeStep = getStepFromParams(searchParams.get("paso") ?? searchParams.get("section"));
  const activeStepIndex = STEPS.findIndex((step) => step.key === activeStep);
  const currentStep = STEPS[activeStepIndex] ?? STEPS[0];

  const goToStep = (step: IngresoUvaStep) => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.delete("section");
      next.set("paso", step);
      return next;
    });
  };

  const nextStep = STEPS[activeStepIndex + 1];
  const previousStep = STEPS[activeStepIndex - 1];

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
                <p className="mt-2 text-xs leading-relaxed text-inherit opacity-80">
                  {step.description}
                </p>
              </button>
            );
          })}
        </div>
      </AppCard>

      <AppCard
        as="section"
        tone="soft"
        padding="md"
        className="border-[color:var(--border-shell)] bg-[color:var(--surface-muted)]"
      >
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="text-xs font-black uppercase tracking-[0.28em] text-[color:var(--accent-primary)]">
              Paso {currentStep.eyebrow}
            </div>
            <h2 className="mt-2 text-2xl font-bold text-[color:var(--text-on-dark)]">
              {currentStep.title}
            </h2>
            <p className="mt-2 max-w-3xl text-sm leading-relaxed text-[color:var(--text-on-dark-muted)]">
              {currentStep.helper}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {previousStep ? (
              <AppButton type="button" variant="secondary" size="sm" onClick={() => goToStep(previousStep.key)}>
                Volver
              </AppButton>
            ) : null}
            {nextStep ? (
              <AppButton type="button" variant="primary" size="sm" onClick={() => goToStep(nextStep.key)}>
                Ir a {nextStep.title}
              </AppButton>
            ) : null}
          </div>
        </div>
      </AppCard>

      {activeStep === "remito" ? (
        <RecepcionPage initialSection="remito" hideSectionSelector />
      ) : null}

      {activeStep === "recepcion" ? (
        <RecepcionPage initialSection="recepcion" hideSectionSelector />
      ) : null}

      {activeStep === "analisis" ? (
        <RecepcionPage initialSection="analisis" hideSectionSelector />
      ) : null}

      {activeStep === "ciu" ? (
        <div className="space-y-3">
          <NoticeBanner tone="info" title="CIU como cierre del ingreso">
            Creá el CIU cuando la recepción ya exista. Después vinculalo con esa recepción para que el comprobante no quede suelto.
          </NoticeBanner>
          <CiuQcPage initialSection="ciu" hideSectionSelector />
          <CiuQcPage initialSection="vinculo" hideSectionSelector />
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
    </div>
  );
}
