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
import {
  getTipoVariedadForVariedad,
  getVariedadesByTipo,
  MANEJO_CULTIVO_OPTIONS,
  SISTEMA_CONDUCCION_OPTIONS,
  SISTEMA_RIEGO_OPTIONS,
  TIPO_VARIEDAD_OPTIONS,
  type TipoVariedadVid,
} from "../../domain/viticultura/catalogos";

function optionalNumber(value: string) {
  return value.trim() ? Number(value) : null;
}

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
    tipo_variedad: "tinta" as TipoVariedadVid,
    variedad: "",
    sistema_riego: "",
    sistema_productivo: "",
    sistema_conduccion: "",
    cantidad_hileras: "",
    largo_hileras_m: "",
    densidad_hileras: "",
    distancia_plantacion: "",
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
  const variedadOptions = useMemo(
    () => getVariedadesByTipo(form.tipo_variedad),
    [form.tipo_variedad],
  );

  const onChange = (key: keyof typeof form, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const onChangeTipoVariedad = (value: TipoVariedadVid) => {
    setForm((prev) => ({ ...prev, tipo_variedad: value, variedad: "" }));
  };

  const onChangeVariedad = (value: string) => {
    setForm((prev) => ({
      ...prev,
      variedad: value,
      tipo_variedad: value ? getTipoVariedadForVariedad(value) : prev.tipo_variedad,
    }));
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
    const numericFields = [
      { label: "Cantidad de hileras", value: form.cantidad_hileras },
      { label: "Largo de hileras", value: form.largo_hileras_m },
      { label: "Densidad de hileras", value: form.densidad_hileras },
    ];
    const invalidField = numericFields.find(
      (field) => field.value.trim() && (Number.isNaN(Number(field.value)) || Number(field.value) < 0),
    );
    if (invalidField) {
      setError(`${invalidField.label} debe ser un número válido.`);
      return;
    }

    setSaving(true);
    setError(null);
    try {
      await createCuartel({
        fincaId: form.fincaId,
        codigo_cuartel: form.codigo_cuartel.trim(),
        superficie_ha: Number(form.superficie_ha),
        cultivo: "Vid",
        tipo_variedad: form.tipo_variedad,
        variedad: form.variedad,
        sistema_riego: form.sistema_riego.trim() || null,
        sistema_productivo: form.sistema_productivo.trim() || null,
        sistema_conduccion: form.sistema_conduccion.trim() || null,
        cantidad_hileras: optionalNumber(form.cantidad_hileras),
        largo_hileras_m: optionalNumber(form.largo_hileras_m),
        densidad_hileras: optionalNumber(form.densidad_hileras),
        distancia_plantacion: form.distancia_plantacion.trim() || null,
      });
      sessionStorage.setItem("setupFincaId", form.fincaId);
      setCreatedCodigo(form.codigo_cuartel.trim());
      setForm((prev) => ({
        ...prev,
        codigo_cuartel: "",
        superficie_ha: "",
        tipo_variedad: "tinta",
        variedad: "",
        sistema_riego: "",
        sistema_productivo: "",
        sistema_conduccion: "",
        cantidad_hileras: "",
        largo_hileras_m: "",
        densidad_hileras: "",
        distancia_plantacion: "",
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
              value="Vid"
             
              disabled
            />
            <AppSelect
              label="Tipo de variedad"
              value={form.tipo_variedad}
              onChange={(e) => onChangeTipoVariedad(e.target.value as TipoVariedadVid)}
              uiSize="lg"
            >
              {TIPO_VARIEDAD_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </AppSelect>
            <AppSelect
              label="Variedad"
              value={form.variedad}
              onChange={(e) => onChangeVariedad(e.target.value)}
              uiSize="lg"
            >
              <option value="">Seleccionar variedad</option>
              {variedadOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </AppSelect>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <AppInput
              label="Cantidad de hileras"
              type="number"
              step="1"
              uiSize="lg"
              placeholder="Ej. 42"
              value={form.cantidad_hileras}
              onChange={(e) => onChange("cantidad_hileras", e.target.value)}
            />
            <AppInput
              label="Largo de hileras (m)"
              type="number"
              step="0.01"
              uiSize="lg"
              placeholder="Ej. 120"
              value={form.largo_hileras_m}
              onChange={(e) => onChange("largo_hileras_m", e.target.value)}
            />
            <AppInput
              label="Densidad de hileras"
              type="number"
              step="0.01"
              uiSize="lg"
              placeholder="Ej. 2.5"
              value={form.densidad_hileras}
              onChange={(e) => onChange("densidad_hileras", e.target.value)}
            />
            <AppInput
              label="Distancia de plantación"
              type="text"
              uiSize="lg"
              placeholder="Ej. 2.5 x 1.2 m"
              value={form.distancia_plantacion}
              onChange={(e) => onChange("distancia_plantacion", e.target.value)}
            />
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <AppSelect
              label="Sistema de riego"
              uiSize="lg"
              value={form.sistema_riego}
              onChange={(e) => onChange("sistema_riego", e.target.value)}
            >
              <option value="">Seleccionar sistema</option>
              {SISTEMA_RIEGO_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </AppSelect>
            <AppSelect
              label="Manejo de cultivo"
              uiSize="lg"
              value={form.sistema_productivo}
              onChange={(e) => onChange("sistema_productivo", e.target.value)}
            >
              <option value="">Seleccionar manejo</option>
              {MANEJO_CULTIVO_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </AppSelect>
            <AppSelect
              label="Sistema de conducción"
              uiSize="lg"
              value={form.sistema_conduccion}
              onChange={(e) => onChange("sistema_conduccion", e.target.value)}
            >
              <option value="">Seleccionar sistema</option>
              {SISTEMA_CONDUCCION_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </AppSelect>
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
