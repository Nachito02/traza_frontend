import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import {
  createCuartel,
  deleteCuartel,
  fetchCuartelById,
  fetchCuartelesByFinca,
  patchCuartel,
  type Cuartel,
  type GeoJSONPolygon,
  type Centroide,
} from "../../features/cuarteles/api";
import CuartelMapEditor from "../../components/CuartelMapEditor";
import { getApiErrorMessage } from "../../lib/api";
import { useAuthStore } from "../../store/authStore";
import { useFincasStore } from "../../features/fincas/store";
import {
  AppButton,
  AppCard,
  AppInput,
  AppSelect,
  NoticeBanner,
  SectionIntro,
  useAppNotifications,
  useConfirmDialog,
} from "../../components/ui";
import {
  getTipoVariedadForVariedad,
  getManejoCultivoLabel,
  getSistemaRiegoLabel,
  getSistemaConduccionLabel,
  getVariedadLabel,
  getVariedadesByTipo,
  isKnownSistemaRiego,
  isKnownVariedad,
  MANEJO_CULTIVO_OPTIONS,
  OTRA_VARIEDAD_VALUE,
  OTRO_RIEGO_VALUE,
  SISTEMA_CONDUCCION_OPTIONS,
  SISTEMA_RIEGO_OPTIONS,
  TIPO_VARIEDAD_OPTIONS,
  type TipoVariedadVid,
} from "../../domain/viticultura/catalogos";

type FormState = {
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

const emptyForm: FormState = {
  fincaId: "",
  codigo_cuartel: "",
  superficie_ha: "",
  cultivo: "Vid",
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
};

type CuartelRow = Cuartel & { fincaId: string };
type FormFieldErrors = Partial<Record<keyof FormState, string>>;

function optionalNumber(value: string) {
  return value.trim() ? Number(value) : null;
}

export default function CuartelesAdmin() {
  const { confirm, ConfirmDialog } = useConfirmDialog();
  const [searchParams, setSearchParams] = useSearchParams();
  const activeBodegaId = useAuthStore((state) => state.activeBodegaId);
  const fincas = useFincasStore((state) => state.fincas);
  const loadFincas = useFincasStore((state) => state.loadFincas);
  const editParam = searchParams.get("edit") ?? "";
  const fincaIdParam = searchParams.get("fincaId") ?? "";
  const createParam = searchParams.get("create");

  const [items, setItems] = useState<CuartelRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loadingEdit, setLoadingEdit] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formMode, setFormMode] = useState<"none" | "create" | "edit">("none");
  const [form, setForm] = useState<FormState>(emptyForm);
  const [fieldErrors, setFieldErrors] = useState<FormFieldErrors>({});
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [detailById, setDetailById] = useState<Record<string, Cuartel>>({});
  const [loadingDetailId, setLoadingDetailId] = useState<string | null>(null);
  const [detailErrorById, setDetailErrorById] = useState<
    Record<string, string>
  >({});
  const [error, setError] = useState<string | null>(null);
  const notifications = useAppNotifications();
  // Estado del polígono (separado del FormState porque es JSON, no string)
  const [mapPolygon, setMapPolygon] = useState<GeoJSONPolygon | null>(null);
  const [mapCentroid, setMapCentroid] = useState<Centroide | null>(null);

  useEffect(() => {
    if (!activeBodegaId) return;
    void loadFincas(activeBodegaId);
  }, [activeBodegaId, loadFincas]);

  useEffect(() => {
    if (!form.fincaId && fincas.length > 0) {
      setForm((prev) => ({
        ...prev,
        fincaId: fincaIdParam || String(fincas[0].finca_id ?? fincas[0].id ?? ""),
      }));
    }
  }, [fincaIdParam, fincas, form.fincaId]);

  const fincaById = useMemo(
    () =>
      Object.fromEntries(
        fincas.map((finca) => [
          String(finca.finca_id ?? finca.id ?? ""),
          finca.nombre_finca ?? "Finca",
        ]),
      ),
    [fincas],
  );

  const selectedFincaLabel = fincaIdParam
    ? fincaById[fincaIdParam] ?? "Finca seleccionada"
    : "Todas las fincas";
  const variedadOptions = useMemo(
    () => getVariedadesByTipo(form.tipo_variedad),
    [form.tipo_variedad],
  );

  const setFieldValue = (key: keyof FormState, value: string) => {
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
    const nextErrors: FormFieldErrors = {};

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

    const numericFields: Array<{ key: keyof FormState; label: string; value: string }> = [
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

  const load = async () => {
    if (!activeBodegaId) {
      setItems([]);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const rows = await Promise.all(
        fincas
          .map((finca) => String(finca.finca_id ?? finca.id ?? ""))
          .filter(Boolean)
          .map(async (fincaId) => {
            const list = await fetchCuartelesByFinca(fincaId);
            return (list ?? []).map((item) => ({ ...item, fincaId }));
          }),
      );
      setItems(rows.flat());
    } catch (requestError) {
      setError(getApiErrorMessage(requestError));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeBodegaId, fincas.length]);

  useEffect(() => {
    if (!editParam && createParam !== "1") return;
    if (editParam) {
      const fallbackFincaId =
        fincaIdParam || items.find((item) => String(item.cuartel_id ?? item.id ?? "") === editParam)?.fincaId || "";
      void onEditById(editParam, fallbackFincaId);
      return;
    }

    setEditingId(null);
    setFormMode("create");
    setError(null);
    setFieldErrors({});
    setForm({
      ...emptyForm,
      fincaId: fincaIdParam || form.fincaId || "",
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [createParam, editParam, fincaIdParam, items]);

  const clearFormQueryState = () => {
    setSearchParams({}, { replace: true });
  };

  const onSubmit = async () => {
    if (saving) return;

    const validationErrors = validateForm();
    if (Object.keys(validationErrors).length > 0) {
      setFieldErrors(validationErrors);
      setError(null);
      notifications.notifyError({
        title: editingId ? "Faltan datos para guardar" : "Faltan datos para crear el cuartel",
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
      if (editingId) {
        await patchCuartel(editingId, {
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
        notifications.notifySuccess({
          title: "Cuartel actualizado",
          message: `El cuartel ${form.codigo_cuartel.trim()} quedó actualizado correctamente.`,
        });
      } else {
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
        notifications.notifySuccess({
          title: "Cuartel creado",
          message: `El cuartel ${form.codigo_cuartel.trim()} quedó registrado correctamente.`,
        });
      }

      setForm(emptyForm);
      setMapPolygon(null);
      setMapCentroid(null);
      setEditingId(null);
      setFormMode("none");
      clearFormQueryState();
      await load();
    } catch (requestError) {
      const message = getApiErrorMessage(requestError);
      setError(message);
      notifications.notifyError({
        title: editingId ? "No se pudo actualizar el cuartel" : "No se pudo crear el cuartel",
        message,
      });
    } finally {
      setSaving(false);
    }
  };

  const onEditById = async (id: string, fallbackFincaId: string) => {
    if (!id) return;
    setLoadingEdit(true);
    setError(null);
    try {
      const detail = await fetchCuartelById(id);
      setEditingId(id);
      setFormMode("edit");
      setFieldErrors({});
      setMapPolygon(detail.poligono ?? null);
      setMapCentroid(detail.centroide ?? null);
      // Si el valor guardado no está en el catálogo, se muestra como "Otra/Otro"
      // con el texto libre precargado.
      const rawVariedad = detail.variedad ?? "";
      const variedadConocida = isKnownVariedad(rawVariedad);
      const rawRiego = detail.sistema_riego ?? "";
      const riegoConocido = isKnownSistemaRiego(rawRiego);
      setForm({
        fincaId: String(detail.finca_id ?? fallbackFincaId ?? ""),
        codigo_cuartel: detail.codigo_cuartel ?? "",
        superficie_ha:
          detail.superficie_ha === undefined || detail.superficie_ha === null
            ? ""
            : String(detail.superficie_ha),
        cultivo: "Vid",
        tipo_variedad: (detail.tipo_variedad as TipoVariedadVid | null) ?? getTipoVariedadForVariedad(detail.variedad),
        variedad: variedadConocida ? rawVariedad : rawVariedad ? OTRA_VARIEDAD_VALUE : "",
        variedad_otra: variedadConocida ? "" : rawVariedad,
        sistema_riego: riegoConocido ? rawRiego : rawRiego ? OTRO_RIEGO_VALUE : "",
        sistema_riego_otro: riegoConocido ? "" : rawRiego,
        sistema_productivo: detail.sistema_productivo ?? "",
        sistema_conduccion: detail.sistema_conduccion ?? "",
        cantidad_hileras:
          detail.cantidad_hileras === undefined || detail.cantidad_hileras === null
            ? ""
            : String(detail.cantidad_hileras),
        largo_hileras_m:
          detail.largo_hileras_m === undefined || detail.largo_hileras_m === null
            ? ""
            : String(detail.largo_hileras_m),
        densidad_hileras:
          detail.densidad_hileras === undefined || detail.densidad_hileras === null
            ? ""
            : String(detail.densidad_hileras),
        distancia_plantacion: detail.distancia_plantacion ?? "",
      });
    } catch (requestError) {
      setError(getApiErrorMessage(requestError));
    } finally {
      setLoadingEdit(false);
    }
  };

  const onDelete = async (item: CuartelRow) => {
    const id = String(item.cuartel_id ?? item.id ?? "");
    if (!id) return;
    if (!(await confirm(`¿Eliminar cuartel ${id}?`))) return;
    try {
      await deleteCuartel(id);
      await load();
    } catch (requestError) {
      setError(getApiErrorMessage(requestError));
    }
  };

  const onToggleDetail = async (id: string) => {
    if (!id) return;
    if (expandedId === id) {
      setExpandedId(null);
      return;
    }

    setExpandedId(id);
    if (detailById[id]) return;

    setLoadingDetailId(id);
    setDetailErrorById((prev) => ({ ...prev, [id]: "" }));
    try {
      const detail = await fetchCuartelById(id);
      setDetailById((prev) => ({ ...prev, [id]: detail }));
    } catch (requestError) {
      setDetailErrorById((prev) => ({
        ...prev,
        [id]: getApiErrorMessage(requestError),
      }));
    } finally {
      setLoadingDetailId(null);
    }
  };

  return (
    <div className="min-h-screen bg-secondary px-6 py-10">
      <div className="mx-auto w-full max-w-6xl space-y-6">
        <AppCard
          as="section"
          tone="default"
          padding="lg"
          header={(
            <SectionIntro
              title="Cuarteles"
              description="Revisá el listado por finca y seguí con altas o ediciones desde un flujo separado."
              actions={
                formMode === "none" ? (
                  <>
                    <AppButton
                      type="button"
                      variant="primary"
                      size="sm"
                      onClick={() => {
                        setEditingId(null);
                        setForm({ ...emptyForm, fincaId: fincaIdParam || "" });
                        setFormMode("create");
                        setError(null);
                        setFieldErrors({});
                        setSearchParams((prev) => {
                          const next = new URLSearchParams(prev);
                          next.set("create", "1");
                          if (fincaIdParam) next.set("fincaId", fincaIdParam);
                          return next;
                        });
                      }}
                    >
                      Nuevo cuartel
                    </AppButton>
                    <AppButton
                      type="button"
                      variant="secondary"
                      size="sm"
                      onClick={() => void load()}
                    >
                      Actualizar listado
                    </AppButton>
                  </>
                ) : undefined
              }
            />
          )}
        >
          <div className="flex flex-wrap gap-2">
            <AppCard as="div" tone="soft" padding="sm">
              <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[color:var(--accent-secondary)]">
                Contexto
              </div>
              <div className="mt-1 text-sm font-semibold text-[color:var(--text-ink)]">{selectedFincaLabel}</div>
            </AppCard>
            <AppCard as="div" tone="soft" padding="sm">
              <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[color:var(--accent-secondary)]">
                Cuarteles
              </div>
              <div className="mt-1 text-sm font-semibold text-[color:var(--text-ink)]">
                {loading ? "Cargando..." : `${items.length} registrados`}
              </div>
            </AppCard>
          </div>

        </AppCard>

        {formMode === "none" ? (
          <AppCard
            as="section"
            tone="default"
            padding="lg"
            header={(
              <SectionIntro
                title="Listado de cuarteles"
                description="Entrá al detalle o editá cada cuartel sin mezclar el formulario con el listado."
              />
            )}
          >

            <div className="mt-4 space-y-3">
              {loading ? (
                <NoticeBanner>Cargando...</NoticeBanner>
              ) : items.length === 0 ? (
                <NoticeBanner>
                  Sin cuarteles para este contexto.
                </NoticeBanner>
              ) : (
                items.map((item, index) => {
                  const id = String(item.cuartel_id ?? item.id ?? `i-${index}`);
                  const isExpanded = expandedId === id;
                  const detail = detailById[id];
                  const detailError = detailErrorById[id];
                  const isLoadingDetail = loadingDetailId === id;
                  return (
                    <AppCard
                      key={id}
                      as="article"
                      tone="soft"
                      padding="md"
                    >
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <div className="text-sm font-semibold text-[color:var(--text-ink)]">
                            {item.codigo_cuartel}
                          </div>
                          <div className="mt-1 text-xs text-[color:var(--text-ink-muted)]">
                            {fincaById[item.fincaId] ?? item.fincaId}
                          </div>
                        </div>
                        <div className="rounded-full border border-[color:var(--border-default)] px-2.5 py-1 text-[11px] font-semibold text-[color:var(--accent-primary)]">
                          {item.cultivo ?? "vid"}
                        </div>
                      </div>

                      <div className="mt-3 grid gap-2 text-xs text-[color:var(--text-ink-muted)] md:grid-cols-2">
                        <div className="rounded-[var(--radius-md)] border border-[color:var(--border-shell)] bg-[color:var(--surface-muted)] px-3 py-2">
                          <span className="font-semibold text-[color:var(--text-on-dark)]">Variedad:</span>{" "}
                          {getVariedadLabel(item.variedad)}
                        </div>
                        <div className="rounded-[var(--radius-md)] border border-[color:var(--border-shell)] bg-[color:var(--surface-muted)] px-3 py-2">
                          <span className="font-semibold text-[color:var(--text-on-dark)]">Superficie:</span>{" "}
                          {item.superficie_ha ?? "-"} ha
                        </div>
                      </div>

                      <div className="mt-3 flex flex-wrap gap-2">
                        <AppButton
                          type="button"
                          variant="secondary"
                          size="sm"
                          onClick={() => void onEditById(id, item.fincaId)}
                        >
                          Editar
                        </AppButton>
                        <AppButton
                          type="button"
                          variant="secondary"
                          size="sm"
                          onClick={() => void onToggleDetail(id)}
                        >
                          {isExpanded ? "Ocultar detalle" : "Ver detalle"}
                        </AppButton>
                        <AppButton
                          type="button"
                          variant="danger"
                          size="sm"
                          onClick={() => void onDelete(item)}
                        >
                          Eliminar
                        </AppButton>
                      </div>

                      {isExpanded ? (
                        <div className="mt-3 rounded-[var(--radius-lg)] border border-[color:var(--border-shell)] bg-[color:var(--surface-muted)] px-3 py-3 text-xs text-[color:var(--text-on-dark-muted)]">
                          {isLoadingDetail ? (
                            <div>Cargando detalle...</div>
                          ) : detailError ? (
                            <div className="text-[color:var(--feedback-danger-text)]">{detailError}</div>
                          ) : (
                            <div className="grid gap-2 md:grid-cols-2">
                              <div>
                                <span className="font-semibold text-[color:var(--text-ink)]">
                                  Código:
                                </span>{" "}
                                {detail?.codigo_cuartel ?? "-"}
                              </div>
                              <div>
                                <span className="font-semibold text-[color:var(--text-ink)]">
                                  Cultivo:
                                </span>{" "}
                                {detail?.cultivo ?? "-"}
                              </div>
                              <div>
                                <span className="font-semibold text-[color:var(--text-ink)]">
                                  Variedad:
                                </span>{" "}
                                {getVariedadLabel(detail?.variedad)}
                              </div>
                              <div>
                                <span className="font-semibold text-[color:var(--text-ink)]">
                                  Sistema de riego:
                                </span>{" "}
                                {getSistemaRiegoLabel(detail?.sistema_riego)}
                              </div>
                              <div>
                                <span className="font-semibold text-[color:var(--text-ink)]">
                                  Superficie:
                                </span>{" "}
                                {detail?.superficie_ha ?? "-"} ha
                              </div>
                              <div>
                                <span className="font-semibold text-[color:var(--text-ink)]">
                                  Manejo de cultivo:
                                </span>{" "}
                                {getManejoCultivoLabel(detail?.sistema_productivo)}
                              </div>
                              <div>
                                <span className="font-semibold text-[color:var(--text-ink)]">
                                  Sistema de conducción:
                                </span>{" "}
                                {getSistemaConduccionLabel(detail?.sistema_conduccion)}
                              </div>
                              <div>
                                <span className="font-semibold text-[color:var(--text-ink)]">
                                  Hileras:
                                </span>{" "}
                                {detail?.cantidad_hileras ?? "-"}
                              </div>
                              <div>
                                <span className="font-semibold text-[color:var(--text-ink)]">
                                  Largo de hileras:
                                </span>{" "}
                                {detail?.largo_hileras_m ?? "-"} m
                              </div>
                              <div>
                                <span className="font-semibold text-[color:var(--text-ink)]">
                                  Densidad de plantación:
                                </span>{" "}
                                {detail?.densidad_hileras ?? "-"}
                              </div>
                              <div>
                                <span className="font-semibold text-[color:var(--text-ink)]">
                                  Distancia de plantación:
                                </span>{" "}
                                {detail?.distancia_plantacion ?? "-"}
                              </div>
                            </div>
                          )}
                        </div>
                      ) : null}
                    </AppCard>
                  );
                })
              )}
            </div>

            {error ? <NoticeBanner tone="danger" className="mt-4">{error}</NoticeBanner> : null}
          </AppCard>
        ) : null}

        {formMode !== "none" ? (
          <AppCard
            as="section"
            tone="default"
            padding="lg"
            header={(
              <SectionIntro
                title={formMode === "edit" ? "Editar cuartel" : "Nuevo cuartel"}
                description="Completá los datos base del cuartel para dejarlo listo dentro de la finca seleccionada."
                actions={(
                  <AppButton
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={() => {
                      setEditingId(null);
                      setForm(emptyForm);
                      setMapPolygon(null);
                      setMapCentroid(null);
                      setFieldErrors({});
                      setFormMode("none");
                      clearFormQueryState();
                    }}
                  >
                    Volver al listado
                  </AppButton>
                )}
              />
            )}
          >
            {loadingEdit ? (
              <NoticeBanner className="mt-4">
                Cargando datos completos del cuartel...
              </NoticeBanner>
            ) : null}
            <AppCard as="div" tone="soft" padding="md" className="mt-4">
              <div className="grid gap-4 md:grid-cols-2">
                <AppSelect
                  label="Finca"
                    value={form.fincaId}
                    onChange={(event) => setFieldValue("fincaId", event.target.value)}
                    disabled={formMode === "edit"}
                    error={fieldErrors.fincaId}
                  >
                    <option value="">Seleccionar finca</option>
                    {fincas.map((finca) => {
                      const id = String(finca.finca_id ?? finca.id ?? "");
                      return (
                        <option key={id} value={id}>
                          {finca.nombre_finca ?? id}
                        </option>
                      );
                    })}
                </AppSelect>
                <AppInput
                  label="Código de cuartel"
                    value={form.codigo_cuartel}
                    onChange={(e) => setFieldValue("codigo_cuartel", e.target.value)}
                    placeholder="Ej. C-01"
                    uiSize="lg"
                    error={fieldErrors.codigo_cuartel}
                  />
                <AppInput
                  label="Superficie (ha)"
                    type="number"
                    min="0"
                    step="0.01"
                    value={form.superficie_ha}
                    onChange={(e) => setFieldValue("superficie_ha", e.target.value)}
                    placeholder="0.00"
                    uiSize="lg"
                    error={fieldErrors.superficie_ha}
                  />
                <AppInput
                  label="Cultivo"
                  value="Vid"
                 
                  uiSize="lg"
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
                <div className="space-y-3">
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
                      value={form.variedad_otra}
                      onChange={(e) => setFieldValue("variedad_otra", e.target.value)}
                      placeholder="Ej. Petit Verdot"
                      uiSize="lg"
                      error={fieldErrors.variedad_otra}
                    />
                  )}
                </div>
                <AppInput
                  label="Cantidad de hileras"
                  type="number"
                  min="0"
                  step="1"
                  value={form.cantidad_hileras}
                  onChange={(e) => setFieldValue("cantidad_hileras", e.target.value)}
                  placeholder="Ej. 42"
                  uiSize="lg"
                  error={fieldErrors.cantidad_hileras}
                />
                <AppInput
                  label="Largo de hileras (m)"
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.largo_hileras_m}
                  onChange={(e) => setFieldValue("largo_hileras_m", e.target.value)}
                  placeholder="Ej. 120"
                  uiSize="lg"
                  error={fieldErrors.largo_hileras_m}
                />
                <AppInput
                  label="Densidad de plantación (plantas/ha)"
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.densidad_hileras}
                  onChange={(e) => setFieldValue("densidad_hileras", e.target.value)}
                  placeholder="Ej. 2.5"
                  uiSize="lg"
                  error={fieldErrors.densidad_hileras}
                />
                <AppInput
                  label="Distancia de plantación"
                  value={form.distancia_plantacion}
                  onChange={(e) => setFieldValue("distancia_plantacion", e.target.value)}
                  placeholder="Ej. 2.5 x 1.2 m"
                  uiSize="lg"
                />
                <div className="space-y-3">
                  <AppSelect
                    label="Sistema de riego"
                    value={form.sistema_riego}
                    onChange={(e) => onChangeSistemaRiego(e.target.value)}
                    uiSize="lg"
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
                      value={form.sistema_riego_otro}
                      onChange={(e) => setFieldValue("sistema_riego_otro", e.target.value)}
                      placeholder="Ej. Riego por mangas"
                      uiSize="lg"
                      error={fieldErrors.sistema_riego_otro}
                    />
                  )}
                </div>
                <AppSelect
                  label="Manejo de cultivo"
                  value={form.sistema_productivo}
                  onChange={(e) => setFieldValue("sistema_productivo", e.target.value)}
                  uiSize="lg"
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
                  className="md:col-span-2"
                  value={form.sistema_conduccion}
                  onChange={(e) => setFieldValue("sistema_conduccion", e.target.value)}
                  uiSize="lg"
                >
                  <option value="">Seleccionar sistema</option>
                  {SISTEMA_CONDUCCION_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </AppSelect>
              </div>
            </AppCard>

            {/* ── Editor de límites en mapa ─────────────────────────── */}
            <AppCard as="div" tone="soft" padding="md" className="mt-4">
              <div className="mb-3">
                <div className="text-sm font-semibold text-[color:var(--text-ink)]">
                  Límites del cuartel en mapa
                  <span className="ml-2 rounded-full bg-[color:var(--surface-muted)] px-2 py-0.5 text-[11px] font-normal text-[color:var(--text-ink-muted)]">
                    Opcional
                  </span>
                </div>
                <p className="mt-0.5 text-xs text-[color:var(--text-ink-muted)]">
                  Hacé click en el mapa satelital para trazar el polígono del cuartel. Los límites se guardan junto al resto de los datos.
                </p>
              </div>
              <CuartelMapEditor
                key={editingId ?? "new"}
                initialPolygon={mapPolygon}
                initialCentroid={mapCentroid}
                onChange={(poly, centroid) => {
                  setMapPolygon(poly);
                  setMapCentroid(centroid);
                }}
              />
            </AppCard>

            <div className="mt-4 flex flex-wrap gap-2">
              <AppButton
                type="button"
                variant="primary"
                loading={saving}
                onClick={() => void onSubmit()}
                disabled={saving || !activeBodegaId}
              >
                {editingId ? "Guardar" : "Crear"}
              </AppButton>
              <AppButton
                type="button"
                variant="secondary"
                onClick={() => {
                  setEditingId(null);
                  setForm(emptyForm);
                  setMapPolygon(null);
                  setMapCentroid(null);
                  setFieldErrors({});
                  setFormMode("none");
                  clearFormQueryState();
                }}
              >
                Cancelar
              </AppButton>
            </div>
            {error ? <NoticeBanner tone="danger" className="mt-4">{error}</NoticeBanner> : null}
          </AppCard>
        ) : null}
      </div>
      {ConfirmDialog}
    </div>
  );
}
