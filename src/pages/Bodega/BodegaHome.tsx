import { Link } from "react-router-dom";
import { useAuthStore } from "../../store/authStore";

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
      <div className="mx-auto w-full max-w-7xl space-y-6">
        <header className="rounded-2xl bg-primary/30 p-6 shadow-sm">
          <h1 className="text-3xl font-bold text-text">Bodega</h1>
          <p className="mt-2 text-sm text-text-secondary">
            Administración de recursos maestros de la bodega activa.
          </p>
        </header>

        <section className="rounded-2xl bg-white p-5 shadow-sm">
          <div className="grid gap-4 md:grid-cols-3">
            {RESOURCES.map((resource) => (
              <article
                key={resource.title}
                className="rounded-xl border border-[#C9A961]/30 bg-[#FFF9F0] p-4"
              >
                <h2 className="text-base font-semibold text-[#3D1B1F]">{resource.title}</h2>
                <p className="mt-1 text-xs text-[#7A4A50]">{resource.description}</p>
                <Link
                  to={resource.to}
                  className="mt-4 inline-flex rounded-lg border border-[#C9A961] px-3 py-2 text-xs font-semibold text-[#722F37] transition hover:bg-[#F7EEDB]"
                >
                  {resource.action}
                </Link>
              </article>
            ))}
          </div>
        </section>

        <section className="rounded-2xl bg-white p-5 shadow-sm">
          <h2 className="text-base font-semibold text-[#3D1B1F]">Eventos operativos</h2>
          <p className="mt-1 text-xs text-[#7A4A50]">
            El registro diario (recepción, controles, operaciones y fraccionamiento) está en la
            pestaña Operación.
          </p>
          <div className="mt-3">
            <Link
              to="/operacion"
              className="inline-flex rounded-lg border border-[#C9A961] bg-[#FFF9F0] px-3 py-2 text-xs font-semibold text-[#722F37] transition hover:bg-[#F7EEDB]"
            >
              Ir a Operación
            </Link>
          </div>
        </section>
      </div>
    </div>
  );
}
