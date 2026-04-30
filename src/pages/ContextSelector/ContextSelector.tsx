import { useNavigate } from "react-router-dom";
import { AppButton, AppCard, GuidedState, NoticeBanner, SectionIntro } from "../../components/ui";
import { useAuthStore } from "../../store/authStore";

const ContextSelector = () => {
  const navigate = useNavigate();
  const setActiveBodega = useAuthStore((state) => state.setActiveBodega);
  const bodegas = useAuthStore((state) => state.bodegas);
  const bodegasLoading = useAuthStore((state) => state.bodegasLoading);

  return (
    <div className="min-h-screen bg-[color:var(--surface-soft)] p-6">
      <div className="mx-auto w-full max-w-4xl space-y-8">
        <SectionIntro
          className="justify-center text-center"
          title="¿En qué bodega vas a trabajar?"
          description="Esto define permisos, datos visibles y acciones habilitadas."
        />

        {bodegasLoading ? (
          <NoticeBanner className="text-center">
            Cargando bodegas…
          </NoticeBanner>
        ) : bodegas.length === 0 ? (
          <GuidedState
            title="Tu usuario todavía no tiene una bodega asignada"
            description="Para trabajar en Traza necesitás estar vinculado a una bodega. Podés crear la estructura inicial o pedirle a un administrador que te asigne acceso."
            action={(
              <AppButton
                type="button"
                variant="primary"
                size="sm"
                onClick={() => navigate("/setup")}
              >
                Ir al setup inicial
              </AppButton>
            )}
            secondaryAction={(
              <AppButton
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => navigate("/usuarios")}
              >
                Revisar usuarios
              </AppButton>
            )}
            steps={[
              { label: "Usuario autenticado", done: true },
              { label: "Bodega asignada", done: false },
            ]}
          />
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {bodegas.map((bodega) => (
              <button
                key={bodega.bodega_id}
                type="button"
                onClick={() => {
                  setActiveBodega(bodega.bodega_id);
                  navigate("/dashboard", { replace: true });
                }}
                className="group rounded-[var(--radius-lg)] text-left transition"
              >
                <AppCard
                  as="article"
                  tone="interactive"
                  padding="lg"
                  className="h-full shadow-[var(--shadow-soft)]"
                >
                  <div className="text-lg font-semibold text-[color:var(--text-ink)]">
                    {bodega.nombre}
                  </div>
                  <div className="mt-2 text-sm text-[color:var(--text-ink-muted)]">
                    CUIT:{" "}
                    <span className="font-medium text-[color:var(--accent-primary)]">
                      {bodega.cuit}
                    </span>
                  </div>
                  <div className="mt-4 text-xs text-[color:var(--text-accent)]/80">
                    Click para activar esta bodega
                  </div>
                </AppCard>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default ContextSelector;
