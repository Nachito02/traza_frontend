import { useEffect, useState } from "react";
import { fetchCampanias, type Campania } from "../../features/campanias/api";
import { fetchCuartelesByFinca } from "../../features/cuarteles/api";
import { fetchPendientesByScope, fetchTareasByBodega, type Tarea } from "../../features/encargos/api";
import { isPendingTask } from "../Tareas/tareas.helpers";
import { listElaboracionResource } from "../../features/elaboracion/api";
import { type Finca } from "../../features/fincas/api";
import {
  fetchTrazabilidades,
  type Trazabilidad,
} from "../../features/trazabilidades/api";

interface UseDashboardDataResult {
  cuartelesCount: number;
  vasijasCount: number;
  tareasCount: number;
  tasks: Tarea[];
  trazabilidades: Trazabilidad[];
  campanias: Campania[];
  loading: boolean;
  error: string | null;
}

export function useDashboardData(
  activeBodegaId: number | string | null | undefined,
  fincas: Finca[],
  isManager = false,
  refreshKey = 0,
): UseDashboardDataResult {
  const [cuartelesCount, setCuartelesCount] = useState(0);
  const [vasijasCount, setVasijasCount] = useState(0);
  const [tareasCount, setTareasCount] = useState(0);
  const [tasks, setTasks] = useState<Tarea[]>([]);
  const [trazabilidades, setTrazabilidades] = useState<Trazabilidad[]>([]);
  const [campanias, setCampanias] = useState<Campania[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!activeBodegaId) {
      setCuartelesCount(0);
      setVasijasCount(0);
      setTareasCount(0);
      setTasks([]);
      setTrazabilidades([]);
      setCampanias([]);
      return;
    }

    let mounted = true;
    setLoading(true);
    setError(null);

    // Para managers: fetchTareasByBodega devuelve todas (pendientes + completadas),
    // filtramos solo pendientes para no mostrar completadas como si fueran activas.
    // Para operarios: fetchPendientesByScope con "mine" ya devuelve solo pendientes.
    const tareasFetch = isManager
      ? fetchTareasByBodega(String(activeBodegaId))
          .then((data) => data.filter(isPendingTask))
          .catch(() => [] as Tarea[])
      : fetchPendientesByScope({ bodegaId: String(activeBodegaId), mode: "mine" }).catch(() => [] as Tarea[]);

    Promise.all([
      fetchTrazabilidades(activeBodegaId),
      fetchCampanias(activeBodegaId),
      listElaboracionResource("vasijas", { bodegaId: String(activeBodegaId) }).catch(() => []),
      tareasFetch,
      Promise.all(
        fincas
          .map((finca) => finca.finca_id ?? finca.id)
          .filter(Boolean)
          .map((fincaId) => fetchCuartelesByFinca(String(fincaId))),
      ),
    ])
      .then(([trazabilidadesData, campaniasData, vasijasData, tareasData, cuartelesLists]) => {
        if (!mounted) return;
        setTrazabilidades(trazabilidadesData ?? []);
        setCampanias(campaniasData ?? []);
        setVasijasCount((vasijasData ?? []).length);
        const tareas = tareasData ?? [];
        setTasks(tareas);
        setTareasCount(tareas.length);
        const totalCuarteles = (cuartelesLists ?? []).reduce(
          (acc, list) => acc + (list?.length ?? 0),
          0,
        );
        setCuartelesCount(totalCuarteles);
      })
      .catch(() => {
        if (!mounted) return;
        setError("No se pudieron cargar todos los indicadores.");
      })
      .finally(() => {
        if (!mounted) return;
        setLoading(false);
      });

    return () => {
      mounted = false;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeBodegaId, fincas, isManager, refreshKey]);

  return {
    cuartelesCount,
    vasijasCount,
    tareasCount,
    tasks,
    trazabilidades,
    campanias,
    loading,
    error,
  };
}
