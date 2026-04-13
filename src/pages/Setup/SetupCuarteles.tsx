import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { createCuartel } from "../../features/cuarteles/api";
import { useFincasStore } from "../../features/fincas/store";
import { useAuthStore } from "../../store/authStore";
import { getApiErrorMessage } from "../../lib/api";
import {
  AppButton,
  AppCard,
  AppInput,
  AppSelect,
  NoticeBanner,
  SectionIntro,
} from "../../components/ui";

const SetupCuarteles = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const urlFincaId = searchParams.get("fincaId") ?? "";
  const activeBodegaId = useAuthStore((state) => state.activeBodegaId);
  const fincas = useFincasStore((state) => state.fincas);
  const fincasLoading = useFincasStore((state) => state.loading);
  const fincasError = useFincasStore((state) => state.error);
  const loadFincas = useFincasStore((state) => state.loadFincas);
  const [createdCodigo, setCreatedCodigo] = useState<string | null>(null);

  const [form, setForm] = useState({
    fincaId: urlFincaId,
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
      const preferredFincaId = urlFincaId || sessionStorage.getItem("setupFincaId") || "";
      const exists = fincas.some(
        (finca) => String(finca.finca_id ?? finca.id ?? "") === preferredFincaId,
      );
      const firstId = exists
        ? preferredFincaId
        : String(fincas[0].finca_id ?? fincas[0].id ?? "");
      setForm((prev) => ({ ...prev, fincaId: firstId }));
    }
  }, [fincas, form.fincaId, urlFincaId]);

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
      sessionStorage.setItem("setupFincaId", form.fincaId);
      setCreatedCodigo(form.codigo_cuartel.trim());
      setForm((prev) => ({
        ...prev,
        codigo_cuartel: "",
        superficie_ha: "",
        variedad: "",
        sistema_productivo: "",
        sistema_conduccion: "",
      }));
    } catch (e) {
      setError(getApiErrorMessage(e));
    } finally {
      setSaving(false);
    }
  };

  if (!activeBodegaId) {
    return (
      <div className="min-h-screen bg-secondary px-6 py-10">
        <div className="mx-auto w-full max-w-4xl">
          <NoticeBanner tone="danger">
            Seleccioná una bodega activa antes de crear cuarteles.
          </NoticeBanner>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-secondary px-6 py-10">
      <div className="mx-auto w-full max-w-4xl space-y-6">
        <AppCard
          as="section"
          tone="default"
          padding="lg"
          header={(
            <SectionIntro
              title="Crear cuartel"
              description="Registrá los cuarteles de la finca para poder asociar labores, campañas y trazabilidad."
            />
          )}
        >
          <NoticeBanner tone="info" title="Flujo">
            Finca - Cuarteles - Protocolo
          </NoticeBanner>
        </AppCard>

        {createdCodigo ? (
          <NoticeBanner tone="success">
            Cuartel <strong>{createdCodigo}</strong> creado correctamente.{" "}
            Podés crear otro o finalizar.
          </NoticeBanner>
        ) : null}

        <AppCard as="section" tone="default" padding="lg">
        <form className="space-y-4">
          <div>
            {fincasLoading ? (
              <NoticeBanner tone="info">Cargando fincas…</NoticeBanner>
            ) : fincasError ? (
              <NoticeBanner tone="danger">{fincasError}</NoticeBanner>
            ) : fincaOptions.length === 0 ? (
              <NoticeBanner tone="warning">No hay fincas cargadas.</NoticeBanner>
            ) : (
              <AppSelect
                label="Finca"
                value={form.fincaId}
                onChange={(e) => onChange("fincaId", e.target.value)}
              >
                {fincaOptions.map((option) => (
                  <option key={option.id} value={option.id}>
                    {option.label}
                  </option>
                ))}
              </AppSelect>
            )}
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <AppInput
              label="Código de cuartel"
                type="text"
                uiSize="lg"
                placeholder="C-01"
                value={form.codigo_cuartel}
                onChange={(e) => onChange("codigo_cuartel", e.target.value)}
            />
            <AppInput
              label="Superficie (ha)"
                type="number"
                step="0.01"
                uiSize="lg"
                placeholder="12.5"
                value={form.superficie_ha}
                onChange={(e) => onChange("superficie_ha", e.target.value)}
            />
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <AppInput
              label="Cultivo"
                type="text"
                uiSize="lg"
                value={form.cultivo}
                onChange={(e) => onChange("cultivo", e.target.value)}
            />
            <AppInput
              label="Variedad"
                type="text"
                uiSize="lg"
                placeholder="Malbec"
                value={form.variedad}
                onChange={(e) => onChange("variedad", e.target.value)}
            />
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <AppInput
              label="Sistema productivo"
                type="text"
                uiSize="lg"
                placeholder="Orgánico"
                value={form.sistema_productivo}
                onChange={(e) => onChange("sistema_productivo", e.target.value)}
            />
            <AppInput
              label="Sistema conducción"
                type="text"
                uiSize="lg"
                placeholder="Espaldera"
                value={form.sistema_conduccion}
                onChange={(e) => onChange("sistema_conduccion", e.target.value)}
            />
          </div>

          {error ? <NoticeBanner tone="danger">{error}</NoticeBanner> : null}
          <div className="flex flex-wrap gap-3">
            <AppButton
              type="button"
              variant="primary"
              disabled={saving}
              loading={saving}
              onClick={() => void handleSubmit()}
            >
              {saving ? "Guardando..." : "Crear cuartel"}
            </AppButton>
            <AppButton
              type="button"
              variant="secondary"
              onClick={() => navigate("/fincas")}
            >
              Finalizar
            </AppButton>
          </div>
        </form>
        </AppCard>
      </div>
    </div>
  );
};

export default SetupCuarteles;
