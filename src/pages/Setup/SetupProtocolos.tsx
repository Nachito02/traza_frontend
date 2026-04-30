import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  fetchProtocolosExpanded,
  getDefaultProtocoloId,
  type ProtocoloExpanded,
} from "../../features/protocolos/api";
import { getApiErrorMessage } from "../../lib/api";
import { useAuthStore } from "../../store/authStore";
import { useCampaniaStore } from "../../store/campaniaStore";
import {
  AppButton,
  AppCard,
  GuidedState,
  NoticeBanner,
  SectionIntro,
} from "../../components/ui";

const SetupProtocolos = () => {
  const navigate = useNavigate();
  const activeBodegaId = useAuthStore((state) => state.activeBodegaId);
  const activeCampaniaId = useCampaniaStore((state) => state.activeCampaniaId);
  const [protocolos, setProtocolos] = useState<ProtocoloExpanded[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const setupFincaId = sessionStorage.getItem("setupFincaId") ?? "";
  const setupCuartelId = sessionStorage.getItem("setupCuartelId") ?? "";
  const missingSetupStep = !activeBodegaId
    ? {
        title: "Primero necesitás elegir una bodega",
        description: "El protocolo se aplica sobre una bodega activa. Elegí el contexto antes de cerrar el setup.",
        actionLabel: "Elegir bodega",
        actionPath: "/contexto",
      }
    : !setupFincaId
      ? {
          title: "Falta cargar la finca",
          description: "La finca es la base para vincular cuarteles y ordenar el trabajo de campo.",
          actionLabel: "Cargar finca",
          actionPath: "/setup/finca",
        }
      : !activeCampaniaId
        ? {
            title: "Falta seleccionar una campaña",
            description: "La campaña define el período de trabajo donde se registran tareas, cosecha y operación.",
            actionLabel: "Configurar campaña",
            actionPath: "/setup/campania",
          }
        : !setupCuartelId
          ? {
              title: "Falta crear un cuartel",
              description: "El cuartel permite asignar órdenes de finca y sostener la trazabilidad desde el origen.",
              actionLabel: "Crear cuartel",
              actionPath: "/setup/cuarteles",
            }
          : null;

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    setError(null);
    fetchProtocolosExpanded()
      .then((data) => {
        if (!mounted) return;
        const loaded = [...(data ?? [])].sort((a, b) => {
          const aProcessCount = (a.protocolo_etapa ?? []).reduce(
            (acc, etapa) => acc + (etapa.protocolo_proceso?.length ?? 0),
            0,
          );
          const bProcessCount = (b.protocolo_etapa ?? []).reduce(
            (acc, etapa) => acc + (etapa.protocolo_proceso?.length ?? 0),
            0,
          );
          return bProcessCount - aProcessCount;
        });
        setProtocolos(loaded);
        const defaultId = getDefaultProtocoloId(loaded);
        if (defaultId) {
          setSelected(defaultId);
        }
      })
      .catch(() => {
        if (!mounted) return;
        setError("No se pudieron cargar los protocolos.");
      })
      .finally(() => {
        if (!mounted) return;
        setLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, []);

  const handleContinue = async () => {
    if (!selected) {
      setError("Seleccioná un protocolo para continuar.");
      return;
    }
    const fincaId = sessionStorage.getItem("setupFincaId") ?? "";
    const cuartelId = sessionStorage.getItem("setupCuartelId") ?? "";
    const campaniaId = activeCampaniaId;
    if (!activeBodegaId || !fincaId || !cuartelId || !campaniaId) {
      setError(
        "Faltan datos previos del setup. Completá finca, campaña y cuartel antes de finalizar.",
      );
      return;
    }

    setSaving(true);
    setError(null);
    try {
      sessionStorage.setItem("setupProtocoloId", selected);
      sessionStorage.removeItem("setupFincaId");
      sessionStorage.removeItem("setupFincaNombre");
      sessionStorage.removeItem("setupCuartelId");
      sessionStorage.removeItem("setupCuartelCodigo");
      navigate("/ordenes");
    } catch (e) {
      setError(getApiErrorMessage(e));
    } finally {
      setSaving(false);
    }
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
              title="Seleccionar protocolo"
              description="Paso 4 de 4 del setup guiado. Elegí el protocolo base con el que el equipo va a operar."
            />
          )}
        >
          <div className="rounded-[var(--radius-md)] border border-[color:var(--border-shell)] bg-[color:var(--surface-muted)] px-5 py-4 text-[color:var(--text-on-dark)]">
            <p className="text-sm font-semibold text-[color:var(--text-on-dark)]">
              Cierre del setup
            </p>
            <p className="mt-2 text-sm text-[color:var(--text-on-dark-muted)]">
              Al finalizar guardamos la configuración base y te llevamos directo a operación para empezar a trabajar.
            </p>
          </div>
        </AppCard>

        {missingSetupStep ? (
          <GuidedState
            title={missingSetupStep.title}
            description={missingSetupStep.description}
            action={(
              <AppButton
                type="button"
                variant="primary"
                size="sm"
                onClick={() => navigate(missingSetupStep.actionPath)}
              >
                {missingSetupStep.actionLabel}
              </AppButton>
            )}
            steps={[
              { label: "Bodega activa", done: Boolean(activeBodegaId) },
              { label: "Finca", done: Boolean(setupFincaId) },
              { label: "Campaña", done: Boolean(activeCampaniaId) },
              { label: "Cuartel", done: Boolean(setupCuartelId) },
              { label: "Protocolo", done: false },
            ]}
          />
        ) : loading ? (
          <NoticeBanner tone="info">Cargando protocolos…</NoticeBanner>
        ) : error ? (
          <NoticeBanner tone="danger">{error}</NoticeBanner>
        ) : protocolos.length === 0 ? (
          <NoticeBanner tone="warning">No hay protocolos disponibles.</NoticeBanner>
        ) : (
          <AppCard as="section" tone="default" padding="lg">
            <div className="space-y-3">
              {protocolos.map((protocolo) => {
                const id =
                  protocolo.protocolo_id ?? protocolo.id ?? protocolo.nombre ?? "";
                return (
                  <label
                    key={id}
                    className={`flex cursor-pointer items-start gap-3 rounded-[var(--radius-lg)] border p-4 text-sm transition ${
                      selected === id
                        ? "border-[color:var(--accent-secondary)] bg-[color:var(--surface-muted)]"
                        : "border-[color:var(--border-shell)] bg-[color:var(--action-secondary-bg)] hover:border-[color:var(--border-default)] hover:bg-[color:var(--action-secondary-hover)]"
                    }`}
                  >
                    <input
                      type="radio"
                      className="mt-1"
                      checked={selected === id}
                      onChange={() => setSelected(id)}
                    />
                    <div>
                      <div className="font-semibold text-[color:var(--text-ink)]">
                        {protocolo.nombre ?? protocolo.codigo ?? "Protocolo"}
                      </div>
                      <div className="mt-1 text-xs text-[color:var(--text-ink-muted)]">
                        {(protocolo.protocolo_etapa ?? []).length} etapas ·{" "}
                        {(protocolo.protocolo_etapa ?? []).reduce(
                          (acc, etapa) => acc + (etapa.protocolo_proceso?.length ?? 0),
                          0,
                        )}{" "}
                        procesos
                      </div>
                      {selected === id && (
                        <div className="mt-1 text-xs font-medium text-[color:var(--accent-primary)]">
                          Protocolo seleccionado por defecto
                        </div>
                      )}
                      {protocolo.descripcion && (
                        <div className="mt-1 text-xs text-[color:var(--text-ink-muted)]">
                          {protocolo.descripcion}
                        </div>
                      )}
                    </div>
                  </label>
                );
              })}

              <div className="pt-3">
                <AppButton
                  type="button"
                  variant="primary"
                  onClick={() => void handleContinue()}
                  disabled={saving}
                  loading={saving}
                >
                  {saving ? "Finalizando setup..." : "Finalizar setup"}
                </AppButton>
              </div>
            </div>
          </AppCard>
        )}
      </div>
    </div>
  );
};

export default SetupProtocolos;
