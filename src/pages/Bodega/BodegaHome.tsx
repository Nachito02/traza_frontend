import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { fetchProtocolos, type Protocolo } from "../../features/protocolos/api";
import { useOperacionStore } from "../../store/operacionStore";
import {
  AppButton,
  AppCard,
  AppSelect,
  NoticeBanner,
  SectionIntro,
} from "../../components/ui";

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
      <div className="mx-auto w-full max-w-6xl space-y-6">
        <SectionIntro
          title="Administración de bodega"
          description="Gestioná los recursos maestros y el contexto operativo de la bodega activa."
        />

        <AppCard
          as="section"
          tone="default"
          padding="lg"
          header={(
            <SectionIntro
              title="Configuración operativa"
              description="El protocolo activo determina las actividades disponibles en Operación."
            />
          )}
        >
          <div className="flex flex-wrap items-center gap-3">
            <div className="min-w-[280px]">
              <AppSelect
                label="Protocolo activo"
                value={activeProtocoloId ?? ""}
                onChange={(e) => setActiveProtocoloId(e.target.value || null)}
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
              </AppSelect>
            </div>
            {activeProtocolo ? (
              <span className="rounded-full border border-[color:var(--border-default)] bg-[color:var(--surface-soft)] px-3 py-1 text-xs font-semibold text-[color:var(--accent-primary)]">
                {[activeProtocolo.nombre, activeProtocolo.version ? `v${activeProtocolo.version}` : null]
                  .filter(Boolean)
                  .join(" ")}
              </span>
            ) : (
              <NoticeBanner tone="warning" className="max-w-xl">
                Sin protocolo — las tareas en Operación no tendrán actividades disponibles.
              </NoticeBanner>
            )}
          </div>
        </AppCard>

        <AppCard
          as="section"
          tone="default"
          padding="lg"
          header={(
            <SectionIntro
              title="Administrar recursos"
              description="Entrá primero al listado del recurso y después continuá con altas, ediciones o bajas."
            />
          )}
        >
          <div className="grid gap-4 md:grid-cols-3">
            {RESOURCES.map((resource) => (
              <AppCard
                key={resource.title}
                as="article"
                tone="interactive"
                padding="md"
              >
                <h2 className="text-base font-semibold text-[color:var(--text-ink)]">{resource.title}</h2>
                <p className="mt-1 text-xs text-[color:var(--text-ink-muted)]">{resource.description}</p>
                <div className="mt-2 text-[11px] text-[color:var(--accent-primary)]/80">
                  Ver listado y gestionar registros
                </div>
                <div className="mt-4">
                  <Link to={resource.to}>
                    <AppButton variant="secondary" size="sm">
                      {resource.action}
                    </AppButton>
                  </Link>
                </div>
              </AppCard>
            ))}
          </div>
        </AppCard>

        <AppCard
          as="section"
          tone="default"
          padding="lg"
          header={(
            <SectionIntro
              title="Eventos operativos"
              description="El registro diario de recepción, controles, operaciones y fraccionamiento vive en la pestaña Operación."
            />
          )}
        >
          <div className="mt-4">
            <Link to="/operacion">
              <AppButton variant="primary" size="sm">Ir a Operación</AppButton>
            </Link>
          </div>
        </AppCard>
      </div>
    </div>
  );
}
