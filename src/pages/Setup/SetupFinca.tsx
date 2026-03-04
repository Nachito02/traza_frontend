import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { createFinca } from "../../features/fincas/api";
import { upsertBodegaFincaVinculo } from "../../features/users/api";
import { useAuthStore } from "../../store/authStore";
import { useFincasStore } from "../../features/fincas/store";

const SetupFinca = () => {
  const activeBodegaId = useAuthStore((state) => state.activeBodegaId);
  const bodegas = useAuthStore((state) => state.bodegas);
  const fetchBodegas = useAuthStore((state) => state.fetchBodegas);
  const setActiveBodega = useAuthStore((state) => state.setActiveBodega);
  const navigate = useNavigate();
  const loadFincas = useFincasStore((state) => state.loadFincas);
  const [selectedBodegaId, setSelectedBodegaId] = useState<string>(
    activeBodegaId ? String(activeBodegaId) : "",
  );
  const [form, setForm] = useState({
    nombre_finca: "",
    rut: "",
    renspa: "",
    catastro: "",
    ubicacion_texto: "",
    tipo_vinculo: "propia" as "propia" | "proveedor_tercero",
    vinculo_activo: true,
  });
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const onChange = (key: keyof typeof form, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  useEffect(() => {
    if (bodegas.length === 0) {
      void fetchBodegas();
    }
  }, [bodegas.length, fetchBodegas]);

  useEffect(() => {
    if (activeBodegaId) {
      setSelectedBodegaId(String(activeBodegaId));
    }
  }, [activeBodegaId]);

  const handleSubmit = async () => {
    if (!selectedBodegaId) {
      setError("Seleccioná una bodega.");
      return;
    }
    if (!form.nombre_finca.trim()) {
      setError("El nombre de la finca es obligatorio.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const created = await createFinca({
        bodegaId: selectedBodegaId,
        nombre_finca: form.nombre_finca.trim(),
        rut: form.rut.trim() || null,
        renspa: form.renspa.trim() || null,
        catastro: form.catastro.trim() || null,
        ubicacion_texto: form.ubicacion_texto.trim() || null,
      });
      const fincaId = String(created.finca_id ?? created.id ?? "");
      if (fincaId) {
        await upsertBodegaFincaVinculo({
          bodegaId: String(selectedBodegaId),
          fincaId,
          tipo_vinculo: form.tipo_vinculo,
          activo: Boolean(form.vinculo_activo),
        });
      }
      setActiveBodega(selectedBodegaId);
      await loadFincas(selectedBodegaId);
      navigate("/setup/campania");
    } catch (e) {
      setError("No se pudo crear la finca.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#F9F6F2] via-[#F3E7DA] to-[#EAD8C6] px-6 py-10">
      <div className="mx-auto w-full max-w-3xl rounded-2xl bg-white/90 p-8 shadow-lg">
        <h1 className="text-2xl text-[#3D1B1F]">Crear finca</h1>
        <p className="mt-2 text-sm text-[#6B3A3F]">
          Paso 1 de 4 del setup guiado.
        </p>

        {bodegas.length === 0 ? (
          <div className="mt-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            No hay bodegas disponibles para este usuario.
          </div>
        ) : (
          <form className="mt-6 space-y-4">
            <div>
              <label className="block text-sm text-[#722F37] mb-2">
                Bodega
              </label>
              <select
                className="w-full rounded-lg border-2 border-[#C9A961]/30 px-3 py-2 text-sm text-[#3D1B1F] outline-none focus:border-[#722F37]"
                value={selectedBodegaId}
                onChange={(e) => setSelectedBodegaId(e.target.value)}
              >
                <option value="">Seleccioná una bodega</option>
                {bodegas.map((bodega) => (
                  <option key={bodega.bodega_id} value={bodega.bodega_id}>
                    {bodega.nombre} {bodega.cuit ? `(${bodega.cuit})` : ""} -{" "}
                    {bodega.bodega_id.slice(0, 8)}
                  </option>
                ))}
              </select>
              <p className="mt-1 text-xs text-[#7A4A50]">
                Se guarda internamente el `bodega_id` de la opción elegida.
              </p>
            </div>
            <div>
              <label className="block text-sm text-[#722F37] mb-2">
                Nombre de la finca
              </label>
              <input
                type="text"
                className="w-full rounded-lg border-2 border-[#C9A961]/30 px-3 py-2 text-sm text-[#3D1B1F] outline-none focus:border-[#722F37]"
                placeholder="Finca Los Andes"
                value={form.nombre_finca}
                onChange={(e) => onChange("nombre_finca", e.target.value)}
              />
            </div>
            <div>
              <label className="block text-sm text-[#722F37] mb-2">RUT</label>
              <input
                type="text"
                className="w-full rounded-lg border-2 border-[#C9A961]/30 px-3 py-2 text-sm text-[#3D1B1F] outline-none focus:border-[#722F37]"
                placeholder="RUT-123"
                value={form.rut}
                onChange={(e) => onChange("rut", e.target.value)}
              />
            </div>
            <div>
              <label className="block text-sm text-[#722F37] mb-2">
                Renspa
              </label>
              <input
                type="text"
                className="w-full rounded-lg border-2 border-[#C9A961]/30 px-3 py-2 text-sm text-[#3D1B1F] outline-none focus:border-[#722F37]"
                placeholder="RENSPA-456"
                value={form.renspa}
                onChange={(e) => onChange("renspa", e.target.value)}
              />
            </div>
            <div>
              <label className="block text-sm text-[#722F37] mb-2">
                Catastro
              </label>
              <input
                type="text"
                className="w-full rounded-lg border-2 border-[#C9A961]/30 px-3 py-2 text-sm text-[#3D1B1F] outline-none focus:border-[#722F37]"
                placeholder="CAT-789"
                value={form.catastro}
                onChange={(e) => onChange("catastro", e.target.value)}
              />
            </div>
            <div>
              <label className="block text-sm text-[#722F37] mb-2">
                Ubicación
              </label>
              <input
                type="text"
                className="w-full rounded-lg border-2 border-[#C9A961]/30 px-3 py-2 text-sm text-[#3D1B1F] outline-none focus:border-[#722F37]"
                placeholder="Luján de Cuyo, Mendoza"
                value={form.ubicacion_texto}
                onChange={(e) => onChange("ubicacion_texto", e.target.value)}
              />
            </div>
            <div>
              <label className="block text-sm text-[#722F37] mb-2">
                Vínculo con la bodega
              </label>
              <select
                className="w-full rounded-lg border-2 border-[#C9A961]/30 px-3 py-2 text-sm text-[#3D1B1F] outline-none focus:border-[#722F37]"
                value={form.tipo_vinculo}
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    tipo_vinculo: e.target.value as "propia" | "proveedor_tercero",
                  }))
                }
              >
                <option value="propia">Propia</option>
                <option value="proveedor_tercero">Proveedor tercero</option>
              </select>
            </div>
            <label className="flex items-center gap-2 text-sm text-[#722F37]">
              <input
                type="checkbox"
                checked={form.vinculo_activo}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, vinculo_activo: e.target.checked }))
                }
              />
              Vínculo activo
            </label>
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
              {saving ? "Guardando..." : "Guardar finca"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
};

export default SetupFinca;
