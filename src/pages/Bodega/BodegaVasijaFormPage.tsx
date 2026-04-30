import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  createElaboracionResource,
  listElaboracionResource,
  patchElaboracionResource,
  type ElaboracionEntity,
} from "../../features/elaboracion/api";
import {
  AppButton,
  AppCard,
  AppInput,
  NoticeBanner,
  SectionIntro,
  useAppNotifications,
} from "../../components/ui";
import { getApiErrorMessage } from "../../lib/api";
import { useAuthStore } from "../../store/authStore";

type BodegaVasijaFormPageProps = {
  mode: "create" | "edit";
};

type VasijaFormState = {
  codigo: string;
  tipo: string;
  capacidad_litros: string;
  estado: string;
  ubicacion: string;
};

type VasijaFieldErrors = Partial<Record<keyof VasijaFormState, string>>;

const emptyForm: VasijaFormState = {
  codigo: "",
  tipo: "",
  capacidad_litros: "",
  estado: "",
  ubicacion: "",
};

const VASIJA_ID_KEYS = ["id_vasija", "vasija_id", "id"];

function resolveVasijaId(item: ElaboracionEntity) {
  for (const key of VASIJA_ID_KEYS) {
    const value = item[key];
    if (typeof value === "string" && value.trim()) return value;
    if (typeof value === "number") return String(value);
  }
  return "";
}

export default function BodegaVasijaFormPage({
  mode,
}: BodegaVasijaFormPageProps) {
  const { id } = useParams();
  const navigate = useNavigate();
  const activeBodegaId = useAuthStore((state) => state.activeBodegaId);
  const [form, setForm] = useState<VasijaFormState>(emptyForm);
  const [loading, setLoading] = useState(mode === "edit");
  const [saving, setSaving] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<VasijaFieldErrors>({});
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const notifications = useAppNotifications();

  const pageTitle = useMemo(
    () => (mode === "edit" ? "Editar vasija" : "Nueva vasija"),
    [mode],
  );

  useEffect(() => {
    if (mode !== "edit") {
      setForm(emptyForm);
      setLoading(false);
      return;
    }
    if (!activeBodegaId || !id) {
      setLoading(false);
      return;
    }

    let mounted = true;
    setLoading(true);
    setError(null);

    listElaboracionResource("vasijas", { bodegaId: String(activeBodegaId) })
      .then((items) => {
        if (!mounted) return;
        const selected = items.find((item) => resolveVasijaId(item) === id);
        if (!selected) {
          setError("No se encontró la vasija seleccionada.");
          return;
        }
        setForm({
          codigo:
            typeof selected.codigo === "string" ? selected.codigo : "",
          tipo: typeof selected.tipo === "string" ? selected.tipo : "",
          capacidad_litros:
            selected.capacidad_litros === null ||
            selected.capacidad_litros === undefined ||
            selected.capacidad_litros === ""
              ? ""
              : String(selected.capacidad_litros),
          estado: typeof selected.estado === "string" ? selected.estado : "",
          ubicacion:
            typeof selected.ubicacion === "string" ? selected.ubicacion : "",
        });
      })
      .catch((requestError) => {
        if (!mounted) return;
        setError(getApiErrorMessage(requestError));
      })
      .finally(() => {
        if (!mounted) return;
        setLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, [activeBodegaId, id, mode]);

  const onChange = (key: keyof VasijaFormState, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    setFieldErrors((prev) => ({ ...prev, [key]: undefined }));
    setError(null);
  };

  const validateForm = () => {
    const nextErrors: VasijaFieldErrors = {};

    if (!form.codigo.trim()) {
      nextErrors.codigo = "El código de la vasija es obligatorio.";
    }

    if (form.capacidad_litros.trim()) {
      const parsed = Number(form.capacidad_litros);
      if (Number.isNaN(parsed) || parsed <= 0) {
        nextErrors.capacidad_litros = "Ingresá una capacidad válida mayor a cero.";
      }
    }

    return nextErrors;
  };

  const onSubmit = async () => {
    if (saving) return;
    if (!activeBodegaId) {
      setError("Seleccioná una bodega para continuar.");
      notifications.notifyError({
        title: "Falta contexto",
        message: "Seleccioná una bodega para poder guardar la vasija.",
      });
      return;
    }

    const validationErrors = validateForm();
    if (Object.keys(validationErrors).length > 0) {
      setFieldErrors(validationErrors);
      setError(null);
      notifications.notifyError({
        title: mode === "edit" ? "Faltan datos para guardar" : "Faltan datos para crear la vasija",
        message: "Revisá los campos marcados en el formulario.",
      });
      return;
    }

    const payload: Record<string, unknown> = {
      bodegaId: String(activeBodegaId),
      codigo: form.codigo.trim(),
      tipo: form.tipo.trim() || null,
      estado: form.estado.trim() || null,
      ubicacion: form.ubicacion.trim() || null,
    };
    if (form.capacidad_litros.trim()) {
      payload.capacidad_litros = Number(form.capacidad_litros);
    }

    setSaving(true);
    setError(null);
    setSuccess(null);
    setFieldErrors({});
    try {
      if (mode === "edit" && id) {
        await patchElaboracionResource("vasijas", id, payload);
        setSuccess("Vasija actualizada correctamente.");
        notifications.notifySuccess({
          title: "Vasija actualizada",
          message: `La vasija ${form.codigo.trim()} quedó actualizada correctamente.`,
        });
      } else {
        await createElaboracionResource("vasijas", payload);
        setSuccess("Vasija creada correctamente.");
        notifications.notifySuccess({
          title: "Vasija creada",
          message: `La vasija ${form.codigo.trim()} quedó registrada correctamente.`,
        });
        setForm(emptyForm);
      }

      window.setTimeout(() => {
        navigate("/bodega/vasijas");
      }, 500);
    } catch (requestError) {
      const message = getApiErrorMessage(requestError);
      setError(message);
      notifications.notifyError({
        title: mode === "edit" ? "No se pudo actualizar la vasija" : "No se pudo crear la vasija",
        message,
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-secondary px-6 py-10">
      <div className="mx-auto w-full max-w-4xl space-y-6">
        <AppCard
          as="section"
          tone="default"
          padding="lg"
          header={(
            <SectionIntro
              title={pageTitle}
              description="Completá los datos de la vasija y luego volvés al listado."
              actions={(
                <Link to="/bodega/vasijas">
                  <AppButton variant="secondary" size="sm">Volver al listado</AppButton>
                </Link>
              )}
            />
          )}
        >
          <NoticeBanner tone="info" title="Flujo">
            Primero definís los datos base de la vasija y después seguís trabajando desde el listado.
          </NoticeBanner>
        </AppCard>

        {!activeBodegaId ? (
          <NoticeBanner tone="danger">
            Seleccioná una bodega para administrar vasijas.
          </NoticeBanner>
        ) : loading ? (
          <NoticeBanner>
            Cargando vasija...
          </NoticeBanner>
        ) : (
          <AppCard
            as="section"
            tone="default"
            padding="lg"
            header={(
              <SectionIntro
                title="Datos de la vasija"
                description="Mantené la información base consistente con el resto de la administración."
              />
            )}
          >
            <AppCard as="div" tone="soft" padding="md">
              <div className="grid gap-4 md:grid-cols-2">
              <AppInput
                label="Código"
                  type="text"
                  value={form.codigo}
                  onChange={(event) => onChange("codigo", event.target.value)}
                  uiSize="lg"
                  error={fieldErrors.codigo}
                />
              <AppInput
                label="Tipo"
                  type="text"
                  value={form.tipo}
                  onChange={(event) => onChange("tipo", event.target.value)}
                  uiSize="lg"
                />
              <AppInput
                label="Capacidad litros"
                  type="number"
                  value={form.capacidad_litros}
                  onChange={(event) =>
                    onChange("capacidad_litros", event.target.value)
                  }
                  uiSize="lg"
                  error={fieldErrors.capacidad_litros}
                />
              <AppInput
                label="Estado"
                  type="text"
                  value={form.estado}
                  onChange={(event) => onChange("estado", event.target.value)}
                  uiSize="lg"
                />
              <AppInput
                label="Ubicación"
                className="md:col-span-2"
                  type="text"
                  value={form.ubicacion}
                  onChange={(event) => onChange("ubicacion", event.target.value)}
                  uiSize="lg"
                />
              </div>
            </AppCard>

            {error ? (
              <NoticeBanner tone="danger" className="mt-4">{error}</NoticeBanner>
            ) : null}
            {success ? (
              <NoticeBanner tone="success" className="mt-4">{success}</NoticeBanner>
            ) : null}

            <div className="mt-6 flex flex-wrap gap-3">
              <AppButton
                type="button"
                variant="primary"
                loading={saving}
                onClick={() => void onSubmit()}
                disabled={saving}
              >
                {saving ? "Guardando..." : mode === "edit" ? "Guardar cambios" : "Crear vasija"}
              </AppButton>
              <AppButton
                type="button"
                variant="secondary"
                onClick={() => navigate("/bodega/vasijas")}
              >
                Cancelar
              </AppButton>
            </div>
          </AppCard>
        )}
      </div>
    </div>
  );
}
