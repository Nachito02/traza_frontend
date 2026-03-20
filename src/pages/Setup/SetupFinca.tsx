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
  const [createdFincaId, setCreatedFincaId] = useState<string | null>(null);
  const [createdFincaNombre, setCreatedFincaNombre] = useState<string>("");

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
      const fincaNombre = (
        created.nombre_finca ??
        created.nombre ??
        created.name ??
        form.nombre_finca
      ).trim();

      if (fincaId) {
        await upsertBodegaFincaVinculo({
          bodegaId: String(selectedBodegaId),
          fincaId,
          tipo_vinculo: form.tipo_vinculo,
          activo: Boolean(form.vinculo_activo),
        });
      }
      sessionStorage.setItem("setupFincaId", fincaId);
      sessionStorage.setItem("setupFincaNombre", fincaNombre || form.nombre_finca.trim());
      setActiveBodega(selectedBodegaId);
      await loadFincas(selectedBodegaId);
      setCreatedFincaId(fincaId);
      setCreatedFincaNombre(fincaNombre || form.nombre_finca.trim());
    } catch {
      setError("No se pudo crear la finca.");
    } finally {
      setSaving(false);
    }
  };

  if (createdFincaId) {
    return (
      <div className="min-h-screen bg-secondary px-6 py-10">
        <div className="mx-auto w-full max-w-5xl space-y-6">
          <section className="rounded-2xl bg-primary p-6 shadow-lg">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#8B5E34]">
              Setup
            </p>
            <h1 className="mt-2 text-3xl font-bold text-text">Finca creada</h1>
            <p className="mt-2 text-sm text-text-secondary">
              <strong>{createdFincaNombre}</strong> ya quedó registrada y podés seguir con la carga
              del contexto productivo.
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              <div className="rounded-xl border border-[#C9A961]/30 bg-[#FFF9F0] px-4 py-3">
                <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#8B5E34]">
                  Próximo paso
                </div>
                <div className="mt-1 text-sm font-semibold text-[#3D1B1F]">Crear cuarteles</div>
              </div>
            </div>
          </section>

          <section className="rounded-2xl bg-primary p-6 shadow-lg">
            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() =>
                  navigate(`/setup/cuarteles?fincaId=${encodeURIComponent(createdFincaId)}`)
                }
                className="rounded-lg border border-[#C9A961]/40 px-4 py-2 text-sm font-semibold text-text transition hover:bg-primary"
              >
                Crear un cuartel para esta finca
              </button>
              <button
                type="button"
                onClick={() => navigate("/fincas")}
                className="rounded-lg border border-[#C9A961]/40 px-4 py-2 text-sm font-semibold text-text transition hover:bg-primary"
              >
                Finalizar
              </button>
            </div>
          </section>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-secondary px-6 py-10">
      <div className="mx-auto w-full max-w-5xl space-y-6">
        <section className="rounded-2xl bg-primary p-6 shadow-lg">
          <div className="space-y-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#8B5E34]">
                Setup
              </p>
              <h1 className="mt-2 text-3xl font-bold text-text">Crear finca</h1>
              <p className="mt-2 max-w-3xl text-sm text-text-secondary">
                Definí primero la finca y su vínculo con la bodega para después avanzar con
                campañas, cuarteles y trazabilidad.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <div className="rounded-xl border border-[#C9A961]/30 bg-[#FFF9F0] px-4 py-3">
                <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#8B5E34]">
                  Flujo
                </div>
                <div className="mt-1 text-sm font-semibold text-[#3D1B1F]">
                  Finca - Cuarteles - Protocolos
                </div>
              </div>
            </div>
          </div>
        </section>

        {bodegas.length === 0 ? (
          <section className="rounded-2xl bg-primary p-6 shadow-lg">
            <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              No hay bodegas disponibles para este usuario.
            </div>
          </section>
        ) : (
          <section className="rounded-2xl bg-primary p-6 shadow-lg">
            <form className="space-y-5">
              <div className="rounded-xl border border-[#C9A961]/30 bg-[#FFF9F0] p-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <label className="space-y-2 text-sm text-[#6B3A3F]">
                    <span className="font-semibold text-[#3D1B1F]">Bodega</span>
                    <select
                      className="w-full rounded-xl border border-[#C9A961]/40 bg-white px-3 py-2 text-sm text-[#3D1B1F] outline-none"
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
                    <p className="text-xs text-[#7A4A50]">
                      Se usa la bodega elegida como contexto activo para el setup.
                    </p>
                  </label>

                  <label className="space-y-2 text-sm text-[#6B3A3F]">
                    <span className="font-semibold text-[#3D1B1F]">Nombre de la finca</span>
                    <input
                      type="text"
                      className="w-full rounded-xl border border-[#C9A961]/40 bg-white px-3 py-2 text-sm text-[#3D1B1F] outline-none"
                      placeholder="Finca Los Andes"
                      value={form.nombre_finca}
                      onChange={(e) => onChange("nombre_finca", e.target.value)}
                    />
                  </label>

                  <label className="space-y-2 text-sm text-[#6B3A3F]">
                    <span className="font-semibold text-[#3D1B1F]">RUT</span>
                    <input
                      type="text"
                      className="w-full rounded-xl border border-[#C9A961]/40 bg-white px-3 py-2 text-sm text-[#3D1B1F] outline-none"
                      placeholder="RUT-123"
                      value={form.rut}
                      onChange={(e) => onChange("rut", e.target.value)}
                    />
                  </label>

                  <label className="space-y-2 text-sm text-[#6B3A3F]">
                    <span className="font-semibold text-[#3D1B1F]">Renspa</span>
                    <input
                      type="text"
                      className="w-full rounded-xl border border-[#C9A961]/40 bg-white px-3 py-2 text-sm text-[#3D1B1F] outline-none"
                      placeholder="RENSPA-456"
                      value={form.renspa}
                      onChange={(e) => onChange("renspa", e.target.value)}
                    />
                  </label>

                  <label className="space-y-2 text-sm text-[#6B3A3F]">
                    <span className="font-semibold text-[#3D1B1F]">Catastro</span>
                    <input
                      type="text"
                      className="w-full rounded-xl border border-[#C9A961]/40 bg-white px-3 py-2 text-sm text-[#3D1B1F] outline-none"
                      placeholder="CAT-789"
                      value={form.catastro}
                      onChange={(e) => onChange("catastro", e.target.value)}
                    />
                  </label>

                  <label className="space-y-2 text-sm text-[#6B3A3F] md:col-span-2">
                    <span className="font-semibold text-[#3D1B1F]">Ubicación</span>
                    <input
                      type="text"
                      className="w-full rounded-xl border border-[#C9A961]/40 bg-white px-3 py-2 text-sm text-[#3D1B1F] outline-none"
                      placeholder="Luján de Cuyo, Mendoza"
                      value={form.ubicacion_texto}
                      onChange={(e) => onChange("ubicacion_texto", e.target.value)}
                    />
                  </label>
                </div>
              </div>

              <div className="rounded-xl border border-[#C9A961]/30 bg-[#FFF9F0] p-4">
                <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_auto] md:items-end">
                  <label className="space-y-2 text-sm text-[#6B3A3F]">
                    <span className="font-semibold text-[#3D1B1F]">Vínculo con la bodega</span>
                    <select
                      className="w-full rounded-xl border border-[#C9A961]/40 bg-white px-3 py-2 text-sm text-[#3D1B1F] outline-none"
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
                  </label>

                  <label className="flex items-center gap-2 rounded-xl border border-[#C9A961]/30 bg-white px-3 py-2 text-sm text-[#3D1B1F]">
                    <input
                      type="checkbox"
                      checked={form.vinculo_activo}
                      onChange={(e) =>
                        setForm((prev) => ({ ...prev, vinculo_activo: e.target.checked }))
                      }
                    />
                    Vínculo activo
                  </label>
                </div>
              </div>

              {error ? (
                <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                  {error}
                </div>
              ) : null}

              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  disabled={saving}
                  onClick={() => void handleSubmit()}
                  className="rounded-lg border border-[#C9A961]/40 px-4 py-2 text-sm font-semibold text-text transition hover:bg-primary disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {saving ? "Guardando..." : "Crear finca"}
                </button>
                <button
                  type="button"
                  onClick={() => navigate("/fincas")}
                  className="rounded-lg border border-[#C9A961]/40 px-4 py-2 text-sm font-semibold text-text transition hover:bg-primary"
                >
                  Volver a fincas
                </button>
              </div>
            </form>
          </section>
        )}
      </div>
    </div>
  );
};

export default SetupFinca;
