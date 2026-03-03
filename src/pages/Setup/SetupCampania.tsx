import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  createCampania,
  fetchCampanias,
  type Campania,
} from "../../features/campanias/api";
import { getApiErrorMessage } from "../../lib/api";
import { useAuthStore } from "../../store/authStore";

const SetupCampania = () => {
  const navigate = useNavigate();
  const activeBodegaId = useAuthStore((state) => state.activeBodegaId);
  const [mode, setMode] = useState<"existing" | "new">("existing");
  const [campanias, setCampanias] = useState<Campania[]>([]);
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
        const firstId = String(loaded[0]?.campania_id ?? loaded[0]?.id ?? "");
        if (firstId) {
          setSelectedCampaniaId(firstId);
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
      await createCampania({
        bodegaId: String(activeBodegaId ?? ""),
        nombre: form.nombre.trim(),
        fecha_inicio: form.fecha_inicio,
        fecha_fin: form.fecha_fin,
        estado: "abierta",
      });
      navigate("/setup/cuarteles");
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
      sessionStorage.setItem("activeCampaniaId", selectedCampaniaId);
      sessionStorage.setItem(
        "activeCampaniaNombre",
        selected.nombre ?? selectedCampaniaId,
      );
    }
    navigate("/setup/cuarteles");
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#F9F6F2] via-[#F3E7DA] to-[#EAD8C6] px-6 py-10">
      <div className="mx-auto w-full max-w-3xl rounded-2xl bg-white/90 p-8 shadow-lg">
        <h1 className="text-2xl text-[#3D1B1F]">Crear campaña</h1>
        <p className="mt-2 text-sm text-[#6B3A3F]">
          Paso 2 de 4 del setup guiado.
        </p>
        {!activeBodegaId ? (
          <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            Seleccioná una bodega activa para crear o usar campañas.
          </div>
        ) : null}

        <div className="mt-6 grid grid-cols-2 rounded-lg border border-[#C9A961]/30 bg-[#FFF9F0] p-1">
          <button
            type="button"
            onClick={() => {
              setMode("existing");
              setError(null);
            }}
            className={[
              "rounded-md px-3 py-2 text-sm font-medium transition",
              mode === "existing"
                ? "bg-white text-[#3D1B1F] shadow"
                : "text-[#722F37]",
            ].join(" ")}
          >
            Usar existente
          </button>
          <button
            type="button"
            onClick={() => {
              setMode("new");
              setError(null);
            }}
            className={[
              "rounded-md px-3 py-2 text-sm font-medium transition",
              mode === "new" ? "bg-white text-[#3D1B1F] shadow" : "text-[#722F37]",
            ].join(" ")}
          >
            Crear nueva
          </button>
        </div>

        {mode === "existing" ? (
          <div className="mt-6 space-y-4">
            <div>
              <label className="block text-sm text-[#722F37] mb-2">
                Campaña existente
              </label>
              {loadingCampanias ? (
                <div className="text-sm text-[#6B3A3F]">Cargando campañas…</div>
              ) : campanias.length === 0 ? (
                <div className="rounded-xl border border-[#C9A961]/30 bg-[#FFF9F0] px-3 py-2 text-sm text-[#6B3A3F]">
                  No hay campañas cargadas. Creá una nueva para continuar.
                </div>
              ) : (
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
              )}
            </div>
            <button
              type="button"
              disabled={!canUseExisting || !activeBodegaId}
              onClick={handleContinueWithExisting}
              className="rounded-lg border border-[#C9A961]/40 px-4 py-2 text-sm font-semibold text-[#722F37] transition hover:border-[#C9A961] hover:bg-[#F8F3EE] disabled:cursor-not-allowed disabled:opacity-60"
            >
              Continuar con campaña seleccionada
            </button>
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

            <button
              type="button"
              disabled={saving || !activeBodegaId}
              onClick={() => void handleSubmit()}
              className="rounded-lg border border-[#C9A961]/40 px-4 py-2 text-sm font-semibold text-[#722F37] transition hover:border-[#C9A961] hover:bg-[#F8F3EE] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {saving ? "Guardando..." : "Guardar campaña"}
            </button>
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
