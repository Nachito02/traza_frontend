import { Link } from "react-router-dom";

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
];

const SetupHome = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-[#F9F6F2] via-[#F3E7DA] to-[#EAD8C6] px-6 py-10">
      <div className="mx-auto w-full max-w-4xl">
        <div className="mb-8">
          <h1 className="text-3xl text-[#3D1B1F]">Setup guiado</h1>
          <p className="mt-2 text-sm text-[#6B3A3F]">
            Completa estos pasos para empezar a cargar trazabilidades.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          {steps.map((step) => (
            <Link
              key={step.title}
              to={step.to}
              className="rounded-2xl border border-[#C9A961]/40 bg-white/90 p-6 shadow-lg transition hover:-translate-y-0.5 hover:border-[#C9A961] hover:shadow-xl"
            >
              <div className="text-lg font-semibold text-[#3D1B1F]">
                {step.title}
              </div>
              <div className="mt-2 text-sm text-[#7A4A50]">
                {step.description}
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
};

export default SetupHome;
