import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { createFinca } from "../../features/fincas/api";
import { upsertBodegaFincaVinculo } from "../../features/users/api";
import { useAuthStore } from "../../store/authStore";
import { useFincasStore } from "../../features/fincas/store";
import {
  AppButton,
  AppCard,
  AppInput,
  AppSelect,
  NoticeBanner,
  SectionIntro,
} from "../../components/ui";

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
          <AppCard
            as="section"
            tone="default"
            padding="lg"
            header={(
              <SectionIntro
                title="Finca creada"
                description={
                  <>
                    <strong>{createdFincaNombre}</strong> ya quedó registrada y podés seguir con la
                    carga del contexto productivo.
                  </>
                }
              />
            )}
          >
            <NoticeBanner tone="success" title="Próximo paso">
              Crear cuarteles para esta finca y completar la base operativa.
            </NoticeBanner>
          </AppCard>

          <AppCard as="section" tone="default" padding="lg">
            <div className="flex flex-wrap gap-3">
              <AppButton
                type="button"
                variant="primary"
                onClick={() =>
                  navigate(`/setup/cuarteles?fincaId=${encodeURIComponent(createdFincaId)}`)
                }
              >
                Crear un cuartel para esta finca
              </AppButton>
              <AppButton
                type="button"
                variant="secondary"
                onClick={() => navigate("/fincas")}
              >
                Finalizar
              </AppButton>
            </div>
          </AppCard>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-secondary px-6 py-10">
      <div className="mx-auto w-full max-w-5xl space-y-6">
        <AppCard
          as="section"
          tone="default"
          padding="lg"
          header={(
            <SectionIntro
              title="Crear finca"
              description="Definí primero la finca y su vínculo con la bodega para después avanzar con campañas, cuarteles y trazabilidad."
            />
          )}
        >
          <NoticeBanner tone="info" title="Flujo">
            Finca - Cuarteles - Protocolos
          </NoticeBanner>
        </AppCard>

        {bodegas.length === 0 ? (
          <NoticeBanner tone="danger">
            No hay bodegas disponibles para este usuario.
          </NoticeBanner>
        ) : (
          <AppCard as="section" tone="default" padding="lg">
            <form className="space-y-5">
              <AppCard as="div" tone="soft" padding="md">
                <div className="grid gap-4 md:grid-cols-2">
                  <AppSelect
                    label="Bodega"
                    description="Se usa la bodega elegida como contexto activo para el setup."
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
                  </AppSelect>

                  <AppInput
                    label="Nombre de la finca"
                    type="text"
                    uiSize="lg"
                    placeholder="Finca Los Andes"
                    value={form.nombre_finca}
                    onChange={(e) => onChange("nombre_finca", e.target.value)}
                  />

                  <AppInput
                    label="RUT"
                    type="text"
                    uiSize="lg"
                    placeholder="RUT-123"
                    value={form.rut}
                    onChange={(e) => onChange("rut", e.target.value)}
                  />

                  <AppInput
                    label="Renspa"
                    type="text"
                    uiSize="lg"
                    placeholder="RENSPA-456"
                    value={form.renspa}
                    onChange={(e) => onChange("renspa", e.target.value)}
                  />

                  <AppInput
                    label="Catastro"
                    type="text"
                    uiSize="lg"
                    placeholder="CAT-789"
                    value={form.catastro}
                    onChange={(e) => onChange("catastro", e.target.value)}
                  />

                  <AppInput
                    label="Ubicación"
                    type="text"
                    uiSize="lg"
                    className="md:col-span-2"
                    placeholder="Luján de Cuyo, Mendoza"
                    value={form.ubicacion_texto}
                    onChange={(e) => onChange("ubicacion_texto", e.target.value)}
                  />
                </div>
              </AppCard>

              <AppCard as="div" tone="soft" padding="md">
                <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_auto] md:items-end">
                  <AppSelect
                    label="Vínculo con la bodega"
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
                  </AppSelect>

                  <label className="flex min-h-11 items-center gap-2 rounded-[var(--radius-md)] border border-[color:var(--border-shell)] bg-[color:var(--surface-muted)] px-4 py-2 text-sm text-[color:var(--text-on-dark)]">
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
              </AppCard>

              {error ? <NoticeBanner tone="danger">{error}</NoticeBanner> : null}

              <div className="flex flex-wrap gap-2">
                <AppButton
                  type="button"
                  variant="primary"
                  disabled={saving}
                  loading={saving}
                  onClick={() => void handleSubmit()}
                >
                  {saving ? "Guardando..." : "Crear finca"}
                </AppButton>
                <AppButton
                  type="button"
                  variant="secondary"
                  onClick={() => navigate("/fincas")}
                >
                  Volver a fincas
                </AppButton>
              </div>
            </form>
          </AppCard>
        )}
      </div>
    </div>
  );
};

export default SetupFinca;
