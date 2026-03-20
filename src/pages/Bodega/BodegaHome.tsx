import { Link } from "react-router-dom";

const RESOURCES = [
  {
    title: "Fincas",
    description: "Alta, edición y baja de fincas de la bodega activa.",
    to: "/fincas",
    action: "Administrar fincas",
  },
  {
    title: "Campañas",
    description: "Gestión de campañas y períodos de cosecha.",
    to: "/admin/campanias",
    action: "Administrar campañas",
  },
  {
    title: "Vasijas",
    description: "Alta, edición y baja de vasijas de la bodega activa.",
    to: "/bodega/vasijas",
    action: "Administrar vasijas",
  },
];

export default function BodegaHome() {
  return (
    <div className="min-h-screen bg-secondary px-6 py-10">
      <div className="mx-auto w-full max-w-6xl">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-text">Administracion de bodega</h1>
          <p className="mt-2 text-sm text-text-secondary">
            Gestioná los recursos maestros y accesos operativos de la bodega activa.
          </p>
        </div>

        <section className="mb-8 rounded-2xl bg-primary p-6 shadow-lg">
          <div className="mb-4">
            <h2 className="text-lg font-semibold text-text">Recursos maestros</h2>
            <p className="text-xs text-text">
              Entrá primero al listado del recurso y después continuá con altas, ediciones o bajas.
            </p>
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            {RESOURCES.map((resource) => (
              <article
                key={resource.title}
                className="rounded-xl border border-[#C9A961]/30 bg-[#FFF9F0] p-4 transition hover:bg-white"
              >
                <h2 className="text-base font-semibold text-[#3D1B1F]">{resource.title}</h2>
                <p className="mt-1 text-xs text-[#7A4A50]">{resource.description}</p>
                <div className="mt-2 text-[11px] text-[#8B4049]/80">
                  Ver listado y gestionar registros
                </div>
                <Link
                  to={resource.to}
                  className="mt-4 inline-flex rounded-lg border border-[#C9A961]/40 px-3 py-2 text-xs font-semibold text-[#722F37] transition hover:bg-white"
                >
                  {resource.action}
                </Link>
              </article>
            ))}
          </div>
        </section>

        <section className="rounded-2xl bg-primary p-6 shadow-lg">
          <h2 className="text-lg font-semibold text-text">Eventos operativos</h2>
          <p className="mt-1 text-xs text-text">
            El registro diario de recepción, controles, operaciones y fraccionamiento vive en la
            pestaña Operación.
          </p>
          <div className="mt-4">
            <Link
              to="/operacion"
              className="inline-flex rounded-lg border border-[#C9A961]/40 px-3 py-2 text-xs font-semibold text-text transition hover:bg-primary"
            >
              Ir a Operación
            </Link>
          </div>
        </section>
      </div>
    </div>
  );
}
