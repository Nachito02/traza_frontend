import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { fetchCuartelesByFinca } from "../../features/cuarteles/api";
import { fetchCampanias } from "../../features/campanias/api";
import { fetchProtocolos } from "../../features/protocolos/api";
import {
  createTrazabilidad,
  type CreateTrazabilidadPayload,
} from "../../features/trazabilidades/api";
import { useAuthStore } from "../../store/authStore";
import type { Cuartel } from "../../features/cuarteles/api";
import type { Campania } from "../../features/campanias/api";
import type { Protocolo } from "../../features/protocolos/api";
import { useFincasStore } from "../../features/fincas/store";

const FincaDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const activeBodegaId = useAuthStore((state) => state.activeBodegaId);
  const fincas = useFincasStore((state) => state.fincas);
  const finca = fincas.find(
    (item) => item.finca_id === id || item.id === id
  );

  const [cuarteles, setCuarteles] = useState<Cuartel[]>([]);
  const [campanias, setCampanias] = useState<Campania[]>([]);
  const [protocolos, setProtocolos] = useState<Protocolo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<CreateTrazabilidadPayload>({
    protocoloId: "",
    bodegaId: "",
    fincaId: id ?? "",
    cuartelId: "",
    campaniaId: "",
    nombre_producto: "",
    imagen_producto: "",
  });

  useEffect(() => {
    if (!id) return;
    setForm((prev) => ({ ...prev, fincaId: id }));
  }, [id]);

  useEffect(() => {
    if (!activeBodegaId) return;
    setForm((prev) => ({ ...prev, bodegaId: String(activeBodegaId) }));
  }, [activeBodegaId]);

  useEffect(() => {
    if (!id) return;
    let mounted = true;
    setLoading(true);
    setError(null);
    Promise.all([
      fetchCuartelesByFinca(id),
      fetchCampanias(),
      fetchProtocolos(),
    ])
      .then(([cuartelesData, campaniasData, protocolosData]) => {
        if (!mounted) return;
        setCuarteles(cuartelesData ?? []);
        setCampanias(campaniasData ?? []);
        setProtocolos(protocolosData ?? []);
      })
      .catch(() => {
        if (!mounted) return;
        setError("No se pudieron cargar los datos de la finca.");
      })
      .finally(() => {
        if (!mounted) return;
        setLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, [id]);

  const onChange = (key: keyof CreateTrazabilidadPayload, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const canCreate = useMemo(() => {
    return (
      form.protocoloId &&
      form.bodegaId &&
      form.fincaId &&
      form.cuartelId &&
      form.campaniaId
    );
  }, [form]);

  const handleCreate = async () => {
    if (!canCreate) {
      setError("Completá los campos obligatorios.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const trazabilidad = await createTrazabilidad({
        ...form,
        nombre_producto: form.nombre_producto?.trim() || null,
        imagen_producto: form.imagen_producto?.trim() || null,
      });
      navigate(`/trazabilidades/${trazabilidad.trazabilidad_id}/plan`);
    } catch {
      setError("No se pudo crear la trazabilidad.");
    } finally {
      setSaving(false);
    }
  };

  if (!id) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#F9F6F2] via-[#F3E7DA] to-[#EAD8C6] px-6 py-10">
        <div className="mx-auto w-full max-w-4xl rounded-2xl bg-white/90 p-8 shadow-lg text-sm text-red-700">
          Finca no encontrada.
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#F9F6F2] via-[#F3E7DA] to-[#EAD8C6] px-6 py-10">
      <div className="mx-auto w-full max-w-4xl space-y-6">
        <div className="rounded-2xl bg-white/90 p-8 shadow-lg">
          <h1 className="text-2xl text-[#3D1B1F]">
            {finca?.nombre ?? finca?.nombre_finca ?? finca?.name ?? "Finca"}
          </h1>
          <p className="mt-2 text-sm text-[#6B3A3F]">
            Seleccioná cuartel, campaña y protocolo para crear una trazabilidad.
          </p>
        </div>

        <div className="rounded-2xl bg-white/90 p-8 shadow-lg">
          <h2 className="text-lg font-semibold text-[#3D1B1F]">
            Crear trazabilidad
          </h2>
          {loading ? (
            <div className="mt-4 text-sm text-[#7A4A50]">
              Cargando datos…
            </div>
          ) : error ? (
            <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </div>
          ) : (
            <form className="mt-6 space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="block text-sm text-[#722F37] mb-2">
                    Cuartel
                  </label>
                  <select
                    className="w-full rounded-lg border-2 border-[#C9A961]/30 px-3 py-2 text-sm text-[#3D1B1F] outline-none focus:border-[#722F37]"
                    value={form.cuartelId}
                    onChange={(e) => onChange("cuartelId", e.target.value)}
                  >
                    <option value="">Seleccionar cuartel</option>
                    {cuarteles.map((cuartel) => (
                      <option
                        key={cuartel.cuartel_id ?? cuartel.id}
                        value={cuartel.cuartel_id ?? cuartel.id}
                      >
                        {cuartel.codigo_cuartel}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm text-[#722F37] mb-2">
                    Campaña
                  </label>
                  <select
                    className="w-full rounded-lg border-2 border-[#C9A961]/30 px-3 py-2 text-sm text-[#3D1B1F] outline-none focus:border-[#722F37]"
                    value={form.campaniaId}
                    onChange={(e) => onChange("campaniaId", e.target.value)}
                  >
                    <option value="">Seleccionar campaña</option>
                    {campanias.map((campania) => {
                      const label = campania.nombre;
                      const idValue = campania.campania_id ?? campania.id ?? "";
                      return (
                        <option key={idValue} value={idValue}>
                          {label}
                        </option>
                      );
                    })}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm text-[#722F37] mb-2">
                  Protocolo
                </label>
                <select
                  className="w-full rounded-lg border-2 border-[#C9A961]/30 px-3 py-2 text-sm text-[#3D1B1F] outline-none focus:border-[#722F37]"
                  value={form.protocoloId}
                  onChange={(e) => onChange("protocoloId", e.target.value)}
                >
                  <option value="">Seleccionar protocolo</option>
                  {protocolos.map((protocolo) => {
                    const idValue =
                      protocolo.protocolo_id ?? protocolo.id ?? "";
                    const label =
                      protocolo.nombre ?? protocolo.codigo ?? "Protocolo";
                    return (
                      <option key={idValue} value={idValue}>
                        {label}
                      </option>
                    );
                  })}
                </select>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="block text-sm text-[#722F37] mb-2">
                    Nombre del producto (opcional)
                  </label>
                  <input
                    type="text"
                    className="w-full rounded-lg border-2 border-[#C9A961]/30 px-3 py-2 text-sm text-[#3D1B1F] outline-none focus:border-[#722F37]"
                    value={form.nombre_producto ?? ""}
                    onChange={(e) => onChange("nombre_producto", e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-sm text-[#722F37] mb-2">
                    Imagen del producto (URL opcional)
                  </label>
                  <input
                    type="text"
                    className="w-full rounded-lg border-2 border-[#C9A961]/30 px-3 py-2 text-sm text-[#3D1B1F] outline-none focus:border-[#722F37]"
                    value={form.imagen_producto ?? ""}
                    onChange={(e) => onChange("imagen_producto", e.target.value)}
                  />
                </div>
              </div>

              <button
                type="button"
                disabled={!canCreate || saving}
                onClick={() => void handleCreate()}
                className="rounded-lg border border-[#C9A961]/40 px-4 py-2 text-sm font-semibold text-[#722F37] transition hover:border-[#C9A961] hover:bg-[#F8F3EE] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {saving ? "Creando..." : "Crear trazabilidad"}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

export default FincaDetail;
