import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { createCuartel } from "../../features/cuarteles/api";
import { useFincasStore } from "../../features/fincas/store";
import { useAuthStore } from "../../store/authStore";

const SetupCuarteles = () => {
  const navigate = useNavigate();
  const activeBodegaId = useAuthStore((state) => state.activeBodegaId);
  const fincas = useFincasStore((state) => state.fincas);
  const fincasLoading = useFincasStore((state) => state.loading);
  const fincasError = useFincasStore((state) => state.error);
  const loadFincas = useFincasStore((state) => state.loadFincas);

  const [form, setForm] = useState({
    fincaId: "",
    codigo_cuartel: "",
    superficie_ha: "",
    cultivo: "Vid",
    variedad: "",
    sistema_productivo: "",
    sistema_conduccion: "",
  });
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (activeBodegaId) {
      void loadFincas(activeBodegaId);
    }
  }, [activeBodegaId, loadFincas]);

  useEffect(() => {
    if (!form.fincaId && fincas.length > 0) {
      const firstId = fincas[0].finca_id ?? fincas[0].id ?? "";
      setForm((prev) => ({ ...prev, fincaId: firstId }));
    }
  }, [fincas, form.fincaId]);

  const fincaOptions = useMemo(
    () =>
      fincas.map((finca) => ({
        id: finca.finca_id ?? finca.id ?? "",
        label: finca.nombre ?? finca.nombre_finca ?? finca.name ?? "(Sin nombre)",
      })),
    [fincas]
  );

  const onChange = (key: keyof typeof form, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleSubmit = async () => {
    if (!form.fincaId) {
      setError("Seleccioná una finca.");
      return;
    }
    if (!form.codigo_cuartel.trim()) {
      setError("El código de cuartel es obligatorio.");
      return;
    }
    if (!form.superficie_ha || Number.isNaN(Number(form.superficie_ha))) {
      setError("Superficie válida requerida.");
      return;
    }
    if (!form.variedad.trim()) {
      setError("La variedad es obligatoria.");
      return;
    }

    setSaving(true);
    setError(null);
    try {
      await createCuartel({
        fincaId: form.fincaId,
        codigo_cuartel: form.codigo_cuartel.trim(),
        superficie_ha: Number(form.superficie_ha),
        cultivo: form.cultivo.trim(),
        variedad: form.variedad.trim(),
        sistema_productivo: form.sistema_productivo.trim() || null,
        sistema_conduccion: form.sistema_conduccion.trim() || null,
      });
      navigate("/setup/protocolos");
    } catch {
      setError("No se pudo crear el cuartel.");
    } finally {
      setSaving(false);
    }
  };

  if (!activeBodegaId) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#F9F6F2] via-[#F3E7DA] to-[#EAD8C6] px-6 py-10">
        <div className="mx-auto w-full max-w-3xl rounded-2xl bg-white/90 p-8 shadow-lg text-sm text-red-700">
          Seleccioná una bodega activa antes de crear cuarteles.
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#F9F6F2] via-[#F3E7DA] to-[#EAD8C6] px-6 py-10">
      <div className="mx-auto w-full max-w-3xl rounded-2xl bg-white/90 p-8 shadow-lg">
        <h1 className="text-2xl text-[#3D1B1F]">Crear cuartel</h1>
        <p className="mt-2 text-sm text-[#6B3A3F]">
          Paso 3 de 4 del setup guiado.
        </p>

        <form className="mt-6 space-y-4">
          <div>
            <label className="block text-sm text-[#722F37] mb-2">Finca</label>
            {fincasLoading ? (
              <div className="text-xs text-[#7A4A50]">Cargando fincas…</div>
            ) : fincasError ? (
              <div className="text-xs text-red-700">{fincasError}</div>
            ) : fincaOptions.length === 0 ? (
              <div className="text-xs text-[#7A4A50]">
                No hay fincas cargadas.
              </div>
            ) : (
              <select
                className="w-full rounded-lg border-2 border-[#C9A961]/30 px-3 py-2 text-sm text-[#3D1B1F] outline-none focus:border-[#722F37]"
                value={form.fincaId}
                onChange={(e) => onChange("fincaId", e.target.value)}
              >
                {fincaOptions.map((option) => (
                  <option key={option.id} value={option.id}>
                    {option.label}
                  </option>
                ))}
              </select>
            )}
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="block text-sm text-[#722F37] mb-2">
                Código de cuartel
              </label>
              <input
                type="text"
                className="w-full rounded-lg border-2 border-[#C9A961]/30 px-3 py-2 text-sm text-[#3D1B1F] outline-none focus:border-[#722F37]"
                placeholder="C-01"
                value={form.codigo_cuartel}
                onChange={(e) => onChange("codigo_cuartel", e.target.value)}
              />
            </div>
            <div>
              <label className="block text-sm text-[#722F37] mb-2">
                Superficie (ha)
              </label>
              <input
                type="number"
                step="0.01"
                className="w-full rounded-lg border-2 border-[#C9A961]/30 px-3 py-2 text-sm text-[#3D1B1F] outline-none focus:border-[#722F37]"
                placeholder="12.5"
                value={form.superficie_ha}
                onChange={(e) => onChange("superficie_ha", e.target.value)}
              />
            </div>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="block text-sm text-[#722F37] mb-2">
                Cultivo
              </label>
              <input
                type="text"
                className="w-full rounded-lg border-2 border-[#C9A961]/30 px-3 py-2 text-sm text-[#3D1B1F] outline-none focus:border-[#722F37]"
                value={form.cultivo}
                onChange={(e) => onChange("cultivo", e.target.value)}
              />
            </div>
            <div>
              <label className="block text-sm text-[#722F37] mb-2">
                Variedad
              </label>
              <input
                type="text"
                className="w-full rounded-lg border-2 border-[#C9A961]/30 px-3 py-2 text-sm text-[#3D1B1F] outline-none focus:border-[#722F37]"
                placeholder="Malbec"
                value={form.variedad}
                onChange={(e) => onChange("variedad", e.target.value)}
              />
            </div>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="block text-sm text-[#722F37] mb-2">
                Sistema productivo
              </label>
              <input
                type="text"
                className="w-full rounded-lg border-2 border-[#C9A961]/30 px-3 py-2 text-sm text-[#3D1B1F] outline-none focus:border-[#722F37]"
                placeholder="Orgánico"
                value={form.sistema_productivo}
                onChange={(e) => onChange("sistema_productivo", e.target.value)}
              />
            </div>
            <div>
              <label className="block text-sm text-[#722F37] mb-2">
                Sistema conducción
              </label>
              <input
                type="text"
                className="w-full rounded-lg border-2 border-[#C9A961]/30 px-3 py-2 text-sm text-[#3D1B1F] outline-none focus:border-[#722F37]"
                placeholder="Espaldera"
                value={form.sistema_conduccion}
                onChange={(e) => onChange("sistema_conduccion", e.target.value)}
              />
            </div>
          </div>

          {error && (
            <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </div>
          )}
          <button
            type="button"
            disabled={saving}
            onClick={() => void handleSubmit()}
            className="rounded-lg border border-[#C9A961]/40 px-4 py-2 text-sm font-semibold text-[#722F37] transition hover:border-[#C9A961] hover:bg-[#F8F3EE] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {saving ? "Guardando..." : "Guardar cuartel"}
          </button>
        </form>
      </div>
    </div>
  );
};

export default SetupCuarteles;
