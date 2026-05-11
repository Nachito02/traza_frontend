import { Link, useNavigate } from "react-router-dom";
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
  const activeBodegaId = useAuthStore((state) => state.activeBodegaId);

  const pageTitle = mode === "edit" ? "Vasijas — editar" : "Nueva vasija";
  const pageDescription =
    mode === "edit"
      ? "Seleccioná una vasija del listado para editar sus datos."
      : "Completá los datos y guardá. Después podés seguir trabajando desde el listado.";

  const handleCreated = (_item: ElaboracionEntity) => {
    navigate("/bodega/vasijas");
  };

  return (
    <div className="min-h-screen bg-secondary px-6 py-10">
      <div className="mx-auto w-full max-w-4xl space-y-6">
        <AppCard
          as="section"
          tone="default"
          padding="lg"
          header={(
            <SectionIntro
              title={pageTitle}
              description={pageDescription}
              actions={(
                <Link to="/bodega/vasijas">
                  <AppButton variant="secondary" size="sm">Volver al listado</AppButton>
                </Link>
              )}
            />
          )}
        />

        {!activeBodegaId ? (
          <NoticeBanner tone="danger">
            Seleccioná una bodega para administrar vasijas.
          </NoticeBanner>
        ) : (
          <GenericCrudSection
            title="Vasija"
            description="Datos base de la vasija."
            resource="vasijas"
            bodegaId={activeBodegaId}
            fields={VASIJA_FIELDS}
            // create: muestra el form directamente (sin listado)
            // edit:   muestra el listado con botones de edición inline
            separatedLayout={mode === "edit"}
            onCreated={handleCreated}
          />
        )}
      </div>
    </div>
  );
}
