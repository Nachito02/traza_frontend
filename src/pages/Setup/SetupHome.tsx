import { useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
import {
  AppCard,
  OperationalReadinessCard,
  type OperationalReadinessStep,
  SectionIntro,
} from "../../components/ui";
import { useFincasStore } from "../../features/fincas/store";
import { useAuthStore } from "../../store/authStore";
import { useOperacionStore } from "../../store/operacionStore";
import { useDashboardData } from "../Dashboard/useDashboardData";

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
    title: "Ir a operación",
    description: "Entrar al trabajo diario de tareas, recepción y seguimiento.",
    to: "/ordenes",
  },
];

const SetupHome = () => {
  const activeBodegaId = useAuthStore((state) => state.activeBodegaId);
  const fincas = useFincasStore((state) => state.fincas);
  const loadFincas = useFincasStore((state) => state.loadFincas);
  const activeProtocoloId = useOperacionStore((state) => state.activeProtocoloId);
  const { cuartelesCount, vasijasCount, campanias } = useDashboardData(activeBodegaId, fincas);

  useEffect(() => {
    if (!activeBodegaId) return;
    void loadFincas(activeBodegaId);
  }, [activeBodegaId, loadFincas]);

  const readinessSteps = useMemo<OperationalReadinessStep[]>(() => {
    const hasBodega = Boolean(activeBodegaId);
    const hasCampania = campanias.some((campania) => campania.estado === "abierta");
    const hasFincas = fincas.length > 0;
    const hasCuarteles = cuartelesCount > 0;
    const hasProtocol = Boolean(activeProtocoloId);
    const hasVasijas = vasijasCount > 0;

    return [
      {
        key: "bodega",
        title: "Bodega activa",
        description: "Elegí la bodega sobre la que vas a configurar el sistema.",
        actionLabel: "Elegir bodega",
        to: "/contexto",
        done: hasBodega,
      },
      {
        key: "campania",
        title: "Campaña activa",
        description: "Definí la temporada de trabajo para ordenar registros y cosechas.",
        actionLabel: "Configurar campaña",
        to: "/setup/campania",
        done: hasCampania,
        disabled: !hasBodega,
      },
      {
        key: "finca",
        title: "Crear finca",
        description: "Cargá la unidad productiva principal.",
        actionLabel: "Crear finca",
        to: "/setup/finca",
        done: hasFincas,
        disabled: !hasBodega,
      },
      {
        key: "cuarteles",
        title: "Configurar cuarteles",
        description: "Cargá los cuarteles, variedades y datos agronómicos base.",
        actionLabel: "Crear cuarteles",
        to: "/setup/cuarteles",
        done: hasCuarteles,
        disabled: !hasFincas,
      },
      {
        key: "protocolo",
        title: "Seleccionar protocolo",
        description: "Activá el protocolo con el que va a trabajar el equipo.",
        actionLabel: "Seleccionar protocolo",
        to: "/setup/protocolos",
        done: hasProtocol,
        disabled: !hasBodega,
      },
      {
        key: "vasijas",
        title: "Crear vasijas",
        description: "Prepará la estructura de bodega para recepción, existencias y elaboración.",
        actionLabel: "Crear vasija",
        to: "/bodega/vasijas/nueva",
        done: hasVasijas,
        disabled: !hasBodega,
      },
    ];
  }, [activeBodegaId, activeProtocoloId, campanias, cuartelesCount, fincas.length, vasijasCount]);

  return (
    <div className="min-h-screen bg-secondary px-6 py-10">
      <div className="mx-auto w-full max-w-5xl space-y-6">
        <SectionIntro
          title="Setup guiado"
          description="Completá estos pasos para dejar lista la estructura base y empezar a operar tareas y procesos."
        />

        <OperationalReadinessCard
          steps={readinessSteps}
          title="Hoja de ruta del setup"
          description="Este panel te muestra qué está listo y qué falta para que la bodega pueda empezar a operar con contexto."
          compact
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
