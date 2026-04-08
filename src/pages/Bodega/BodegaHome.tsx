import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { fetchProtocolos, type Protocolo } from "../../features/protocolos/api";
import { useOperacionStore } from "../../store/operacionStore";

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
  const { activeProtocoloId, setActiveProtocoloId } = useOperacionStore();
  const [protocolos, setProtocolos] = useState<Protocolo[]>([]);

  useEffect(() => {
    fetchProtocolos()
      .then((data) => setProtocolos(data ?? []))
      .catch(() => setProtocolos([]));
  }, []);

  const activeProtocolo = protocolos.find(
    (p) => String(p.protocolo_id ?? p.id ?? "") === (activeProtocoloId ?? ""),
  );

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
            <h2 className="text-lg font-semibold text-text">Configuración operativa</h2>
            <p className="text-xs text-text-secondary">
              El protocolo activo determina las actividades disponibles en Operación.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2">
              <label className="text-sm font-semibold text-text">Protocolo activo:</label>
              <select
                value={activeProtocoloId ?? ""}
                onChange={(e) => setActiveProtocoloId(e.target.value || null)}
                className="rounded-lg border border-[#C9A961]/40 bg-white px-3 py-2 text-sm text-[#3D1B1F]"
              >
                <option value="">Sin protocolo seleccionado</option>
                {protocolos.map((p) => {
                  const id = String(p.protocolo_id ?? p.id ?? "");
                  const label = [p.nombre, p.version ? `v${p.version}` : null]
                    .filter(Boolean)
                    .join(" ");
                  return (
                    <option key={id} value={id}>
                      {label || id}
                    </option>
                  );
                })}
              </select>
            </div>
            {activeProtocolo ? (
              <span className="rounded-full bg-[#EED9BC] px-3 py-1 text-xs font-semibold text-[#5A2D32]">
                {[activeProtocolo.nombre, activeProtocolo.version ? `v${activeProtocolo.version}` : null]
                  .filter(Boolean)
                  .join(" ")}
              </span>
            ) : (
              <span className="text-xs text-amber-700">
                Sin protocolo — las tareas en Operación no tendrán actividades disponibles.
              </span>
            )}
          </div>
        </section>

        <section className="mb-8 rounded-2xl bg-primary p-6 shadow-lg">
          <div className="mb-4">
            <h2 className="text-lg font-semibold text-text">Administrar recursos</h2>
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
