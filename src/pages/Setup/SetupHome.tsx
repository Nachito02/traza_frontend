import { Link } from "react-router-dom";
import { AppCard, SectionIntro } from "../../components/ui";

const steps = [
  {
    title: "Crear finca",
    description: "Define la finca principal.",
    to: "/setup/finca",
  },
  {
    title: "Crear campaña",
    description: "Define período y fechas clave.",
    to: "/setup/campania",
  },
  {
    title: "Configurar cuarteles",
    description: "Carga cuarteles y variedades.",
    to: "/setup/cuarteles",
  },
  {
    title: "Seleccionar protocolo",
    description: "Define protocolo activo.",
    to: "/setup/protocolos",
  },
  {
    title: "Trazabilidades activas",
    description: "Revisar trazabilidades en curso y su avance.",
    to: "/trazabilidades",
  },
];

const SetupHome = () => {
  return (
    <div className="min-h-screen bg-secondary px-6 py-10">
      <div className="mx-auto w-full max-w-5xl space-y-6">
        <SectionIntro
          title="Setup guiado"
          description="Completá estos pasos para dejar lista la estructura base y empezar a operar trazabilidades."
        />

        <div className="grid gap-4 md:grid-cols-2">
          {steps.map((step) => (
            <Link
              key={step.title}
              to={step.to}
              className="block"
            >
              <AppCard tone="interactive" padding="lg" className="h-full">
                <div className="text-lg font-semibold text-text">{step.title}</div>
                <div className="mt-2 text-sm text-text-secondary">{step.description}</div>
              </AppCard>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
};

export default SetupHome;
