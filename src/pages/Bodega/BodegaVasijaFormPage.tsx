import { Link, NavLink, useLocation, useNavigate, useParams } from "react-router-dom";
import { AppButton, AppCard, NoticeBanner, SectionIntro } from "../../components/ui";
import { VASIJA_FIELDS } from "../../features/elaboracion/vasijaFields";
import GenericCrudSection from "../Elaboracion/components/GenericCrudSection";
import { useAuthStore } from "../../store/authStore";
import type { ElaboracionEntity } from "../../features/elaboracion/api";

type BodegaVasijaFormPageProps = {
  mode: "create" | "edit";
};

export default function BodegaVasijaFormPage({ mode }: BodegaVasijaFormPageProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const { id } = useParams<{ id: string }>();
  const activeBodegaId = useAuthStore((state) => state.activeBodegaId);

  const pageTitle = mode === "edit" ? "Editar vasija" : "Nueva vasija";
  const pageDescription =
    mode === "edit"
      ? "Actualizá la ficha de la vasija sin volver a pasar por el listado."
      : "Completá la ficha base y dejala lista para operar en procesos, existencias y trazabilidad.";
  const pageEyebrow = "Bodega";
  const navLinks = [
    { to: "/bodega/vasijas", label: "Listado de vasijas" },
    { to: "/bodega/vasijas/nueva", label: "Nueva vasija" },
  ];

  const handleCreated = (_item: ElaboracionEntity) => {
    navigate("/bodega/vasijas");
  };

  const handleCancel = () => {
    navigate("/bodega/vasijas");
  };

  return (
    <div className="min-h-screen bg-secondary px-6 py-10">
      <div className="mx-auto w-full max-w-6xl space-y-6">
        <SectionIntro
          eyebrow={pageEyebrow}
          title={pageTitle}
          description={pageDescription}
        />

        <AppCard
          as="section"
          tone="default"
          padding="lg"
        >
          <nav className="flex flex-wrap gap-2">
            {navLinks.map((link) => {
              const isActive = location.pathname === link.to;
              return (
                <NavLink
                  key={link.to}
                  to={link.to}
                  className={() =>
                    [
                      "inline-flex min-h-10 items-center justify-center rounded-[var(--radius-md)] border px-3 py-2 text-xs font-semibold shadow-[var(--shadow-inset-soft)] transition-all duration-[var(--motion-fast)] ease-[var(--motion-standard)]",
                      isActive
                        ? "border-[color:var(--border-default)] bg-[color:var(--action-primary-bg)] text-[color:var(--text-primary)]"
                        : "border-[color:var(--border-shell)] bg-[color:var(--action-secondary-bg)] text-[color:var(--text-ink-muted)] hover:border-[color:var(--border-default)] hover:bg-[color:var(--action-secondary-hover)] hover:text-[color:var(--text-ink)]",
                    ].join(" ")
                  }
                >
                  {link.label}
                </NavLink>
              );
            })}
          </nav>
        </AppCard>

        {!activeBodegaId ? (
          <NoticeBanner tone="danger">
            Seleccioná una bodega para administrar vasijas.
          </NoticeBanner>
        ) : (
          <div className="space-y-4">
            <AppCard
              as="section"
              tone="default"
              padding="lg"
              header={(
                <SectionIntro
                  eyebrow="Ficha operativa"
                  title={mode === "edit" ? "Ajustar datos de la vasija" : "Registrar vasija"}
                  description="Definí el código, tipo, capacidad, etapa y ubicación para que quede disponible en toda la operación."
                  actions={(
                    <Link to="/bodega/vasijas">
                      <AppButton variant="secondary" size="sm">Volver al listado</AppButton>
                    </Link>
                  )}
                />
              )}
            >
              <div className="rounded-[var(--radius-md)] border border-[color:var(--border-subtle)] bg-[color:var(--surface-accent-soft)] px-3 py-2 text-xs text-[color:var(--text-ink-muted)]">
                La vasija se guarda en la bodega activa y después queda disponible para movimientos, existencias, fermentación y cortes.
              </div>
            </AppCard>

            <GenericCrudSection
              title="Vasija"
              description="Completá la ficha base de la vasija."
              resource="vasijas"
              bodegaId={activeBodegaId}
              fields={VASIJA_FIELDS}
              separatedLayout={mode === "edit"}
              initialEditId={mode === "edit" ? (id ?? null) : null}
              onCreated={handleCreated}
              onCancel={handleCancel}
            />
          </div>
        )}
      </div>
    </div>
  );
}
