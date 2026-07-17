import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { createCuartel, type GeoJSONPolygon, type Centroide } from "../../features/cuarteles/api";
import CuartelMapEditor from "../../components/CuartelMapEditor";
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
  useAppNotifications,
} from "../../components/ui";
import {
  getTipoVariedadForVariedad,
  getVariedadesByTipo,
  MANEJO_CULTIVO_OPTIONS,
  OTRA_VARIEDAD_VALUE,
  OTRO_RIEGO_VALUE,
  SISTEMA_CONDUCCION_OPTIONS,
  SISTEMA_RIEGO_OPTIONS,
  TIPO_VARIEDAD_OPTIONS,
  type TipoVariedadVid,
} from "../../domain/viticultura/catalogos";

function optionalNumber(value: string) {
  return value.trim() ? Number(value) : null;
}

function OptLabel({ children }: { children: React.ReactNode }) {
  return (
    <span className="flex items-center gap-1.5">
      {children}
      <span className="rounded-full bg-[color:var(--surface-soft)] px-1.5 py-0.5 text-[11px] font-normal text-[color:var(--text-ink-muted)]">
        Opcional
      </span>
    </span>
  );
}

type CuartelForm = {
  fincaId: string;
  codigo_cuartel: string;
  superficie_ha: string;
  cultivo: string;
  tipo_variedad: TipoVariedadVid;
  variedad: string;
  variedad_otra: string;
  sistema_riego: string;
  sistema_riego_otro: string;
  sistema_productivo: string;
  sistema_conduccion: string;
  cantidad_hileras: string;
  largo_hileras_m: string;
  densidad_hileras: string;
  distancia_plantacion: string;
};

type CuartelFieldErrors = Partial<Record<keyof CuartelForm, string>>;

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
  const [showForm, setShowForm] = useState(true);
  const [mapPolygon, setMapPolygon] = useState<GeoJSONPolygon | null>(null);
  const [mapCentroid, setMapCentroid] = useState<Centroide | null>(null);
  const notifications = useAppNotifications();

  const [form, setForm] = useState<CuartelForm>({
    fincaId: urlFincaId,
    codigo_cuartel: "",
    superficie_ha: "",
    cultivo: "Vid",
    tipo_variedad: "tinta" as TipoVariedadVid,
    variedad: "",
    variedad_otra: "",
    sistema_riego: "",
    sistema_riego_otro: "",
    sistema_productivo: "",
    sistema_conduccion: "",
    cantidad_hileras: "",
    largo_hileras_m: "",
    densidad_hileras: "",
    distancia_plantacion: "",
  });
  const [fieldErrors, setFieldErrors] = useState<CuartelFieldErrors>({});
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
        label: finca.nombre_finca ?? "(Sin nombre)",
      })),
    [fincas]
  );
  const variedadOptions = useMemo(
    () => getVariedadesByTipo(form.tipo_variedad),
    [form.tipo_variedad],
  );

  const onChange = (key: keyof CuartelForm, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    setFieldErrors((prev) => ({ ...prev, [key]: undefined }));
    setError(null);
  };

  const onChangeTipoVariedad = (value: TipoVariedadVid) => {
    setForm((prev) => ({ ...prev, tipo_variedad: value, variedad: "", variedad_otra: "" }));
    setFieldErrors((prev) => ({ ...prev, tipo_variedad: undefined, variedad: undefined }));
    setError(null);
  };

  const onChangeVariedad = (value: string) => {
    const isOtra = value === OTRA_VARIEDAD_VALUE;
    setForm((prev) => ({
      ...prev,
      variedad: value,
      // "Otra" no permite inferir el tipo: se conserva el elegido por el usuario.
      tipo_variedad: value && !isOtra ? getTipoVariedadForVariedad(value) : prev.tipo_variedad,
      variedad_otra: isOtra ? prev.variedad_otra : "",
    }));
    setFieldErrors((prev) => ({ ...prev, variedad: undefined, tipo_variedad: undefined }));
    setError(null);
  };

  const onChangeSistemaRiego = (value: string) => {
    setForm((prev) => ({
      ...prev,
      sistema_riego: value,
      sistema_riego_otro: value === OTRO_RIEGO_VALUE ? prev.sistema_riego_otro : "",
    }));
    setFieldErrors((prev) => ({ ...prev, sistema_riego: undefined }));
    setError(null);
  };

  const validateForm = () => {
    const nextErrors: CuartelFieldErrors = {};

    if (!form.fincaId) {
      nextErrors.fincaId = "Seleccioná una finca.";
    }
    if (!form.codigo_cuartel.trim()) {
      nextErrors.codigo_cuartel = "El código de cuartel es obligatorio.";
    }
    if (!form.superficie_ha.trim()) {
      nextErrors.superficie_ha = "La superficie es obligatoria.";
    } else if (Number.isNaN(Number(form.superficie_ha)) || Number(form.superficie_ha) <= 0) {
      nextErrors.superficie_ha = "Ingresá una superficie válida mayor a cero.";
    }
    if (!form.variedad.trim()) {
      nextErrors.variedad = "Seleccioná una variedad.";
    } else if (form.variedad === OTRA_VARIEDAD_VALUE && !form.variedad_otra.trim()) {
      nextErrors.variedad_otra = "Especificá la variedad.";
    }
    if (form.sistema_riego === OTRO_RIEGO_VALUE && !form.sistema_riego_otro.trim()) {
      nextErrors.sistema_riego_otro = "Especificá el sistema de riego.";
    }

    const numericFields: Array<{ key: keyof CuartelForm; label: string; value: string }> = [
      { key: "cantidad_hileras", label: "Cantidad de hileras", value: form.cantidad_hileras },
      { key: "largo_hileras_m", label: "Largo de hileras", value: form.largo_hileras_m },
      { key: "densidad_hileras", label: "Densidad de plantación", value: form.densidad_hileras },
    ];
    numericFields.forEach((field) => {
      if (!field.value.trim()) return;
      if (Number.isNaN(Number(field.value)) || Number(field.value) < 0) {
        nextErrors[field.key] = `${field.label} debe ser un número válido.`;
      }
    });

    return nextErrors;
  };

  const handleSubmit = async () => {
    if (saving) return;
    const validationErrors = validateForm();
    if (Object.keys(validationErrors).length > 0) {
      setFieldErrors(validationErrors);
      setError(null);
      notifications.notifyError({
        title: "Faltan datos para crear el cuartel",
        message: "Revisá los campos marcados en el formulario.",
      });
      return;
    }

    // "Otra/Otro" guardan el texto libre como valor real (el schema acepta string).
    const variedadFinal =
      form.variedad === OTRA_VARIEDAD_VALUE ? form.variedad_otra.trim() : form.variedad;
    const sistemaRiegoFinal =
      form.sistema_riego === OTRO_RIEGO_VALUE
        ? form.sistema_riego_otro.trim()
        : form.sistema_riego.trim();

    setSaving(true);
    setError(null);
    setFieldErrors({});
    try {
      await createCuartel({
        fincaId: form.fincaId,
        codigo_cuartel: form.codigo_cuartel.trim(),
        superficie_ha: Number(form.superficie_ha),
        cultivo: "Vid",
        tipo_variedad: form.tipo_variedad,
        variedad: variedadFinal,
        sistema_riego: sistemaRiegoFinal || null,
        sistema_productivo: form.sistema_productivo.trim() || null,
        sistema_conduccion: form.sistema_conduccion.trim() || null,
        cantidad_hileras: optionalNumber(form.cantidad_hileras),
        largo_hileras_m: optionalNumber(form.largo_hileras_m),
        densidad_hileras: optionalNumber(form.densidad_hileras),
        distancia_plantacion: form.distancia_plantacion.trim() || null,
        poligono: mapPolygon,
        centroide: mapCentroid,
      });
      sessionStorage.setItem("setupFincaId", form.fincaId);
      setCreatedCodigo(form.codigo_cuartel.trim());
      setMapPolygon(null);
      setMapCentroid(null);
      setShowForm(false);
      notifications.notifySuccess({
        title: "Cuartel creado",
        message: `El cuartel ${form.codigo_cuartel.trim()} quedó registrado correctamente.`,
      });
      setForm((prev) => ({
        ...prev,
        codigo_cuartel: "",
        superficie_ha: "",
        tipo_variedad: "tinta",
        variedad: "",
        variedad_otra: "",
        sistema_riego: "",
        sistema_riego_otro: "",
        sistema_productivo: "",
        sistema_conduccion: "",
        cantidad_hileras: "",
        largo_hileras_m: "",
        densidad_hileras: "",
        distancia_plantacion: "",
      }));
    } catch (e) {
      const message = getApiErrorMessage(e);
      setError(message);
      notifications.notifyError({
        title: "No se pudo crear el cuartel",
        message,
      });
    } finally {
      setSaving(false);
    }
  };

  const handleCreateAnother = () => {
    setCreatedCodigo(null);
    setError(null);
    setFieldErrors({});
    setMapPolygon(null);
    setMapCentroid(null);
    setShowForm(true);
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

        {createdCodigo && !showForm ? (
          <AppCard
            as="section"
            tone="default"
            padding="lg"
            header={(
              <SectionIntro
                title="Cuartel creado"
                description={
                  <>
                    El cuartel <strong>{createdCodigo}</strong> quedó registrado. Podés cargar otro
                    cuartel para la misma finca o finalizar este paso del setup.
                  </>
                }
              />
            )}
          >
            <div className="flex flex-wrap gap-3">
              <AppButton
                type="button"
                variant="primary"
                onClick={handleCreateAnother}
              >
                Crear otro cuartel
              </AppButton>
              <AppButton
                type="button"
                variant="secondary"
                onClick={() => navigate("/fincas")}
              >
                Ir a fincas
              </AppButton>
            </div>
          </AppCard>
        ) : null}

        {showForm ? (
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
                error={fieldErrors.fincaId}
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
                error={fieldErrors.codigo_cuartel}
            />
            <AppInput
              label="Superficie (ha)"
                type="number"
                min="0"
                step="0.01"
                uiSize="lg"
                placeholder="12.5"
                value={form.superficie_ha}
                onChange={(e) => onChange("superficie_ha", e.target.value)}
                error={fieldErrors.superficie_ha}
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
              error={fieldErrors.tipo_variedad}
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
              error={fieldErrors.variedad}
            >
              <option value="">Seleccionar variedad</option>
              {variedadOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
              <option value={OTRA_VARIEDAD_VALUE}>Otra (especificar)…</option>
            </AppSelect>
            {form.variedad === OTRA_VARIEDAD_VALUE && (
              <AppInput
                label="Especificá la variedad"
                type="text"
                uiSize="lg"
                placeholder="Ej. Petit Verdot"
                value={form.variedad_otra}
                onChange={(e) => onChange("variedad_otra", e.target.value)}
                error={fieldErrors.variedad_otra}
              />
            )}
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <AppInput
              label={<OptLabel>Cantidad de hileras</OptLabel>}
              type="number"
              min="0"
              step="1"
              uiSize="lg"
              placeholder="Ej. 42"
              value={form.cantidad_hileras}
              onChange={(e) => onChange("cantidad_hileras", e.target.value)}
              error={fieldErrors.cantidad_hileras}
            />
            <AppInput
              label={<OptLabel>Largo de hileras (m)</OptLabel>}
              type="number"
              min="0"
              step="0.01"
              uiSize="lg"
              placeholder="Ej. 120"
              value={form.largo_hileras_m}
              onChange={(e) => onChange("largo_hileras_m", e.target.value)}
              error={fieldErrors.largo_hileras_m}
            />
            <AppInput
              label={<OptLabel>Densidad de plantación (plantas/ha)</OptLabel>}
              type="number"
              min="0"
              step="0.01"
              uiSize="lg"
              placeholder="Ej. 2.5"
              value={form.densidad_hileras}
              onChange={(e) => onChange("densidad_hileras", e.target.value)}
              error={fieldErrors.densidad_hileras}
            />
            <AppInput
              label={<OptLabel>Distancia de plantación</OptLabel>}
              type="text"
              uiSize="lg"
              placeholder="Ej. 2.5 x 1.2 m"
              value={form.distancia_plantacion}
              onChange={(e) => onChange("distancia_plantacion", e.target.value)}
            />
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-3">
              <AppSelect
                label={<OptLabel>Sistema de riego</OptLabel>}
                uiSize="lg"
                value={form.sistema_riego}
                onChange={(e) => onChangeSistemaRiego(e.target.value)}
              >
                <option value="">Seleccionar sistema</option>
                {SISTEMA_RIEGO_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
                <option value={OTRO_RIEGO_VALUE}>Otro (especificar)…</option>
              </AppSelect>
              {form.sistema_riego === OTRO_RIEGO_VALUE && (
                <AppInput
                  label="Especificá el sistema de riego"
                  type="text"
                  uiSize="lg"
                  placeholder="Ej. Riego por mangas"
                  value={form.sistema_riego_otro}
                  onChange={(e) => onChange("sistema_riego_otro", e.target.value)}
                  error={fieldErrors.sistema_riego_otro}
                />
              )}
            </div>
            <AppSelect
              label={<OptLabel>Manejo de cultivo</OptLabel>}
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
              label={<OptLabel>Sistema de conducción</OptLabel>}
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

          {/* ── Editor de límites en mapa ───────────────────────── */}
          <AppCard as="div" tone="soft" padding="md">
            <div className="mb-3">
              <div className="text-sm font-semibold text-[color:var(--text-ink)]">
                Límites del cuartel en mapa
                <span className="ml-2 rounded-full bg-[color:var(--surface-muted)] px-2 py-0.5 text-[11px] font-normal text-[color:var(--text-ink-muted)]">
                  Opcional
                </span>
              </div>
              <p className="mt-0.5 text-xs text-[color:var(--text-ink-muted)]">
                Hacé click en el mapa satelital para trazar el polígono del cuartel.
              </p>
            </div>
            <CuartelMapEditor
              onChange={(poly, centroid) => {
                setMapPolygon(poly);
                setMapCentroid(centroid);
              }}
            />
          </AppCard>

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
          </div>
        </form>
        </AppCard>
        ) : null}
      </div>
    </div>
  );
};

export default SetupCuarteles;
