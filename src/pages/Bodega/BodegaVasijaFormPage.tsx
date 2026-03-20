import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  createElaboracionResource,
  listElaboracionResource,
  patchElaboracionResource,
  type ElaboracionEntity,
} from "../../features/elaboracion/api";
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
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

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
  };

  const onSubmit = async () => {
    if (!activeBodegaId) {
      setError("Seleccioná una bodega para continuar.");
      return;
    }
    if (!form.codigo.trim()) {
      setError("El código es obligatorio.");
      return;
    }
    if (form.capacidad_litros.trim()) {
      const parsed = Number(form.capacidad_litros);
      if (Number.isNaN(parsed)) {
        setError("La capacidad debe ser numérica.");
        return;
      }
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
    try {
      if (mode === "edit" && id) {
        await patchElaboracionResource("vasijas", id, payload);
        setSuccess("Vasija actualizada correctamente.");
      } else {
        await createElaboracionResource("vasijas", payload);
        setSuccess("Vasija creada correctamente.");
        setForm(emptyForm);
      }

      window.setTimeout(() => {
        navigate("/bodega/vasijas");
      }, 500);
    } catch (requestError) {
      setError(getApiErrorMessage(requestError));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-secondary px-6 py-10">
      <div className="mx-auto w-full max-w-3xl rounded-2xl bg-primary p-6 shadow-lg">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-text">{pageTitle}</h1>
            <p className="mt-1 text-sm text-text-secondary">
              Completá los datos de la vasija y luego volvés al listado.
            </p>
          </div>
          <Link
            to="/bodega/vasijas"
            className="rounded-lg border border-[#C9A961]/40 px-3 py-2 text-xs font-semibold text-text transition hover:bg-primary"
          >
            Volver al listado
          </Link>
        </div>

        {!activeBodegaId ? (
          <div className="mt-6 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            Seleccioná una bodega para administrar vasijas.
          </div>
        ) : loading ? (
          <div className="mt-6 rounded-xl border border-[#C9A961]/30 bg-[#FFF9F0] px-3 py-2 text-sm text-[#7A4A50]">
            Cargando vasija...
          </div>
        ) : (
          <>
            <div className="mt-6 rounded-xl border border-[#C9A961]/30 bg-[#FFF9F0] p-4">
              <div className="mb-4">
                <h2 className="text-lg font-semibold text-[#3D1B1F]">Datos de la vasija</h2>
                <p className="text-xs text-[#7A4A50]">
                  Mantené la información base consistente con el resto de la administración.
                </p>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
              <label className="text-sm text-[#722F37]">
                <span className="mb-2 block">Código</span>
                <input
                  type="text"
                  value={form.codigo}
                  onChange={(event) => onChange("codigo", event.target.value)}
                  className="w-full rounded-lg border-2 border-[#C9A961]/30 px-3 py-2 text-sm text-[#3D1B1F] outline-none focus:border-[#722F37]"
                />
              </label>
              <label className="text-sm text-[#722F37]">
                <span className="mb-2 block">Tipo</span>
                <input
                  type="text"
                  value={form.tipo}
                  onChange={(event) => onChange("tipo", event.target.value)}
                  className="w-full rounded-lg border-2 border-[#C9A961]/30 px-3 py-2 text-sm text-[#3D1B1F] outline-none focus:border-[#722F37]"
                />
              </label>
              <label className="text-sm text-[#722F37]">
                <span className="mb-2 block">Capacidad litros</span>
                <input
                  type="number"
                  value={form.capacidad_litros}
                  onChange={(event) =>
                    onChange("capacidad_litros", event.target.value)
                  }
                  className="w-full rounded-lg border-2 border-[#C9A961]/30 px-3 py-2 text-sm text-[#3D1B1F] outline-none focus:border-[#722F37]"
                />
              </label>
              <label className="text-sm text-[#722F37]">
                <span className="mb-2 block">Estado</span>
                <input
                  type="text"
                  value={form.estado}
                  onChange={(event) => onChange("estado", event.target.value)}
                  className="w-full rounded-lg border-2 border-[#C9A961]/30 px-3 py-2 text-sm text-[#3D1B1F] outline-none focus:border-[#722F37]"
                />
              </label>
              <label className="text-sm text-[#722F37] md:col-span-2">
                <span className="mb-2 block">Ubicación</span>
                <input
                  type="text"
                  value={form.ubicacion}
                  onChange={(event) => onChange("ubicacion", event.target.value)}
                  className="w-full rounded-lg border-2 border-[#C9A961]/30 px-3 py-2 text-sm text-[#3D1B1F] outline-none focus:border-[#722F37]"
                />
              </label>
              </div>
            </div>

            {error ? (
              <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                {error}
              </div>
            ) : null}
            {success ? (
              <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
                {success}
              </div>
            ) : null}

            <div className="mt-6 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => void onSubmit()}
                disabled={saving}
                className="rounded-lg border border-[#722F37] bg-[#722F37] px-4 py-2 text-sm font-semibold text-[#FFF9F0] transition hover:bg-[#8A3A45] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {saving ? "Guardando..." : mode === "edit" ? "Guardar cambios" : "Crear vasija"}
              </button>
              <button
                type="button"
                onClick={() => navigate("/bodega/vasijas")}
                className="rounded-lg border border-[#C9A961]/40 px-4 py-2 text-sm font-semibold text-[#722F37] transition hover:bg-[#F8F3EE]"
              >
                Cancelar
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
