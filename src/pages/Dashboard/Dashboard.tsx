import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { apiClient } from "../../lib/api";
import { useAuthStore } from "../../store/authStore";
import { useFincasStore } from "../../features/fincas/store";

type Milestone = {
  milestone_id?: string;
  id?: string;
  title?: string;
  nombre?: string;
  status?: "alerta" | "pendiente" | "completado" | string;
  due_in_days?: number | null;
  completed_at?: string | null;
};

const Dashboard = () => {
  const activeBodegaId = useAuthStore((state) => state.activeBodegaId);
  const fincas = useFincasStore((state) => state.fincas);
  const fincasLoading = useFincasStore((state) => state.loading);
  const fincasError = useFincasStore((state) => state.error);
  const loadFincas = useFincasStore((state) => state.loadFincas);
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    setError(null);
    apiClient
      .get<Milestone[]>("/milestones/me")
      .then((res) => {
        if (!mounted) return;
        setMilestones(res.data ?? []);
      })
      .catch(() => {
        if (!mounted) return;
        setError("No se pudieron cargar los milestones.");
      })
      .finally(() => {
        if (!mounted) return;
        setLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (!activeBodegaId) return;
    void loadFincas(activeBodegaId);
  }, [activeBodegaId, loadFincas]);

  const grouped = useMemo(() => {
    const alerts: Milestone[] = [];
    const pending: Milestone[] = [];
    const completed: Milestone[] = [];

    for (const m of milestones) {
      if (m.status === "alerta") {
        alerts.push(m);
      } else if (m.status === "completado" || m.completed_at) {
        completed.push(m);
      } else {
        pending.push(m);
      }
    }

    return { alerts, pending, completed };
  }, [milestones]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#F9F6F2] via-[#F3E7DA] to-[#EAD8C6] px-6 py-10">
      <div className="mx-auto w-full max-w-6xl">
        <div className="mb-8">
          <h1 className="text-3xl text-[#3D1B1F]">¿Qué tengo que hacer hoy?</h1>
          <p className="mt-2 text-sm text-[#6B3A3F]">
            Prioriza tareas críticas y avanza en tu campaña con claridad.
          </p>
        </div>

        <section className="mb-8 rounded-2xl border border-[#C9A961]/30 bg-white/90 p-6 shadow-lg">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-[#3D1B1F]">Fincas</h2>
              <p className="text-xs text-[#6B3A3F]">
                Primero definí la finca para poder cargar campañas, cuarteles y
                protocolos.
              </p>
            </div>
            <Link
              to="/setup/finca"
              className="rounded-lg border border-[#C9A961]/40 px-3 py-2 text-xs font-semibold text-[#722F37] transition hover:border-[#C9A961] hover:bg-[#F8F3EE]"
            >
              Crear finca
            </Link>
          </div>

          <div className="mt-4">
            {!activeBodegaId ? (
              <div className="text-xs text-[#7A4A50]">
                Seleccioná una bodega para ver las fincas.
              </div>
            ) : fincasLoading ? (
              <div className="text-xs text-[#7A4A50]">Cargando fincas…</div>
            ) : fincasError ? (
              <div className="text-xs text-red-700">{fincasError}</div>
            ) : fincas.length === 0 ? (
              <div className="text-xs text-[#7A4A50]">
                No hay fincas cargadas.
              </div>
            ) : (
              <div className="grid gap-3 md:grid-cols-2">
                {fincas.map((finca) => (
                  <Link
                    key={finca.finca_id ?? finca.id ?? finca.nombre}
                    to={`/fincas/${finca.finca_id ?? finca.id}`}
                    className="rounded-xl border border-[#C9A961]/30 bg-[#FFF9F0] p-4 transition hover:border-[#C9A961] hover:shadow-md"
                  >
                    <div className="text-sm font-semibold text-[#3D1B1F]">
                      {finca.nombre ??
                        finca.nombre_finca ??
                        finca.name ??
                        "Finca sin nombre"}
                    </div>
                    <div className="mt-1 text-xs text-[#7A4A50]">
                      {finca.ubicacion ?? "Ubicación sin definir"}
                    </div>
                    <div className="mt-2 text-[11px] text-[#8B4049]/80">
                      Ver detalles y crear trazabilidad
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </section>

        {loading ? (
          <div className="rounded-2xl border border-[#C9A961]/30 bg-white/90 p-6 text-center text-sm text-[#6B3A3F]">
            Cargando milestones…
          </div>
        ) : error ? (
          <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-center text-sm text-red-700">
            {error}
          </div>
        ) : milestones.length === 0 ? (
          <div className="rounded-2xl border border-[#C9A961]/30 bg-white/90 p-6 text-center text-sm text-[#6B3A3F]">
            No hay milestones activos.
          </div>
        ) : (
          <div className="grid gap-6 lg:grid-cols-3">
          <section className="rounded-2xl border border-[#E7B0A6]/50 bg-white/90 p-5 shadow-lg">
            <div className="mb-4 flex items-center gap-2 text-sm font-semibold text-[#8B2A2A]">
              🔴 Trazabilidades con alertas
            </div>
            <div className="space-y-3">
              {grouped.alerts.length === 0 ? (
                <div className="rounded-xl border border-[#F2C1B8] bg-[#FFF6F4] p-4 text-xs text-[#7A4A50]">
                  Sin alertas activas.
                </div>
              ) : (
                grouped.alerts.map((item) => (
                <div
                  key={item.milestone_id ?? item.id ?? item.title ?? item.nombre}
                  className="rounded-xl border border-[#F2C1B8] bg-[#FFF6F4] p-4"
                >
                  <div className="text-sm font-semibold text-[#3D1B1F]">
                    {item.title ?? item.nombre ?? "Milestone con alerta"}
                  </div>
                  <div className="mt-1 text-xs text-[#7A4A50]">
                    {item.due_in_days
                      ? `Carencia por vencer (${item.due_in_days} días)`
                      : "Revisar tarea pendiente"}
                  </div>
                </div>
              ))
              )}
            </div>
          </section>

          <section className="rounded-2xl border border-[#F1D6A4]/60 bg-white/90 p-5 shadow-lg">
            <div className="mb-4 flex items-center gap-2 text-sm font-semibold text-[#8A6B1F]">
              🟡 Milestones pendientes
            </div>
            <div className="space-y-3">
              {grouped.pending.length === 0 ? (
                <div className="rounded-xl border border-[#F5E3B7] bg-[#FFF9E9] p-4 text-xs text-[#7A4A50]">
                  No hay pendientes.
                </div>
              ) : (
                grouped.pending.map((item) => (
                <div
                  key={item.milestone_id ?? item.id ?? item.title ?? item.nombre}
                  className="rounded-xl border border-[#F5E3B7] bg-[#FFF9E9] p-4"
                >
                  <div className="text-sm font-semibold text-[#3D1B1F]">
                    {item.title ?? item.nombre ?? "Milestone pendiente"}
                  </div>
                  <div className="mt-1 text-xs text-[#7A4A50]">
                    {item.due_in_days
                      ? `Vence en ${item.due_in_days} días`
                      : "Pendiente de validación"}
                  </div>
                </div>
              ))
              )}
            </div>
          </section>

          <section className="rounded-2xl border border-[#B9D7B4]/70 bg-white/90 p-5 shadow-lg">
            <div className="mb-4 flex items-center gap-2 text-sm font-semibold text-[#2D6B2D]">
              🟢 Milestones completados hoy
            </div>
            <div className="space-y-3">
              {grouped.completed.length === 0 ? (
                <div className="rounded-xl border border-[#CBE6C6] bg-[#F3FBF2] p-4 text-xs text-[#7A4A50]">
                  No hay completados hoy.
                </div>
              ) : (
                grouped.completed.map((item) => (
                <div
                  key={item.milestone_id ?? item.id ?? item.title ?? item.nombre}
                  className="rounded-xl border border-[#CBE6C6] bg-[#F3FBF2] p-4"
                >
                  <div className="text-sm font-semibold text-[#3D1B1F]">
                    {item.title ?? item.nombre ?? "Milestone completado"}
                  </div>
                  <div className="mt-1 text-xs text-[#7A4A50]">
                    {item.completed_at ? "Completado hoy" : "Completado"}
                  </div>
                </div>
              ))
              )}
            </div>
          </section>
        </div>
        )}
      </div>
    </div>
  );
};

export default Dashboard;
