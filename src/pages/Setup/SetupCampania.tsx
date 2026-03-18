import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  createCampania,
  fetchCampanias,
  type Campania,
} from "../../features/campanias/api";
import { getApiErrorMessage } from "../../lib/api";
import { useAuthStore } from "../../store/authStore";
import { useCampaniaStore } from "../../store/campaniaStore";

const SetupCampania = () => {
  const navigate = useNavigate();
  const activeBodegaId = useAuthStore((state) => state.activeBodegaId);
  const setActiveCampania = useCampaniaStore((state) => state.setActiveCampania);
  const loadCampanias = useCampaniaStore((state) => state.loadCampanias);
  const [mode, setMode] = useState<"active" | "existing" | "new">("active");
  const [campanias, setCampanias] = useState<Campania[]>([]);
  const [activeCampania, setActiveCampaniaLocal] = useState<Campania | null>(null);
  const [selectedCampaniaId, setSelectedCampaniaId] = useState("");
  const [loadingCampanias, setLoadingCampanias] = useState(true);
  const [form, setForm] = useState({
    nombre: "",
    fecha_inicio: "",
    fecha_fin: "",
    estado: "abierta",
  });
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const onChange = (key: keyof typeof form, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  useEffect(() => {
    let mounted = true;
    setLoadingCampanias(true);
    fetchCampanias(activeBodegaId ?? undefined)
      .then((data) => {
        if (!mounted) return;
        const loaded = data ?? [];
        setCampanias(loaded);
        const active = loaded.find((c) => c.estado === "abierta") ?? null;
        setActiveCampaniaLocal(active);
        if (active) {
          const activeId = String(active.campania_id ?? active.id ?? "");
          setSelectedCampaniaId(activeId);
          setMode("active");
        } else {
          const firstId = String(loaded[0]?.campania_id ?? loaded[0]?.id ?? "");
          if (firstId) setSelectedCampaniaId(firstId);
          setMode(loaded.length > 0 ? "existing" : "new");
        }
      })
      .catch(() => {
        if (!mounted) return;
        setCampanias([]);
      })
      .finally(() => {
        if (!mounted) return;
        setLoadingCampanias(false);
      });

    return () => {
      mounted = false;
    };
  }, [activeBodegaId]);

  const validateDates = () => {
    if (!form.fecha_inicio || !form.fecha_fin) return true;
    return new Date(form.fecha_fin) > new Date(form.fecha_inicio);
  };

  const canUseExisting = useMemo(
    () =>
      !loadingCampanias &&
      campanias.length > 0 &&
      Boolean(selectedCampaniaId),
    [campanias.length, loadingCampanias, selectedCampaniaId],
  );

  const handleSubmit = async () => {
    if (!form.nombre.trim()) {
      setError("El nombre de la campaña es obligatorio.");
      return;
    }
    if (!form.fecha_inicio || !form.fecha_fin) {
      setError("Fecha inicio y fin son obligatorias.");
      return;
    }
    if (!validateDates()) {
      setError("La fecha fin debe ser posterior a la fecha inicio.");
      return;
    }

    setSaving(true);
    setError(null);
    try {
      const created = await createCampania({
        bodegaId: String(activeBodegaId ?? ""),
        nombre: form.nombre.trim(),
        fecha_inicio: form.fecha_inicio,
        fecha_fin: form.fecha_fin,
        estado: "abierta",
      });
      const createdCampaniaId = String(created.campania_id ?? created.id ?? "");
      if (createdCampaniaId) {
        setActiveCampania(
          createdCampaniaId,
          created.nombre ?? form.nombre.trim() ?? createdCampaniaId,
        );
        if (activeBodegaId) {
          await loadCampanias(activeBodegaId);
        }
      }
      navigate("/admin/campanias");
    } catch (e) {
      const message = getApiErrorMessage(e);
      if (message.toLowerCase().includes("unique")) {
        setError("Ya existe una campaña con ese nombre. Elegí otro nombre.");
      } else {
      setError(message);
      }
    } finally {
      setSaving(false);
    }
  };

  const handleContinueWithExisting = () => {
    if (!selectedCampaniaId) {
      setError("Seleccioná una campaña existente.");
      return;
    }
    const selected = campanias.find(
      (item) => String(item.campania_id ?? item.id) === selectedCampaniaId,
    );
    if (selected) {
      setActiveCampania(selectedCampaniaId, selected.nombre ?? selectedCampaniaId);
    }
    navigate("/admin/campanias");
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#F9F6F2] via-[#F3E7DA] to-[#EAD8C6] px-6 py-10">
      <div className="mx-auto w-full max-w-3xl rounded-2xl bg-white/90 p-8 shadow-lg">
        <h1 className="text-2xl text-[#3D1B1F]">Campaña</h1>

        {!activeBodegaId ? (
          <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            Seleccioná una bodega activa para crear o usar campañas.
          </div>
        ) : null}

        {loadingCampanias ? (
          <div className="mt-6 text-sm text-[#6B3A3F]">Cargando campañas…</div>
        ) : mode === "active" && activeCampania ? (
          <div className="mt-6 space-y-4">
            <div className="rounded-xl border border-emerald-300 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
              Campaña activa: <strong>{activeCampania.nombre}</strong>
            </div>
            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                disabled={!activeBodegaId}
                onClick={handleContinueWithExisting}
                className="rounded-lg border border-[#C9A961]/40 px-4 py-2 text-sm font-semibold text-[#722F37] transition hover:border-[#C9A961] hover:bg-[#F8F3EE] disabled:opacity-60"
              >
                Continuar con esta campaña
              </button>
              <button
                type="button"
                onClick={() => { setMode("new"); setError(null); }}
                className="rounded-lg border border-transparent px-4 py-2 text-sm text-[#7A4A50] transition hover:text-[#3D1B1F]"
              >
                Crear nueva campaña
              </button>
            </div>
          </div>
        ) : mode === "existing" && campanias.length > 0 ? (
          <div className="mt-6 space-y-4">
            <div>
              <label className="block text-sm text-[#722F37] mb-2">
                Campaña existente
              </label>
              <select
                className="w-full rounded-lg border-2 border-[#C9A961]/30 px-3 py-2 text-sm text-[#3D1B1F] outline-none focus:border-[#722F37]"
                value={selectedCampaniaId}
                onChange={(e) => setSelectedCampaniaId(e.target.value)}
              >
                {campanias.map((campania) => {
                  const id = String(campania.campania_id ?? campania.id ?? "");
                  return (
                    <option key={id} value={id}>
                      {campania.nombre}
                    </option>
                  );
                })}
              </select>
            </div>
            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                disabled={!canUseExisting || !activeBodegaId}
                onClick={handleContinueWithExisting}
                className="rounded-lg border border-[#C9A961]/40 px-4 py-2 text-sm font-semibold text-[#722F37] transition hover:border-[#C9A961] hover:bg-[#F8F3EE] disabled:cursor-not-allowed disabled:opacity-60"
              >
                Continuar con campaña seleccionada
              </button>
              <button
                type="button"
                onClick={() => { setMode("new"); setError(null); }}
                className="rounded-lg border border-transparent px-4 py-2 text-sm text-[#7A4A50] transition hover:text-[#3D1B1F]"
              >
                Crear nueva campaña
              </button>
            </div>
          </div>
        ) : (
          <form className="mt-6 space-y-4">
            <div>
              <label className="block text-sm text-[#722F37] mb-2">
                Nombre de la campaña
              </label>
              <input
                type="text"
                className="w-full rounded-lg border-2 border-[#C9A961]/30 px-3 py-2 text-sm text-[#3D1B1F] outline-none focus:border-[#722F37]"
                placeholder="Campaña 2025"
                value={form.nombre}
                onChange={(e) => onChange("nombre", e.target.value)}
              />
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="block text-sm text-[#722F37] mb-2">
                  Fecha inicio
                </label>
                <input
                  type="date"
                  className="w-full rounded-lg border-2 border-[#C9A961]/30 px-3 py-2 text-sm text-[#3D1B1F] outline-none focus:border-[#722F37]"
                  value={form.fecha_inicio}
                  onChange={(e) => onChange("fecha_inicio", e.target.value)}
                />
              </div>
              <div>
                <label className="block text-sm text-[#722F37] mb-2">
                  Fecha fin
                </label>
                <input
                  type="date"
                  className="w-full rounded-lg border-2 border-[#C9A961]/30 px-3 py-2 text-sm text-[#3D1B1F] outline-none focus:border-[#722F37]"
                  value={form.fecha_fin}
                  onChange={(e) => onChange("fecha_fin", e.target.value)}
                />
              </div>
            </div>

            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                disabled={saving || !activeBodegaId}
                onClick={() => void handleSubmit()}
                className="rounded-lg border border-[#C9A961]/40 px-4 py-2 text-sm font-semibold text-[#722F37] transition hover:border-[#C9A961] hover:bg-[#F8F3EE] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {saving ? "Guardando..." : "Crear campaña"}
              </button>
              <button
                type="button"
                onClick={() => navigate("/admin/campanias")}
                className="rounded-lg border border-transparent px-4 py-2 text-sm text-[#7A4A50] transition hover:text-[#3D1B1F]"
              >
                Omitir
              </button>
            </div>
          </form>
        )}

        {error && (
          <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </div>
        )}
      </div>
    </div>
  );
};

export default SetupCampania;
