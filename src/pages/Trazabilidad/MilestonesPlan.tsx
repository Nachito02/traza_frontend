import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import {
  completeMilestone,
  fetchMilestones,
  type Milestone,
} from "../../features/milestones/api";
import {
  createEventoCosecha,
  createEventoRiego,
} from "../../features/eventos/api";
import { fetchTrazabilidad, type Trazabilidad } from "../../features/trazabilidades/api";

type EventoFormState = {
  fecha: string;
  fecha_cosecha: string;
  volumen: string;
  cantidad: string;
  unidad: string;
  sistema_riego: string;
  destino: string;
};

const MilestonesPlan = () => {
  const { id } = useParams();
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [active, setActive] = useState<Milestone | null>(null);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [trazabilidad, setTrazabilidad] = useState<Trazabilidad | null>(null);
  const [form, setForm] = useState<EventoFormState>({
    fecha: "",
    fecha_cosecha: "",
    volumen: "",
    cantidad: "",
    unidad: "m3",
    sistema_riego: "goteo",
    destino: "bodega",
  });

  useEffect(() => {
    if (!id) return;
    let mounted = true;
    setLoading(true);
    setError(null);
    Promise.all([fetchMilestones(id), fetchTrazabilidad(id)])
      .then(([milestonesData, trazabilidadData]) => {
        if (!mounted) return;
        setMilestones(
          [...(milestonesData ?? [])].sort(
            (a, b) => a.protocolo_proceso.orden - b.protocolo_proceso.orden
          )
        );
        setTrazabilidad(trazabilidadData);
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
  }, [id]);

  const obligatorioPendiente = useMemo(() => {
    return milestones.some(
      (m) =>
        m.protocolo_proceso.obligatorio && m.estado !== "completado"
    );
  }, [milestones]);

  const openModal = (milestone: Milestone) => {
    setFormError(null);
    setForm({
      fecha: "",
      fecha_cosecha: "",
      volumen: "",
      cantidad: "",
      unidad: "m3",
      sistema_riego: "goteo",
      destino: "bodega",
    });
    setActive(milestone);
  };

  const closeModal = () => {
    setActive(null);
  };

  const onChange = (key: keyof EventoFormState, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleSubmit = async () => {
    if (!active) return;
    setFormError(null);
    setSaving(true);
    try {
      if (active.protocolo_proceso.evento_tipo === "riego") {
        if (!form.fecha || !form.volumen) {
          setFormError("Fecha y volumen son obligatorios.");
          return;
        }
        if (!trazabilidad) {
          setFormError("No se pudo determinar la trazabilidad.");
          return;
        }
        await createEventoRiego({
          milestoneId: active.milestone_id,
          fecha: form.fecha,
          cuartelId: trazabilidad.cuartel_id,
          campaniaId: trazabilidad.campania_id,
          volumen: Number(form.volumen),
          unidad: form.unidad,
          sistema_riego: form.sistema_riego,
          responsable_persona_id: null,
        });
      } else if (active.protocolo_proceso.evento_tipo === "cosecha") {
        if (!form.fecha_cosecha || !form.cantidad) {
          setFormError("Fecha de cosecha y cantidad son obligatorios.");
          return;
        }
        if (!trazabilidad) {
          setFormError("No se pudo determinar la trazabilidad.");
          return;
        }
        await createEventoCosecha({
          milestoneId: active.milestone_id,
          fecha_cosecha: form.fecha_cosecha,
          cuartelId: trazabilidad.cuartel_id,
          campaniaId: trazabilidad.campania_id,
          cantidad: Number(form.cantidad),
          unidad: form.unidad,
          destino: form.destino,
          responsable_persona_id: null,
        });
      } else {
        setFormError("Tipo de evento no soportado todavía.");
        return;
      }

      const updated = await completeMilestone(active.milestone_id);
      setMilestones((prev) =>
        prev.map((m) =>
          m.milestone_id === active.milestone_id
            ? { ...m, ...updated, estado: "completado" }
            : m
        )
      );
      closeModal();
    } catch {
      setFormError("No se pudo registrar el evento.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#F9F6F2] via-[#F3E7DA] to-[#EAD8C6] px-6 py-10">
      <div className="mx-auto w-full max-w-5xl">
        <div className="mb-8">
          <h1 className="text-3xl text-[#3D1B1F]">Plan de trabajo</h1>
          <p className="mt-2 text-sm text-[#6B3A3F]">
            Completá los milestones del protocolo para cerrar la trazabilidad.
          </p>
        </div>

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
            No hay milestones para esta trazabilidad.
          </div>
        ) : (
          <div className="space-y-4">
            {milestones.map((m) => (
              <div
                key={m.milestone_id}
                className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-[#C9A961]/30 bg-white/90 p-5 shadow-sm"
              >
                <div>
                  <div className="text-sm font-semibold text-[#3D1B1F]">
                    {m.protocolo_proceso.orden}. {m.protocolo_proceso.nombre}
                  </div>
                  <div className="mt-1 text-xs text-[#7A4A50]">
                    Tipo: {m.protocolo_proceso.evento_tipo} •{" "}
                    {m.protocolo_proceso.obligatorio
                      ? "Obligatorio"
                      : "Opcional"}
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span
                    className={`rounded-full px-3 py-1 text-xs font-semibold ${
                      m.estado === "completado"
                        ? "bg-[#F3FBF2] text-[#2D6B2D]"
                        : "bg-[#FFF9E9] text-[#8A6B1F]"
                    }`}
                  >
                    {m.estado}
                  </span>
                  <button
                    type="button"
                    onClick={() => openModal(m)}
                    disabled={m.estado === "completado"}
                    className="rounded-lg border border-[#C9A961]/40 px-3 py-2 text-xs font-semibold text-[#722F37] transition hover:border-[#C9A961] hover:bg-[#F8F3EE] disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    Registrar evento
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="mt-8 flex justify-end">
          <button
            type="button"
            disabled={obligatorioPendiente}
            className="rounded-lg border border-[#C9A961]/40 px-4 py-2 text-sm font-semibold text-[#722F37] transition hover:border-[#C9A961] hover:bg-[#F8F3EE] disabled:cursor-not-allowed disabled:opacity-60"
          >
            Finalizar trazabilidad
          </button>
        </div>
      </div>

      {active && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-xl rounded-2xl bg-white p-6 shadow-xl">
            <div className="mb-4">
              <h2 className="text-xl text-[#3D1B1F]">
                Registrar evento: {active.protocolo_proceso.nombre}
              </h2>
              <p className="text-xs text-[#7A4A50]">
                Tipo: {active.protocolo_proceso.evento_tipo}
              </p>
            </div>

            {active.protocolo_proceso.evento_tipo === "riego" && (
              <div className="space-y-3">
                <div>
                  <label className="block text-xs text-[#722F37] mb-2">
                    Fecha
                  </label>
                  <input
                    type="date"
                    className="w-full rounded-lg border-2 border-[#C9A961]/30 px-3 py-2 text-sm text-[#3D1B1F] outline-none focus:border-[#722F37]"
                    value={form.fecha}
                    onChange={(e) => onChange("fecha", e.target.value)}
                  />
                </div>
                <div className="grid gap-3 md:grid-cols-2">
                  <div>
                    <label className="block text-xs text-[#722F37] mb-2">
                      Volumen
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      className="w-full rounded-lg border-2 border-[#C9A961]/30 px-3 py-2 text-sm text-[#3D1B1F] outline-none focus:border-[#722F37]"
                      value={form.volumen}
                      onChange={(e) => onChange("volumen", e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-[#722F37] mb-2">
                      Unidad
                    </label>
                    <input
                      type="text"
                      className="w-full rounded-lg border-2 border-[#C9A961]/30 px-3 py-2 text-sm text-[#3D1B1F] outline-none focus:border-[#722F37]"
                      value={form.unidad}
                      onChange={(e) => onChange("unidad", e.target.value)}
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs text-[#722F37] mb-2">
                    Sistema de riego
                  </label>
                  <input
                    type="text"
                    className="w-full rounded-lg border-2 border-[#C9A961]/30 px-3 py-2 text-sm text-[#3D1B1F] outline-none focus:border-[#722F37]"
                    value={form.sistema_riego}
                    onChange={(e) => onChange("sistema_riego", e.target.value)}
                  />
                </div>
              </div>
            )}

            {active.protocolo_proceso.evento_tipo === "cosecha" && (
              <div className="space-y-3">
                <div>
                  <label className="block text-xs text-[#722F37] mb-2">
                    Fecha de cosecha
                  </label>
                  <input
                    type="date"
                    className="w-full rounded-lg border-2 border-[#C9A961]/30 px-3 py-2 text-sm text-[#3D1B1F] outline-none focus:border-[#722F37]"
                    value={form.fecha_cosecha}
                    onChange={(e) => onChange("fecha_cosecha", e.target.value)}
                  />
                </div>
                <div className="grid gap-3 md:grid-cols-2">
                  <div>
                    <label className="block text-xs text-[#722F37] mb-2">
                      Cantidad
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      className="w-full rounded-lg border-2 border-[#C9A961]/30 px-3 py-2 text-sm text-[#3D1B1F] outline-none focus:border-[#722F37]"
                      value={form.cantidad}
                      onChange={(e) => onChange("cantidad", e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-[#722F37] mb-2">
                      Unidad
                    </label>
                    <input
                      type="text"
                      className="w-full rounded-lg border-2 border-[#C9A961]/30 px-3 py-2 text-sm text-[#3D1B1F] outline-none focus:border-[#722F37]"
                      value={form.unidad}
                      onChange={(e) => onChange("unidad", e.target.value)}
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs text-[#722F37] mb-2">
                    Destino
                  </label>
                  <input
                    type="text"
                    className="w-full rounded-lg border-2 border-[#C9A961]/30 px-3 py-2 text-sm text-[#3D1B1F] outline-none focus:border-[#722F37]"
                    value={form.destino}
                    onChange={(e) => onChange("destino", e.target.value)}
                  />
                </div>
              </div>
            )}

            {formError && (
              <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                {formError}
              </div>
            )}

            <div className="mt-6 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={closeModal}
                className="rounded-lg border border-[#C9A961]/40 px-4 py-2 text-sm font-semibold text-[#722F37] transition hover:border-[#C9A961] hover:bg-[#F8F3EE]"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={saving}
                onClick={() => void handleSubmit()}
                className="rounded-lg border border-[#C9A961]/40 px-4 py-2 text-sm font-semibold text-[#722F37] transition hover:border-[#C9A961] hover:bg-[#F8F3EE] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {saving ? "Guardando..." : "Registrar evento"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MilestonesPlan;
