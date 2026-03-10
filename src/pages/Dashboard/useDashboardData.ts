import { useEffect, useState } from "react";
import { fetchCampanias, type Campania } from "../../features/campanias/api";
import { fetchCuartelesByFinca } from "../../features/cuarteles/api";
import { fetchPendientesByScope } from "../../features/encargos/api";
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
  trazabilidades: Trazabilidad[];
  campanias: Campania[];
  loading: boolean;
  error: string | null;
}

export function useDashboardData(
  activeBodegaId: number | string | null | undefined,
  fincas: Finca[],
): UseDashboardDataResult {
  const [cuartelesCount, setCuartelesCount] = useState(0);
  const [vasijasCount, setVasijasCount] = useState(0);
  const [tareasCount, setTareasCount] = useState(0);
  const [trazabilidades, setTrazabilidades] = useState<Trazabilidad[]>([]);
  const [campanias, setCampanias] = useState<Campania[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!activeBodegaId) {
      setCuartelesCount(0);
      setVasijasCount(0);
      setTareasCount(0);
      setTrazabilidades([]);
      setCampanias([]);
      return;
    }

    let mounted = true;
    setLoading(true);
    setError(null);

    Promise.all([
      fetchTrazabilidades(activeBodegaId),
      fetchCampanias(activeBodegaId),
      listElaboracionResource("vasijas", { bodegaId: String(activeBodegaId) }).catch(() => []),
      fetchPendientesByScope({
        bodegaId: String(activeBodegaId),
        mode: "mine",
      }).catch(() => []),
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
        setTareasCount((tareasData ?? []).length);
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
  }, [activeBodegaId, fincas]);

  return {
    cuartelesCount,
    vasijasCount,
    tareasCount,
    trazabilidades,
    campanias,
    loading,
    error,
  };
}
